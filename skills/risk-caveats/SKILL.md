---
name: risk-caveats
description: Adds disciplined uncertainty, limitation, and evidence-quality checks around quantitative answers.
triggers:
  - risk
  - caveat
  - uncertainty
  - confidence
  - limitations
---

# Risk and Caveats

Protect the intelligence layer from overstating what the quantitative engine actually establishes.

## Responsibilities

- Check whether supplied evidence is complete enough for the requested conclusion.
- Surface data, timeframe, sample, methodology, or signal-quality caveats explicitly present in context.
- Separate engine confidence fields from conversational certainty.
- Detect conflicts between supplied facts and avoid forcing a conclusion.
- Keep language proportional to evidence.

## Inputs

- Quantitative outputs.
- Metadata and provenance.
- Historical/backtest context.
- User question and requested level of certainty.

## Outputs

- Evidence-quality assessment.
- Relevant caveats.
- Conflicts or missing inputs.
- Calibrated wording guidance for response generation.

## Communication

- Can wrap outputs from any quantitative-facing skill.
- Feeds research brief, signal explanation, comparison, and final synthesis.
- Never modifies engine facts.
- Never substitutes a guessed value for a missing value.

## Hard Rule

Uncertainty must be represented, not hidden. The skill may qualify an answer but may not manufacture a quantitative confidence score.
