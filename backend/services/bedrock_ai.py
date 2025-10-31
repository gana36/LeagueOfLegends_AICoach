import boto3
import json
from typing import Dict, List, Optional


class BedrockAIService:
    """Service for interacting with Amazon Bedrock AI models"""

    def __init__(self, region_name: str = "us-east-1"):
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=region_name
        )
        # Using Claude 3 Sonnet as default model
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

    async def invoke_model(
        self,
        prompt: str,
        max_tokens: int = 2048,
        temperature: float = 0.7
    ) -> str:
        """Invoke Bedrock model with a prompt"""

        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })

        try:
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=body
            )

            response_body = json.loads(response['body'].read())
            return response_body['content'][0]['text']

        except Exception as e:
            print(f"Error invoking Bedrock model: {e}")
            raise

    async def generate_year_recap_narrative(
        self,
        player_stats: Dict,
        match_data: List[Dict]
    ) -> str:
        """Generate a personalized year-end recap narrative"""

        prompt = f"""You are a creative League of Legends analyst creating a personalized year-end recap.

Player Statistics:
- Games Played: {player_stats.get('games_played', 0)}
- Win Rate: {player_stats.get('win_rate', 0):.1f}%
- Most Played Champions: {', '.join(player_stats.get('top_champions', [])[:3])}
- Average KDA: {player_stats.get('avg_kda', 0):.2f}
- Total Kills: {player_stats.get('total_kills', 0)}
- Total Deaths: {player_stats.get('total_deaths', 0)}
- Total Assists: {player_stats.get('total_assists', 0)}

Create an engaging, personalized year-end recap in 3-4 paragraphs that:
1. Celebrates their achievements and highlights
2. Tells their League of Legends story from this year
3. Uses creative metaphors and gaming references
4. Is fun, shareable, and makes them feel good about their journey
5. Includes specific stats naturally in the narrative

Make it personal, engaging, and worthy of sharing on social media!"""

        return await self.invoke_model(prompt, max_tokens=1024, temperature=0.8)

    async def analyze_playstyle(
        self,
        player_stats: Dict,
        champion_stats: List[Dict]
    ) -> str:
        """Analyze and describe player's playstyle"""

        prompt = f"""As a League of Legends expert analyst, analyze this player's playstyle:

Overall Stats:
- Win Rate: {player_stats.get('win_rate', 0):.1f}%
- Average KDA: {player_stats.get('avg_kda', 0):.2f}
- Average Kills: {player_stats.get('avg_kills', 0):.1f}
- Average Deaths: {player_stats.get('avg_deaths', 0):.1f}
- Average Assists: {player_stats.get('avg_assists', 0):.1f}
- Damage per minute: {player_stats.get('damage_per_min', 0):.0f}
- Gold per minute: {player_stats.get('gold_per_min', 0):.0f}

Top Champions:
{json.dumps(champion_stats[:5], indent=2)}

Provide a concise playstyle analysis covering:
1. Are they aggressive or passive?
2. Do they prefer carry or support roles?
3. What's their teamfight style?
4. Key patterns in their champion pool
5. One unique characteristic of their playstyle

Keep it under 200 words and actionable."""

        return await self.invoke_model(prompt, max_tokens=512, temperature=0.6)

    async def identify_strengths_weaknesses(
        self,
        player_stats: Dict,
        performance_trends: Dict
    ) -> Dict[str, List[str]]:
        """Identify player strengths and areas for improvement"""

        prompt = f"""As a League of Legends coach, analyze this player's performance data:

Statistics:
{json.dumps(player_stats, indent=2)}

Performance Trends:
{json.dumps(performance_trends, indent=2)}

Identify:
1. Top 3 strengths (things they do well consistently)
2. Top 3 areas for improvement (specific, actionable weaknesses)

Format as JSON:
{{
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"]
}}

Be specific and actionable. Focus on patterns, not one-off games."""

        response = await self.invoke_model(prompt, max_tokens=512, temperature=0.5)

        try:
            # Extract JSON from response
            start_idx = response.find('{')
            end_idx = response.rfind('}') + 1
            json_str = response[start_idx:end_idx]
            return json.loads(json_str)
        except:
            # Fallback if JSON parsing fails
            return {
                "strengths": ["Consistent gameplay", "Good champion pool", "Team-focused"],
                "weaknesses": ["Vision control", "CS optimization", "Late game decisions"]
            }

    async def generate_improvement_tips(
        self,
        weaknesses: List[str],
        player_stats: Dict
    ) -> List[str]:
        """Generate specific improvement tips based on weaknesses"""

        prompt = f"""As a League of Legends coach, provide specific improvement tips for these weaknesses:

Weaknesses:
{', '.join(weaknesses)}

Player Context:
- Win Rate: {player_stats.get('win_rate', 0):.1f}%
- Main Role: {player_stats.get('main_role', 'Unknown')}
- Average KDA: {player_stats.get('avg_kda', 0):.2f}

Provide 3-5 concrete, actionable tips that this player can implement immediately.
Format as a JSON array of strings: ["tip 1", "tip 2", "tip 3"]"""

        response = await self.invoke_model(prompt, max_tokens=512, temperature=0.6)

        try:
            start_idx = response.find('[')
            end_idx = response.rfind(']') + 1
            json_str = response[start_idx:end_idx]
            return json.loads(json_str)
        except:
            return [
                "Focus on improving map awareness",
                "Practice CS drills in practice tool",
                "Watch replays to identify mistakes"
            ]
