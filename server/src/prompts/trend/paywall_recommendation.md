# Paywall & Monetization Recommendation

Analyze the episode performance metrics and retention drops to suggest optimal paywall placement:
- Series: {{seriesId}}
- Total Episodes: {{totalEpisodes}}
- Retention Data: {{retentionSummary}}

Return JSON array of paywall recommendations:
[
  {
    "episode_id": "ep-003",
    "episode_number": 3,
    "suggested_paywall_type": "coins",
    "confidence_score": 94,
    "predicted_retention_rate": 82.5,
    "reasoning": "Episode 3 features a high-stakes cliffhanger climax with 84% retention."
  }
]
