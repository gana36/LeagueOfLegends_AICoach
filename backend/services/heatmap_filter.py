"""
Shared heatmap filtering logic
Used by both the API endpoint and the year recap chat agent
"""
import os
import boto3
from boto3.dynamodb.conditions import Key
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)


def filter_heatmap_events(puuid: str, event_type: str, champion_name: str = None,
                          role: str = None, match_count: int = None,
                          game_time_start: int = None, game_time_end: int = None):
    """
    Filter heatmap events based on criteria.

    Args:
        puuid: Player PUUID
        event_type: 'kills', 'deaths', 'assists', or 'objectives'
        champion_name: Optional champion filter
        role: Optional role filter (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
        match_count: Optional number of recent matches
        game_time_start: Optional start of game time range in minutes (e.g., 10)
        game_time_end: Optional end of game time range in minutes (e.g., 15)

    Returns:
        Dict with filtered_events and metadata
    """
    try:
        # Connect to MongoDB
        mongo_connection = os.getenv('MONGODB_CONNECTION_STRING')
        mongo_client = MongoClient(mongo_connection, serverSelectionTimeoutMS=10000)
        mongo_db = mongo_client['lol_timelines']

        # Connect to DynamoDB
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        logger.info(f"Filtering {event_type} - Champion: {champion_name}, Role: {role}, MatchCount: {match_count}, GameTime: {game_time_start}-{game_time_end}")

        # Get timelines
        timelines_cursor = mongo_db.timelines.find({'puuid': puuid})
        timelines = list(timelines_cursor)

        if not timelines:
            return {
                "success": True,
                "filtered_events": [],
                "total_events": 0,
                "matches_analyzed": 0,
                "filters_applied": {
                    "event_type": event_type,
                    "champion": champion_name,
                    "role": role,
                    "match_count": match_count,
                    "game_time_start": game_time_start,
                    "game_time_end": game_time_end
                }
            }

        # Build match metadata
        match_metadata = {}
        participant_id_map = {}

        timelines_to_process = timelines[:match_count] if match_count else timelines

        for timeline_doc in timelines_to_process:
            match_id = timeline_doc['matchId']

            try:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').eq(f'match#{match_id}')
                )

                if response['Items']:
                    match_data = response['Items'][0].get('data', {})

                    # Find participant ID
                    participants_puuids = match_data.get('metadata', {}).get('participants', [])
                    for idx, p_uuid in enumerate(participants_puuids, 1):
                        if p_uuid == puuid:
                            participant_id_map[match_id] = idx
                            break

                    # Extract champion and role
                    participants = match_data.get('info', {}).get('participants', [])
                    for participant in participants:
                        if participant.get('puuid') == puuid:
                            match_metadata[match_id] = {
                                'champion_name': participant.get('championName', 'Unknown'),
                                'role': participant.get('teamPosition', 'Unknown')
                            }
                            break
            except Exception as e:
                logger.error(f"Error fetching match {match_id}: {e}")
                continue

        # Filter events
        filtered_events = []

        for timeline_doc in timelines_to_process:
            match_id = timeline_doc['matchId']

            if match_id not in participant_id_map or match_id not in match_metadata:
                continue

            metadata = match_metadata[match_id]
            participant_id = participant_id_map[match_id]

            # Apply filters
            if champion_name and metadata['champion_name'] != champion_name:
                continue
            if role and metadata['role'] != role:
                continue

            # Process timeline
            timeline_data = timeline_doc['data']

            for frame in timeline_data['info']['frames']:
                for event in frame.get('events', []):
                    if not event.get('position'):
                        continue

                    pos = event['position']
                    timestamp = event['timestamp']

                    # Apply game time filter (timestamp is in milliseconds)
                    game_time_minutes = timestamp / 60000  # Convert ms to minutes
                    if game_time_start is not None and game_time_minutes < game_time_start:
                        continue
                    if game_time_end is not None and game_time_minutes > game_time_end:
                        continue

                    event_matched = False
                    event_data = {
                        'x': pos['x'],
                        'y': pos['y'],
                        'timestamp': timestamp,
                        'match_id': match_id,
                        'champion_name': metadata['champion_name'],
                        'role': metadata['role']
                    }

                    # Match event type
                    if event_type == 'deaths':
                        if event['type'] == 'CHAMPION_KILL' and event.get('victimId') == participant_id:
                            event_data['killer_id'] = event.get('killerId')
                            event_matched = True
                    elif event_type == 'kills':
                        if event['type'] == 'CHAMPION_KILL' and event.get('killerId') == participant_id:
                            event_data['victim_id'] = event.get('victimId')
                            event_matched = True
                    elif event_type == 'assists':
                        if event['type'] == 'CHAMPION_KILL' and participant_id in event.get('assistingParticipantIds', []):
                            event_data['victim_id'] = event.get('victimId')
                            event_matched = True
                    elif event_type == 'objectives':
                        if event['type'] == 'ELITE_MONSTER_KILL' and event.get('killerId') == participant_id:
                            event_data['monster_type'] = event.get('monsterType')
                            event_matched = True
                        elif event['type'] == 'BUILDING_KILL':
                            assisting = event.get('assistingParticipantIds', [])
                            if participant_id in assisting or event.get('killerId') == participant_id:
                                event_data['building_type'] = event.get('buildingType')
                                event_matched = True

                    if event_matched:
                        filtered_events.append(event_data)

        logger.info(f"Filtered to {len(filtered_events)} events from {len(match_metadata)} matches")

        return {
            "success": True,
            "filtered_events": filtered_events,
            "total_events": len(filtered_events),
            "matches_analyzed": len(match_metadata),
            "filters_applied": {
                "event_type": event_type,
                "champion": champion_name,
                "role": role,
                "match_count": match_count,
                "game_time_start": game_time_start,
                "game_time_end": game_time_end
            }
        }

    except Exception as e:
        logger.error(f"Error filtering heatmap: {e}", exc_info=True)
        raise
