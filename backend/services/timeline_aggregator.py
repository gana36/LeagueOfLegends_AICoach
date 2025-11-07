import json
import os
from typing import Dict, List
from collections import defaultdict
import logging
from pymongo import MongoClient
import boto3

logger = logging.getLogger(__name__)


class TimelineAggregator:
    """
    Service to aggregate timeline data for year recap heatmaps.
    Fetches timeline data from MongoDB Atlas and match data from DynamoDB.
    """

    def __init__(self):
        # MongoDB Atlas connection
        self.mongo_connection = os.getenv('MONGODB_CONNECTION_STRING')
        self.mongo_client = MongoClient(self.mongo_connection)
        self.mongo_db = self.mongo_client['lol_timelines']

        # DynamoDB connection
        self.aws_region = os.getenv('AWS_REGION', 'us-east-1')
        self.dynamodb = boto3.resource('dynamodb', region_name=self.aws_region)
        self.dynamodb_table = self.dynamodb.Table('lol-player-data')

    def _get_participant_id_for_puuid(self, match_data: Dict, target_puuid: str) -> int:
        """Get the participant ID for a given PUUID in a match"""
        try:
            participants = match_data['metadata']['participants']
            for idx, puuid in enumerate(participants, 1):
                if puuid == target_puuid:
                    return idx
        except Exception as e:
            logger.error(f"Error getting participant ID: {e}")

        return None

    def _get_match_data_from_dynamodb(self, puuid: str, match_id: str) -> Dict:
        """Fetch match data from DynamoDB"""
        try:
            from boto3.dynamodb.conditions import Key

            response = self.dynamodb_table.query(
                KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').eq(f'match#{match_id}')
            )

            if response['Items']:
                return response['Items'][0].get('data', {})
        except Exception as e:
            logger.error(f"Error fetching match from DynamoDB: {e}")

        return None

    def generate_heatmap_data(self, target_puuid: str, player_name: str = "Player") -> Dict:
        """
        Generate heatmap data for all timeline events for a specific player.
        Fetches data from MongoDB Atlas and DynamoDB.

        Returns:
            Dict with stats and heatmap data for deaths, kills, assists, objectives
        """
        logger.info(f"Generating heatmap data for {player_name}")

        # Get all timelines for this player from MongoDB
        try:
            timelines_cursor = self.mongo_db.timelines.find({'puuid': target_puuid})
            timelines = list(timelines_cursor)
        except Exception as e:
            logger.error(f"Error fetching timelines from MongoDB: {e}")
            return self._empty_response(target_puuid, player_name)

        if not timelines:
            logger.warning(f"No timeline data found in MongoDB for PUUID: {target_puuid}")
            return self._empty_response(target_puuid, player_name)

        logger.info(f"Found {len(timelines)} timelines in MongoDB")

        # Build match_id -> participant_id mapping
        puuid_to_participant_map = {}

        for timeline_doc in timelines:
            try:
                match_id = timeline_doc['matchId']

                # Get match data from DynamoDB to find participant ID
                match_data = self._get_match_data_from_dynamodb(target_puuid, match_id)

                if match_data:
                    participant_id = self._get_participant_id_for_puuid(match_data, target_puuid)
                    if participant_id:
                        puuid_to_participant_map[match_id] = participant_id

            except Exception as e:
                logger.error(f"Error processing timeline for match {timeline_doc.get('matchId')}: {e}")
                continue

        logger.info(f"Found player in {len(puuid_to_participant_map)} matches")

        # Initialize data structures
        heatmap_data = {
            "deaths": [],
            "kills": [],
            "assists": [],
            "objectives": []
        }

        stats = {
            "total_matches": len(puuid_to_participant_map),
            "deaths_count": 0,
            "kills_count": 0,
            "assists_count": 0,
            "objectives_count": 0
        }

        # Timeline statistics - track events by time (in minutes)
        # Each bucket represents a 1-minute interval
        timeline_stats = {
            "deaths": defaultdict(int),
            "kills": defaultdict(int),
            "assists": defaultdict(int),
            "objectives": defaultdict(int)
        }

        # Process each timeline from MongoDB
        for timeline_doc in timelines:
            try:
                match_id = timeline_doc['matchId']

                if match_id not in puuid_to_participant_map:
                    continue

                player_participant_id = puuid_to_participant_map[match_id]
                timeline_data = timeline_doc['data']

                # Process each frame
                for frame in timeline_data['info']['frames']:
                    # Process events
                    for event in frame.get('events', []):
                        if not event.get('position'):
                            continue

                        pos = event['position']
                        timestamp = event['timestamp']

                        # Calculate minute bucket for timeline
                        minute_bucket = timestamp // 60000  # Convert ms to minutes

                        # DEATHS: Player was killed
                        if event['type'] == 'CHAMPION_KILL' and event.get('victimId') == player_participant_id:
                            heatmap_data['deaths'].append({
                                'x': pos['x'],
                                'y': pos['y'],
                                'timestamp': timestamp,
                                'match_id': match_id,
                                'killer_id': event.get('killerId')
                            })
                            stats['deaths_count'] += 1
                            timeline_stats['deaths'][minute_bucket] += 1

                        # KILLS: Player got the kill
                        elif event['type'] == 'CHAMPION_KILL' and event.get('killerId') == player_participant_id:
                            heatmap_data['kills'].append({
                                'x': pos['x'],
                                'y': pos['y'],
                                'timestamp': timestamp,
                                'match_id': match_id,
                                'victim_id': event.get('victimId')
                            })
                            stats['kills_count'] += 1
                            timeline_stats['kills'][minute_bucket] += 1

                        # ASSISTS: Player got an assist
                        elif event['type'] == 'CHAMPION_KILL' and player_participant_id in event.get('assistingParticipantIds', []):
                            heatmap_data['assists'].append({
                                'x': pos['x'],
                                'y': pos['y'],
                                'timestamp': timestamp,
                                'match_id': match_id,
                                'victim_id': event.get('victimId')
                            })
                            stats['assists_count'] += 1
                            timeline_stats['assists'][minute_bucket] += 1

                        # OBJECTIVES: Player participated in objective kills
                        elif event['type'] == 'ELITE_MONSTER_KILL' and event.get('killerId') == player_participant_id:
                            heatmap_data['objectives'].append({
                                'x': pos['x'],
                                'y': pos['y'],
                                'timestamp': timestamp,
                                'match_id': match_id,
                                'monster_type': event.get('monsterType')
                            })
                            stats['objectives_count'] += 1
                            timeline_stats['objectives'][minute_bucket] += 1

                        elif event['type'] == 'BUILDING_KILL':
                            # Check if player was involved
                            assisting = event.get('assistingParticipantIds', [])
                            if player_participant_id in assisting or event.get('killerId') == player_participant_id:
                                heatmap_data['objectives'].append({
                                    'x': pos['x'],
                                    'y': pos['y'],
                                    'timestamp': timestamp,
                                    'match_id': match_id,
                                    'building_type': event.get('buildingType')
                                })
                                stats['objectives_count'] += 1
                                timeline_stats['objectives'][minute_bucket] += 1

            except Exception as e:
                logger.error(f"Error processing timeline for match {match_id}: {e}")
                continue

        logger.info(f"Generated heatmap: {stats}")

        # Convert timeline stats to arrays for easier frontend consumption
        # Calculate cumulative and per-minute averages
        total_matches = len(puuid_to_participant_map) or 1  # Avoid division by zero

        timeline_data = {
            "deaths": self._format_timeline_data(timeline_stats['deaths'], total_matches),
            "kills": self._format_timeline_data(timeline_stats['kills'], total_matches),
            "assists": self._format_timeline_data(timeline_stats['assists'], total_matches),
            "objectives": self._format_timeline_data(timeline_stats['objectives'], total_matches)
        }

        return {
            "player_puuid": target_puuid,
            "player_name": player_name,
            "stats": stats,
            "heatmap_data": heatmap_data,
            "timeline_data": timeline_data
        }

    def _format_timeline_data(self, minute_buckets: Dict[int, int], total_matches: int) -> List[Dict]:
        """
        Format timeline data for frontend consumption.
        Returns array of {minute, count, cumulative, average_per_game}
        """
        if not minute_buckets:
            return []

        # Get max minute to establish range
        max_minute = max(minute_buckets.keys()) if minute_buckets else 0

        result = []
        cumulative = 0

        for minute in range(0, max_minute + 1):
            count = minute_buckets.get(minute, 0)
            cumulative += count

            result.append({
                "minute": minute,
                "count": count,  # Total across all matches
                "cumulative": cumulative,  # Cumulative total
                "average_per_game": round(count / total_matches, 2)  # Average per game
            })

        return result

    def _empty_response(self, puuid: str, player_name: str) -> Dict:
        """Return empty response structure"""
        return {
            "player_puuid": puuid,
            "player_name": player_name,
            "stats": {
                "total_matches": 0,
                "deaths_count": 0,
                "kills_count": 0,
                "assists_count": 0,
                "objectives_count": 0
            },
            "heatmap_data": {
                "deaths": [],
                "kills": [],
                "assists": [],
                "objectives": []
            },
            "timeline_data": {
                "deaths": [],
                "kills": [],
                "assists": [],
                "objectives": []
            }
        }
