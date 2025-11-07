from typing import Dict, List, Optional
import statistics
from collections import Counter, defaultdict
from datetime import datetime


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

        # Extract highlights with enhanced data
        highlights = self._extract_highlights(puuid, matches)
        
        # Calculate improvements (compare recent vs overall performance)
        performance_trends = self._calculate_performance_trends(puuid, matches)
        biggest_improvement = None
        if performance_trends.get("trending_up"):
            improvement_pct = ((performance_trends.get("recent_kda", 0) - performance_trends.get("average_kda", 0)) / 
                              max(performance_trends.get("average_kda", 1), 1)) * 100
            biggest_improvement = {
                "metric": "KDA",
                "improvement": improvement_pct,
                "from": performance_trends.get("average_kda", 0),
                "to": performance_trends.get("recent_kda", 0)
            }

        return {
            "narrative": narrative,
            "stats": player_stats,
            "total_matches": len(matches),
            "highlights": highlights,
            "biggest_improvement": biggest_improvement,
            "mastery": {
                "top_champions": top_masteries[:5],
                "total_score": mastery_score
            },
            "achievements": self._format_challenges(challenges),
            "performance_trends": performance_trends
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
        """Analyze persistent strengths and weaknesses with detailed metrics"""

        match_ids = await self.riot_client.get_match_history(
            puuid, region=region, count=match_count
        )
        matches = await self.riot_client.get_multiple_matches(match_ids, region)

        player_stats = self._calculate_player_stats(puuid, matches)
        performance_trends = self._calculate_performance_trends(puuid, matches)

        # Calculate detailed metrics for strengths/weaknesses
        detailed_metrics = self._calculate_detailed_metrics(puuid, matches)

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
            "stats": player_stats,
            "detailed_metrics": detailed_metrics,
            "performance_trends": performance_trends
        }

    def _calculate_detailed_metrics(self, puuid: str, matches: List[Dict]) -> Dict:
        """Calculate detailed metrics for strengths/weaknesses analysis"""
        
        metrics = {
            "early_game": {"kills": 0, "deaths": 0, "assists": 0, "cs": 0, "games": 0},
            "mid_game": {"kills": 0, "deaths": 0, "assists": 0, "objectives": 0, "games": 0},
            "late_game": {"kills": 0, "deaths": 0, "assists": 0, "teamfights": 0, "games": 0},
            "vision_control": {"wards_placed": 0, "wards_destroyed": 0, "control_wards": 0},
            "objective_control": {"dragons": 0, "barons": 0, "heralds": 0, "towers": 0},
            "consistency": {"win_streaks": [], "loss_streaks": [], "kda_variance": 0}
        }

        current_streak = {"type": None, "count": 0}
        kdas = []

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            game_duration = match["info"].get("gameDuration", 0) / 60
            won = participant.get("win", False)
            
            kda = self._calculate_kda(
                participant.get("kills", 0),
                participant.get("deaths", 0),
                participant.get("assists", 0)
            )
            kdas.append(kda)

            # Track streaks
            if current_streak["type"] == ("win" if won else "loss"):
                current_streak["count"] += 1
            else:
                if current_streak["count"] > 0:
                    if current_streak["type"] == "win":
                        metrics["consistency"]["win_streaks"].append(current_streak["count"])
                    else:
                        metrics["consistency"]["loss_streaks"].append(current_streak["count"])
                current_streak = {"type": "win" if won else "loss", "count": 1}

            # Early game (0-15 min) - approximate from total stats
            if game_duration >= 15:
                metrics["early_game"]["kills"] += participant.get("kills", 0) * 0.4
                metrics["early_game"]["deaths"] += participant.get("deaths", 0) * 0.4
                metrics["early_game"]["assists"] += participant.get("assists", 0) * 0.3
                metrics["early_game"]["cs"] += (participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0)) * 0.5
                metrics["early_game"]["games"] += 1

            # Mid game (15-30 min)
            if 15 <= game_duration <= 30:
                metrics["mid_game"]["kills"] += participant.get("kills", 0) * 0.4
                metrics["mid_game"]["deaths"] += participant.get("deaths", 0) * 0.4
                metrics["mid_game"]["assists"] += participant.get("assists", 0) * 0.5
                metrics["mid_game"]["games"] += 1

            # Late game (30+ min)
            if game_duration > 30:
                metrics["late_game"]["kills"] += participant.get("kills", 0) * 0.2
                metrics["late_game"]["deaths"] += participant.get("deaths", 0) * 0.2
                metrics["late_game"]["assists"] += participant.get("assists", 0) * 0.2
                metrics["late_game"]["games"] += 1

            # Vision control
            metrics["vision_control"]["wards_placed"] += participant.get("wardsPlaced", 0)
            metrics["vision_control"]["wards_destroyed"] += participant.get("wardsKilled", 0)
            metrics["vision_control"]["control_wards"] += participant.get("visionWardsBoughtInGame", 0)

        # Finalize streak
        if current_streak["count"] > 0:
            if current_streak["type"] == "win":
                metrics["consistency"]["win_streaks"].append(current_streak["count"])
            else:
                metrics["consistency"]["loss_streaks"].append(current_streak["count"])

        # Calculate averages
        games = len(matches) or 1
        for phase in ["early_game", "mid_game", "late_game"]:
            phase_games = metrics[phase]["games"] or 1
            if phase_games > 0:
                metrics[phase]["avg_kills"] = metrics[phase]["kills"] / phase_games
                metrics[phase]["avg_deaths"] = metrics[phase]["deaths"] / phase_games
                metrics[phase]["avg_assists"] = metrics[phase]["assists"] / phase_games

        metrics["consistency"]["kda_variance"] = statistics.variance(kdas) if len(kdas) > 1 else 0
        metrics["consistency"]["max_win_streak"] = max(metrics["consistency"]["win_streaks"]) if metrics["consistency"]["win_streaks"] else 0
        metrics["consistency"]["max_loss_streak"] = max(metrics["consistency"]["loss_streaks"]) if metrics["consistency"]["loss_streaks"] else 0

        return metrics

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
        """Calculate performance trends over time with detailed time-series data"""

        kdas = []
        recent_kdas = []
        time_series_data = []  # For progress visualization

        for i, match in enumerate(matches):
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            game_duration = match["info"].get("gameDuration", 0) / 60  # minutes
            game_timestamp = match["info"].get("gameCreation", 0)  # Unix timestamp
            
            kda = self._calculate_kda(
                participant.get("kills", 0),
                participant.get("deaths", 0),
                participant.get("assists", 0)
            )
            kdas.append(kda)

            # Recent performance (last 20% of matches)
            if i < len(matches) * 0.2:
                recent_kdas.append(kda)

            # Time series data for progress visualization
            time_series_data.append({
                "timestamp": game_timestamp,
                "date": game_timestamp,  # Will be formatted on frontend
                "kda": kda,
                "kills": participant.get("kills", 0),
                "deaths": participant.get("deaths", 0),
                "assists": participant.get("assists", 0),
                "win": participant.get("win", False),
                "damage": participant.get("totalDamageDealtToChampions", 0),
                "gold": participant.get("goldEarned", 0),
                "cs": participant.get("totalMinionsKilled", 0) + participant.get("neutralMinionsKilled", 0),
                "vision_score": participant.get("visionScore", 0),
                "champion": participant.get("championName", "Unknown"),
                "role": participant.get("teamPosition", "UNKNOWN"),
                "match_id": match.get("metadata", {}).get("matchId", "")
            })

        avg_kda = statistics.mean(kdas) if kdas else 0
        recent_avg_kda = statistics.mean(recent_kdas) if recent_kdas else 0

        # Calculate rolling averages (last 10 games)
        rolling_avg_kda = []
        for i in range(len(kdas)):
            window = kdas[max(0, i-9):i+1]
            rolling_avg_kda.append(statistics.mean(window))

        return {
            "average_kda": avg_kda,
            "recent_kda": recent_avg_kda,
            "trending_up": recent_avg_kda > avg_kda,
            "kda_variance": statistics.variance(kdas) if len(kdas) > 1 else 0,
            "time_series": time_series_data,
            "rolling_averages": rolling_avg_kda
        }

    def _extract_highlights(self, puuid: str, matches: List[Dict]) -> Dict:
        """Extract highlight moments from match history with detailed stats"""

        best_game = None
        best_kda = 0
        pentakills = 0
        highest_damage = 0
        highest_damage_game = None
        highlight_matches = []
        champion_performance = defaultdict(lambda: {"games": 0, "wins": 0, "total_kda": 0, "best_kda": 0})

        for match in matches:
            participant = self._find_participant(puuid, match)
            if not participant:
                continue

            champion = participant.get("championName", "Unknown")
            kda = self._calculate_kda(
                participant.get("kills", 0),
                participant.get("deaths", 0),
                participant.get("assists", 0)
            )
            won = participant.get("win", False)
            damage = participant.get("totalDamageDealtToChampions", 0)
            kills = participant.get("kills", 0)
            assists = participant.get("assists", 0)

            # Track champion performance
            champion_performance[champion]["games"] += 1
            champion_performance[champion]["wins"] += 1 if won else 0
            champion_performance[champion]["total_kda"] += kda
            if kda > champion_performance[champion]["best_kda"]:
                champion_performance[champion]["best_kda"] = kda

            # Best game by KDA
            if kda > best_kda:
                best_kda = kda
                best_game = {
                    "champion": champion,
                    "kda": round(kda, 2),
                    "kills": kills,
                    "deaths": participant.get("deaths", 0),
                    "assists": assists,
                    "damage": damage,
                    "win": won,
                    "match_id": match.get("metadata", {}).get("matchId", ""),
                    "game_duration": match["info"].get("gameDuration", 0) / 60
                }

            # Highest damage game
            if damage > highest_damage:
                highest_damage = damage
                highest_damage_game = {
                    "champion": champion,
                    "damage": damage,
                    "kda": round(kda, 2),
                    "kills": kills,
                    "assists": assists,
                    "match_id": match.get("metadata", {}).get("matchId", "")
                }

            # Collect highlight matches (exceptional performances)
            if kda >= 5.0 or kills >= 15 or assists >= 20:
                highlight_matches.append({
                    "champion": champion,
                    "kda": round(kda, 2),
                    "kills": kills,
                    "deaths": participant.get("deaths", 0),
                    "assists": assists,
                    "damage": damage,
                    "win": won,
                    "match_id": match.get("metadata", {}).get("matchId", "")
                })

            pentakills += participant.get("pentaKills", 0)

        # Calculate most played champions with stats
        most_played_champions = []
        for champ, data in champion_performance.items():
            games = data["games"]
            most_played_champions.append({
                "champion": champ,
                "games": games,
                "wins": data["wins"],
                "win_rate": (data["wins"] / games * 100) if games > 0 else 0,
                "avg_kda": round(data["total_kda"] / games, 2) if games > 0 else 0,
                "best_kda": round(data["best_kda"], 2)
            })
        most_played_champions.sort(key=lambda x: x["games"], reverse=True)

        return {
            "best_game": best_game,
            "pentakills": pentakills,
            "highest_damage": highest_damage,
            "highest_damage_game": highest_damage_game,
            "highlight_matches": sorted(highlight_matches, key=lambda x: x["kda"], reverse=True)[:10],
            "most_played_champions": most_played_champions[:10]
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

    async def compare_players(
        self,
        puuid1: str,
        puuid2: str,
        match_count: int = 50,
        region: str = "americas"
    ) -> Dict:
        """Compare two players' performance and playstyles"""
        
        # Get stats for both players
        match_ids1 = await self.riot_client.get_match_history(puuid1, region=region, count=match_count)
        match_ids2 = await self.riot_client.get_match_history(puuid2, region=region, count=match_count)
        
        matches1 = await self.riot_client.get_multiple_matches(match_ids1, region)
        matches2 = await self.riot_client.get_multiple_matches(match_ids2, region)
        
        stats1 = self._calculate_player_stats(puuid1, matches1)
        stats2 = self._calculate_player_stats(puuid2, matches2)
        
        # Calculate playstyle compatibility
        compatibility = self._calculate_playstyle_compatibility(stats1, stats2)
        
        return {
            "player1": stats1,
            "player2": stats2,
            "comparison": {
                "win_rate_diff": stats1.get("win_rate", 0) - stats2.get("win_rate", 0),
                "kda_diff": stats1.get("avg_kda", 0) - stats2.get("avg_kda", 0),
                "damage_diff": stats1.get("damage_per_min", 0) - stats2.get("damage_per_min", 0),
                "cs_diff": stats1.get("cs_per_min", 0) - stats2.get("cs_per_min", 0)
            },
            "compatibility": compatibility
        }

    def _calculate_playstyle_compatibility(self, stats1: Dict, stats2: Dict) -> Dict:
        """Calculate how well two players' playstyles complement each other"""
        
        # Determine roles
        role1 = stats1.get("main_role", "UNKNOWN")
        role2 = stats2.get("main_role", "UNKNOWN")
        
        # Complementary role pairs
        complementary_pairs = [
            ("TOP", "JUNGLE"), ("JUNGLE", "MIDDLE"), ("MIDDLE", "BOTTOM"),
            ("BOTTOM", "UTILITY"), ("UTILITY", "BOTTOM")
        ]
        
        role_compatible = (role1, role2) in complementary_pairs or (role2, role1) in complementary_pairs
        
        # Analyze playstyle differences
        kda_diff = abs(stats1.get("avg_kda", 0) - stats2.get("avg_kda", 0))
        damage_diff = abs(stats1.get("damage_per_min", 0) - stats2.get("damage_per_min", 0))
        
        # One aggressive, one supportive = good complement
        one_aggressive = (stats1.get("avg_kills", 0) > 8) != (stats2.get("avg_kills", 0) > 8)
        
        compatibility_score = 0
        if role_compatible:
            compatibility_score += 30
        if one_aggressive:
            compatibility_score += 20
        if kda_diff < 1.0:  # Similar skill level
            compatibility_score += 25
        if damage_diff < 200:  # Similar playstyle intensity
            compatibility_score += 25
        
        return {
            "score": min(100, compatibility_score),
            "role_compatible": role_compatible,
            "skill_level_similar": kda_diff < 1.0,
            "playstyle_complementary": one_aggressive,
            "recommendation": self._generate_compatibility_recommendation(compatibility_score, role1, role2)
        }

    def _generate_compatibility_recommendation(self, score: int, role1: str, role2: str) -> str:
        """Generate a recommendation based on compatibility score"""
        if score >= 80:
            return f"Excellent duo potential! Your {role1} and their {role2} roles complement each other well."
        elif score >= 60:
            return f"Good synergy! Your playstyles work well together, though there's room for improvement."
        elif score >= 40:
            return f"Moderate compatibility. Consider adjusting playstyles to better complement each other."
        else:
            return f"Different playstyles. Focus on communication and role coordination to maximize synergy."

    async def generate_shareable_moments(
        self,
        puuid: str,
        match_count: int = 50,
        region: str = "americas"
    ) -> Dict:
        """Generate shareable moments and insights for social media"""
        
        match_ids = await self.riot_client.get_match_history(puuid, region=region, count=match_count)
        matches = await self.riot_client.get_multiple_matches(match_ids, region)
        
        player_stats = self._calculate_player_stats(puuid, matches)
        highlights = self._extract_highlights(puuid, matches)
        performance_trends = self._calculate_performance_trends(puuid, matches)
        
        # Generate fun, shareable insights
        shareable_insights = self._generate_shareable_insights(player_stats, highlights, performance_trends)
        
        return {
            "shareable_cards": shareable_insights,
            "stats": player_stats,
            "highlights": highlights,
            "trends": performance_trends
        }

    def _generate_shareable_insights(
        self,
        stats: Dict,
        highlights: Dict,
        trends: Dict
    ) -> List[Dict]:
        """Generate fun, shareable insights for social media"""
        
        cards = []
        
        # Most played champion card
        if highlights.get("most_played_champions"):
            top_champ = highlights["most_played_champions"][0]
            cards.append({
                "type": "most_played_champion",
                "title": f"Your Main: {top_champ['champion']}",
                "subtitle": f"{top_champ['games']} games • {top_champ['win_rate']:.1f}% win rate",
                "stat": f"{top_champ['avg_kda']:.2f} KDA",
                "emoji": "🎯",
                "color": "#10B981"
            })
        
        # Best game card
        if highlights.get("best_game"):
            best = highlights["best_game"]
            cards.append({
                "type": "best_game",
                "title": f"Best Game: {best['champion']}",
                "subtitle": f"{best['kills']}/{best['deaths']}/{best['assists']}",
                "stat": f"{best['kda']:.2f} KDA",
                "emoji": "⭐",
                "color": "#F59E0B"
            })
        
        # Improvement card
        if trends.get("trending_up"):
            improvement = ((trends.get("recent_kda", 0) - trends.get("average_kda", 0)) / trends.get("average_kda", 1)) * 100
            cards.append({
                "type": "improvement",
                "title": "On the Rise! 📈",
                "subtitle": f"Recent KDA: {trends.get('recent_kda', 0):.2f}",
                "stat": f"+{improvement:.1f}% improvement",
                "emoji": "📈",
                "color": "#3B82F6"
            })
        
        # Win streak card
        if highlights.get("most_played_champions"):
            # Calculate win streak from trends
            win_streak = 0
            for game in trends.get("time_series", [])[:10]:
                if game.get("win"):
                    win_streak += 1
                else:
                    break
            
            if win_streak >= 3:
                cards.append({
                    "type": "win_streak",
                    "title": f"{win_streak} Game Win Streak! 🔥",
                    "subtitle": "Keep the momentum going!",
                    "stat": f"{win_streak} wins",
                    "emoji": "🔥",
                    "color": "#EF4444"
                })
        
        # Damage dealer card
        if highlights.get("highest_damage_game"):
            damage_game = highlights["highest_damage_game"]
            cards.append({
                "type": "damage_dealer",
                "title": f"Damage King: {damage_game['champion']}",
                "subtitle": f"{damage_game['damage']:,} damage dealt",
                "stat": f"{damage_game['kda']:.2f} KDA",
                "emoji": "💥",
                "color": "#8B5CF6"
            })
        
        # Consistency card
        variance = trends.get("kda_variance", 0)
        if variance < 2.0:
            cards.append({
                "type": "consistency",
                "title": "Consistent Performer 🎯",
                "subtitle": "Your performance is stable",
                "stat": f"{stats.get('win_rate', 0):.1f}% win rate",
                "emoji": "🎯",
                "color": "#06B6D4"
            })
        
        return cards
