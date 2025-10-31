"""
Agent Tools - Functions that the Bedrock Agent can call
"""
from typing import Dict, List
import statistics
from collections import Counter


class AgentTools:
    """Tools that the coaching agent can use to analyze player data"""

    def __init__(self, riot_client):
        self.riot_client = riot_client

    async def analyze_recent_performance(
        self,
        puuid: str,
        games: int = 20,
        region: str = "americas"
    ) -> Dict:
        """
        Analyze player's recent performance in detail

        Returns insights about:
        - Win rate trends
        - Performance in different game lengths
        - Role performance
        - Time-based patterns
        """
        match_ids = await self.riot_client.get_match_history(puuid, region=region, count=games)
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        if not matches:
            return {"error": "No matches found"}

        # Analyze by game length
        short_games = []  # < 25 min
        medium_games = []  # 25-35 min
        long_games = []  # > 35 min

        # Recent vs older performance
        recent_games = matches[:games//2]
        older_games = matches[games//2:]

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            duration = match["info"].get("gameDuration", 0) / 60  # minutes
            won = participant.get("win", False)

            if duration < 25:
                short_games.append(won)
            elif duration < 35:
                medium_games.append(won)
            else:
                long_games.append(won)

        # Calculate trends
        recent_wr = self._calculate_win_rate(recent_games, puuid)
        older_wr = self._calculate_win_rate(older_games, puuid)

        return {
            "total_games": len(matches),
            "overall_win_rate": (sum(1 for m in matches if self._find_participant(puuid, m).get("win")) / len(matches)) * 100,
            "recent_win_rate": recent_wr,
            "older_win_rate": older_wr,
            "trending": "up" if recent_wr > older_wr else "down",
            "performance_by_duration": {
                "short_games": {
                    "count": len(short_games),
                    "win_rate": (sum(short_games) / len(short_games) * 100) if short_games else 0
                },
                "medium_games": {
                    "count": len(medium_games),
                    "win_rate": (sum(medium_games) / len(medium_games) * 100) if medium_games else 0
                },
                "long_games": {
                    "count": len(long_games),
                    "win_rate": (sum(long_games) / len(long_games) * 100) if long_games else 0
                }
            }
        }

    async def detect_patterns(
        self,
        puuid: str,
        games: int = 30,
        region: str = "americas"
    ) -> Dict:
        """
        Detect recurring patterns in player's gameplay

        Identifies:
        - Vision control patterns
        - Death patterns (early vs late game)
        - Damage consistency
        - Objective participation
        """
        match_ids = await self.riot_client.get_match_history(puuid, region=region, count=games)
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        if not matches:
            return {"error": "No matches found"}

        vision_scores = []
        early_deaths = []  # Deaths in first 15 min
        late_deaths = []   # Deaths after 25 min
        damage_consistency = []
        objective_participation = []

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            # Vision patterns
            vision_scores.append(participant.get("visionScore", 0))

            # Damage consistency (damage per minute)
            duration = match["info"].get("gameDuration", 1) / 60
            damage_per_min = participant.get("totalDamageDealtToChampions", 0) / duration
            damage_consistency.append(damage_per_min)

            # Objective participation
            dragons = participant.get("dragonKills", 0)
            barons = participant.get("baronKills", 0)
            heralds = participant.get("riftHeraldKills", 0)
            objective_participation.append(dragons + barons + heralds)

        # Analyze patterns
        avg_vision = statistics.mean(vision_scores) if vision_scores else 0
        vision_variance = statistics.variance(vision_scores) if len(vision_scores) > 1 else 0
        avg_damage = statistics.mean(damage_consistency) if damage_consistency else 0
        damage_variance = statistics.variance(damage_consistency) if len(damage_consistency) > 1 else 0

        return {
            "vision_control": {
                "average_vision_score": round(avg_vision, 1),
                "consistency": "high" if vision_variance < 10 else "low",
                "assessment": "good" if avg_vision > 40 else "needs_improvement"
            },
            "damage_output": {
                "average_dpm": round(avg_damage, 0),
                "consistency": "high" if damage_variance < 5000 else "low",
                "assessment": "good" if avg_damage > 500 else "needs_improvement"
            },
            "objective_focus": {
                "avg_objectives_per_game": round(statistics.mean(objective_participation), 1) if objective_participation else 0,
                "assessment": "good" if statistics.mean(objective_participation) > 1 else "needs_improvement"
            },
            "identified_weaknesses": self._identify_weaknesses(avg_vision, avg_damage, objective_participation)
        }

    async def recommend_champions(
        self,
        puuid: str,
        role: str,
        weakness: str,
        games: int = 30,
        region: str = "americas"
    ) -> Dict:
        """
        Recommend champions based on identified weaknesses

        Args:
            role: Player's main role
            weakness: Identified weakness (e.g., "early_game", "vision", "late_game")
        """
        # Champion recommendations based on weakness
        recommendations = {
            "early_game": {
                "TOP": ["Renekton", "Pantheon", "Darius", "Jayce"],
                "JUNGLE": ["Lee Sin", "Elise", "Jarvan IV", "Xin Zhao"],
                "MIDDLE": ["Pantheon", "Talon", "Zed", "LeBlanc"],
                "BOTTOM": ["Draven", "Kalista", "Lucian", "Caitlyn"],
                "UTILITY": ["Leona", "Nautilus", "Thresh", "Alistar"]
            },
            "late_game": {
                "TOP": ["Kayle", "Nasus", "Sion", "Ornn"],
                "JUNGLE": ["Master Yi", "Karthus", "Kindred", "Evelynn"],
                "MIDDLE": ["Kassadin", "Veigar", "Viktor", "Azir"],
                "BOTTOM": ["Jinx", "Kog'Maw", "Vayne", "Twitch"],
                "UTILITY": ["Sona", "Janna", "Lulu", "Yuumi"]
            },
            "vision": {
                "TOP": ["Shen", "Ornn", "Sion"],
                "JUNGLE": ["Lee Sin", "Elise", "Rek'Sai"],
                "MIDDLE": ["Twisted Fate", "Galio", "Aurelion Sol"],
                "BOTTOM": ["Ashe", "Jhin", "Varus"],
                "UTILITY": ["All supports naturally have good vision"]
            },
            "tankiness": {
                "TOP": ["Malphite", "Ornn", "Sion", "Cho'Gath"],
                "JUNGLE": ["Rammus", "Zac", "Sejuani", "Amumu"],
                "MIDDLE": ["Galio", "Gragas"],
                "BOTTOM": ["Rarely applicable"],
                "UTILITY": ["Braum", "Tahm Kench", "Alistar", "Leona"]
            },
            "damage": {
                "TOP": ["Fiora", "Camille", "Jax", "Riven"],
                "JUNGLE": ["Kha'Zix", "Graves", "Kindred", "Evelynn"],
                "MIDDLE": ["Syndra", "Orianna", "Viktor", "Azir"],
                "BOTTOM": ["Jinx", "Kai'Sa", "Vayne", "Ezreal"],
                "UTILITY": ["Zyra", "Brand", "Vel'Koz", "Xerath"]
            }
        }

        # Get current champion pool
        match_ids = await self.riot_client.get_match_history(puuid, region=region, count=games)
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        current_champions = Counter()
        for match in matches:
            participant = self._find_participant(puuid, match)
            if participant:
                champion = participant.get("championName", "")
                if champion:
                    current_champions[champion] += 1

        # Get recommendations
        recommended = recommendations.get(weakness, {}).get(role, [])
        current_pool = [champ for champ, _ in current_champions.most_common(5)]

        # Filter out already played champions
        new_recommendations = [champ for champ in recommended if champ not in current_pool]

        return {
            "current_champion_pool": current_pool,
            "recommended_champions": new_recommendations[:4],
            "reason": f"These champions excel at {weakness.replace('_', ' ')}"
        }

    async def compare_to_rank(
        self,
        puuid: str,
        target_rank: str,
        games: int = 30,
        region: str = "americas"
    ) -> Dict:
        """
        Compare player's stats to target rank benchmarks

        Args:
            target_rank: "gold", "platinum", "diamond", "master"
        """
        # Benchmark stats (approximate averages from high-elo players)
        benchmarks = {
            "gold": {
                "cs_per_min": 6.5,
                "vision_score_per_min": 1.0,
                "kda": 2.5,
                "damage_per_min": 450
            },
            "platinum": {
                "cs_per_min": 7.0,
                "vision_score_per_min": 1.2,
                "kda": 2.8,
                "damage_per_min": 500
            },
            "diamond": {
                "cs_per_min": 7.5,
                "vision_score_per_min": 1.5,
                "kda": 3.2,
                "damage_per_min": 550
            },
            "master": {
                "cs_per_min": 8.0,
                "vision_score_per_min": 1.8,
                "kda": 3.8,
                "damage_per_min": 600
            }
        }

        # Get player stats
        match_ids = await self.riot_client.get_match_history(puuid, region=region, count=games)
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        player_stats = self._calculate_aggregate_stats(puuid, matches)
        target_stats = benchmarks.get(target_rank.lower(), benchmarks["platinum"])

        return {
            "target_rank": target_rank,
            "comparison": {
                "cs_per_min": {
                    "yours": player_stats["cs_per_min"],
                    "target": target_stats["cs_per_min"],
                    "gap": player_stats["cs_per_min"] - target_stats["cs_per_min"],
                    "status": "above" if player_stats["cs_per_min"] >= target_stats["cs_per_min"] else "below"
                },
                "vision_score_per_min": {
                    "yours": player_stats["vision_per_min"],
                    "target": target_stats["vision_score_per_min"],
                    "gap": player_stats["vision_per_min"] - target_stats["vision_score_per_min"],
                    "status": "above" if player_stats["vision_per_min"] >= target_stats["vision_score_per_min"] else "below"
                },
                "kda": {
                    "yours": player_stats["kda"],
                    "target": target_stats["kda"],
                    "gap": player_stats["kda"] - target_stats["kda"],
                    "status": "above" if player_stats["kda"] >= target_stats["kda"] else "below"
                }
            },
            "biggest_gap": self._find_biggest_gap(player_stats, target_stats)
        }

    async def generate_practice_plan(
        self,
        weaknesses: List[str],
        timeframe_weeks: int = 3
    ) -> Dict:
        """
        Generate a structured practice plan based on weaknesses
        """
        practice_modules = {
            "vision": {
                "week_1": "Ward timing drills - Place 2 control wards per back, track ward cooldowns",
                "week_2": "Map awareness practice - Check minimap every 5 seconds, ping enemy positions",
                "week_3": "Deep warding - Practice warding enemy jungle before objectives"
            },
            "early_game": {
                "week_1": "Level 1-3 trading patterns - Practice all-ins in practice tool",
                "week_2": "Wave management - Learn to freeze and slow push",
                "week_3": "Jungle tracking - Track enemy jungler, anticipate ganks"
            },
            "late_game": {
                "week_1": "Positioning drills - Watch 5 high-elo VODs, focus on teamfight positioning",
                "week_2": "Macro decisions - Baron/Dragon setup, vision denial, wave control",
                "week_3": "Closing games - Practice ending games with leads, avoid throwing"
            },
            "damage": {
                "week_1": "Combo practice - Master champion combos in practice tool",
                "week_2": "Trading stance - Harass opponents while CSing efficiently",
                "week_3": "Target selection - Focus correct targets in teamfights"
            },
            "cs": {
                "week_1": "Last-hitting drills - 10 min practice tool, aim for 90+ CS",
                "week_2": "CSing under tower - Practice tower last-hitting",
                "week_3": "CS while trading - Maintain CS while harassing"
            }
        }

        plan = {}
        for i, weakness in enumerate(weaknesses[:timeframe_weeks]):
            week_num = i + 1
            if weakness in practice_modules:
                plan[f"week_{week_num}"] = {
                    "focus": weakness.replace("_", " ").title(),
                    "tasks": practice_modules[weakness]
                }

        return {
            "duration_weeks": timeframe_weeks,
            "weekly_plan": plan,
            "daily_commitment": "30-45 minutes of focused practice",
            "success_metrics": "Track improvement in target stats each week"
        }

    # Helper methods
    def _find_participant(self, puuid: str, match: Dict) -> Dict:
        """Find participant in match"""
        if "info" not in match or "participants" not in match["info"]:
            return {}
        for p in match["info"]["participants"]:
            if p.get("puuid") == puuid:
                return p
        return {}

    def _calculate_win_rate(self, matches: List[Dict], puuid: str) -> float:
        """Calculate win rate from matches"""
        wins = sum(1 for m in matches if self._find_participant(puuid, m).get("win", False))
        return (wins / len(matches) * 100) if matches else 0

    def _identify_weaknesses(self, vision: float, damage: float, objectives: List) -> List[str]:
        """Identify weaknesses based on stats"""
        weaknesses = []
        if vision < 40:
            weaknesses.append("vision")
        if damage < 500:
            weaknesses.append("damage")
        if statistics.mean(objectives) < 1 if objectives else True:
            weaknesses.append("objective_control")
        return weaknesses or ["none_detected"]

    def _calculate_aggregate_stats(self, puuid: str, matches: List[Dict]) -> Dict:
        """Calculate aggregate stats from matches"""
        total_cs = 0
        total_duration = 0
        total_kills = 0
        total_deaths = 0
        total_assists = 0
        total_vision = 0

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            duration = match["info"].get("gameDuration", 0) / 60
            total_duration += duration
            total_cs += participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)
            total_kills += participant.get("kills", 0)
            total_deaths += participant.get("deaths", 0)
            total_assists += participant.get("assists", 0)
            total_vision += participant.get("visionScore", 0)

        games = len(matches)
        return {
            "cs_per_min": (total_cs / total_duration) if total_duration > 0 else 0,
            "vision_per_min": (total_vision / total_duration) if total_duration > 0 else 0,
            "kda": ((total_kills + total_assists) / max(total_deaths, 1))
        }

    def _find_biggest_gap(self, player: Dict, target: Dict) -> str:
        """Find the stat with biggest gap to target"""
        gaps = {
            "CS": abs(player["cs_per_min"] - target["cs_per_min"]) / target["cs_per_min"],
            "Vision": abs(player["vision_per_min"] - target["vision_score_per_min"]) / target["vision_score_per_min"],
            "KDA": abs(player["kda"] - target["kda"]) / target["kda"]
        }
        return max(gaps, key=gaps.get)
