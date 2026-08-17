---
name: comparison
description: Compares engine-provided quantitative facts across assets, signals, periods, or conditions without recalculating market truth.
triggers:
  - compare
  - compare signals
  - relative strength
  - which is stronger
  - compare pairs
---

# Comparison

Produce structured comparisons from facts already supplied by the quantitative engine or other trusted Gizmo skills.

## Responsibilities

- Align supplied metrics and contexts for side-by-side comparison.
- Identify meaningful differences, similarities, and conflicts.
- Preserve the original timeframe, window, methodology, and asset context.
- Explain what the differences mean without creating new quantitative facts.
- State when a comparison is invalid because the inputs are not comparable.

## Inputs

- Two or more engine-provided result sets.
- Asset/pair identifiers.
- Timeframe/window metadata.
- User's comparison question.
- Historical or backtest outputs when supplied.

## Outputs

- Comparison target and scope.
- Facts side by side.
- Interpretation of the supplied differences.
- Caveats about differing windows, samples, or unavailable fields.
- Clear conclusion limited to the evidence supplied.

## Communication

- Receive quantitative facts through existing engine/intelligence interfaces.
- May consume signal-explanation, historical, or backtest interpretation outputs.
- Never fetch market data directly.
- Never recompute correlation, regression, alpha, beta, residuals, z-scores, or signals.

## Hard Rule

Comparison is an interpretation layer. It may select, organize, and explain engine facts, but it must not manufacture missing values or perform an alternative market calculation.
