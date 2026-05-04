import "dotenv/config";
import express from "express";
import cors from "cors";
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function sendJson(res, status, body) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(status).json(body);
}

function dedupeSuggestions(suggestions, quote) {
    const quoteLower = quote.trim().toLowerCase();
    const seen = new Set();
    const cleaned = [];

    for (const item of suggestions) {
        const text = String(item || "").trim();
        if (!text) continue;
        const key = text.toLowerCase();
        if (key === quoteLower) continue;
        if (seen.has(key)) continue;
        seen.add(key);
        cleaned.push(text);
    }

    return cleaned;
}

function buildFallbackSuggestions(quote) {
    const base = quote.trim().replace(/[.!?]+$/g, "");
    const seed = base || "Life grows through challenge";
    const lowered = seed.charAt(0).toLowerCase() + seed.slice(1);

    return [
        `${seed}, and every challenge strengthens who you become.`,
        `Through every obstacle, ${lowered} gains deeper meaning.`,
        `${seed} - because struggle is what shapes true growth.`,
        `When tested by hardship, ${lowered} becomes more powerful.`,
        `${seed}; adversity is the forge that refines it.`,
    ];
}

app.get("/", (req, res) => {
    sendJson(res, 200, { message: "API is running" });
});

app.post("/analyze-quote", async (req, res) => {
    try {
        const quote = req.body?.quote;

        if (typeof quote !== "string" || !quote.trim()) {
            sendJson(res, 400, {
                error:
                    'Request body must be JSON with a non-empty string field "quote".',
            });
            return;
        }

        if (!process.env.GEMINI_API_KEY?.trim()) {
            sendJson(res, 500, {
                error:
                    "Missing GEMINI_API_KEY. Add it to your .env or environment.",
            });
            return;
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName =
            process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent({
            contents: [
                {
                    parts: [
                        {
                            text: `You are an expert quote writer.

Rewrite the given quote into 5 DISTINCT and IMPROVED versions.

Rules:
- Each suggestion MUST be a better, more refined version
- Improve clarity, grammar, and emotional impact
- Keep the same meaning but enhance expression
- DO NOT repeat or copy the original quote
- DO NOT make small edits - rewrite properly
- Each suggestion must be UNIQUE from others

Return ONLY JSON:
{
  "rating": number,
  "feedback": "text",
  "suggestions": ["...", "...", "...", "...", "..."]
}

Quote:
"${quote.trim()}"`,
                        },
                    ],
                },
            ],
        });

        const response = result.response;
        let rawText = response.text();

        rawText = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (err) {
            console.error("PARSE ERROR:", rawText);
            return res.json({
                rating: 0,
                feedback: "Parsing error",
                suggestions: [],
            });
        }

        const rawSuggestions = Array.isArray(parsed?.suggestions)
            ? parsed.suggestions
            : [];
        const cleanSuggestions = rawSuggestions
            .map((s) => String(s || "").trim())
            .filter(
                (s) =>
                    s.length > 0 &&
                    s.toLowerCase() !== quote.trim().toLowerCase()
            );
        const uniqueSuggestions = dedupeSuggestions(cleanSuggestions, quote);
        const hadDuplicates = uniqueSuggestions.length !== cleanSuggestions.length;

        let finalSuggestions = uniqueSuggestions;
        if (finalSuggestions.length < 5 || hadDuplicates) {
            finalSuggestions = dedupeSuggestions(
                [...finalSuggestions, ...buildFallbackSuggestions(quote)],
                quote
            ).slice(0, 5);
        }

        if (finalSuggestions.length < 5) {
            finalSuggestions = [
                "Life grows stronger through challenges",
                "Hurdles shape the strength of life",
                "Life becomes meaningful through its struggles",
                "Obstacles are what refine life's journey",
                "Challenges are the true builders of life",
            ];
        }

        res.json({
            rating:
                typeof parsed?.rating === "number" && !Number.isNaN(parsed.rating)
                    ? parsed.rating
                    : 6,
            feedback:
                typeof parsed?.feedback === "string" && parsed.feedback.trim()
                    ? parsed.feedback
                    : "Decent quote but can be improved",
            suggestions: finalSuggestions,
        });
    } catch (error) {
        console.error("GEMINI ERROR:", error);
        res.json({
            rating: 0,
            feedback: "Error analyzing quote",
            suggestions: [],
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
