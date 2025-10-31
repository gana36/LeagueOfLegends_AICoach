from typing import Dict, List, Optional
import statistics
from collections import Counter, defaultdict


class MatchAnalyzer:
    """Analyzes match data and generates insights using AI"""

    def __init__(self, riot_client, bedrock_service):
        self.riot_client = riot_client
        self.bedrock_service = bedrock_service

    async def generate_year_recap(
        self,
        puuid: str,
        match_count: int = 100,
        region: str = "americas",
        platform: str = "na1"
    ) -> Dict:
        """Generate comprehensive year-end recap for a player"""

        # Fetch match history
        match_ids = await self.riot_client.get_match_history(
            puuid, region=region, count=match_count
        )

        # Get detailed match data
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        # Calculate stats from matches
        player_stats = self._calculate_player_stats(puuid, matches)

        # Fetch additional data from new APIs
        try:
            # Get champion mastery data
            top_masteries = await self.riot_client.get_top_champion_masteries(
                puuid, count=10, platform=platform
            )
            mastery_score = await self.riot_client.get_champion_mastery_score(
                puuid, platform=platform
            )
        except Exception as e:
            print(f"Warning: Could not fetch mastery data: {e}")
            top_masteries = []
            mastery_score = 0

        # Try to get challenges data
        try:
            challenges = await self.riot_client.get_player_challenges(
                puuid, platform=platform
            )
        except Exception as e:
            print(f"Warning: Could not fetch challenges data: {e}")
            challenges = {}

        # Generate AI narrative with enriched data
        narrative = await self.bedrock_service.generate_year_recap_narrative(
            player_stats,
            matches,
            top_masteries,
            challenges
        )

        return {
            "narrative": narrative,
            "stats": player_stats,
            "total_matches": len(matches),
            "highlights": self._extract_highlights(puuid, matches),
            "mastery": {
                "top_champions": top_masteries[:5],
                "total_score": mastery_score
            },
            "achievements": self._format_challenges(challenges)
        }

    def _format_challenges(self, challenges: Dict) -> Dict:
        """Format challenge data for year recap"""
        if not challenges:
            return {
                "total_level": "NONE",
                "total_points": 0,
                "top_challenges": []
            }

        total_points = challenges.get("totalPoints", {})

        # Get top challenges by percentile (rarest achievements)
        challenge_list = challenges.get("challenges", [])
        top_challenges = sorted(
            challenge_list,
            key=lambda x: x.get("percentile", 100),
            reverse=False  # Lower percentile = rarer
        )[:5]

        return {
            "total_level": total_points.get("level", "NONE"),
            "total_points": total_points.get("current", 0),
            "percentile": total_points.get("percentile", 0),
            "top_challenges": top_challenges
        }

    async def generate_insights(
        self,
        puuid: str,
        match_count: int = 50,
        region: str = "americas"
    ) -> Dict:
        """Generate AI-powered insights about player performance"""

        match_ids = await self.riot_client.get_match_history(
            puuid, region=region, count=match_count
        )
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        player_stats = self._calculate_player_stats(puuid, matches)
        champion_stats = self._calculate_champion_stats(puuid, matches)

        playstyle_analysis = await self.bedrock_service.analyze_playstyle(
            player_stats,
            champion_stats
        )

        return {
            "playstyle_analysis": playstyle_analysis,
            "player_stats": player_stats,
            "champion_stats": champion_stats[:10],
            "performance_trends": self._calculate_performance_trends(puuid, matches)
        }

    async def analyze_strengths_weaknesses(
        self,
        puuid: str,
        match_count: int = 50,
        region: str = "americas"
    ) -> Dict:
        """Analyze persistent strengths and weaknesses"""

        match_ids = await self.riot_client.get_match_history(
            puuid, region=region, count=match_count
        )
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        player_stats = self._calculate_player_stats(puuid, matches)
        performance_trends = self._calculate_performance_trends(puuid, matches)

        analysis = await self.bedrock_service.identify_strengths_weaknesses(
            player_stats,
            performance_trends
        )

        improvement_tips = await self.bedrock_service.generate_improvement_tips(
            analysis.get("weaknesses", []),
            player_stats
        )

        return {
            "strengths": analysis.get("strengths", []),
            "weaknesses": analysis.get("weaknesses", []),
            "improvement_tips": improvement_tips,
            "stats": player_stats
        }

    def _calculate_player_stats(self, puuid: str, matches: List[Dict]) -> Dict:
        """Calculate aggregate player statistics"""

        stats = {
            "games_played": 0,
            "wins": 0,
            "losses": 0,
            "total_kills": 0,
            "total_deaths": 0,
            "total_assists": 0,
            "total_damage": 0,
            "total_gold": 0,
            "total_cs": 0,
            "total_duration": 0,
            "champions_played": Counter(),
            "roles_played": Counter()
        }

        for match in matches:
            # Find player in match
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            stats["games_played"] += 1
            stats["wins"] += 1 if participant.get("win") else 0
            stats["losses"] += 0 if participant.get("win") else 1
            stats["total_kills"] += participant.get("kills", 0)
            stats["total_deaths"] += participant.get("deaths", 0)
            stats["total_assists"] += participant.get("assists", 0)
            stats["total_damage"] += participant.get("totalDamageDealtToChampions", 0)
            stats["total_gold"] += participant.get("goldEarned", 0)
            stats["total_cs"] += participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)

            game_duration = match["info"].get("gameDuration", 0)
            stats["total_duration"] += game_duration

            champion = participant.get("championName", "Unknown")
            stats["champions_played"][champion] += 1

            role = participant.get("teamPosition", "UNKNOWN")
            if role:
                stats["roles_played"][role] += 1

        # Calculate averages and derived stats
        games = stats["games_played"] or 1

        return {
            "games_played": stats["games_played"],
            "wins": stats["wins"],
            "losses": stats["losses"],
            "win_rate": (stats["wins"] / games) * 100,
            "avg_kills": stats["total_kills"] / games,
            "avg_deaths": stats["total_deaths"] / games,
            "avg_assists": stats["total_assists"] / games,
            "avg_kda": self._calculate_kda(
                stats["total_kills"],
                stats["total_deaths"],
                stats["total_assists"]
            ),
            "total_kills": stats["total_kills"],
            "total_deaths": stats["total_deaths"],
            "total_assists": stats["total_assists"],
            "damage_per_min": (stats["total_damage"] / (stats["total_duration"] / 60)) if stats["total_duration"] > 0 else 0,
            "gold_per_min": (stats["total_gold"] / (stats["total_duration"] / 60)) if stats["total_duration"] > 0 else 0,
            "cs_per_min": (stats["total_cs"] / (stats["total_duration"] / 60)) if stats["total_duration"] > 0 else 0,
            "top_champions": [champ for champ, _ in stats["champions_played"].most_common(10)],
            "main_role": stats["roles_played"].most_common(1)[0][0] if stats["roles_played"] else "UNKNOWN"
        }

    def _calculate_champion_stats(self, puuid: str, matches: List[Dict]) -> List[Dict]:
        """Calculate per-champion statistics"""

        champion_data = defaultdict(lambda: {
            "games": 0,
            "wins": 0,
            "kills": 0,
            "deaths": 0,
            "assists": 0
        })

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            champion = participant.get("championName", "Unknown")
            champion_data[champion]["games"] += 1
            champion_data[champion]["wins"] += 1 if participant.get("win") else 0
            champion_data[champion]["kills"] += participant.get("kills", 0)
            champion_data[champion]["deaths"] += participant.get("deaths", 0)
            champion_data[champion]["assists"] += participant.get("assists", 0)

        # Convert to list and calculate averages
        champion_stats = []
        for champion, data in champion_data.items():
            games = data["games"] or 1
            champion_stats.append({
                "champion": champion,
                "games": data["games"],
                "wins": data["wins"],
                "win_rate": (data["wins"] / games) * 100,
                "avg_kda": self._calculate_kda(
                    data["kills"],
                    data["deaths"],
                    data["assists"]
                )
            })

        # Sort by games played
        champion_stats.sort(key=lambda x: x["games"], reverse=True)
        return champion_stats

    def _calculate_performance_trends(self, puuid: str, matches: List[Dict]) -> Dict:
        """Calculate performance trends over time"""

        kdas = []
        recent_kdas = []

        for i, match in enumerate(matches):
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            kda = self._calculate_kda(
                participant.get("kills", 0),
                participant.get("deaths", 0),
                participant.get("assists", 0)
            )
            kdas.append(kda)

            # Recent performance (last 20% of matches)
            if i < len(matches) * 0.2:
                recent_kdas.append(kda)

        avg_kda = statistics.mean(kdas) if kdas else 0
        recent_avg_kda = statistics.mean(recent_kdas) if recent_kdas else 0

        return {
            "average_kda": avg_kda,
            "recent_kda": recent_avg_kda,
            "trending_up": recent_avg_kda > avg_kda,
            "kda_variance": statistics.variance(kdas) if len(kdas) > 1 else 0
        }

    def _extract_highlights(self, puuid: str, matches: List[Dict]) -> Dict:
        """Extract highlight moments from match history"""

        best_game = None
        best_kda = 0
        pentakills = 0
        highest_damage = 0

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            kda = self._calculate_kda(
                participant.get("kills", 0),
                participant.get("deaths", 0),
                participant.get("assists", 0)
            )

            if kda > best_kda:
                best_kda = kda
                best_game = {
                    "champion": participant.get("championName"),
                    "kda": kda,
                    "kills": participant.get("kills"),
                    "deaths": participant.get("deaths"),
                    "assists": participant.get("assists")
                }

            pentakills += participant.get("pentaKills", 0)

            damage = participant.get("totalDamageDealtToChampions", 0)
            if damage > highest_damage:
                highest_damage = damage

        return {
            "best_game": best_game,
            "pentakills": pentakills,
            "highest_damage": highest_damage
        }

    def _find_participant(self, puuid: str, match: Dict) -> Optional[Dict]:
        """Find participant data for a specific player in a match"""
        if "info" not in match or "participants" not in match["info"]:
            return None

        for participant in match["info"]["participants"]:
            if participant.get("puuid") == puuid:
                return participant

        return None

    def _calculate_kda(self, kills: int, deaths: int, assists: int) -> float:
        """Calculate KDA ratio"""
        if deaths == 0:
            return kills + assists
        return (kills + assists) / deaths
