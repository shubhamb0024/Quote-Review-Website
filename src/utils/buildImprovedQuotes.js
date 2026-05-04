const GENERIC_SUGGESTION_PATTERN =
    /\b(improve|clarity|grammar|originality|emotional impact|add|try|replace|consider|use|should|could|might|tip)\b/i;

function cleanSuggestion(value) {
    return String(value || "")
        .replace(/^[\s"']+|[\s"']+$/g, "")
        .replace(/^\d+[\).\-\s]+/, "")
        .trim();
}

function isLikelyRewrite(text, original) {
    if (!text) return false;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 6) return false;
    if (GENERIC_SUGGESTION_PATTERN.test(text)) return false;
    const normalizedOriginal = original.toLowerCase().replace(/[^\w\s]/g, "");
    const normalizedText = text.toLowerCase().replace(/[^\w\s]/g, "");
    return normalizedText !== normalizedOriginal;
}

function normalizeBaseQuote(quote) {
    const fallback = "Your perspective can become your strength";
    const trimmed = String(quote || "")
        .replace(/^[\s"']+|[\s"']+$/g, "")
        .trim();
    if (!trimmed) return fallback;
    return trimmed.replace(/\s+/g, " ");
}

function lowerFirst(text) {
    if (!text) return text;
    return text.charAt(0).toLowerCase() + text.slice(1);
}

function buildFallbackRewrites(baseQuote) {
    const baseNoPunctuation = baseQuote.replace(/[.!?]+$/g, "");
    const lowered = lowerFirst(baseNoPunctuation);

    return [
        `${baseNoPunctuation}; let it guide you with clearer purpose every day.`,
        `Choose this truth and live it fully: ${lowered}.`,
        `In hard moments, remember this and move with intention: ${lowered}.`,
        `${baseNoPunctuation}, and let that conviction shape your next decision.`,
        `Hold this close: ${lowered} - then keep going with confidence.`,
    ];
}

export function buildImprovedQuotes(originalQuote, aiSuggestions) {
    const baseQuote = normalizeBaseQuote(originalQuote);
    const incoming = Array.isArray(aiSuggestions) ? aiSuggestions : [];
    const rewritten = [];

    for (const item of incoming) {
        const cleaned = cleanSuggestion(item);
        if (!cleaned) continue;
        if (!isLikelyRewrite(cleaned, baseQuote)) continue;
        rewritten.push(cleaned);
        if (rewritten.length === 5) break;
    }

    if (rewritten.length < 5) {
        const fallback = buildFallbackRewrites(baseQuote);
        for (const candidate of fallback) {
            if (rewritten.length === 5) break;
            if (!rewritten.includes(candidate)) rewritten.push(candidate);
        }
    }

    return rewritten.slice(0, 5);
}
