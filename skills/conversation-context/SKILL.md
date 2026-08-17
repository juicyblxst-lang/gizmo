---
name: conversation-context
description: Maintains task-relevant conversational state so Gizmo can handle follow-up research requests without confusing prior snapshots with current engine truth.
triggers:
  - follow up
  - continue
  - what about
  - same pair
  - same signal
---

# Conversation Context

Maintain the minimum state needed to interpret follow-up questions while keeping quantitative truth in the engine.

## Responsibilities

Track, when explicitly established:

- active asset or pair
- timeframe and analysis window
- current research question
- latest engine result reference
- previous snapshot reference, separately from the current result
- requested comparison target
- historical/backtest scope
- unresolved clarification

Resolve references such as "that signal", "the other pair", or "same timeframe" only when the conversation context makes them unambiguous.

## Temporal State

Keep two distinct states.

### Current Engine State
The latest quantitative-engine result relevant to the active request. This is the authoritative market state.

### Previous Snapshot
The most recent earlier result established in conversation. It is useful for detecting change but is never authoritative for current market truth.

When a new engine result arrives:

1. Preserve the old current result as `previous_snapshot`.
2. Store the new result as `current_engine_state`.
3. Preserve timestamps, timeframes, and windows when supplied.
4. Never treat an undated previous summary as current truth.

A follow-up asking for "current", "now", or "right now" requires current engine state when current market truth is necessary.

## No-Change Compression

When current and previous snapshots are materially equivalent on fields relevant to the user's question, expose that continuity as `no_material_change: true` so response synthesis can summarize continuity instead of repeating the entire analysis.

When there is a material difference, expose only the relevant changed fields plus their provenance.

## Inputs

- Current user message.
- Prior conversational state.
- Prior skill outputs.
- Current engine context.

## Outputs

- Normalized task context for routing and skills.
- Updated conversational state.
- Explicit current/previous temporal distinction.
- `no_material_change` when comparison is supported.
- Clarification when a reference is genuinely ambiguous.

## Communication

- Feeds intent-routing and all research interpretation skills.
- Receives state updates from completed interactions.
- Supplies current/previous context to research-brief and response-synthesis.
- Does not own market facts and does not calculate metrics.

## Hard Rule

Conversation context can remember what was discussed; it cannot become a substitute for a fresh quantitative-engine result when the user asks for current market truth.
