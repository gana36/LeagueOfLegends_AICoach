"""
Habits Detection System
Identifies persistent gameplay patterns (both good and bad habits)
"""
import logging
from typing import Dict, List, Optional
import boto3
from boto3.dynamodb.conditions import Key
import statistics

logger = logging.getLogger(__name__)


class HabitsDetector:
    """Detects persistent gameplay habits across matches"""

    def __init__(self):
        self.dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
        self.table = self.dynamodb.Table('lol-player-data')

    def detect_habits(
        self,
        puuid: str,
        time_range: Optional[int] = None,
        rank: str = "GOLD"
    ) -> Dict:
        """
        Detect persistent habits from match history

        Args:
            puuid: Player PUUID
            time_range: Number of recent matches to analyze (None = all)
            rank: Player's rank for context

        Returns:
            Dict with good_habits and bad_habits lists
        """
        try:
            # Fetch match data
            matches = self._fetch_matches(puuid, time_range)

            if not matches:
                return {
                    "success": False,
                    "error": "No match data available"
                }

            # Analyze patterns
            match_patterns = self._analyze_match_patterns(puuid, matches)

            # Detect good habits
            good_habits = self._detect_good_habits(match_patterns, rank)

            # Detect bad habits
            bad_habits = self._detect_bad_habits(match_patterns, rank)

            return {
                "success": True,
                "matches_analyzed": len(matches),
                "good_habits": good_habits,
                "bad_habits": bad_habits,
                "patterns": match_patterns["summary"]
            }

        except Exception as e:
            logger.error(f"Error detecting habits: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    def _fetch_matches(self, puuid: str, time_range: Optional[int]) -> List[Dict]:
        """Fetch match data from DynamoDB"""
        try:
            response = self.table.query(
                KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
            )

            matches = response['Items']

            # Limit to time_range if specified
            if time_range:
                matches = matches[:time_range]

            return matches

        except Exception as e:
            logger.error(f"Error fetching matches: {e}", exc_info=True)
            return []

    def _analyze_match_patterns(self, puuid: str, matches: List[Dict]) -> Dict:
        """Analyze patterns across all matches"""
        patterns = {
            'vision_data': [],
            'early_kills': [],
            'late_deaths': [],
            'objective_participation': [],
            'cs_per_min': [],
            'gold_per_min': [],
            'kda': [],
            'damage_share': [],
            'game_durations': [],
            'control_wards_games': 0,
            'first_blood_games': 0,
            'pentakills': 0,
            'wins': 0,
            'total_games': 0
        }

        for match_item in matches:
            match_data = match_item.get('data', {})
            participant = self._find_participant(puuid, match_data)

            if not participant:
                continue

            patterns['total_games'] += 1

            # Vision patterns
            vision_score = int(participant.get('visionScore', 0))
            control_wards = int(participant.get('visionWardsBoughtInGame', 0))
            wards_placed = int(participant.get('wardsPlaced', 0))

            patterns['vision_data'].append({
                'vision_score': vision_score,
                'control_wards': control_wards,
                'wards_placed': wards_placed
            })

            if control_wards > 0:
                patterns['control_wards_games'] += 1

            # Early game aggression
            challenges = participant.get('challenges', {})
            early_kills = int(challenges.get('killsBeforeLevel10', 0) or 0)
            patterns['early_kills'].append(early_kills)

            # Late game deaths (after 25 minutes)
            deaths = int(participant.get('deaths', 0))
            game_duration_seconds = int(match_data.get('info', {}).get('gameDuration', 0))
            game_duration_minutes = game_duration_seconds / 60

            if game_duration_minutes > 25:
                # Estimate late game deaths (rough approximation)
                late_game_death_ratio = 0.4  # Assume 40% of deaths happen in late game
                estimated_late_deaths = deaths * late_game_death_ratio
                patterns['late_deaths'].append(estimated_late_deaths)

            # Objective participation
            dragon_takedowns = int(challenges.get('dragonTakedowns', 0) or 0)
            baron_kills = int(challenges.get('teamBaronKills', 0) or 0)
            patterns['objective_participation'].append(dragon_takedowns + baron_kills)

            # CS and gold efficiency
            cs = int(participant.get('totalMinionsKilled', 0)) + int(participant.get('neutralMinionsKilled', 0))
            gold = int(participant.get('goldEarned', 0))

            if game_duration_minutes > 0:
                cs_per_min = cs / game_duration_minutes
                gold_per_min = gold / game_duration_minutes
                patterns['cs_per_min'].append(cs_per_min)
                patterns['gold_per_min'].append(gold_per_min)

            # KDA and damage
            kills = int(participant.get('kills', 0))
            assists = int(participant.get('assists', 0))
            kda = (kills + assists) / max(deaths, 1)
            patterns['kda'].append(kda)

            # Damage share
            damage_share = float(challenges.get('teamDamagePercentage', 0) or 0) * 100
            patterns['damage_share'].append(damage_share)

            # Game duration
            patterns['game_durations'].append(game_duration_minutes)

            # Special achievements
            if participant.get('firstBloodKill'):
                patterns['first_blood_games'] += 1

            pentakills = int(participant.get('pentaKills', 0))
            patterns['pentakills'] += pentakills

            # Wins
            if participant.get('win'):
                patterns['wins'] += 1

        # Calculate summary statistics
        patterns['summary'] = self._calculate_pattern_summary(patterns)

        return patterns

    def _calculate_pattern_summary(self, patterns: Dict) -> Dict:
        """Calculate summary statistics from patterns"""
        total_games = patterns['total_games']

        if total_games == 0:
            return {}

        return {
            'avg_vision_score': statistics.mean([v['vision_score'] for v in patterns['vision_data']]) if patterns['vision_data'] else 0,
            'avg_control_wards': statistics.mean([v['control_wards'] for v in patterns['vision_data']]) if patterns['vision_data'] else 0,
            'control_ward_consistency': (patterns['control_wards_games'] / total_games) * 100,
            'avg_early_kills': statistics.mean(patterns['early_kills']) if patterns['early_kills'] else 0,
            'avg_late_deaths': statistics.mean(patterns['late_deaths']) if patterns['late_deaths'] else 0,
            'avg_objective_participation': statistics.mean(patterns['objective_participation']) if patterns['objective_participation'] else 0,
            'avg_cs_per_min': statistics.mean(patterns['cs_per_min']) if patterns['cs_per_min'] else 0,
            'cs_variance': statistics.variance(patterns['cs_per_min']) if len(patterns['cs_per_min']) > 1 else 0,
            'avg_kda': statistics.mean(patterns['kda']) if patterns['kda'] else 0,
            'kda_variance': statistics.variance(patterns['kda']) if len(patterns['kda']) > 1 else 0,
            'avg_damage_share': statistics.mean(patterns['damage_share']) if patterns['damage_share'] else 0,
            'win_rate': (patterns['wins'] / total_games) * 100,
            'first_blood_rate': (patterns['first_blood_games'] / total_games) * 100,
            'pentakills': patterns['pentakills']
        }

    def _detect_good_habits(self, patterns: Dict, rank: str) -> List[Dict]:
        """Detect positive persistent habits"""
        good_habits = []
        summary = patterns['summary']

        if not summary:
            return good_habits

        # Habit 1: Consistent ward placement
        control_ward_consistency = summary.get('control_ward_consistency', 0)
        if control_ward_consistency >= 95:
            good_habits.append({
                'habit': 'Consistent Ward Placement',
                'icon': '👁️',
                'description': f'Buys control wards in {control_ward_consistency:.0f}% of games',
                'metric': f'{control_ward_consistency:.0f}%',
                'strength': 'excellent' if control_ward_consistency >= 98 else 'good',
                'details': f'Average {summary.get("avg_control_wards", 0):.1f} control wards per game'
            })

        # Habit 2: Strong early game aggression
        avg_early_kills = summary.get('avg_early_kills', 0)
        if avg_early_kills >= 1.5:
            good_habits.append({
                'habit': 'Strong Early Game Aggression',
                'icon': '⚔️',
                'description': f'Averages {avg_early_kills:.1f} kills before level 10',
                'metric': f'{avg_early_kills:.1f} kills',
                'strength': 'excellent' if avg_early_kills >= 2.5 else 'good',
                'details': 'Applies early pressure and gets ahead in lane'
            })

        # Habit 3: High objective participation
        avg_objectives = summary.get('avg_objective_participation', 0)
        if avg_objectives >= 3.5:
            good_habits.append({
                'habit': 'High Objective Focus',
                'icon': '🐉',
                'description': f'Participates in {avg_objectives:.1f} major objectives per game',
                'metric': f'{avg_objectives:.1f} objs/game',
                'strength': 'excellent' if avg_objectives >= 5 else 'good',
                'details': 'Consistently shows up for dragons and barons'
            })

        # Habit 4: Consistent CS performance
        cs_variance = summary.get('cs_variance', 0)
        avg_cs = summary.get('avg_cs_per_min', 0)
        if cs_variance < 1.0 and avg_cs >= 5.5:
            good_habits.append({
                'habit': 'Consistent Farming',
                'icon': '🌾',
                'description': f'Maintains {avg_cs:.1f} CS/min with low variance',
                'metric': f'{avg_cs:.1f} CS/min',
                'strength': 'excellent' if cs_variance < 0.5 else 'good',
                'details': 'Reliable farm regardless of game state'
            })

        # Habit 5: High vision score
        avg_vision = summary.get('avg_vision_score', 0)
        if avg_vision >= 50:
            good_habits.append({
                'habit': 'Excellent Vision Control',
                'icon': '🔍',
                'description': f'Maintains {avg_vision:.0f} average vision score',
                'metric': f'{avg_vision:.0f} vision',
                'strength': 'excellent' if avg_vision >= 60 else 'good',
                'details': 'Provides strong map visibility for team'
            })

        # Habit 6: Consistent performance (low KDA variance)
        kda_variance = summary.get('kda_variance', 0)
        avg_kda = summary.get('avg_kda', 0)
        if kda_variance < 3.0 and avg_kda >= 2.5:
            good_habits.append({
                'habit': 'Reliable Performance',
                'icon': '📈',
                'description': f'Consistent {avg_kda:.1f} KDA across games',
                'metric': f'{avg_kda:.1f} KDA',
                'strength': 'excellent' if kda_variance < 2.0 else 'good',
                'details': 'Performs well regardless of matchup or team comp'
            })

        # Habit 7: First blood aggression
        first_blood_rate = summary.get('first_blood_rate', 0)
        if first_blood_rate >= 15:
            good_habits.append({
                'habit': 'First Blood Hunter',
                'icon': '🩸',
                'description': f'Gets first blood in {first_blood_rate:.0f}% of games',
                'metric': f'{first_blood_rate:.0f}%',
                'strength': 'excellent' if first_blood_rate >= 25 else 'good',
                'details': 'Creates early advantages for the team'
            })

        return good_habits

    def _detect_bad_habits(self, patterns: Dict, rank: str) -> List[Dict]:
        """Detect negative persistent habits"""
        bad_habits = []
        summary = patterns['summary']

        if not summary:
            return bad_habits

        # Bad Habit 1: Poor vision control
        control_ward_consistency = summary.get('control_ward_consistency', 0)
        if control_ward_consistency < 70:
            bad_habits.append({
                'habit': 'Inconsistent Ward Placement',
                'icon': '🚫',
                'description': f'Only buys control wards in {control_ward_consistency:.0f}% of games',
                'metric': f'{control_ward_consistency:.0f}%',
                'severity': 'high' if control_ward_consistency < 50 else 'medium',
                'recommendation': 'Aim to buy at least 1-2 control wards every game for better vision control'
            })

        # Bad Habit 2: Frequent late game deaths
        avg_late_deaths = summary.get('avg_late_deaths', 0)
        if avg_late_deaths >= 2.5:
            bad_habits.append({
                'habit': 'Late Game Deaths',
                'icon': '💀',
                'description': f'Dies {avg_late_deaths:.1f} times in late game on average',
                'metric': f'{avg_late_deaths:.1f} deaths',
                'severity': 'high' if avg_late_deaths >= 3.5 else 'medium',
                'recommendation': 'Play more cautiously in late game when death timers are long'
            })

        # Bad Habit 3: Poor objective participation
        avg_objectives = summary.get('avg_objective_participation', 0)
        if avg_objectives < 2.0:
            bad_habits.append({
                'habit': 'Low Objective Participation',
                'icon': '🐉',
                'description': f'Only participates in {avg_objectives:.1f} major objectives per game',
                'metric': f'{avg_objectives:.1f} objs',
                'severity': 'high' if avg_objectives < 1.5 else 'medium',
                'recommendation': 'Rotate to dragons and barons earlier to help secure objectives'
            })

        # Bad Habit 4: Low CS performance
        avg_cs = summary.get('avg_cs_per_min', 0)
        if avg_cs < 5.0:
            bad_habits.append({
                'habit': 'Low Farm Efficiency',
                'icon': '🌾',
                'description': f'Only averaging {avg_cs:.1f} CS/min',
                'metric': f'{avg_cs:.1f} CS/min',
                'severity': 'high' if avg_cs < 4.0 else 'medium',
                'recommendation': 'Focus on last-hitting minions and finding farm between fights'
            })

        # Bad Habit 5: Inconsistent performance
        kda_variance = summary.get('kda_variance', 0)
        if kda_variance >= 5.0:
            bad_habits.append({
                'habit': 'Inconsistent Performance',
                'icon': '📉',
                'description': 'Large variance in KDA between games',
                'metric': f'Variance: {kda_variance:.1f}',
                'severity': 'medium',
                'recommendation': 'Work on maintaining a consistent playstyle regardless of early game'
            })

        # Bad Habit 6: Passive early game
        avg_early_kills = summary.get('avg_early_kills', 0)
        if avg_early_kills < 0.5:
            bad_habits.append({
                'habit': 'Passive Early Game',
                'icon': '😴',
                'description': f'Only {avg_early_kills:.1f} kills before level 10 on average',
                'metric': f'{avg_early_kills:.1f} kills',
                'severity': 'medium',
                'recommendation': 'Look for opportunities to trade and pressure opponents early'
            })

        # Bad Habit 7: Low damage contribution
        avg_damage_share = summary.get('avg_damage_share', 0)
        if avg_damage_share < 15 and avg_damage_share > 0:
            bad_habits.append({
                'habit': 'Low Damage Output',
                'icon': '💥',
                'description': f'Only dealing {avg_damage_share:.1f}% of team damage',
                'metric': f'{avg_damage_share:.1f}%',
                'severity': 'medium',
                'recommendation': 'Look for more opportunities to poke and trade damage in fights'
            })

        return bad_habits

    def _find_participant(self, puuid: str, match_data: Dict) -> Optional[Dict]:
        """Find player's participant data in a match"""
        try:
            participants = match_data.get('info', {}).get('participants', [])
            for participant in participants:
                if participant.get('puuid') == puuid:
                    return participant
        except Exception as e:
            logger.error(f"Error finding participant: {e}")
        return None
