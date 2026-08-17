---
name: backtest-interpretation
description: Explains quantitative backtest outputs and their limitations without recalculating performance metrics.
triggers:
  - backtest
  - backtest results
  - strategy performance
  - historical performance
---

# Backtest Interpretation

Translate backtest outputs from the quantitative engine into useful research conclusions without independently calculating performance.

## Responsibilities

- Explain supplied backtest metrics and what they represent.
- Distinguish in-sample evidence from out-of-sample or validation evidence when metadata provides that distinction.
- Surface supplied drawdown, hit rate, return, trade count, stability, and other performance facts.
- Identify limitations visible in the supplied methodology or metadata.
- Avoid turning historical performance into a guarantee.

## Inputs

- Quantitative-engine backtest result.
- Strategy/signal identifier.
- Test period and timeframe.
- Methodology and validation metadata when available.
- User's question.

## Outputs

- Result summary.
- Evidence from supplied metrics.
- Interpretation.
- Reliability/limitations discussion.
- Appropriate next research step.

## Communication

- Receives backtest facts from the existing quantitative engine.
- Can feed research-brief, comparison, and risk-caveat skills.
- Does not calculate returns, Sharpe, drawdown, hit rate, or any other performance statistic.
- Does not alter engine methodology.

## Hard Rule

A backtest is evidence about the tested sample, not proof of future performance. Never invent missing metrics or claim predictive certainty.
