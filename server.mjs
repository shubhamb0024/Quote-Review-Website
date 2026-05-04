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
                            text: `Analyze this quote:

"${quote.trim()}"

Return ONLY valid JSON:
{
  "rating": number,
  "feedback": "text",
  "suggestions": ["...", "..."]
}`,
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

        res.json(parsed);
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
