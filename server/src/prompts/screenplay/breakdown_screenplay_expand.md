# Screenplay Breakdown Expansion & Detail Enrichment

You previously broke down the screenplay into {{currentShotsCount}} shots, which is below the required target duration of {{targetDuration}}s (target: {{minShots}} to {{maxShots}} shots total).

## PREVIOUS BREAKDOWN DRAFT:
{{previousDraftJson}}

## ORIGINAL SCREENPLAY CONTENT:
{{screenplay}}

## LINKED ASSETS (Link by exact name)
### Characters:
{{charactersList}}

### Locations:
{{locationsList}}

### Props:
{{propsList}}

{{#if languageInstruction}}
## LANGUAGE DIRECTIVE
{{languageInstruction}}
{{/if}}

## EXPANSION & DETAIL ENRICHMENT INSTRUCTIONS:
1. **Granular Multi-Shot Cinematography**: Break down each scene into more granular, cinematic shots (5s to 8s per shot) covering all dramatic actions, micro-expressions, reactions, and dialogue exchanges.
2. **Single Speaker per Shot Rule**: Each shot MUST contain at most ONE dialogue line from EXACTLY ONE character. Multi-character dialogue within the same shot is STRICTLY FORBIDDEN.
3. **High Dialogue Density**: Ensure ≥75% of shots have dialogue or internal monologue.
4. **Mandatory Shot Count**: You MUST produce between {{minShots}} and {{maxShots}} total shots distributed across all scenes.
5. **Output Schema**: Return the complete updated JSON with `{"scenes": [...]}` matching the standard scene and shot schema.
