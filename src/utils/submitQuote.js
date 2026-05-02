/**
 * Sends the quote from #quoteInput to the analyze API and forwards the parsed JSON to displayResult.
 *
 * Call as `submitQuote(displayResult)`. If `displayResult` is omitted in the browser,
 * falls back to a global `displayResult` when it is a function (useful for simple HTML demos).
 *
 * On failure, invokes `displayResult({ error: string })`.
 *
 * @param {(data: { rating?: number, feedback?: string, suggestions?: string[], error?: string }) => void} [displayResult]
 * @returns {Promise<void>}
 */
export async function submitQuote(displayResult) {
    const globalDisplayResult =
        typeof window !== "undefined" &&
        typeof window.displayResult === "function"
            ? window.displayResult
            : null;
    const show =
        typeof displayResult === "function"
            ? displayResult
            : globalDisplayResult;

    if (!show) {
        console.error(
            'submitQuote: pass a callback as submitQuote(displayResult), or define a global function named displayResult.'
        );
        return;
    }

    const input = document.getElementById("quoteInput");
    if (!input) {
        show({ error: "No input field found with id \"quoteInput\"." });
        return;
    }

    const quote = (input.value || "").trim();
    if (!quote) {
        show({ error: "Please enter a quote." });
        return;
    }

    let res;
    try {
        res = await fetch("http://localhost:5000/analyze-quote", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ quote }),
        });
    } catch (err) {
        show({
            error:
                err?.message ||
                "Could not reach the API. Is the server running on port 5000?",
        });
        return;
    }

    if (!res.ok) {
        const responseText = await res.text().catch(() => "");
        console.error(
            "[submitQuote] Response not OK; status:",
            res.status,
            "body:",
            responseText
        );
        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch {
            parsed = null;
        }
        show({
            error:
                typeof parsed?.error === "string"
                    ? parsed.error
                    : `Request failed with status ${res.status}.`,
        });
        return;
    }

    let data;
    try {
        data = await res.json();
    } catch {
        show({ error: "The server returned a response that is not JSON." });
        return;
    }

    show(data);
}
