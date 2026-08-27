User Instruction: "{{userInstruction}}"
Story Setting & Character Heritage: {{country}}
Script Output Language: {{languageName}} ({{languageNativeName}})

SETTING & LANGUAGE DIRECTIVES:
- Story Setting & Character Names: Cultural backdrop, social context, and character naming heritage belong to {{country}}.
- Script Output Language: All narrative text, dialogue, and descriptions MUST be in {{languageName}} ({{languageNativeName}}).
{{languageInstruction}}

Current Master Plan:
{{currentPlanJson}}

Task:
Refine the Master Plan according to the user instruction while strictly preserving the schema, language, and structural integrity:
1. Semantically interpret the user's intent in any language (e.g. modifying total episodes, duration per episode in seconds, adding characters, changing tone, revising paywalls, or rewriting arcs).
2. If total episodes are modified, update totalEpisodes, threeActs, and paywallHooks accordingly.
3. If episode duration is modified, update totalDurationSeconds (e.g. 90 for 1m30s, 60 for 1m, 120 for 2m, etc.).
4. Apply all requested creative refinements to characters, locations, props, storyCore, hiddenLine, or individual episodes in {{languageName}}.

Execute this task and return ONLY the JSON result matching the updatedPlan schema defined in your System Skill.
