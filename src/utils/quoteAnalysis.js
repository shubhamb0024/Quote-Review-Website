const STOPWORDS = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "as", "by", "with", "from", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "it", "this", "that", "these", "those", "i", "you", "we", "they", "he", "she",
    "my", "your", "our", "their", "what", "which", "who", "when", "where", "why", "how",
    "not", "no", "so", "if", "than", "then", "there", "here", "just", "very", "really",
]);

const SENSORIAL = /\b(light|shadow|ocean|rain|wind|fire|cold|warm|sweet|bitter|soft|sharp|silver|golden|silent|echo|breath|heart|song|dream|moon|sun|stars?|river|stone|ocean|thorn|rose)\b/i;
const FIGURE = /\b(like|as if|though|yet|beyond|within|between|against|upon|toward)\b/i;
const ABSTRACT = /\b(time|truth|hope|freedom|memory|death|love|fear|courage|soul|faith|pain|beauty)\b/i;

function tokenizeWords(text) {
    return text
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.replace(/^[^\w']+|[^\w']+$/g, "").toLowerCase())
        .filter(Boolean);
}

function pickThemeWord(words) {
    const candidates = words.filter((w) => w.length > 4 && !STOPWORDS.has(w));
    if (!candidates.length) return null;
    const seed = candidates.reduce((acc, w) => acc + w.split("").reduce((s, ch) => s + ch.charCodeAt(0), 0), 0);
    return candidates[seed % candidates.length];
}

/**
 * Lightweight client-side heuristics (no external API).
 * Returns half-star granularity rating 1–5 and exactly five refinement tips.
 */
export function analyzeQuote(raw) {
    const text = typeof raw === "string" ? raw.trim() : "";
    const words = tokenizeWords(text);
    const wordCount = words.length;
    const unique = new Set(words);
    const variety = wordCount ? unique.size / wordCount : 0;

    let rating = 2;
    if (wordCount >= 6) rating += 0.4;
    if (wordCount >= 12) rating += 0.35;
    if (wordCount >= 25) rating += 0.2;
    if (variety > 0.75) rating += 0.5;
    else if (variety > 0.55) rating += 0.3;
    if (SENSORIAL.test(text)) rating += 0.35;
    if (FIGURE.test(text)) rating += 0.25;
    if (ABSTRACT.test(text)) rating += 0.25;
    if (/[;:—–]/.test(text)) rating += 0.15;
    if (/\?/.test(text)) rating += 0.1;

    rating = Math.min(5, Math.max(1, rating));
    rating = Math.round(rating * 2) / 2;

    const theme = pickThemeWord(words);

    const pool = [];

    if (theme) {
        pool.push(
            `Let “${theme}” recur once more at the closing line — a quiet echo ties the quote together and adds weight.`
        );
    }

    if (!FIGURE.test(text) && wordCount > 4) {
        pool.push(
            "Add one concrete image compared to something familiar (simile or metaphor): it gives readers something to picture before the idea lands."
        );
    }

    if (!SENSORIAL.test(text)) {
        pool.push(
            "Weave in a single sensory detail — sound, smell, texture, temperature — so the line is felt before it is understood."
        );
    }

    if (!/\?/.test(text) && wordCount > 5) {
        pool.push(
            "Try ending with a short question aimed at the reader; it invites reflection without explaining the metaphor."
        );
    }

    if (variety < 0.55 && wordCount > 8) {
        pool.push(
            "Replace one repeated qualifier with a fresher synonym or cut it entirely — leaner language often reads more poetic."
        );
    }

    if (wordCount > 35 && !/[.;]\s/.test(text)) {
        pool.push(
            "Break the thought into two balanced phrases with a comma, semicolon, or em-dash — rhythm helps meaning breathe."
        );
    }

    if (wordCount < 6 && text.length > 0) {
        pool.push(
            "Extend the phrase with one clause that contrasts or turns the idea (but / yet / instead) — contrast deepens implication."
        );
    }

    if (!ABSTRACT.test(text) && wordCount > 3) {
        pool.push(
            "Name one abstract force (hope, time, mercy) and tether it to your image — philosophy sticks when it grows from something physical."
        );
    }

    const defaults = [
        "Invert the sentence order once: putting the payoff first can sharpen surprise.",
        "Read it aloud slowly; wherever you rush, insert a softer word or pause — eloquence loves deliberate tempo.",
        "Remove the most obvious cliché phrase and substitute a metaphor only you would think of.",
        "Pair a small detail with a big idea on the same line; scale contrast is memorably lyrical.",
        "Cut one adverb; upgrade the verb it modified so energy lives in action, not decoration.",
        "Capitalize sparingly mid-line unless it signals a persona or proper myth — restraint keeps gravity.",
    ];

    const tips = [...pool];
    const seen = new Set(tips);
    for (const d of defaults) {
        if (tips.length >= 5) break;
        if (!seen.has(d)) {
            seen.add(d);
            tips.push(d);
        }
    }
    let i = 0;
    while (tips.length < 5) {
        tips.push(defaults[i % defaults.length]);
        i += 1;
    }

    return {
        rating,
        suggestions: tips.slice(0, 5),
    };
}
