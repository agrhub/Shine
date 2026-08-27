# Web Novel to Micro-Drama Adaptation

Convert the following web novel excerpt/synopsis into a {{count}}-episode vertical micro-drama series structure.
- Novel Title: {{title}}
- Novel Text: {{novelText}}

Respond in strict JSON:
{
  "title": "{{title}}",
  "genre": "Urban Romance / Revenge",
  "total_episodes": {{count}},
  "episodes": [
    {
      "episode_number": 1,
      "title": "Ep 1: The Return",
      "hook": "Opening 3s hook description",
      "cliffhanger": "Ending 45s cliffhanger reveal"
    }
  ]
}
