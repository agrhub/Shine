# Micro-Drama Subtitle & Kinetic Caption Timing

Break down the following dialogue into timed micro-drama caption cues with word-level breakdown:
- Language: {{language}}
- Dialogue: "{{dialogue}}"

Respond in strict JSON (words timestamps must be relative in milliseconds from 0 to cue duration):
[
  {
    "id": "cue_1",
    "text": "Where are you, Kael?",
    "from_us": 0,
    "to_us": 1800000,
    "words": [
      { "text": "Where", "from": 0, "to": 400, "is_key_word": false },
      { "text": "are", "from": 400, "to": 700, "is_key_word": false },
      { "text": "you,", "from": 700, "to": 1100, "is_key_word": false },
      { "text": "Kael?", "from": 1100, "to": 1800, "is_key_word": true }
    ]
  }
]
