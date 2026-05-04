import React, { useState, useRef, useEffect } from "react";
import {
    Typography,
    Container,
    TextField,
    Button,
    Box,
    Paper,
    Collapse,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { submitQuote } from "../../utils/submitQuote";
import { buildImprovedQuotes } from "../../utils/buildImprovedQuotes";

const useStyles = makeStyles((theme) => ({
    "@keyframes spinPulse": {
        "0%": {
            transform: "rotate(0deg) scale(0.95)",
        },
        "50%": {
            transform: "rotate(180deg) scale(1.05)",
        },
        "100%": {
            transform: "rotate(360deg) scale(0.95)",
        },
    },
    "@keyframes floatIn": {
        "0%": {
            opacity: 0,
            transform: "translateY(12px) scale(0.98)",
        },
        "100%": {
            opacity: 1,
            transform: "translateY(0) scale(1)",
        },
    },
    "@keyframes pulseGlow": {
        "0%, 100%": {
            boxShadow: `0 4px 20px rgba(0, 191, 191, 0.35)`,
        },
        "50%": {
            boxShadow: `0 8px 32px rgba(219, 97, 162, 0.45), 0 0 0 4px rgba(0, 191, 191, 0.2)`,
        },
    },
    "@keyframes shimmer": {
        "0%": { backgroundPosition: "0% 50%" },
        "100%": { backgroundPosition: "200% 50%" },
    },
    /** Stack above sphere (canvas is z-index: -1); flow from top so results aren't trapped below fold */
    main: {
        position: "relative",
        zIndex: 1,
        flex: "0 1 auto",
        width: "100%",
        paddingTop: theme.spacing(14),
        paddingBottom: theme.spacing(14),
        marginLeft: "auto",
        marginRight: "auto",
        "@media (max-width: 768px)": {
            paddingLeft: theme.spacing(2),
            paddingRight: theme.spacing(2),
        },
        "@media (min-width: 769px)": {
            paddingLeft: theme.spacing(4),
            paddingRight: theme.spacing(4),
        },
    },
    headline: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 600,
        marginBottom: theme.spacing(3),
        [theme.breakpoints.down("xs")]: {
            fontSize: "1.75rem",
        },
    },
    sectionLabel: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontSize: "0.7rem",
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
    formStack: {
        display: "flex",
        flexDirection: "column",
        padding: theme.spacing(3),
        borderRadius: theme.spacing(2),
        background:
            theme.palette.type === "dark"
                ? "rgba(24, 24, 24, 0.72)"
                : "rgba(255, 255, 255, 0.8)",
        boxShadow:
            theme.palette.type === "dark"
                ? "0 16px 42px rgba(0, 0, 0, 0.35)"
                : "0 16px 42px rgba(17, 17, 17, 0.12)",
        backdropFilter: "blur(8px)",
        "& > *:not(:last-child)": {
            marginBottom: theme.spacing(0),
        },
    },
    textarea: {
        marginBottom: theme.spacing(2),
        "& .MuiOutlinedInput-root": {
            transition: "box-shadow 0.3s ease, border-color 0.3s ease",
            borderRadius: theme.spacing(1.5),
            "&:hover fieldset": {
                borderColor: theme.palette.primary.main,
            },
            "&.Mui-focused fieldset": {
                borderWidth: 2,
                boxShadow: `0 0 0 4px ${
                    theme.palette.type === "dark"
                        ? "rgba(0, 191, 191, 0.2)"
                        : "rgba(0, 191, 191, 0.18)"
                }`,
            },
            "& textarea": {
                lineHeight: 1.6,
                padding: theme.spacing(2),
                fontFamily:
                    'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
            },
        },
    },
    actionsRow: {
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: theme.spacing(2),
    },
    submitButton: {
        padding: theme.spacing(1.25, 5),
        minWidth: 160,
        borderRadius: theme.spacing(4),
        textTransform: "none",
        fontWeight: 600,
        fontSize: "1.05rem",
        letterSpacing: "0.02em",
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        background: `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main}, ${theme.palette.primary.main})`,
        backgroundSize: "200% 100%",
        color: theme.palette.type === "dark" ? "#fafafa" : "#111111",
        boxShadow:
            theme.palette.type === "dark"
                ? `0 6px 24px rgba(0, 191, 191, 0.25)`
                : `0 6px 24px rgba(219, 97, 162, 0.2)`,
        transition:
            "transform 0.22s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.35s ease",
        "&:hover": {
            transform: "translateY(-3px) scale(1.02)",
            animation:
                "$shimmer 2.5s ease infinite alternate, $pulseGlow 2.2s ease-in-out infinite",
        },
        "&:active": {
            transform: "translateY(-1px) scale(0.98)",
            animation: "none",
        },
        "&:disabled": {
            background: theme.palette.action.disabledBackground,
            color: theme.palette.action.disabled,
            animation: "none",
            transform: "none",
        },
    },
    resultsAnchor: {
        scrollMarginTop: theme.spacing(2),
        marginTop: theme.spacing(4),
        minHeight: 280,
    },
    resultsInner: {
        display: "flex",
        flexDirection: "column",
        animation: "$floatIn 280ms ease",
        "& > *:not(:last-child)": {
            marginBottom: theme.spacing(3),
        },
    },
    ratingPaper: {
        padding: theme.spacing(3, 3, 3.5),
        borderRadius: theme.spacing(2),
        border: `2px solid ${
            theme.palette.type === "dark"
                ? "rgba(0,191,191,0.35)"
                : "rgba(0,191,191,0.35)"
        }`,
        boxShadow:
            theme.palette.type === "dark"
                ? "inset 0 1px 0 rgba(255,255,255,0.06)"
                : "inset 0 1px 0 rgba(0,0,0,0.04)",
        backgroundColor:
            theme.palette.type === "dark"
                ? "rgba(17,17,17,0.75)"
                : "rgba(250,250,250,0.92)",
        backgroundImage:
            theme.palette.type === "dark"
                ? "linear-gradient(160deg, rgba(0,191,191,0.09) 0%, rgba(17,17,17,0.9) 45%)"
                : "linear-gradient(160deg, rgba(250,250,250,1) 0%, rgba(0,191,191,0.1) 100%)",
        backdropFilter: "blur(10px)",
    },
    ratingLabel: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        opacity: 0.9,
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
    ratingValue: {
        fontWeight: 700,
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontVariantNumeric: "tabular-nums",
        margin: 0,
        fontSize: "2.1rem",
    },
    feedbackText: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontSize: "1rem",
        lineHeight: 1.6,
        marginTop: theme.spacing(1.5),
        marginBottom: 0,
        opacity: 0.95,
    },
    suggestionsPaper: {
        padding: theme.spacing(3, 3.5),
        borderRadius: theme.spacing(2),
        border: `2px solid ${
            theme.palette.type === "dark"
                ? "rgba(219,97,162,0.4)"
                : "rgba(219,97,162,0.35)"
        }`,
        boxShadow:
            theme.palette.type === "dark"
                ? "inset 0 1px 0 rgba(255,255,255,0.04)"
                : "none",
        backgroundColor:
            theme.palette.type === "dark"
                ? "rgba(17,17,17,0.8)"
                : "rgba(255,255,255,0.95)",
        backgroundImage:
            theme.palette.type === "dark"
                ? "linear-gradient(155deg, rgba(219,97,162,0.08) 0%, rgba(17,17,17,0.92) 50%)"
                : "linear-gradient(155deg, #fff 0%, rgba(219,97,162,0.06) 100%)",
        backdropFilter: "blur(8px)",
    },
    suggestionsTitle: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 700,
        marginBottom: theme.spacing(3),
        fontSize: "1rem",
        lineHeight: 1.4,
    },
    suggestionsGrid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: theme.spacing(1.5),
    },
    suggestionCard: {
        borderRadius: theme.spacing(1.5),
        padding: theme.spacing(1.75, 2),
        border: `1px solid ${
            theme.palette.type === "dark"
                ? "rgba(255,255,255,0.12)"
                : "rgba(17,17,17,0.08)"
        }`,
        background:
            theme.palette.type === "dark"
                ? "rgba(255,255,255,0.03)"
                : "rgba(255,255,255,0.9)",
        display: "flex",
        gap: theme.spacing(1.5),
        alignItems: "flex-start",
    },
    suggestionIndex: {
        minWidth: 24,
        fontWeight: 700,
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        color: theme.palette.secondary.main,
    },
    suggestionText: {
        margin: 0,
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        lineHeight: 1.6,
    },
    errorPaper: {
        padding: theme.spacing(2.5, 3),
        borderRadius: theme.spacing(2),
        border: `1px solid ${
            theme.palette.type === "dark"
                ? "rgba(255,99,132,0.5)"
                : "rgba(209, 54, 88, 0.45)"
        }`,
        background:
            theme.palette.type === "dark"
                ? "rgba(79, 17, 32, 0.35)"
                : "rgba(255, 237, 243, 0.9)",
    },
    loaderOverlay: {
        position: "fixed",
        inset: 0,
        zIndex: 1400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
            theme.palette.type === "dark"
                ? "rgba(10, 10, 10, 0.78)"
                : "rgba(250, 250, 250, 0.78)",
        backdropFilter: "blur(8px)",
    },
    loaderBox: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: theme.spacing(2),
    },
    loaderLogo: {
        width: 86,
        height: 86,
        animation: "$spinPulse 2.4s ease-in-out infinite",
        filter: "drop-shadow(0 10px 22px rgba(0, 191, 191, 0.35))",
    },
    loaderText: {
        fontFamily:
            'Inter, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif',
        fontWeight: 600,
        letterSpacing: "0.02em",
    },
}));

export const Content = () => {
    const classes = useStyles();
    const [quote, setQuote] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [submitGeneration, setSubmitGeneration] = useState(0);
    const [analysis, setAnalysis] = useState(null);
    const resultsAnchorRef = useRef(null);

    useEffect(() => {
        if (submitGeneration === 0) return;
        const t = window.setTimeout(() => {
            resultsAnchorRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }, 320);
        return () => window.clearTimeout(t);
    }, [submitGeneration]);

    const handleAnalyzeQuote = async () => {
        if (isLoading) return;
        setError("");
        if (!quote.trim()) {
            setError("Please enter a quote.");
            return;
        }

        setIsLoading(true);
        try {
            await submitQuote((data) => {
                if (data && typeof data.error === "string") {
                    setAnalysis(null);
                    setError(data.error || "Something went wrong.");
                    setSubmitGeneration((g) => g + 1);
                    return;
                }

                const r10 =
                    typeof data.rating === "number" && !Number.isNaN(data.rating)
                        ? data.rating
                        : NaN;

                if (Number.isNaN(r10)) {
                    setAnalysis(null);
                    setError("Invalid response: missing numeric rating.");
                    setSubmitGeneration((g) => g + 1);
                    return;
                }

                const rewrittenSuggestions = buildImprovedQuotes(
                    quote,
                    data.suggestions
                );

                setAnalysis({
                    rating: r10,
                    feedback:
                        typeof data.feedback === "string"
                            ? data.feedback
                            : "No feedback provided.",
                    suggestions: rewrittenSuggestions,
                });
                setError("");
                setSubmitGeneration((g) => g + 1);
            });
        } finally {
            setIsLoading(false);
        }
    };

    const visibleResults = Boolean(analysis) || Boolean(error);
    const ratingDisplay =
        analysis && typeof analysis.rating === "number"
            ? `${analysis.rating} / 10`
            : "—";

    return (
        <>
            {isLoading ? (
                <div className={classes.loaderOverlay} role="status" aria-live="polite">
                    <div className={classes.loaderBox}>
                        <img
                            src="/logo.png"
                            alt="Analyzing quote"
                            className={classes.loaderLogo}
                        />
                        <Typography className={classes.loaderText}>
                            Analyzing your quote...
                        </Typography>
                    </div>
                </div>
            ) : null}

            <Container
                component="main"
                className={classes.main}
                maxWidth="md"
                disableGutters
            >
                <Typography variant="h2" component="h1" className={classes.headline}>
                    Enter Your Quote :
                </Typography>

                <Typography className={classes.sectionLabel}>
                    Write your line
                </Typography>

                <form
                    noValidate
                    autoComplete="off"
                    onSubmit={(e) => e.preventDefault()}
                    className={classes.formStack}
                >
                    <TextField
                        className={classes.textarea}
                        id="quoteInput"
                        name="quote"
                        placeholder="Type or paste your quote here..."
                        value={quote}
                        onChange={(ev) => {
                            setQuote(ev.target.value);
                            if (error) setError("");
                        }}
                        multiline
                        rows={7}
                        fullWidth
                        variant="outlined"
                        aria-label="Quote text"
                        error={Boolean(error)}
                        helperText={error ? error : undefined}
                    />
                    <Box className={classes.actionsRow}>
                        <Button
                            type="button"
                            className={classes.submitButton}
                            disableElevation
                            disabled={isLoading}
                            onClick={() => {
                                void handleAnalyzeQuote();
                            }}
                        >
                            {isLoading ? "Analyzing..." : "Submit"}
                        </Button>
                    </Box>
                </form>

                <div ref={resultsAnchorRef} className={classes.resultsAnchor}>
                    <Collapse
                        key={submitGeneration}
                        in={visibleResults}
                        timeout="auto"
                        collapsedHeight={0}
                    >
                        <div className={classes.resultsInner}>
                            {error ? (
                                <Paper elevation={0} className={classes.errorPaper}>
                                    <Typography component="p">{error}</Typography>
                                </Paper>
                            ) : null}

                            {analysis ? (
                                <>
                                    <Paper elevation={0} className={classes.ratingPaper}>
                                        <Typography
                                            className={classes.ratingLabel}
                                            component="p"
                                        >
                                            Your rating
                                        </Typography>
                                        <Typography
                                            className={classes.ratingValue}
                                            variant="h4"
                                            component="p"
                                            aria-live="polite"
                                        >
                                            {ratingDisplay}
                                        </Typography>
                                        <Typography
                                            className={classes.feedbackText}
                                            color="textSecondary"
                                            component="p"
                                        >
                                            {analysis.feedback}
                                        </Typography>
                                    </Paper>

                                    <Paper
                                        elevation={0}
                                        className={classes.suggestionsPaper}
                                    >
                                        <Typography
                                            className={classes.suggestionsTitle}
                                            component="h2"
                                        >
                                            Five rewritten versions
                                        </Typography>
                                        <div className={classes.suggestionsGrid}>
                                            {analysis.suggestions.map((item, index) => (
                                                <div
                                                    key={`${item}-${index}`}
                                                    className={classes.suggestionCard}
                                                >
                                                    <span className={classes.suggestionIndex}>
                                                        {index + 1}.
                                                    </span>
                                                    <p className={classes.suggestionText}>
                                                        {item}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </Paper>
                                </>
                            ) : null}
                        </div>
                    </Collapse>
                </div>
            </Container>
        </>
    );
};
