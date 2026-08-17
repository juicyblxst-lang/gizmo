---
name: historical-regime
description: Interprets historical signals, rolling statistics, and regime changes using quantitative-engine outputs.
triggers:
  - historical signal
  - history
  - regime
  - rolling stats
  - past signals
---

# Historical Regime

Explain historical behavior and regime context using outputs already calculated by the quantitative engine.

## Responsibilities

- Organize supplied historical signals and rolling statistics into a coherent timeline.
- Identify regime transitions only when supported by supplied observations.
- Explain persistence, reversals, clustering, or changes visible in the provided history.
- Connect current observations to supplied historical context without inventing missing periods.
- Distinguish descriptive historical evidence from forward-looking interpretation.

## Inputs

- Historical signal series.
- Rolling statistics.
- Current engine result when supplied.
- Timeframe/window metadata.
- User's historical or regime question.

## Outputs

- Historical snapshot.
- Observed regime characteristics.
- Changes or transitions supported by the supplied data.
- Current-versus-history context when both are available.
- Caveats about sample length, missing observations, and comparability.

## Communication

- Quantitative engine is the source of all numerical history.
- May feed comparison and signal-explanation skills.
- May receive backtest context but does not reinterpret unsupported metrics.
- Does not fetch or calculate market data itself.

## Hard Rule

Never infer a regime from unstated or absent data. If the engine has not supplied the historical observation required to answer, report that limitation.
