# Character Facial Consistency Landmarks

Analyze facial consistency landmarks for character "{{charName}}" with visual traits: "{{charTraits}}".
Extract 8 spatial key landmarks for LoRA face-lock in short drama video generation:
1. front
2. quarter_left
3. quarter_right
4. profile_left
5. profile_right
6. low_angle
7. high_angle
8. dramatic_close_up

Respond in strict JSON:
[
  { "id": "anc-1", "name": "Frontal Primary View", "landmark_type": "front", "match_score": 99.2, "status": "locked" },
  { "id": "anc-2", "name": "45-Degree Side Profile", "landmark_type": "quarter_left", "match_score": 98.4, "status": "locked" },
  { "id": "anc-3", "name": "Right 45 Angle", "landmark_type": "quarter_right", "match_score": 98.1, "status": "locked" },
  { "id": "anc-4", "name": "Profile Left", "landmark_type": "profile_left", "match_score": 97.5, "status": "locked" },
  { "id": "anc-5", "name": "Profile Right", "landmark_type": "profile_right", "match_score": 97.3, "status": "locked" },
  { "id": "anc-6", "name": "Low Dramatic", "landmark_type": "low_angle", "match_score": 96.8, "status": "locked" },
  { "id": "anc-7", "name": "High Tense", "landmark_type": "high_angle", "match_score": 96.4, "status": "locked" },
  { "id": "anc-8", "name": "Cinematic Dramatic Close-up", "landmark_type": "dramatic_close_up", "match_score": 98.9, "status": "locked" }
]
