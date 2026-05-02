require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

function sendJson(res, status, body) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(status).json(body);
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

        if (!process.env.OPENAI_API_KEY?.trim()) {
            sendJson(res, 500, {
                error:
                    "Missing OPENAI_API_KEY. Add it to your .env or environment.",
            });
            return;
        }

        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                input: `Analyze this quote:

"${quote.trim()}"

Return ONLY valid JSON in this format:
{
  "rating": number,
  "feedback": "text",
  "suggestions": ["...", "..."]
}`,
            }),
        });

        const data = await response.json();

        console.log("FULL RESPONSE:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            console.log("[analyze-quote] OpenAI error response:", data);
            res.json({
                rating: 0,
                feedback: "Error analyzing quote",
                suggestions: [],
            });
            return;
        }

        let rawText = "";

        if (data.output && data.output.length > 0) {
            for (const item of data.output) {
                if (item.content) {
                    for (const c of item.content) {
                        if (c.text) {
                            rawText += c.text;
                        }
                    }
                }
            }
        }

        console.log("RAW TEXT:", rawText);

        rawText = rawText
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (err) {
            console.error("JSON PARSE ERROR:", err);
            res.json({
                rating: 0,
                feedback: "Parsing error from AI",
                suggestions: [],
            });
            return;
        }

        res.json(parsed);
    } catch (err) {
        console.error("[analyze-quote] Outer error:", err);
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
