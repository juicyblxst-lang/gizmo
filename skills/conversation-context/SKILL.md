---
name: conversation-context
description: Maintains task-relevant conversational state for Gizmo follow-up requests.
triggers:
  - follow up
  - continue
  - what about
  - same pair
  - same signal
---

# Conversation Context

Maintain the minimum state needed to interpret follow-up questions without becoming a source of quantitative truth.

## Responsibilities

- Track the active asset or pair when established.
- Track timeframe and analysis window when established.
- Track the current research question.
- Track relevant prior engine result context.
- Track comparison, historical, or backtest scope when established.
- Resolve references such as "that signal" or "same timeframe" only when unambiguous.
- Ask for clarification when a reference is genuinely ambiguous.

## Inputs

- Current user message.
- Prior conversational state.
- Prior skill outputs.
- Current engine context.

## Outputs

- Normalized task context for routing and skills.
- Updated conversational state.
- Clarification when required.

## Communication

Feeds intent routing and interpretation skills. Receives state updates from completed interactions. It does not calculate metrics or own quantitative facts.

## Hard Rule

Context remembers what was discussed; it cannot substitute for a fresh quantitative-engine result when current market truth is requested.
