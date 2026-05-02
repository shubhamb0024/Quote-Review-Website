require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;
const OPENAI_REQUEST_MS = Number(process.env.OPENAI_TIMEOUT_MS) || 120_000;

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

const ANALYZE_SYSTEM_PROMPT = `You are a quote critic.
Evaluate the quote based on clarity, grammar, originality, and emotional impact.
Give a strict rating out of 10.
Give short feedback (1-2 lines).
Give 5 improved versions.

Return ONLY valid JSON (no markdown, no commentary) in exactly this shape:
{"rating": number, "feedback": string, "suggestions": string[]}`;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API is running");
});

/**
 * Extract the first balanced `{ ... }` object from text (ignores braces inside JSON strings).
 */
function extractBalancedJsonObject(src) {
    const str = String(src);
    const start = str.indexOf("{");
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;

    for (let i = start; i < str.length; i += 1) {
        const c = str[i];

        if (inString) {
            if (escape) {
                escape = false;
                continue;
            }
            if (c === "\\") {
                escape = true;
                continue;
            }
            if (c === '"') {
                inString = false;
            }
            continue;
        }

        if (c === '"') {
            inString = true;
            continue;
        }

        if (c === "{") depth += 1;
        if (c === "}") {
            depth -= 1;
            if (depth === 0) {
                return str.slice(start, i + 1);
            }
        }
    }

    return null;
}

/**
 * Collect string chunks that might contain JSON (fenced code, full text, balanced object).
 */
function jsonCandidateChunks(modelText) {
    const text = String(modelText).trim();
    const chunks = [];
    const fenceRe = /```(?:json)?\s*([\s\S]*?)```/gi;
    let m;
    while ((m = fenceRe.exec(text)) !== null) {
        chunks.push(m[1].trim());
    }
    chunks.push(text);
    const balanced = extractBalancedJsonObject(text);
    if (balanced) chunks.push(balanced);
    return chunks;
}

function coerceRating(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
        return value;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        const n = Number(trimmed);
        if (!Number.isNaN(n) && trimmed !== "") return n;
        const frac = trimmed.match(/(\d+(?:\.\d+)?)/);
        if (frac) return Number(frac[1]);
    }
    return NaN;
}

/**
 * Returns a clean payload or null if the object cannot be normalized.
 * Shape: { rating: number, feedback: string, suggestions: string[] }
 */
function normalizeAnalyzeResponse(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
        return null;
    }

    const rating = coerceRating(obj.rating);
    if (Number.isNaN(rating)) return null;

    if (obj.feedback == null) return null;
    const feedback = String(obj.feedback).trim();
    if (!feedback) return null;

    if (!Array.isArray(obj.suggestions)) return null;
    const suggestions = obj.suggestions
        .map((item) => String(item).trim())
        .filter((s) => s.length > 0);

    return {
        rating,
        feedback,
        suggestions,
    };
}

/**
 * Parse OpenAI message content that may include prose; extract and return clean JSON shape.
 */
function parseAnalyzeFromModelText(modelText) {
    const seen = new Set();
    for (const chunk of jsonCandidateChunks(modelText)) {
        if (!chunk || seen.has(chunk)) continue;
        seen.add(chunk);

        let parsed;
        try {
            parsed = JSON.parse(chunk);
        } catch {
            const inner = extractBalancedJsonObject(chunk);
            if (!inner || inner === chunk) continue;
            try {
                parsed = JSON.parse(inner);
            } catch {
                continue;
            }
        }

        const normalized = normalizeAnalyzeResponse(parsed);
        if (normalized) return normalized;
    }

    return null;
}

function clientOpenAiStatus(upstreamStatus) {
    if (upstreamStatus >= 400 && upstreamStatus < 600) return upstreamStatus;
    return 502;
}

/**
 * Readable error payload when the OpenAI API or transport fails (never exposes the API key).
 */
function describeOpenAiFailure(status, completionJson, rawText) {
    const apiMsg =
        completionJson?.error?.message ||
        completionJson?.message ||
        (typeof rawText === "string" && rawText.trim()
            ? rawText.trim().slice(0, 500)
            : null);

    switch (status) {
        case 401:
            return "OpenAI rejected the API key (unauthorized). Check OPENAI_API_KEY in your .env file.";
        case 403:
            return "OpenAI denied access for this request (forbidden).";
        case 404:
            return "OpenAI endpoint or model was not found. Verify the configured model exists for your account.";
        case 429:
            return "OpenAI rate limit or quota exceeded. Try again shortly.";
        case 500:
        case 502:
        case 503:
            return apiMsg || "OpenAI service error. Try again later.";
        default:
            return apiMsg || "OpenAI request failed.";
    }
}

app.post("/analyze-quote", async (req, res) => {
    const { quote } = req.body ?? {};

    if (typeof quote !== "string" || !quote.trim()) {
        res.status(400).json({
            error: 'Request body must be JSON with a non-empty string field "quote".',
        });
        return;
    }

    const apiKey = process.env.OPENAI_API_KEY;
    const trimmedKey = typeof apiKey === "string" ? apiKey.trim() : "";
    if (!trimmedKey) {
        res.status(500).json({
            error:
                'Missing OPENAI_API_KEY. Add it to a .env file in the project root (see dotenv) or export it in your environment.',
        });
        return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_REQUEST_MS);

    try {
        let openaiRes;
        try {
            openaiRes = await fetch(OPENAI_URL, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${trimmedKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: "gpt-5.3",
                    messages: [
                        { role: "system", content: ANALYZE_SYSTEM_PROMPT },
                        {
                            role: "user",
                            content: quote.trim(),
                        },
                    ],
                    response_format: { type: "json_object" },
                }),
                signal: controller.signal,
            });
        } catch (fetchErr) {
            const name = fetchErr?.name ?? "";
            if (name === "AbortError") {
                console.error("[analyze-quote] OpenAI request timed out");
                res.status(504).json({
                    error: `OpenAI request timed out after ${OPENAI_REQUEST_MS}ms.`,
                });
                return;
            }
            if (
                fetchErr instanceof TypeError ||
                name === "FetchError"
            ) {
                console.error("[analyze-quote] Network error:", fetchErr);
                res.status(502).json({
                    error:
                        "Could not reach OpenAI. Check your internet connection or firewall.",
                });
                return;
            }
            throw fetchErr;
        }

        const rawText = await openaiRes.text().catch(() => "");
        let completionJson;
        try {
            completionJson = rawText ? JSON.parse(rawText) : {};
        } catch {
            console.error("[analyze-quote] Non-JSON body from OpenAI", {
                status: openaiRes.status,
                snippet: String(rawText).slice(0, 200),
            });
            const status =
                clientOpenAiStatus(openaiRes.status);
            res.status(status).json({
                error:
                    "OpenAI returned an invalid payload (could not parse as JSON).",
            });
            return;
        }

        if (!openaiRes.ok) {
            const payload = describeOpenAiFailure(
                openaiRes.status,
                completionJson,
                rawText
            );
            console.error("[analyze-quote] OpenAI HTTP error:", {
                status: openaiRes.status,
                type: completionJson?.error?.type,
            });
            res.status(clientOpenAiStatus(openaiRes.status)).json({
                error: payload,
            });
            return;
        }

        const content =
            completionJson?.choices?.[0]?.message?.content ?? "";
        if (!content.trim()) {
            res.status(502).json({
                error: "OpenAI returned an empty completion.",
            });
            return;
        }

        const clean = parseAnalyzeFromModelText(content);
        if (!clean) {
            console.error(
                "[analyze-quote] Could not extract valid JSON object:",
                content.slice(0, 800)
            );
            res.status(502).json({
                error:
                    "Could not extract a valid JSON object with rating, feedback, and suggestions from the model output.",
            });
            return;
        }

        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.json({
            rating: clean.rating,
            feedback: clean.feedback,
            suggestions: clean.suggestions,
        });
    } catch (err) {
        console.error("[analyze-quote] Unexpected:", err);
        res.status(500).json({
            error: err?.message || "Unexpected server error.",
        });
    } finally {
        clearTimeout(timeoutId);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
