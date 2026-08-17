---
name: intent-routing
description: Classifies user intent and routes requests to the existing Gizmo intelligence capabilities without hardcoded endpoint behavior.
triggers:
  - analyze
  - signal
  - compare
  - history
  - backtest
  - explain
  - research
---

# Intent Routing

Determine which existing intelligence capability should handle a user request and preserve relevant context across turns.

## Responsibilities

- Identify the user's requested task, assets, timeframe, and desired depth when stated.
- Route to one or more existing skills based on intent.
- Detect when a request requires clarification before a quantitative call can be meaningful.
- Preserve explicit user constraints and avoid silently changing scope.
- Allow multiple skills to contribute when a question genuinely spans signal, history, comparison, or backtest context.

## Inputs

- User message.
- Conversation context.
- Existing engine context when available.
- Known skill capabilities.

## Outputs

- Selected skill or skill sequence.
- Structured task context.
- Clarification request when required information is missing.
- Routing rationale internally; concise user-facing behavior externally.

## Communication

Possible destinations include leadlag, signal-explanation, comparison, historical-regime, backtest-interpretation, risk-caveats, research-brief, and final response synthesis.

## Hard Rule

Route; do not hardcode a replacement implementation. This skill must not call or recreate quantitative calculations merely to satisfy an intent.
