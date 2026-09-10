# Gizmo

Gizmo is an evidence-first crypto market-intelligence system built around lead/lag analysis and a conversational intelligence layer. It is designed to explain market relationships from quantitative engine outputs without inventing missing market facts.

## What it does

- Analyzes BTC/SOL lead-lag relationships using OKX market data.
- Converts price observations into log returns.
- Searches 1–24 hour lags using Pearson correlation.
- Fits a linear regression relationship and derives residuals.
- Calculates a rolling residual z-score and exposes a threshold-based signal state.
- Routes user requests across existing intelligence capabilities such as lead/lag, comparison, historical context, backtest interpretation, research briefs, and risk caveats.
- Keeps the quantitative engine as the source of market truth while the conversational layer explains supplied results.

## Lead/lag workflow

The current lead/lag skill fetches 168 hourly observations for BTC-USDT-SWAP and SOL-USDT-SWAP from OKX, calculates log returns, evaluates lags from 1 to 24 hours, fits `SOL = α + β × BTC`, and derives residual/z-score information. The implementation is exposed as a reusable OpenClaw skill.

## Evidence-first design

Gizmo intentionally separates calculation from interpretation.

The intelligence layer is not allowed to invent prices, timestamps, signals, confidence, historical outcomes, or quantitative metrics. Research and backtest skills consume results from the existing quantitative engine rather than silently recomputing market truth. When current engine evidence is unavailable, the system should say so rather than promote an old snapshot as current.

Backtests are treated as evidence about the tested sample, not guarantees of future performance. Risk/caveat handling explicitly surfaces missing inputs, weak evidence, conflicting signals, and methodological limitations.

## Current project structure

- `skills/leadlag` — BTC/SOL quantitative lead-lag implementation.
- `skills/research-brief` — evidence-first conversational market brief.
- `skills/intent-routing` — routes user intent to existing capabilities.
- `skills/comparison` — compares engine-provided quantitative facts without creating new market calculations.
- `skills/backtest-interpretation` — explains supplied backtest results and limitations.
- `skills/risk-caveats` — calibrates uncertainty and evidence quality.
- `ui/` and `web-ui/` — Node/Express-based UI components using Axios, Socket.IO, and Chart.js.

## Important scope

Gizmo is a market-intelligence and research system, not a claim of guaranteed trading profitability. A signal or historical relationship is evidence to investigate, not proof of future performance.

## Development

The repository contains an OpenClaw workspace and reusable skills. The public README intentionally describes only behavior that is represented in the current repository rather than claiming capabilities that are not documented or verified here.
