"""
Player API Endpoints
FastAPI routes for fetching and storing player data
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
import sys
import os
from pathlib import Path
from pymongo import MongoClient

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from services.player_data_service import PlayerDataService

router = APIRouter(prefix="/api/player", tags=["player"])

# Initialize MongoDB client once (reuse connection)
_mongo_client = None

def get_mongo_client():
    """Get or create MongoDB client singleton"""
    global _mongo_client
    if _mongo_client is None:
        connection_string = os.getenv('MONGODB_CONNECTION_STRING')
        _mongo_client = MongoClient(
            connection_string,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
            connectTimeoutMS=5000,
            socketTimeoutMS=5000
        )
    return _mongo_client

# Request/Response models
class PlayerRequest(BaseModel):
    gameName: str
    tagLine: str
    matchCount: Optional[int] = 10
    saveLocal: Optional[bool] = True

class PlayerResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None

# Initialize service
player_service = PlayerDataService()

@router.post("/fetch", response_model=PlayerResponse)
async def fetch_player_data(request: PlayerRequest):
    """
    Fetch player data from Riot API and upload to databases

    Args:
        gameName: Player's game name (e.g., "Sneaky")
        tagLine: Player's tag line (e.g., "NA1")
        matchCount: Number of recent matches to fetch (default: 10)
        saveLocal: Whether to save data locally (default: True)

    Returns:
        Success status and processing summary
    """
    try:
        # Process player (fetch + save + upload)
        result = await player_service.process_player(
            game_name=request.gameName,
            tag_line=request.tagLine,
            match_count=request.matchCount,
            save_local=request.saveLocal
        )

        if not result['success']:
            raise HTTPException(
                status_code=400,
                detail=result.get('error', 'Failed to process player')
            )

        return PlayerResponse(
            success=True,
            message=f"Successfully processed {request.gameName}#{request.tagLine}",
            data=result
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/{puuid}")
async def get_player_data(puuid: str):
    """
    Get player data from DynamoDB

    Args:
        puuid: Player's PUUID

    Returns:
        All player data from DynamoDB
    """
    try:
        import boto3
        import os

        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Query all data for this player
        response = table.query(
            KeyConditionExpression='puuid = :puuid',
            ExpressionAttributeValues={':puuid': puuid}
        )

        items = response['Items']

        # Organize data by type
        data = {
            'account': None,
            'summoner': None,
            'matches': [],
            'championMastery': None,
            'ranked': None,
            'challenges': None
        }

        for item in items:
            data_type = item['dataType']

            if data_type == 'account':
                data['account'] = item.get('data')
            elif data_type == 'summoner':
                data['summoner'] = item.get('data')
            elif data_type.startswith('match#'):
                data['matches'].append(item.get('data'))
            elif data_type == 'champion_mastery':
                data['championMastery'] = item.get('data')
            elif data_type == 'ranked':
                data['ranked'] = item.get('data')
            elif data_type == 'challenges':
                data['challenges'] = item.get('data')

        # Sort matches by date (newest first)
        if data['matches']:
            data['matches'].sort(
                key=lambda x: x.get('info', {}).get('gameCreation', 0),
                reverse=True
            )

        return {
            'success': True,
            'puuid': puuid,
            'data': data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/match/timeline/{match_id}")
async def get_match_timeline(match_id: str):
    """
    Get match timeline from MongoDB Atlas

    Args:
        match_id: Match ID (e.g., "NA1_5080320781")

    Returns:
        Match timeline data
    """
    try:
        import logging

        logger = logging.getLogger(__name__)
        logger.info(f"Fetching timeline for match: {match_id}")

        # Use the shared MongoDB client
        mongo_client = get_mongo_client()
        mongo_db = mongo_client['lol_timelines']

        timeline_doc = mongo_db.timelines.find_one(
            {'matchId': match_id},
            {'_id': 0}  # Exclude MongoDB's _id field
        )

        if not timeline_doc:
            logger.warning(f"Timeline not found for match: {match_id}")
            raise HTTPException(status_code=404, detail="Timeline not found")

        logger.info(f"Timeline document keys: {timeline_doc.keys()}")

        # Extract the actual timeline data (nested inside 'data' field)
        # The 'data' field contains the full timeline from Riot API
        timeline_data = timeline_doc.get('data', {})

        logger.info(f"Timeline data extracted, has info: {'info' in timeline_data}")

        return {
            'success': True,
            'matchId': match_id,
            'timeline': timeline_data  # Return the timeline data directly
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching timeline: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search/{game_name}/{tag_line}")
async def search_player(game_name: str, tag_line: str):
    """
    Search for a player in the database

    Args:
        game_name: Player's game name
        tag_line: Player's tag line

    Returns:
        Player account info if found in database
    """
    try:
        import boto3
        import os

        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Scan for player by name (not efficient for large databases)
        # For production, consider adding a GSI on playerName
        response = table.scan(
            FilterExpression='playerName = :name',
            ExpressionAttributeValues={
                ':name': f"{game_name}#{tag_line}"
            },
            Limit=1
        )

        items = response['Items']

        if not items:
            return {
                'success': False,
                'found': False,
                'message': f"Player {game_name}#{tag_line} not found in database"
            }

        account_item = items[0]
        return {
            'success': True,
            'found': True,
            'puuid': account_item['puuid'],
            'playerName': account_item.get('playerName'),
            'data': account_item.get('data')
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/matches/{puuid}")
async def get_player_matches(puuid: str):
    """
    Get list of all matches for a player from DynamoDB

    Args:
        puuid: Player's PUUID

    Returns:
        List of matches with summary info for selection
    """
    try:
        import boto3
        import os
        from datetime import datetime

        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Query all match data for this player with pagination
        # Note: dataType is the sort key in the lol-player-data table
        from boto3.dynamodb.conditions import Key

        matches = []
        last_evaluated_key = None

        # Paginate through all results
        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                )

            # Process items from this page
            for item in response['Items']:
                match_data = item.get('data', {})
                match_info = match_data.get('info', {})
                match_metadata = match_data.get('metadata', {})

                # Find the player's participant data
                participants = match_info.get('participants', [])
                player_data = next((p for p in participants if p.get('puuid') == puuid), None)

                if player_data:
                    match_summary = {
                        'matchId': match_metadata.get('matchId'),
                        'gameCreation': match_info.get('gameCreation'),
                        'gameDuration': match_info.get('gameDuration'),
                        'gameMode': match_info.get('gameMode'),
                        'championName': player_data.get('championName'),
                        'championId': player_data.get('championId'),
                        'kills': player_data.get('kills'),
                        'deaths': player_data.get('deaths'),
                        'assists': player_data.get('assists'),
                        'win': player_data.get('win'),
                        'role': player_data.get('teamPosition'),
                        'fullData': match_data  # Include full match data
                    }
                    matches.append(match_summary)

            # Check if there are more results to fetch
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        # Sort by game creation time (newest first)
        matches.sort(key=lambda x: x.get('gameCreation', 0), reverse=True)

        return {
            'success': True,
            'puuid': puuid,
            'matchCount': len(matches),
            'matches': matches
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
