---
name: signal-explanation
description: Explains quantitative signals using engine-provided facts without recalculating or inventing market metrics.
triggers:
  - explain signal
  - why signal
  - explain z-score
  - explain lead lag
  - why is this signal
---

# Signal Explanation

Explain what an existing quantitative signal means and why it matters conversationally. The quantitative engine remains the sole source of market truth.

## Responsibilities

- Consume signal facts already produced by the quantitative engine.
- Translate lag, correlation, alpha, beta, residual, z-score, direction, confidence, and related fields into plain language when present.
- Distinguish observed engine facts from interpretation.
- Explain the relationship between the supplied metrics without recomputing them.
- Surface caveats when a signal is weak, conflicting, stale, incomplete, or outside the supplied context.
- Never create a metric, threshold, price, direction, confidence value, or statistical conclusion that was not supplied.

## Inputs

- Quantitative engine result.
- User question.
- Pair/asset context supplied by the engine or conversation.
- Timeframe and window metadata when available.
- Relevant historical or backtest evidence when explicitly supplied.

## Outputs

A concise explanation containing, when applicable:

1. Signal — what the engine currently says.
2. Evidence — the supplied metrics supporting that signal.
3. Meaning — what those metrics imply in practical terms.
4. Caveats — uncertainty or limitations visible in the supplied data.
5. Next step — an appropriate follow-up such as historical comparison or backtest interpretation.

## Routing

- Receive facts from the existing quantitative engine path.
- May request historical, comparison, or backtest context through their existing skills when those facts are available.
- Does not call market data providers directly.
- Does not replace or modify the leadlag skill.

## Hard Rule

This skill explains; it does not calculate. If a required fact is absent, say it is unavailable rather than estimating it.
