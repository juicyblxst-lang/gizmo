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

## Temporal Consistency

Treat time explicitly.

- `current_engine_state` = the latest quantitative result obtained for the request.
- `previous_snapshot` = a result or observation previously established in conversation/context.
- Never present `previous_snapshot` as if it were current.
- When both exist, compare them only on fields that are actually present in both snapshots and only when their timestamps/windows are compatible.
- If the current engine state is unavailable, say that current state is unavailable rather than promoting an old snapshot.
- If a previous snapshot is materially different from the current engine state, lead with the change and explain the supplied evidence for that change.
- If there is no material change, summarize the continuity rather than reproducing the entire previous analysis.

Preferred temporal language is explicit: **Current**, **Previously**, **No material change**, or **Changed since the previous snapshot**.

## Inputs

Accept the smallest available set of existing context:

1. User request
2. Active asset/pair and timeframe, if known
3. Current quantitative-engine results when required
4. Previous snapshot, if present
5. Relevant existing intelligence outputs, if present
6. Conversation context needed to interpret references such as "this setup" or "that signal"

If a required scope is missing, clarify before producing a supposedly current or specific brief.

## Output Contract

Return a compact research brief with this structure when the evidence supports it:

### Snapshot
One or two sentences stating the verified current setup.

### Change
Only when a previous snapshot exists: state what changed, or say **No material change**. Do not repeat unchanged metrics merely to fill space.

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

The headings may be compressed or omitted for a short request, but the separation between **fact**, **time**, and **interpretation** must remain clear.

## Concision / No-Change Rule

Do not repeat a complete prior analysis when the current engine state confirms continuity.

Use a compact continuity statement such as:

> **No material change.** The current engine state remains consistent with the previous snapshot.

Then include only the changed or decision-relevant evidence.

If there is a material change, summarize the delta first and provide supporting metrics second.

## Communication Pattern

User request → existing context resolution → current quantitative engine result(s) when required → temporal comparison with previous snapshot when available → evidence selection → interpretation → brief response.

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
- `previous_snapshot` = historical conversational state, not current truth;
- `interpretation` = explanation derived from supplied facts;
- `unknown` = not established.

Never present an `interpretation`, `previous_snapshot`, or `unknown` as an `engine_fact`.

## Visualization Guidance

A visualization is useful only when it answers the user's analytical question better than text alone.

Appropriate examples include:

- "What is BTC doing?"
- "Compare BTC and SOL."
- "Show me the lead-lag relationship."
- "Is BTC leading SOL?"

Do not request or render a market chart for general chit-chat, greetings, help requests, or questions where the chart would add no analytical value.

When a visualization is appropriate, use existing engine-provided series and metrics. Do not create a new calculation path merely to populate a chart.

## Examples

User: "Give me the rundown on BTC/SOL."

Behavior:

1. Resolve BTC/SOL and the relevant current context.
2. Use the existing quantitative result for the pair.
3. Select the lead/lag, correlation, regression/residual, z-score, signal, and quality fields only if they are actually supplied and relevant.
4. If a previous snapshot exists, identify the meaningful delta or state that there is no material change.
5. Explain what those results mean without recomputing them.
6. State important caveats.
7. Suggest the next existing analysis if useful.

User: "What matters right now?"

Behavior:

1. Resolve the active pair/context from the conversation.
2. If current quantitative evidence exists, prioritize the strongest verified observations.
3. If current evidence does not exist, request it through the existing quantitative path rather than guessing.

## Integration Principle

This skill is intentionally thin. It is a response-layer wrapper around existing capabilities, not a replacement intelligence architecture.

Extend existing behavior. Reuse existing outputs. Explain instead of calculate. Validate instead of assume. Keep previous state separate from current truth.
