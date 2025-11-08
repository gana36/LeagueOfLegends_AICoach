"""
Strength and Weakness Analyzer
AI-powered performance analysis with contextual insights
"""
import logging
from typing import Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
from services.benchmarks import (
    get_rank_benchmarks,
    get_role_adjusted_benchmarks,
    calculate_percentile,
    get_percentile_label
)

logger = logging.getLogger(__name__)


class StrengthAnalyzer:
    """Analyzes player strengths and weaknesses with AI-powered insights"""

    def __init__(self):
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'
        )
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"

    def analyze_player_performance(
        self,
        puuid: str,
        rank: str = "GOLD",
        role: Optional[str] = None,
        analysis_type: str = "overall",
        time_range: Optional[int] = None
    ) -> Dict:
        """
        Perform comprehensive performance analysis

        Args:
            puuid: Player PUUID
            rank: Player's rank (IRON, BRONZE, SILVER, GOLD, etc.)
            role: Player's primary role (optional)
            analysis_type: "overall", "recent", "champion_specific", "role_specific"
            time_range: For recent analysis, number of matches

        Returns:
            Comprehensive analysis with strengths, weaknesses, and AI insights
        """
        try:
            # Fetch player stats
            player_stats = self._fetch_player_stats(puuid, time_range)

            if not player_stats:
                return {
                    "success": False,
                    "error": "No match data found for analysis"
                }

            # Get appropriate benchmarks
            if role:
                benchmarks = get_role_adjusted_benchmarks(rank, role)
            else:
                benchmarks = get_rank_benchmarks(rank)

            # Calculate comparisons
            comparisons = self._calculate_comparisons(player_stats, benchmarks)

            # Find outliers (strengths and weaknesses)
            outliers = self._find_outliers(comparisons)

            # Detect patterns
            patterns = self._detect_patterns(puuid, player_stats)

            # Generate AI narrative
            ai_narrative = self._generate_ai_narrative(
                player_stats,
                benchmarks,
                outliers,
                patterns,
                rank,
                role
            )

            # Generate recommendations
            recommendations = self._generate_recommendations(outliers, patterns)

            return {
                "success": True,
                "analysis_type": analysis_type,
                "rank": rank,
                "role": role,
                "player_stats": player_stats,
                "comparisons": comparisons,
                "strengths": outliers["strengths"],
                "weaknesses": outliers["weaknesses"],
                "patterns": patterns,
                "ai_narrative": ai_narrative,
                "recommendations": recommendations,
                "overall_percentile": self._calculate_overall_percentile(comparisons)
            }

        except Exception as e:
            logger.error(f"Error in performance analysis: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _fetch_player_stats(self, puuid: str, time_range: Optional[int] = None) -> Dict:
        """Fetch and aggregate player statistics from DynamoDB"""
        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            # Query matches
            response = table.query(
                KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
            )

            matches = response['Items']

            # Limit to time_range if specified
            if time_range:
                matches = matches[:time_range]

            if not matches:
                return {}

            # Aggregate statistics
            stats = {
                'total_matches': 0,
                'total_wins': 0,
                'total_kills': 0,
                'total_deaths': 0,
                'total_assists': 0,
                'total_vision_score': 0,
                'total_cs': 0,
                'total_gold': 0,
                'total_damage': 0,
                'total_game_duration': 0,
                'late_game_deaths': 0,  # Deaths after 25min
                'early_game_kills': 0,  # Kills before 10min
            }

            for match_item in matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid:
                        stats['total_matches'] += 1
                        stats['total_wins'] += 1 if participant.get('win') else 0
                        stats['total_kills'] += participant.get('kills', 0)
                        stats['total_deaths'] += participant.get('deaths', 0)
                        stats['total_assists'] += participant.get('assists', 0)
                        stats['total_vision_score'] += participant.get('visionScore', 0)
                        stats['total_cs'] += participant.get('totalMinionsKilled', 0) + participant.get('neutralMinionsKilled', 0)
                        stats['total_gold'] += participant.get('goldEarned', 0)
                        stats['total_damage'] += participant.get('totalDamageDealtToChampions', 0)

                        # Game duration in minutes
                        game_duration = match_data.get('info', {}).get('gameDuration', 0)
                        if game_duration > 0:
                            stats['total_game_duration'] += game_duration / 60  # Convert to minutes

                        break

            # Calculate averages
            num_matches = stats['total_matches']
            if num_matches == 0:
                return {}

            total_game_time_minutes = stats['total_game_duration']

            calculated_stats = {
                'matches_analyzed': num_matches,
                'win_rate': round((stats['total_wins'] / num_matches) * 100, 1),
                'avg_kda': round((stats['total_kills'] + stats['total_assists']) / max(stats['total_deaths'], 1), 2),
                'avg_kills': round(stats['total_kills'] / num_matches, 1),
                'avg_deaths': round(stats['total_deaths'] / num_matches, 1),
                'avg_assists': round(stats['total_assists'] / num_matches, 1),
                'avg_vision_score': round(stats['total_vision_score'] / num_matches, 1),
                'avg_cs_per_min': round(stats['total_cs'] / total_game_time_minutes, 1) if total_game_time_minutes > 0 else 0,
                'avg_gold_per_min': round(stats['total_gold'] / total_game_time_minutes, 0) if total_game_time_minutes > 0 else 0,
                'avg_damage_per_min': round(stats['total_damage'] / total_game_time_minutes, 0) if total_game_time_minutes > 0 else 0,
            }

            return calculated_stats

        except Exception as e:
            logger.error(f"Error fetching player stats: {e}", exc_info=True)
            return {}

    def _calculate_comparisons(self, player_stats: Dict, benchmarks: Dict) -> List[Dict]:
        """Calculate how player stats compare to benchmarks"""
        comparisons = []

        metric_mapping = {
            'avg_kda': 'avg_kda',
            'avg_vision_score': 'avg_vision_score',
            'avg_cs_per_min': 'avg_cs_per_min',
            'avg_damage_per_min': 'avg_damage_per_min',
            'avg_gold_per_min': 'avg_gold_per_min',
            'win_rate': 'avg_win_rate'
        }

        for player_metric, bench_metric in metric_mapping.items():
            if player_metric in player_stats and bench_metric in benchmarks:
                # Convert to float to handle Decimal types from DynamoDB
                player_value = float(player_stats[player_metric])
                benchmark_value = float(benchmarks[bench_metric])

                percentile = calculate_percentile(player_value, benchmark_value)
                label = get_percentile_label(percentile)

                difference = player_value - benchmark_value
                difference_pct = ((player_value - benchmark_value) / benchmark_value) * 100 if benchmark_value > 0 else 0

                comparisons.append({
                    'metric': player_metric,
                    'player_value': player_value,
                    'benchmark_value': round(benchmark_value, 1),
                    'difference': round(difference, 1),
                    'difference_pct': round(difference_pct, 1),
                    'percentile': percentile,
                    'label': label
                })

        return comparisons

    def _find_outliers(self, comparisons: List[Dict]) -> Dict:
        """Identify exceptional strengths and notable weaknesses"""
        strengths = []
        weaknesses = []

        for comp in comparisons:
            if comp['percentile'] >= 70:  # Top 30% or better
                strengths.append(comp)
            elif comp['percentile'] <= 30:  # Bottom 30%
                weaknesses.append(comp)

        # Sort by percentile
        strengths.sort(key=lambda x: x['percentile'], reverse=True)
        weaknesses.sort(key=lambda x: x['percentile'])

        return {
            "strengths": strengths[:5],  # Top 5 strengths
            "weaknesses": weaknesses[:5]  # Top 5 weaknesses
        }

    def _detect_patterns(self, puuid: str, player_stats: Dict) -> Dict:
        """Detect gameplay patterns (placeholder for now)"""
        # TODO: Implement pattern detection (late game deaths, early game aggression, etc.)
        return {
            "detected": []
        }

    def _generate_ai_narrative(
        self,
        player_stats: Dict,
        benchmarks: Dict,
        outliers: Dict,
        patterns: Dict,
        rank: str,
        role: Optional[str]
    ) -> str:
        """Generate AI-powered narrative about player performance"""
        try:
            import json

            # Build context for AI
            strengths_text = "\n".join([
                f"- {s['metric']}: {s['player_value']} (Rank avg: {s['benchmark_value']}, {s['label']} - {s['percentile']}th percentile)"
                for s in outliers['strengths'][:3]
            ])

            weaknesses_text = "\n".join([
                f"- {s['metric']}: {s['player_value']} (Rank avg: {s['benchmark_value']}, {s['label']} - {s['percentile']}th percentile)"
                for s in outliers['weaknesses'][:3]
            ])

            role_text = f" as a {role} player" if role else ""

            prompt = f"""You are analyzing a League of Legends player's performance. They are a {rank} player{role_text}.

PLAYER STATISTICS:
- Win Rate: {player_stats.get('win_rate', 0)}%
- KDA: {player_stats.get('avg_kda', 0)}
- Vision Score: {player_stats.get('avg_vision_score', 0)}
- CS/min: {player_stats.get('avg_cs_per_min', 0)}
- Matches Analyzed: {player_stats.get('matches_analyzed', 0)}

TOP STRENGTHS:
{strengths_text if strengths_text else "No exceptional strengths detected"}

AREAS TO IMPROVE:
{weaknesses_text if weaknesses_text else "No significant weaknesses detected"}

Generate a 2-3 sentence analysis that:
1. Celebrates their top strength with specific numbers and percentile
2. Acknowledges 1-2 key areas for improvement with context
3. Is encouraging, actionable, and ends on a positive note

Use emojis sparingly (1-2 max). Be enthusiastic but professional."""

            # Call Claude
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps({
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 400,
                    "temperature": 0.7,
                    "messages": [{
                        "role": "user",
                        "content": prompt
                    }]
                })
            )

            result = json.loads(response['body'].read())

            # Extract text
            narrative = ""
            for content in result.get('content', []):
                if content.get('type') == 'text':
                    narrative += content['text']

            return narrative or "Unable to generate analysis. Please try again."

        except Exception as e:
            logger.error(f"Error generating AI narrative: {e}", exc_info=True)
            return f"Analysis complete with {len(outliers['strengths'])} strengths and {len(outliers['weaknesses'])} areas to improve."

    def _generate_recommendations(self, outliers: Dict, patterns: Dict) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []

        # Recommendations based on weaknesses
        for weakness in outliers['weaknesses'][:3]:
            metric = weakness['metric']

            if 'vision' in metric.lower():
                recommendations.append("Focus on consistent ward placement - aim for 1-2 control wards per game")
            elif 'kda' in metric.lower() or 'deaths' in metric.lower():
                recommendations.append("Work on map awareness and positioning to reduce deaths")
            elif 'cs' in metric.lower():
                recommendations.append("Practice last-hitting in practice tool - aim for 6+ CS/min")
            elif 'damage' in metric.lower():
                recommendations.append("Look for more opportunities to trade and poke in lane")

        # Add generic recommendation if no specific ones
        if not recommendations:
            recommendations.append("Keep up the great work! Focus on consistency across all games")

        return recommendations[:3]  # Limit to top 3

    def _calculate_overall_percentile(self, comparisons: List[Dict]) -> int:
        """Calculate overall performance percentile"""
        if not comparisons:
            return 50

        # Average of all percentiles
        avg_percentile = sum(c['percentile'] for c in comparisons) / len(comparisons)
        return round(avg_percentile)
