Generate the complete high-level Master Story Plan Core for a {{totalEpisodes}}-episode vertical micro-drama series.
Target Country: {{country}} ({{languageName}} - {{languageNativeName}}).

LANGUAGE SPECIFICATION (MANDATORY):
{{languageInstruction}}
- The story must resonate culturally with audiences in {{country}}.
- All titles, loglines, synopses, character descriptions, settings, and narrative hooks MUST BE IN {{languageName}} ({{languageNativeName}}).

Project Parameters:
- Series Title: {{title}}
- Genre: {{genre}}
- Visual Art Style: {{visualStyle}} ({{visualStylePrompt}})
- Synopsis: {{synopsis}}
- Target Country: {{country}}
- Primary Language: {{languageName}} ({{languageCode}})
- Aspect Ratio: {{ratio}}
- Total Episodes: {{totalEpisodes}}
- Duration per Episode: {{durationDisplay}} ({{totalDurationSeconds}} seconds)
- Viral Topic: {{viralTopic}}

Setting Context Directives:
- era: Specific time period in target language (e.g. "Modern 2026", "1990s retro", "Near future")
- location: Specific geographic and architectural setting in {{country}}
- culturalAtmosphere: Local social context, cultural habits, and ambient visual mood of {{country}}.

Characters Directives:
- Assign authentic character personas for {{country}} matching the Core Triangle hierarchy.
- For each character, assign gender ("female", "male", "neutral") and a voiceId from the catalog below:
{{voiceCatalog}}

Locations Directives:
- Generate all recurring environment settings in episodes (Studio, Corporate HQ, Downtown Street, etc.) with detailed physical characteristics, layout, materials, lighting atmosphere, and timeOfDay.

Props Directives:
- Generate all key story-driving physical objects are visibled in episodes (encrypted drive, smartphone, dossier, etc.) with detailed physical characteristics, textures, and materials.

Episode Directives:
{{episodeScopeInstruction}}

Execute this task strictly adhering to the dramaturgical rules, pacing formulas, and required JSON Output Schema defined in your System Skill.
