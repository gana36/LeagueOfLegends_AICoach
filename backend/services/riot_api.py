import httpx
from typing import List, Dict, Optional
import asyncio


class RiotAPIClient:
    """Client for interacting with Riot Games API"""

    BASE_URLS = {
        "americas": "https://americas.api.riotgames.com",
        "asia": "https://asia.api.riotgames.com",
        "europe": "https://europe.api.riotgames.com",
        "sea": "https://sea.api.riotgames.com"
    }

    PLATFORM_URLS = {
        "na1": "https://na1.api.riotgames.com",
        "euw1": "https://euw1.api.riotgames.com",
        "kr": "https://kr.api.riotgames.com",
        "br1": "https://br1.api.riotgames.com"
    }

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.headers = {
            "X-Riot-Token": api_key
        }

    async def get_account_by_riot_id(
        self,
        game_name: str,
        tag_line: str,
        region: str = "americas"
    ) -> Dict:
        """Get account information by Riot ID (game name + tag line)"""
        base_url = self.BASE_URLS.get(region, self.BASE_URLS["americas"])
        url = f"{base_url}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_summoner_by_puuid(self, puuid: str, platform: str = "na1") -> Dict:
        """Get summoner information by PUUID"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/summoner/v4/summoners/by-puuid/{puuid}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_match_history(
        self,
        puuid: str,
        region: str = "americas",
        count: int = 20,
        start: int = 0
    ) -> List[str]:
        """Get list of match IDs for a player"""
        base_url = self.BASE_URLS.get(region, self.BASE_URLS["americas"])
        url = f"{base_url}/lol/match/v5/matches/by-puuid/{puuid}/ids"

        params = {
            "start": start,
            "count": count
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def get_match_details(self, match_id: str, region: str = "americas") -> Dict:
        """Get detailed information about a specific match"""
        base_url = self.BASE_URLS.get(region, self.BASE_URLS["americas"])
        url = f"{base_url}/lol/match/v5/matches/{match_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_multiple_matches(
        self,
        match_ids: List[str],
        region: str = "americas"
    ) -> List[Dict]:
        """Get details for multiple matches (with rate limiting)"""
        matches = []

        for match_id in match_ids:
            try:
                match_data = await self.get_match_details(match_id, region)
                matches.append(match_data)
                # Rate limiting - be respectful to Riot API
                await asyncio.sleep(0.1)
            except Exception as e:
                print(f"Error fetching match {match_id}: {e}")
                continue

        return matches

    # ============= CHAMPION MASTERY API =============

    async def get_champion_mastery_by_puuid(
        self,
        puuid: str,
        platform: str = "na1"
    ) -> List[Dict]:
        """Get all champion mastery entries for a player sorted by mastery points"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_champion_mastery_by_champion(
        self,
        puuid: str,
        champion_id: int,
        platform: str = "na1"
    ) -> Dict:
        """Get champion mastery for a specific champion"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/by-champion/{champion_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_top_champion_masteries(
        self,
        puuid: str,
        count: int = 10,
        platform: str = "na1"
    ) -> List[Dict]:
        """Get top N champion masteries by mastery points"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top"

        params = {"count": count}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def get_champion_mastery_score(
        self,
        puuid: str,
        platform: str = "na1"
    ) -> int:
        """Get total mastery score (sum of all champion mastery levels)"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/champion-mastery/v4/scores/by-puuid/{puuid}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    # ============= LEAGUE/RANKED API =============

    async def get_league_entries_by_summoner(
        self,
        summoner_id: str,
        platform: str = "na1"
    ) -> List[Dict]:
        """Get ranked league entries for a summoner (Solo/Duo, Flex, etc.)"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/league/v4/entries/by-summoner/{summoner_id}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_challenger_league(
        self,
        queue: str = "RANKED_SOLO_5x5",
        platform: str = "na1"
    ) -> Dict:
        """Get Challenger league for a specific queue"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/league/v4/challengerleagues/by-queue/{queue}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_grandmaster_league(
        self,
        queue: str = "RANKED_SOLO_5x5",
        platform: str = "na1"
    ) -> Dict:
        """Get Grandmaster league for a specific queue"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/league/v4/grandmasterleagues/by-queue/{queue}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_master_league(
        self,
        queue: str = "RANKED_SOLO_5x5",
        platform: str = "na1"
    ) -> Dict:
        """Get Master league for a specific queue"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/league/v4/masterleagues/by-queue/{queue}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    # ============= CHALLENGES API =============

    async def get_player_challenges(
        self,
        puuid: str,
        platform: str = "na1"
    ) -> Dict:
        """Get all challenge data for a player"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/challenges/v1/player-data/{puuid}"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_challenge_config(
        self,
        platform: str = "na1"
    ) -> List[Dict]:
        """Get configuration for all challenges"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/challenges/v1/challenges/config"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_challenge_percentiles(
        self,
        platform: str = "na1"
    ) -> Dict:
        """Get percentile distribution for all challenges"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/challenges/v1/challenges/percentiles"

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()
            return response.json()

    async def get_challenge_leaderboard(
        self,
        challenge_id: int,
        level: str = "MASTER",
        platform: str = "na1",
        limit: int = 50
    ) -> List[Dict]:
        """Get leaderboard for a specific challenge"""
        platform_url = self.PLATFORM_URLS.get(platform, self.PLATFORM_URLS["na1"])
        url = f"{platform_url}/lol/challenges/v1/challenges/{challenge_id}/leaderboards/by-level/{level}"

        params = {"limit": limit}

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

