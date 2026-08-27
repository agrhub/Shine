Generate the complete high-level Master Story Plan Core for a {{totalEpisodes}}-episode vertical micro-drama series.

=== CRITICAL DISTINCTION: SETTING/COUNTRY VS. SCRIPT OUTPUT LANGUAGE ===
1. Story Setting & Character Cultural Heritage (Country: {{country}}):
   - The story world, physical locations, social backdrop, cultural habits, and CHARACTER NAMES must authentically represent {{country}}.
   - Examples:
     * If Country is "China": Character names must be authentic Chinese names (e.g. Lu Chen, Gu Tingxiao, Lin Yue, Jiang Nan), locations in Chinese cities/landmarks (Shanghai, Beijing, ancient courtyards), and tropes reflecting Chinese micro-drama conventions (urban CEO, family inheritance, revenge).
     * If Country is "Vietnam": Character names must be Vietnamese (e.g. Minh Triet, Hoang My, Bao Nam), locations in Hanoi/Saigon/Da Nang.
     * If Country is "United States": Character names must be Western (e.g. Alex Vance, Evelyn Cross), locations in New York/LA/Chicago.
2. Script Output Language (Language: {{languageName}} - {{languageNativeName}}):
   - Regardless of the country setting, the ENTIRE script (titles, loglines, synopses, character descriptions, scene settings, and narrative hooks) MUST BE WRITTEN IN {{languageName}} ({{languageNativeName}}).
   - Example: A China-setting drama with Chinese characters (Lu Chen, Lin Yue) written completely in English for global streaming.

LANGUAGE INSTRUCTION:
{{languageInstruction}}

Project Parameters:
- Series Title: {{title}}
- Genre: {{genre}}
- Visual Art Style: {{visualStyle}} ({{visualStylePrompt}})
- Synopsis: {{synopsis}}
- Cultural Setting & Character Heritage: {{country}}
- Output Script Language: {{languageName}} ({{languageCode}})
- Aspect Ratio: {{ratio}}
- Total Episodes: {{totalEpisodes}}
- Duration per Episode: {{durationDisplay}} ({{totalDurationSeconds}} seconds)
- Viral Topic: {{viralTopic}}

Setting Context Directives:
- era: Specific time period in script language (e.g. "Modern 2026", "1990s retro", "Ancient period")
- location: Specific geographic and architectural setting in {{country}}
- culturalAtmosphere: Local social context, cultural habits, and ambient visual mood of {{country}}.

Characters Directives:
- Generate a comprehensive and rich ensemble cast of characters (Protagonist, Antagonists, Allies, Love Interests, Rivals, Catalysts, Family, and Informants) as required by the series narrative.
- Assign authentic character names and personas belonging culturally to {{country}} (e.g., Chinese names for China setting, Vietnamese names for Vietnam setting, Western names for US setting).
- For each character, assign role ("protagonist" | "antagonist" | "catalyst" | "supporter" | "love_interest" | "rival"), gender ("female", "male", "neutral"), and an appropriate voiceId from the catalog below:
{{voiceCatalog}}

Locations Directives:
- Generate all recurring environment settings in episodes (Studio, Corporate HQ, Downtown Street, etc.) with detailed physical characteristics, layout, materials, lighting atmosphere, and timeOfDay.

Props Directives:
- Generate all key story-driving physical objects are visibled in episodes (encrypted drive, smartphone, dossier, etc.) with detailed physical characteristics, textures, and materials.

Episode Directives:
- MANDATORY EPISODE 1 STRUCTURE (Prologue & World/Character Exposition):
  * Episode 1 MUST NOT start abruptly in the middle of a random action. It MUST establish the narrative universe in 4 clear beats:
    1. World & Social Backdrop: Establishing the society, clan hierarchy, or grand premise with narrator voiceover.
    2. Protagonist Introduction: Introducing the protagonist, their identity, and their defining past trauma or loss.
    3. Antagonist Showcase: Revealing the opposing faction or primary villain and the core oppression/conflict.
    4. Inciting Incident: The decisive spark/betrayal that forces the protagonist to initiate their campaign/journey.
  * Subsequent episodes (Ep 2+) dive into high-stakes execution, escalation, and tactical battles.
{{episodeScopeInstruction}}

Execute this task strictly adhering to the dramaturgical rules, pacing formulas, and required JSON Output Schema defined in your System Skill.
