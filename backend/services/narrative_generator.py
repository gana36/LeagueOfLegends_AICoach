"""
Year Recap Narrative Generator
Spotify Wrapped-style storytelling for League of Legends year recap
"""
import logging
from typing import Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
from collections import defaultdict, Counter
from datetime import datetime
import statistics

logger = logging.getLogger(__name__)


class NarrativeGenerator:
    """Generates engaging Spotify Wrapped-style narratives from player data"""

    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = self.dynamodb.Table('lol-player-data')

        # Optional: Try to initialize Bedrock for AI narratives
        try:
            self.bedrock = boto3.client(
                service_name='bedrock-runtime',
                region_name='us-east-1'
            )
            self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
            logger.info("Bedrock AI initialized for narrative generation")
        except Exception as e:
            self.bedrock = None
            logger.warning(f"Bedrock not available, will use template narratives: {e}")

    def generate_year_narrative(
        self,
        puuid: str,
        player_name: str = "Player",
        year: int = 2024
    ) -> Dict:
        """
        Generate complete Spotify Wrapped-style narrative

        Returns:
            Dict with multiple narrative "cards" and data for visualization
        """
        try:
            # Fetch and analyze all match data
            matches_data = self._fetch_all_matches(puuid)

            if not matches_data or matches_data['total_matches'] == 0:
                return {
                    "success": False,
                    "error": "No match data available for narrative generation"
                }

            # Detect milestones and achievements
            milestones = self._detect_milestones(matches_data)

            # Calculate interesting statistics
            stats = self._calculate_narrative_stats(matches_data)

            # Generate narrative cards
            cards = self._generate_narrative_cards(
                player_name=player_name,
                year=year,
                stats=stats,
                milestones=milestones,
                matches_data=matches_data
            )

            return {
                "success": True,
                "player_name": player_name,
                "year": year,
                "total_matches": matches_data['total_matches'],
                "cards": cards,
                "milestones": milestones,
                "stats": stats
            }

        except Exception as e:
            logger.error(f"Error generating narrative: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _fetch_all_matches(self, puuid: str) -> Dict:
        """Fetch and aggregate all match data"""
        try:
            # Fetch ALL matches with pagination
            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = self.table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = self.table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])

                # Check if there are more results
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            logger.info(f"Fetched {len(matches)} total matches for narrative generation")

            if not matches:
                return {'total_matches': 0}

            # Aggregate data
            data = {
                'matches': [],
                'total_matches': 0,
                'wins': 0,
                'losses': 0,
                'total_kills': 0,
                'total_deaths': 0,
                'total_assists': 0,
                'total_damage': 0,
                'total_gold': 0,
                'total_cs': 0,
                'total_vision_score': 0,
                'total_wards_placed': 0,
                'total_game_time': 0,
                'pentakills': 0,
                'quadrakills': 0,
                'triple_kills': 0,
                'first_bloods': 0,
                'champions_played': Counter(),
                'roles_played': Counter(),
                'monthly_stats': defaultdict(lambda: {'games': 0, 'wins': 0}),
                'daily_games': [],
                'best_game': None,
                'best_kda': 0,
                'longest_win_streak': 0,
                'current_win_streak': 0,
                'longest_game': 0,
                'shortest_game': float('inf')
            }

            current_streak = 0

            for match_item in matches:
                match_data = match_item.get('data', {})
                participant = self._find_participant(puuid, match_data)

                if not participant:
                    continue

                data['total_matches'] += 1

                # Basic stats
                won = participant.get('win', False)
                kills = int(participant.get('kills', 0))
                deaths = int(participant.get('deaths', 0))
                assists = int(participant.get('assists', 0))

                data['wins'] += 1 if won else 0
                data['losses'] += 0 if won else 1
                data['total_kills'] += kills
                data['total_deaths'] += deaths
                data['total_assists'] += assists
                data['total_damage'] += int(participant.get('totalDamageDealtToChampions', 0))
                data['total_gold'] += int(participant.get('goldEarned', 0))
                data['total_cs'] += int(participant.get('totalMinionsKilled', 0)) + int(participant.get('neutralMinionsKilled', 0))
                data['total_vision_score'] += int(participant.get('visionScore', 0))
                data['total_wards_placed'] += int(participant.get('wardsPlaced', 0))

                # Game duration
                game_duration = int(match_data.get('info', {}).get('gameDuration', 0))
                data['total_game_time'] += game_duration
                data['longest_game'] = max(data['longest_game'], game_duration)
                data['shortest_game'] = min(data['shortest_game'], game_duration)

                # Multikills
                data['pentakills'] += int(participant.get('pentaKills', 0))
                data['quadrakills'] += int(participant.get('quadraKills', 0))
                data['triple_kills'] += int(participant.get('tripleKills', 0))
                data['first_bloods'] += 1 if participant.get('firstBloodKill') else 0

                # Champions and roles
                champion = participant.get('championName', 'Unknown')
                role = participant.get('teamPosition', 'UNKNOWN')
                data['champions_played'][champion] += 1
                if role:
                    data['roles_played'][role] += 1

                # Monthly tracking
                game_creation = int(match_data.get('info', {}).get('gameCreation', 0))
                if game_creation:
                    date = datetime.fromtimestamp(game_creation / 1000)
                    month_key = date.strftime('%Y-%m')
                    data['monthly_stats'][month_key]['games'] += 1
                    data['monthly_stats'][month_key]['wins'] += 1 if won else 0

                # KDA tracking for best game
                kda = (kills + assists) / max(deaths, 1)
                if kda > data['best_kda']:
                    data['best_kda'] = kda
                    data['best_game'] = {
                        'kda': kda,
                        'kills': kills,
                        'deaths': deaths,
                        'assists': assists,
                        'champion': champion,
                        'won': won,
                        'match_id': match_data.get('metadata', {}).get('matchId', 'Unknown')
                    }

                # Win streak tracking
                if won:
                    current_streak += 1
                    data['longest_win_streak'] = max(data['longest_win_streak'], current_streak)
                else:
                    current_streak = 0

                # Store individual match for timeline
                data['matches'].append({
                    'won': won,
                    'kda': kda,
                    'champion': champion,
                    'timestamp': game_creation
                })

            return data

        except Exception as e:
            logger.error(f"Error fetching matches: {e}", exc_info=True)
            return {'total_matches': 0}

    def _detect_milestones(self, matches_data: Dict) -> List[Dict]:
        """Detect significant milestones and achievements"""
        milestones = []

        # Pentakill milestone
        if matches_data['pentakills'] > 0:
            milestones.append({
                'type': 'pentakill',
                'icon': '⭐',
                'title': 'PENTAKILL ACHIEVED',
                'description': f"You achieved {matches_data['pentakills']} pentakill{'s' if matches_data['pentakills'] > 1 else ''} this year!",
                'value': matches_data['pentakills'],
                'rarity': 'legendary'
            })

        # Win streak milestone
        if matches_data['longest_win_streak'] >= 5:
            milestones.append({
                'type': 'win_streak',
                'icon': '🔥',
                'title': 'UNSTOPPABLE',
                'description': f"Your longest win streak: {matches_data['longest_win_streak']} games!",
                'value': matches_data['longest_win_streak'],
                'rarity': 'rare' if matches_data['longest_win_streak'] >= 8 else 'uncommon'
            })

        # Games played milestone
        total_games = matches_data['total_matches']
        if total_games >= 100:
            milestones.append({
                'type': 'games_played',
                'icon': '🎮',
                'title': 'DEDICATED PLAYER',
                'description': f"You played {total_games} games this year!",
                'value': total_games,
                'rarity': 'common'
            })

        # First blood hunter
        if matches_data['first_bloods'] >= 20:
            milestones.append({
                'type': 'first_blood',
                'icon': '🩸',
                'title': 'FIRST BLOOD HUNTER',
                'description': f"You got first blood {matches_data['first_bloods']} times!",
                'value': matches_data['first_bloods'],
                'rarity': 'uncommon'
            })

        # Vision master
        avg_vision = matches_data['total_vision_score'] / max(matches_data['total_matches'], 1)
        if avg_vision >= 50:
            milestones.append({
                'type': 'vision_master',
                'icon': '👁️',
                'title': 'VISION MASTER',
                'description': f"Average vision score: {avg_vision:.0f}",
                'value': int(avg_vision),
                'rarity': 'rare'
            })

        # Champion mastery
        top_champion = matches_data['champions_played'].most_common(1)
        if top_champion and top_champion[0][1] >= 30:
            milestones.append({
                'type': 'champion_mastery',
                'icon': '🏆',
                'title': 'ONE TRICK',
                'description': f"You played {top_champion[0][0]} {top_champion[0][1]} times!",
                'value': top_champion[0][1],
                'champion': top_champion[0][0],
                'rarity': 'rare'
            })

        # High KDA game
        if matches_data['best_game'] and matches_data['best_kda'] >= 10:
            best = matches_data['best_game']
            milestones.append({
                'type': 'best_game',
                'icon': '💎',
                'title': 'LEGENDARY PERFORMANCE',
                'description': f"{best['kills']}/{best['deaths']}/{best['assists']} on {best['champion']}",
                'value': matches_data['best_kda'],
                'rarity': 'legendary'
            })

        return sorted(milestones, key=lambda x: {'legendary': 0, 'rare': 1, 'uncommon': 2, 'common': 3}[x['rarity']])

    def _calculate_narrative_stats(self, matches_data: Dict) -> Dict:
        """Calculate interesting statistics for narrative"""
        total_games = matches_data['total_matches']

        if total_games == 0:
            return {}

        total_time_hours = matches_data['total_game_time'] / 3600
        avg_game_time = matches_data['total_game_time'] / total_games / 60

        return {
            'total_games': total_games,
            'wins': matches_data['wins'],
            'losses': matches_data['losses'],
            'win_rate': round((matches_data['wins'] / total_games) * 100, 1),
            'total_kills': matches_data['total_kills'],
            'total_deaths': matches_data['total_deaths'],
            'total_assists': matches_data['total_assists'],
            'avg_kda': round((matches_data['total_kills'] + matches_data['total_assists']) / max(matches_data['total_deaths'], 1), 2),
            'total_hours': round(total_time_hours, 1),
            'avg_game_minutes': round(avg_game_time, 1),
            'longest_game_minutes': round(matches_data['longest_game'] / 60, 1),
            'total_damage': matches_data['total_damage'],
            'total_wards': matches_data['total_wards_placed'],
            'avg_vision': round(matches_data['total_vision_score'] / total_games, 1),
            'top_3_champions': [
                {'name': champ, 'games': count}
                for champ, count in matches_data['champions_played'].most_common(3)
            ],
            'favorite_role': matches_data['roles_played'].most_common(1)[0][0] if matches_data['roles_played'] else 'UNKNOWN',
            'best_month': self._find_best_month(matches_data['monthly_stats']),
            'total_takedowns': matches_data['total_kills'] + matches_data['total_assists']
        }

    def _find_best_month(self, monthly_stats: Dict) -> Optional[str]:
        """Find the month with the best win rate"""
        if not monthly_stats:
            return None

        best_month = None
        best_wr = 0

        for month, stats in monthly_stats.items():
            if stats['games'] >= 5:  # Need at least 5 games
                wr = (stats['wins'] / stats['games']) * 100
                if wr > best_wr:
                    best_wr = wr
                    best_month = month

        if best_month:
            date = datetime.strptime(best_month, '%Y-%m')
            return date.strftime('%B')  # Return month name
        return None

    def _generate_narrative_cards(
        self,
        player_name: str,
        year: int,
        stats: Dict,
        milestones: List[Dict],
        matches_data: Dict
    ) -> List[Dict]:
        """Generate Spotify Wrapped-style cards"""
        cards = []

        # Card 1: Opening - Year in Review
        cards.append({
            'id': 'opening',
            'type': 'hero',
            'title': f'{year} was YOUR year',
            'subtitle': player_name,
            'primary_stat': {
                'label': 'Games Played',
                'value': stats['total_games'],
                'icon': '🎮'
            },
            'secondary_stats': [
                {'label': 'Hours Played', 'value': f"{stats['total_hours']}h"},
                {'label': 'Win Rate', 'value': f"{stats['win_rate']}%"}
            ],
            'theme': 'gradient-purple'
        })

        # Card 2: Battle Stats
        cards.append({
            'id': 'combat',
            'type': 'stats',
            'title': 'Your Battle Stats',
            'stats': [
                {
                    'label': 'Total Kills',
                    'value': stats['total_kills'],
                    'icon': '⚔️',
                    'color': 'green'
                },
                {
                    'label': 'Total Assists',
                    'value': stats['total_assists'],
                    'icon': '🤝',
                    'color': 'blue'
                },
                {
                    'label': 'KDA Ratio',
                    'value': stats['avg_kda'],
                    'icon': '💎',
                    'color': 'gold'
                },
                {
                    'label': 'Total Takedowns',
                    'value': stats['total_takedowns'],
                    'icon': '💪',
                    'color': 'purple'
                }
            ],
            'theme': 'gradient-red'
        })

        # Card 3: Champion Journey
        if stats['top_3_champions']:
            top_champ = stats['top_3_champions'][0]
            cards.append({
                'id': 'champions',
                'type': 'champion_showcase',
                'title': 'Your Champion Pool',
                'main_champion': {
                    'name': top_champ['name'],
                    'games': top_champ['games'],
                    'percentage': round((top_champ['games'] / stats['total_games']) * 100, 1)
                },
                'top_champions': stats['top_3_champions'],
                'total_champions': len(matches_data['champions_played']),
                'favorite_role': stats['favorite_role'],
                'theme': 'gradient-blue'
            })

        # Card 4: Best Moments (Milestones)
        if milestones:
            cards.append({
                'id': 'milestones',
                'type': 'achievements',
                'title': 'Your Best Moments',
                'subtitle': f'{len(milestones)} milestone{"s" if len(milestones) != 1 else ""} unlocked',
                'milestones': milestones[:4],  # Top 4 milestones
                'theme': 'gradient-gold'
            })

        # Card 5: Time Investment
        cards.append({
            'id': 'time',
            'type': 'time_stats',
            'title': 'Time on the Rift',
            'main_stat': {
                'value': stats['total_hours'],
                'label': 'hours played',
                'sublabel': f"That's {stats['total_hours'] * 60:.0f} minutes!"
            },
            'details': [
                {'label': 'Average game', 'value': f"{stats['avg_game_minutes']} min"},
                {'label': 'Longest game', 'value': f"{stats['longest_game_minutes']} min"},
                {'label': 'Total games', 'value': stats['total_games']}
            ],
            'theme': 'gradient-cyan'
        })

        # Card 6: Vision & Support Stats
        cards.append({
            'id': 'vision',
            'type': 'support_stats',
            'title': 'Map Awareness',
            'main_stat': {
                'value': stats['total_wards'],
                'label': 'wards placed',
                'icon': '👁️'
            },
            'secondary_stats': [
                {
                    'label': 'Avg Vision Score',
                    'value': stats['avg_vision'],
                    'description': 'per game'
                },
                {
                    'label': 'Wards per game',
                    'value': round(stats['total_wards'] / stats['total_games'], 1),
                    'description': 'keeping vision up'
                }
            ],
            'theme': 'gradient-green'
        })

        # Card 7: Best Month
        if stats.get('best_month'):
            best_month_data = matches_data['monthly_stats'].get(stats['best_month'], {})
            cards.append({
                'id': 'best_month',
                'type': 'highlight',
                'title': 'Your Peak Month',
                'month': stats['best_month'],
                'description': f"{stats['best_month']} was when you dominated",
                'stats': best_month_data,
                'theme': 'gradient-orange'
            })

        # Card 8: AI-Generated Summary
        ai_summary = self._generate_ai_summary(player_name, year, stats, milestones)
        cards.append({
            'id': 'summary',
            'type': 'narrative',
            'title': 'Your Year in Review',
            'narrative': ai_summary,
            'theme': 'gradient-purple'
        })

        # Card 9: Closing - Thank You
        cards.append({
            'id': 'closing',
            'type': 'finale',
            'title': f'Thanks for playing in {year}!',
            'message': f"Here's to another year on the Rift, {player_name}",
            'call_to_action': 'Share Your Year Recap',
            'theme': 'gradient-rainbow'
        })

        return cards

    def _generate_ai_summary(self, player_name: str, year: int, stats: Dict, milestones: List[Dict]) -> str:
        """Generate AI-powered narrative summary (or template if AI unavailable)"""
        top_champs = ", ".join([c['name'] for c in stats['top_3_champions'][:3]]) if stats.get('top_3_champions') else "various champions"

        # If Bedrock is available, use AI generation
        if self.bedrock:
            try:
                import json

                milestone_text = "\n".join([
                    f"- {m['title']}: {m['description']}"
                    for m in milestones[:3]
                ]) if milestones else "No major milestones this year"

                prompt = f"""Generate an engaging, Spotify Wrapped-style summary for a League of Legends player's year in review.

PLAYER: {player_name}
YEAR: {year}

STATISTICS:
- Games Played: {stats['total_games']}
- Win Rate: {stats['win_rate']}%
- KDA: {stats['avg_kda']}
- Hours Played: {stats['total_hours']}
- Top Champions: {top_champs}
- Favorite Role: {stats['favorite_role']}

MILESTONES:
{milestone_text}

Write a 3-4 sentence narrative that:
1. Celebrates their year with energy and enthusiasm
2. Highlights their most impressive stat or achievement
3. Mentions their champion loyalty or versatility
4. Ends with an encouraging or inspiring note

Style: Energetic, positive, personal (use "you"), like Spotify Wrapped
Tone: Celebratory but authentic
Length: 3-4 sentences maximum

Do NOT use emojis. Keep it text only."""

                response = self.bedrock.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps({
                        "anthropic_version": "bedrock-2023-05-31",
                        "max_tokens": 300,
                        "temperature": 0.8,
                        "messages": [{
                            "role": "user",
                            "content": prompt
                        }]
                    })
                )

                result = json.loads(response['body'].read())

                narrative = ""
                for content in result.get('content', []):
                    if content.get('type') == 'text':
                        narrative += content['text']

                if narrative:
                    return narrative

            except Exception as e:
                logger.error(f"Error generating AI summary: {e}")

        # Fallback: Template-based narrative
        return self._generate_template_narrative(player_name, year, stats, milestones, top_champs)

    def _generate_template_narrative(self, player_name: str, year: int, stats: Dict, milestones: List[Dict], top_champs: str) -> str:
        """Generate template-based narrative when AI is unavailable"""

        # Find the most impressive stat
        impressive_stat = None
        if stats['win_rate'] >= 60:
            impressive_stat = f"crushing it with a {stats['win_rate']}% win rate"
        elif stats['avg_kda'] >= 4:
            impressive_stat = f"dominating with a {stats['avg_kda']} KDA"
        elif stats['total_hours'] >= 100:
            impressive_stat = f"dedicating {stats['total_hours']} hours to perfecting your craft"

        # Build narrative
        parts = []

        # Opening
        parts.append(f"What a year it's been on the Rift, {player_name}!")

        # Main achievement
        if impressive_stat:
            parts.append(f"You played {stats['total_games']} games this year, {impressive_stat}.")
        else:
            parts.append(f"You played {stats['total_games']} games this year, steadily improving your gameplay.")

        # Champion mastery
        if stats.get('top_3_champions') and len(stats['top_3_champions']) >= 1:
            top_champ = stats['top_3_champions'][0]
            parts.append(f"Your dedication to {top_champ['name']} really shows - {top_champ['games']} games of pure mastery.")

        # Closing encouragement
        if milestones:
            parts.append(f"With {len(milestones)} major milestones achieved, you're ready to climb even higher in {year + 1}!")
        else:
            parts.append(f"Keep grinding and the wins will come - see you on the Rift in {year + 1}!")

        return " ".join(parts)

    def _find_participant(self, puuid: str, match_data: Dict) -> Optional[Dict]:
        """Find player's participant data in match"""
        try:
            participants = match_data.get('info', {}).get('participants', [])
            for participant in participants:
                if participant.get('puuid') == puuid:
                    return participant
        except Exception as e:
            logger.error(f"Error finding participant: {e}")
        return None
