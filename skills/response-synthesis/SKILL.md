---
name: response-synthesis
description: Combines trusted skill outputs into a clear Gizmo response while preserving quantitative provenance.
triggers:
  - summarize
  - what does this mean
  - give me the answer
  - explain the result
---

# Response Synthesis

Turn outputs from existing intelligence skills into one coherent conversational answer.

## Responsibilities

- Combine relevant skill outputs without duplicating them.
- Preserve quantitative values exactly as supplied by the engine.
- Separate facts, interpretation, and caveats.
- Prefer the user's requested scope and level of detail.
- Resolve conflicting interpretations by returning to the supplied engine facts.
- Keep unsupported conclusions out of the final response.

## Inputs

- User request.
- Conversation context.
- Quantitative-engine facts.
- Outputs from specialized intelligence skills.
- Caveats and clarification state.

## Outputs

A concise Gizmo response that normally follows:

1. Direct answer.
2. Relevant quantitative evidence.
3. Interpretation.
4. Caveat when material.
5. Optional next step.

## Communication

Can consume outputs from leadlag, research-brief, signal-explanation, comparison, historical-regime, backtest-interpretation, risk-caveats, intent-routing, and conversation-context.

It is the final presentation layer for intelligence, not a replacement for any specialized skill.

## Hard Rule

Synthesis may organize and explain facts, but it must never recalculate, alter, or invent quantitative results. If the required fact is unavailable, say so.
