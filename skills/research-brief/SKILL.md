---
name: research-brief
description: Evidence-first conversational market briefing skill. Synthesizes verified quantitative engine outputs into concise research briefs without calculating or inventing market facts.
triggers:
  - briefing
  - brief
  - rundown
  - what matters
  - market overview
  - summarize the setup
  - give me the rundown
---

# Research Brief

This skill gives Gizmo a concise, evidence-first briefing from the quantitative lead-lag engine and the existing intelligence context.

It is a conversational intelligence layer. It does **not** become a second market-data or analytics engine.

## Core Rule

The quantitative engine is the single source of market truth.

This skill may:

- request or consume existing quantitative outputs;
- organize verified facts into a useful narrative;
- compare already-computed metrics;
- identify which supplied findings matter most to the user's question;
- explain implications that follow directly from supplied evidence;
- surface uncertainty, missing context, and conflicting supplied signals;
- ask a clarification question when the request is underspecified.

This skill must never:

- fetch market data independently when the quantitative engine already owns that responsibility;
- recalculate correlation, regression, alpha, beta, residuals, z-scores, lead/lag, rolling statistics, signals, or backtests;
- invent prices, signals, confidence, timestamps, historical outcomes, or causal explanations;
- silently fill missing quantitative fields with guesses;
- override a quantitative-engine result with model intuition.

## Inputs

Accept the smallest available set of existing context:

1. User request
2. Active asset/pair and timeframe, if known
3. Quantitative-engine results already available in the conversation/context
4. Relevant existing intelligence outputs, if present
5. Conversation context needed to interpret references such as "this setup" or "that signal"

If a required scope is missing, clarify before producing a supposedly current or specific brief.

## Output Contract

Return a compact research brief with this structure when the evidence supports it:

### Snapshot
One or two sentences stating the verified current setup.

### Evidence
Only the quantitative facts actually supplied by the engine. Prefer the metrics most relevant to the user's request.

### Interpretation
Explain what those supplied facts mean in plain language. Distinguish interpretation from measured facts.

### What Matters
Prioritize the strongest or most decision-relevant observations already supported by the evidence.

### Caveats
State missing inputs, weak/ambiguous evidence, conflicting signals, or limitations when they materially affect interpretation.

### Next Step
Offer the most useful existing analysis, comparison, history, monitoring, or clarification path rather than inventing a new analytical method.

The headings may be compressed or omitted for a short request, but the separation between **fact** and **interpretation** must remain clear.

## Communication Pattern

User request → existing context resolution → quantitative engine result(s) when required → evidence selection → interpretation → brief response.

The research-brief skill consumes engine results; it does not replace or modify the engine.

When another existing intelligence skill has already produced a relevant result, reuse that result rather than requesting duplicate analysis.

When the user asks for a comparison, historical context, signal explanation, monitoring, or another specialized task, route to the existing specialized capability and use its verified output as evidence for the brief.

## Clarification Rules

Ask a clarification question only when the ambiguity would materially change the requested analysis, for example:

- the user names multiple assets but does not identify which relationship to brief;
- timeframe is required but absent;
- "current" is requested but no current engine result is available;
- a reference such as "that signal" cannot be resolved from conversation context.

Do not ask for information that is already present in context.

## Safety / Truthfulness

Use explicit provenance internally:

- `engine_fact` = directly supplied by the quantitative engine;
- `context_fact` = supplied by existing conversation/intelligence context;
- `interpretation` = explanation derived from supplied facts;
- `unknown` = not established.

Never present an `interpretation` or `unknown` as an `engine_fact`.

## Examples

User: "Give me the rundown on BTC/SOL."

Behavior:

1. Resolve BTC/SOL and the relevant current context.
2. Use the existing quantitative result for the pair.
3. Select the lead/lag, correlation, regression/residual, z-score, signal, and quality fields only if they are actually supplied and relevant.
4. Explain what those results mean without recomputing them.
5. State important caveats.
6. Suggest the next existing analysis if useful.

User: "What matters right now?"

Behavior:

1. Resolve the active pair/context from the conversation.
2. If current quantitative evidence exists, prioritize the strongest verified observations.
3. If current evidence does not exist, request it through the existing quantitative path rather than guessing.

## Integration Principle

This skill is intentionally thin. It is a response-layer wrapper around existing capabilities, not a replacement intelligence architecture.

Extend existing behavior. Reuse existing outputs. Explain instead of calculate. Validate instead of assume.
