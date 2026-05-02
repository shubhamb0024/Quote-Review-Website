import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
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
import { displayResult } from "../../utils/displayResult";

const useStyles = makeStyles((theme) => ({
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
        fontWeight: 600,
        marginBottom: theme.spacing(3),
        [theme.breakpoints.down("xs")]: {
            fontSize: "1.75rem",
        },
    },
    sectionLabel: {
        fontFamily: '"Roboto Mono", monospace',
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
        "& > *:not(:last-child)": {
            marginBottom: theme.spacing(0),
        },
    },
    textarea: {
        marginBottom: theme.spacing(2),
        "& .MuiOutlinedInput-root": {
            transition: "box-shadow 0.3s ease, border-color 0.3s ease",
            borderRadius: theme.spacing(1),
            "&:hover fieldset": {
                borderColor: theme.palette.primary.main,
            },
            "&.Mui-focused fieldset": {
                borderWidth: 2,
            },
            "& textarea": {
                lineHeight: 1.6,
                padding: theme.spacing(2),
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
    },
    resultsInner: {
        display: "flex",
        flexDirection: "column",
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
        fontFamily: '"Roboto Mono", monospace',
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        opacity: 0.9,
        marginBottom: theme.spacing(2),
        color: theme.palette.text.secondary,
    },
    ratingValue: {
        fontWeight: 700,
        fontFamily: '"Roboto Mono", monospace',
        fontVariantNumeric: "tabular-nums",
        margin: 0,
    },
    feedbackText: {
        fontFamily: '"Roboto Mono", monospace',
        fontSize: "0.9rem",
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
        fontFamily: '"Roboto Mono", monospace',
        fontWeight: 700,
        marginBottom: theme.spacing(3),
        fontSize: "1rem",
        lineHeight: 1.4,
    },
    suggestionList: {
        margin: 0,
        paddingLeft: theme.spacing(2.75),
        listStylePosition: "outside",
        fontFamily: '"Roboto Mono", monospace',
        fontSize: "0.9rem",
        lineHeight: 1.65,
        color: theme.palette.text.primary,
        "& li": {
            marginBottom: theme.spacing(2),
            paddingLeft: theme.spacing(1),
        },
        "& li:last-child": {
            marginBottom: 0,
        },
        "& li::marker": {
            color: theme.palette.secondary.main,
            fontWeight: 700,
        },
    },
}));

export const Content = () => {
    const classes = useStyles();
    const [quote, setQuote] = useState("");
    const [error, setError] = useState("");
    const [submitGeneration, setSubmitGeneration] = useState(0);
    /** Non-null after a successful API response (drives scroll). */
    const [ratingOutOfTen, setRatingOutOfTen] = useState(null);
    /** Open results panel after any submit that produced data for displayResult (including API errors). */
    const [resultsOpen, setResultsOpen] = useState(false);
    const lastResultRef = useRef(null);
    const resultsAnchorRef = useRef(null);

    /**
     * Re-apply DOM after React renders so #rating / #feedback / #suggestions are not wiped by reconciliation.
     */
    useLayoutEffect(() => {
        if (lastResultRef.current) {
            displayResult(lastResultRef.current);
        }
    });

    useEffect(() => {
        if (submitGeneration === 0 || ratingOutOfTen == null) return;
        const t = window.setTimeout(() => {
            resultsAnchorRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "nearest",
            });
        }, 320);
        return () => window.clearTimeout(t);
    }, [submitGeneration, ratingOutOfTen]);

    const displayResultAndTrack = (data) => {
        lastResultRef.current = data;
        displayResult(data);
    };

    const handleAnalyzeQuote = async () => {
        setError("");
        await submitQuote((data) => {
            if (data && typeof data.error === "string") {
                setError(data.error);
                setRatingOutOfTen(null);
                setResultsOpen(true);
                setSubmitGeneration((g) => g + 1);
                displayResultAndTrack(data);
                return;
            }
            const r10 =
                typeof data.rating === "number" && !Number.isNaN(data.rating)
                    ? data.rating
                    : NaN;
            if (Number.isNaN(r10)) {
                setError("Invalid response: missing numeric rating.");
                setRatingOutOfTen(null);
                setResultsOpen(false);
                displayResultAndTrack({
                    error: "Invalid response: missing numeric rating.",
                });
                return;
            }
            setError("");
            setRatingOutOfTen(r10);
            setResultsOpen(true);
            setSubmitGeneration((g) => g + 1);
            displayResultAndTrack(data);
        });
    };

    const visibleResults = resultsOpen;

    return (
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
                    placeholder="Type or paste your quote here…"
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
                        onClick={() => {
                            void handleAnalyzeQuote();
                        }}
                    >
                        Submit
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
                        <Paper elevation={0} className={classes.ratingPaper}>
                            <Typography
                                className={classes.ratingLabel}
                                component="p"
                            >
                                Your rating
                            </Typography>
                            <Typography
                                id="rating"
                                className={classes.ratingValue}
                                variant="h5"
                                component="p"
                                aria-live="polite"
                            />
                            <Typography
                                id="feedback"
                                className={classes.feedbackText}
                                color="textSecondary"
                                component="p"
                            />
                        </Paper>

                        <Paper elevation={0} className={classes.suggestionsPaper}>
                            <Typography
                                className={classes.suggestionsTitle}
                                component="h2"
                            >
                                Five ways to go deeper & more beautiful
                            </Typography>
                            <ul
                                id="suggestions"
                                className={classes.suggestionList}
                            />
                        </Paper>
                    </div>
                </Collapse>
            </div>
        </Container>
    );
};
