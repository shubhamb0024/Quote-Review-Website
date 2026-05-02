/**
 * Renders API data into #rating, #feedback, and #suggestions (ul with li children).
 * Safe for mixed text: uses textContent only (no HTML injection).
 *
 * @param {object} data
 * @param {string} [data.error] - When set, shows error in #feedback and clears suggestions
 * @param {number} [data.rating]
 * @param {string} [data.feedback]
 * @param {string[]} [data.suggestions]
 */
export function displayResult(data) {
    const ratingEl = document.getElementById("rating");
    const feedbackEl = document.getElementById("feedback");
    const suggestionsEl = document.getElementById("suggestions");

    if (!ratingEl || !feedbackEl || !suggestionsEl) {
        console.warn(
            "displayResult: expected elements #rating, #feedback, and #suggestions in the DOM."
        );
        return;
    }

    if (data && typeof data.error === "string") {
        ratingEl.textContent = "—";
        feedbackEl.textContent = data.error;
        clearList(suggestionsEl);
        return;
    }

    const r =
        typeof data.rating === "number" && !Number.isNaN(data.rating)
            ? data.rating
            : null;

    if (r === null) {
        ratingEl.textContent = "—";
        feedbackEl.textContent = "Invalid response: missing numeric rating.";
        clearList(suggestionsEl);
        return;
    }

    ratingEl.textContent = `${r} / 10`;
    feedbackEl.textContent =
        typeof data.feedback === "string" ? data.feedback : "";

    clearList(suggestionsEl);
    const items = Array.isArray(data.suggestions) ? data.suggestions : [];

    items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = String(item);
        suggestionsEl.appendChild(li);
    });
}

function clearList(ul) {
    if (typeof ul.replaceChildren === "function") {
        ul.replaceChildren();
    } else {
        ul.innerHTML = "";
    }
}
