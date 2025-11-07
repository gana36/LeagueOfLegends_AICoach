"""
Dynamic Player Data Service
- Fetches player data from Riot API
- Saves to local filesystem
- Uploads to DynamoDB and MongoDB Atlas
"""

import os
import json
import httpx
import boto3
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

class PlayerDataService:
    def __init__(self):
        self.riot_api_key = os.getenv('RIOT_API_KEY')
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.mongodb_connection = os.getenv('MONGODB_CONNECTION_STRING')

        # Riot API base URLs
        self.base_url_americas = "https://americas.api.riotgames.com"
        self.base_url_na = "https://na1.api.riotgames.com"

        # AWS DynamoDB
        self.dynamodb = boto3.resource('dynamodb', region_name=self.aws_region)
        self.dynamodb_table = self.dynamodb.Table('lol-player-data')

        # MongoDB Atlas
        self.mongo_client = MongoClient(self.mongodb_connection)
        self.mongo_db = self.mongo_client['lol_timelines']

    async def fetch_player_data(self, game_name: str, tag_line: str, match_count: int = 10):
        """
        Fetch all player data from Riot API

        Args:
            game_name: Player's game name (e.g., "Sneaky")
            tag_line: Player's tag line (e.g., "NA1")
            match_count: Number of recent matches to fetch (default: 10)

        Returns:
            Dict with all fetched data and status
        """
        async with httpx.AsyncClient() as client:
            headers = {"X-Riot-Token": self.riot_api_key}

            try:
                # 1. Get account by Riot ID
                print(f"Fetching account for {game_name}#{tag_line}...")
                account_url = f"{self.base_url_americas}/riot/account/v1/accounts/by-riot-id/{game_name}/{tag_line}"
                account_response = await client.get(account_url, headers=headers)
                account_response.raise_for_status()
                account_data = account_response.json()
                puuid = account_data['puuid']

                print(f"✓ Found account: {puuid}")

                # 2. Get summoner by PUUID
                print("Fetching summoner data...")
                summoner_url = f"{self.base_url_na}/lol/summoner/v4/summoners/by-puuid/{puuid}"
                summoner_response = await client.get(summoner_url, headers=headers)
                summoner_response.raise_for_status()
                summoner_data = summoner_response.json()

                # 3. Get match IDs
                print(f"Fetching last {match_count} match IDs...")
                match_ids_url = f"{self.base_url_americas}/lol/match/v5/matches/by-puuid/{puuid}/ids?start=0&count={match_count}"
                match_ids_response = await client.get(match_ids_url, headers=headers)
                match_ids_response.raise_for_status()
                match_ids = match_ids_response.json()

                print(f"✓ Found {len(match_ids)} matches")

                # 4. Get match details
                matches = []
                for i, match_id in enumerate(match_ids, 1):
                    print(f"Fetching match {i}/{len(match_ids)}: {match_id}")
                    match_url = f"{self.base_url_americas}/lol/match/v5/matches/{match_id}"
                    match_response = await client.get(match_url, headers=headers)
                    if match_response.status_code == 200:
                        matches.append(match_response.json())
                    else:
                        print(f"  ⚠️ Failed to fetch match {match_id}")

                # 5. Get match timelines
                timelines = []
                for i, match_id in enumerate(match_ids, 1):
                    print(f"Fetching timeline {i}/{len(match_ids)}: {match_id}")
                    timeline_url = f"{self.base_url_americas}/lol/match/v5/matches/{match_id}/timeline"
                    timeline_response = await client.get(timeline_url, headers=headers)
                    if timeline_response.status_code == 200:
                        timelines.append({
                            'matchId': match_id,
                            'data': timeline_response.json()
                        })
                    else:
                        print(f"  ⚠️ Failed to fetch timeline {match_id}")

                # 6. Get champion mastery
                print("Fetching champion mastery...")
                mastery_url = f"{self.base_url_na}/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top?count=10"
                mastery_response = await client.get(mastery_url, headers=headers)
                champion_mastery = mastery_response.json() if mastery_response.status_code == 200 else []

                # 7. Get ranked data
                print("Fetching ranked data...")
                ranked_url = f"{self.base_url_na}/lol/league/v4/entries/by-summoner/{summoner_data['id']}"
                ranked_response = await client.get(ranked_url, headers=headers)
                ranked_data = ranked_response.json() if ranked_response.status_code == 200 else []

                # 8. Get challenges
                print("Fetching challenges...")
                challenges_url = f"{self.base_url_na}/lol/challenges/v1/player-data/{puuid}"
                challenges_response = await client.get(challenges_url, headers=headers)
                challenges_data = challenges_response.json() if challenges_response.status_code == 200 else {}

                print(f"\n✅ Successfully fetched all data for {game_name}#{tag_line}")

                return {
                    'success': True,
                    'puuid': puuid,
                    'gameName': game_name,
                    'tagLine': tag_line,
                    'account': account_data,
                    'summoner': summoner_data,
                    'matches': matches,
                    'timelines': timelines,
                    'championMastery': champion_mastery,
                    'ranked': ranked_data,
                    'challenges': challenges_data
                }

            except httpx.HTTPStatusError as e:
                error_msg = f"API Error: {e.response.status_code} - {e.response.text}"
                print(f"❌ {error_msg}")
                return {'success': False, 'error': error_msg}
            except Exception as e:
                error_msg = f"Error: {str(e)}"
                print(f"❌ {error_msg}")
                return {'success': False, 'error': error_msg}

    def save_to_filesystem(self, player_data: Dict, base_dir: str = 'player_data') -> str:
        """Save fetched data to filesystem in organized structure"""

        puuid = player_data['puuid']
        game_name = player_data['gameName']
        tag_line = player_data['tagLine']

        # Create player directory
        player_dir = Path(base_dir) / f"{game_name}_{tag_line}_{puuid[:8]}"
        player_dir.mkdir(parents=True, exist_ok=True)

        print(f"\nSaving data to: {player_dir}")

        # Save account
        account_dir = player_dir / 'account'
        account_dir.mkdir(exist_ok=True)
        with open(account_dir / 'account.json', 'w', encoding='utf-8') as f:
            json.dump(player_data['account'], f, indent=2, ensure_ascii=False)

        # Save summoner
        summoner_dir = player_dir / 'summoner'
        summoner_dir.mkdir(exist_ok=True)
        with open(summoner_dir / 'summoner.json', 'w', encoding='utf-8') as f:
            json.dump(player_data['summoner'], f, indent=2)

        # Save matches
        matches_dir = player_dir / 'match_summary'
        matches_dir.mkdir(exist_ok=True)
        for i, match in enumerate(player_data['matches'], 1):
            match_id = match['metadata']['matchId']
            with open(matches_dir / f'match_{i}_{match_id}.json', 'w', encoding='utf-8') as f:
                json.dump(match, f, indent=2)

        # Save timelines
        timelines_dir = player_dir / 'match_timeline'
        timelines_dir.mkdir(exist_ok=True)
        for timeline_obj in player_data['timelines']:
            match_id = timeline_obj['matchId']
            with open(timelines_dir / f'timeline_{match_id}.json', 'w', encoding='utf-8') as f:
                json.dump(timeline_obj['data'], f, indent=2)

        # Save champion mastery
        mastery_dir = player_dir / 'champion_mastery'
        mastery_dir.mkdir(exist_ok=True)
        with open(mastery_dir / 'champion.json', 'w', encoding='utf-8') as f:
            json.dump(player_data['championMastery'], f, indent=2)

        # Save ranked
        ranked_dir = player_dir / 'ranked'
        ranked_dir.mkdir(exist_ok=True)
        with open(ranked_dir / 'ranked.json', 'w', encoding='utf-8') as f:
            json.dump(player_data['ranked'], f, indent=2)

        # Save challenges
        challenges_dir = player_dir / 'challenges'
        challenges_dir.mkdir(exist_ok=True)
        with open(challenges_dir / 'challenges.json', 'w', encoding='utf-8') as f:
            json.dump(player_data['challenges'], f, indent=2)

        # Save README
        readme = {
            'fetch_date': datetime.utcnow().isoformat(),
            'player': f"{game_name}#{tag_line}",
            'puuid': puuid,
            'match_count': len(player_data['matches']),
            'timeline_count': len(player_data['timelines'])
        }
        with open(player_dir / 'README.json', 'w', encoding='utf-8') as f:
            json.dump(readme, f, indent=2)

        print(f"✅ Saved all data to filesystem")
        return str(player_dir)

    def upload_to_dynamodb(self, player_data: Dict) -> int:
        """Upload player data to DynamoDB (except timelines)"""

        puuid = player_data['puuid']
        game_name = player_data['gameName']
        tag_line = player_data['tagLine']
        player_name = f"{game_name}#{tag_line}"

        print(f"\nUploading to DynamoDB...")
        upload_count = 0

        # Helper to convert floats to Decimal
        def convert_floats(obj):
            from decimal import Decimal
            if isinstance(obj, float):
                return Decimal(str(obj))
            elif isinstance(obj, dict):
                return {k: convert_floats(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert_floats(item) for item in obj]
            return obj

        try:
            # 1. Upload account
            self.dynamodb_table.put_item(Item=convert_floats({
                'puuid': puuid,
                'dataType': 'account',
                'playerName': player_name,
                'data': player_data['account'],
                'uploadedAt': datetime.utcnow().isoformat()
            }))
            upload_count += 1
            print(f"  ✓ Uploaded account")

            # 2. Upload summoner
            self.dynamodb_table.put_item(Item=convert_floats({
                'puuid': puuid,
                'dataType': 'summoner',
                'data': player_data['summoner'],
                'uploadedAt': datetime.utcnow().isoformat()
            }))
            upload_count += 1
            print(f"  ✓ Uploaded summoner")

            # 3. Upload matches
            for match in player_data['matches']:
                match_id = match['metadata']['matchId']
                self.dynamodb_table.put_item(Item=convert_floats({
                    'puuid': puuid,
                    'dataType': f'match#{match_id}',
                    'matchId': match_id,
                    'data': match,
                    'uploadedAt': datetime.utcnow().isoformat()
                }))
                upload_count += 1
            print(f"  ✓ Uploaded {len(player_data['matches'])} matches")

            # 4. Upload champion mastery
            self.dynamodb_table.put_item(Item=convert_floats({
                'puuid': puuid,
                'dataType': 'champion_mastery',
                'data': player_data['championMastery'],
                'uploadedAt': datetime.utcnow().isoformat()
            }))
            upload_count += 1
            print(f"  ✓ Uploaded champion mastery")

            # 5. Upload ranked
            if player_data['ranked']:
                self.dynamodb_table.put_item(Item=convert_floats({
                    'puuid': puuid,
                    'dataType': 'ranked',
                    'data': player_data['ranked'],
                    'uploadedAt': datetime.utcnow().isoformat()
                }))
                upload_count += 1
                print(f"  ✓ Uploaded ranked data")

            # 6. Upload challenges
            if player_data['challenges']:
                self.dynamodb_table.put_item(Item=convert_floats({
                    'puuid': puuid,
                    'dataType': 'challenges',
                    'data': player_data['challenges'],
                    'uploadedAt': datetime.utcnow().isoformat()
                }))
                upload_count += 1
                print(f"  ✓ Uploaded challenges")

            print(f"✅ Uploaded {upload_count} items to DynamoDB")
            return upload_count

        except Exception as e:
            print(f"❌ DynamoDB upload error: {e}")
            return upload_count

    def upload_to_mongodb(self, player_data: Dict) -> int:
        """Upload timelines to MongoDB Atlas"""

        puuid = player_data['puuid']
        print(f"\nUploading timelines to MongoDB Atlas...")
        upload_count = 0

        try:
            for timeline_obj in player_data['timelines']:
                match_id = timeline_obj['matchId']
                timeline_data = timeline_obj['data']

                doc = {
                    'matchId': match_id,
                    'puuid': puuid,
                    'data': timeline_data,
                    'uploadedAt': datetime.utcnow()
                }

                # Add metadata
                if 'info' in timeline_data:
                    info = timeline_data['info']
                    doc['gameCreation'] = info.get('gameCreation')
                    doc['gameDuration'] = info.get('gameDuration')
                    doc['frameInterval'] = info.get('frameInterval')
                    doc['frames'] = len(info.get('frames', []))

                # Upsert (update or insert)
                self.mongo_db.timelines.update_one(
                    {'matchId': match_id},
                    {'$set': doc},
                    upsert=True
                )
                upload_count += 1

            print(f"✅ Uploaded {upload_count} timelines to MongoDB")
            return upload_count

        except Exception as e:
            print(f"❌ MongoDB upload error: {e}")
            return upload_count

    async def process_player(self, game_name: str, tag_line: str, match_count: int = 10, save_local: bool = True):
        """
        Complete flow: Fetch → Save → Upload

        Returns:
            Dict with status and summary
        """
        result = {
            'success': False,
            'player': f"{game_name}#{tag_line}",
            'steps': {}
        }

        # Step 1: Fetch from Riot API
        print("="*60)
        print(f"Processing player: {game_name}#{tag_line}")
        print("="*60)

        player_data = await self.fetch_player_data(game_name, tag_line, match_count)

        if not player_data['success']:
            result['error'] = player_data.get('error')
            return result

        result['puuid'] = player_data['puuid']
        result['steps']['fetch'] = {'success': True, 'matches': len(player_data['matches'])}

        # Step 2: Save to filesystem (optional)
        if save_local:
            try:
                player_dir = self.save_to_filesystem(player_data)
                result['steps']['save'] = {'success': True, 'directory': player_dir}
            except Exception as e:
                result['steps']['save'] = {'success': False, 'error': str(e)}

        # Step 3: Upload to DynamoDB
        try:
            dynamo_count = self.upload_to_dynamodb(player_data)
            result['steps']['dynamodb'] = {'success': True, 'itemsUploaded': dynamo_count}
        except Exception as e:
            result['steps']['dynamodb'] = {'success': False, 'error': str(e)}

        # Step 4: Upload to MongoDB
        try:
            mongo_count = self.upload_to_mongodb(player_data)
            result['steps']['mongodb'] = {'success': True, 'timelinesUploaded': mongo_count}
        except Exception as e:
            result['steps']['mongodb'] = {'success': False, 'error': str(e)}

        result['success'] = True
        print("\n" + "="*60)
        print("✅ Processing complete!")
        print("="*60)

        return result
