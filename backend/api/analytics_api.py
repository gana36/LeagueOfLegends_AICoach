"""
Analytics API Endpoints
FastAPI routes for performance analytics and statistics
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
import boto3
from boto3.dynamodb.conditions import Key
from collections import defaultdict

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


class VisionStatsRequest(BaseModel):
    puuid: str


def get_player_participant_data(match_data: Dict, target_puuid: str) -> Optional[Dict]:
    """Find the player's participant data in a match"""
    try:
        participants = match_data.get('info', {}).get('participants', [])
        for participant in participants:
            if participant.get('puuid') == target_puuid:
                return participant
    except Exception as e:
        print(f"Error finding participant: {e}")
    return None


@router.post("/performance")
async def get_performance_analytics(request: VisionStatsRequest):
    """
    Get complete performance analytics for a player in one call

    Returns:
        - Vision control stats (wards, vision score)
        - Objective control stats (dragons, barons, towers)
        - Items and runes (most used with pick rates)
        - Performance trends (gold, damage, deaths, vision per match)
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Fetch all matches with pagination (do this once!)
        matches = []
        last_evaluated_key = None

        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#'),
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#')
                )

            matches.extend(response['Items'])

            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        if not matches:
            raise HTTPException(status_code=404, detail="No matches found for player")

        # Initialize aggregation containers
        vision_totals = {
            'wardsPlaced': 0, 'wardsKilled': 0, 'controlWardsPlaced': 0,
            'stealthWardsPlaced': 0, 'visionScore': 0, 'visionWardsBoughtInGame': 0,
            'gameDuration': 0
        }

        objective_totals = {
            'dragonTakedowns': 0, 'baronTakedowns': 0, 'turretTakedowns': 0,
            'firstBloodCount': 0, 'firstTowerCount': 0, 'inhibitorTakedowns': 0,
            'objectivesStolen': 0, 'teamObjectives': 0
        }

        item_counts = defaultdict(int)
        rune_counts = defaultdict(int)

        # Performance trends - store per match
        performance_trends = []

        match_count = 0

        # Process all matches in one pass
        for match_item in matches:
            match_data = match_item.get('data', {})
            player_data = get_player_participant_data(match_data, request.puuid)

            if not player_data:
                continue

            match_count += 1
            match_info = match_data.get('info', {})

            # === Vision Stats ===
            vision_totals['wardsPlaced'] += int(player_data.get('wardsPlaced', 0))
            vision_totals['wardsKilled'] += int(player_data.get('wardsKilled', 0))
            vision_totals['controlWardsPlaced'] += int(player_data.get('detectorWardsPlaced', 0))
            vision_totals['stealthWardsPlaced'] += int(player_data.get('challenges', {}).get('stealthWardsPlaced', 0) or 0)
            vision_totals['visionScore'] += int(player_data.get('visionScore', 0))
            vision_totals['visionWardsBoughtInGame'] += int(player_data.get('visionWardsBoughtInGame', 0))

            game_duration = int(match_info.get('gameDuration', 0))
            vision_totals['gameDuration'] += game_duration

            # === Objective Stats ===
            challenges = player_data.get('challenges', {})
            objective_totals['dragonTakedowns'] += int(challenges.get('dragonTakedowns', 0) or 0)
            objective_totals['baronTakedowns'] += int(challenges.get('teamBaronKills', 0) or 0)
            objective_totals['turretTakedowns'] += int(player_data.get('turretKills', 0))
            objective_totals['inhibitorTakedowns'] += int(player_data.get('inhibitorKills', 0))
            objective_totals['firstBloodCount'] += 1 if player_data.get('firstBloodKill') else 0
            objective_totals['firstTowerCount'] += 1 if player_data.get('firstTowerKill') else 0
            objective_totals['objectivesStolen'] += int(challenges.get('objectivesStolen', 0) or 0)
            objective_totals['teamObjectives'] += int(challenges.get('teamBaronKills', 0) or 0) + int(challenges.get('teamElderDragonKills', 0) or 0)

            # === Items ===
            for i in range(7):
                item_id = player_data.get(f'item{i}', 0)
                if item_id > 0:
                    item_counts[item_id] += 1

            # === Runes ===
            perks = player_data.get('perks', {})
            primary_style = perks.get('styles', [{}])[0] if perks.get('styles') else {}
            if primary_style:
                for selection in primary_style.get('selections', []):
                    perk_id = selection.get('perk')
                    if perk_id:
                        rune_counts[perk_id] += 1

            # === Performance Trends ===
            game_duration_minutes = game_duration / 60 if game_duration > 0 else 1
            performance_trends.append({
                'matchId': match_data.get('metadata', {}).get('matchId'),
                'gameCreation': match_info.get('gameCreation'),
                'goldPerMinute': round(player_data.get('goldEarned', 0) / game_duration_minutes, 1),
                'damageToChampions': player_data.get('totalDamageDealtToChampions', 0),
                'deaths': player_data.get('deaths', 0),
                'visionScore': player_data.get('visionScore', 0),
                'kda': round((player_data.get('kills', 0) + player_data.get('assists', 0)) / max(player_data.get('deaths', 0), 1), 2),
                'win': player_data.get('win', False)
            })

        if match_count == 0:
            raise HTTPException(status_code=404, detail="No valid match data found")

        # === Calculate Vision Averages ===
        vision_averages = {
            'wardsPlaced': round(vision_totals['wardsPlaced'] / match_count, 1),
            'wardsKilled': round(vision_totals['wardsKilled'] / match_count, 1),
            'controlWards': round(vision_totals['controlWardsPlaced'] / match_count, 1),
            'stealthWardsPlaced': round(vision_totals['stealthWardsPlaced'] / match_count, 1),
            'detectorWardsPlaced': round(vision_totals['controlWardsPlaced'] / match_count, 1),
            'visionScore': round(vision_totals['visionScore'] / match_count, 1),
            'visionWardsBought': round(vision_totals['visionWardsBoughtInGame'] / match_count, 1)
        }

        # === Calculate Objective Averages ===
        objective_averages = {
            'dragons': round(objective_totals['dragonTakedowns'] / match_count, 2),
            'barons': round(objective_totals['baronTakedowns'] / match_count, 2),
            'heralds': 0,
            'towers': round(objective_totals['turretTakedowns'] / match_count, 2),
            'inhibitors': round(objective_totals['inhibitorTakedowns'] / match_count, 2),
            'firstBloodRate': round((objective_totals['firstBloodCount'] / match_count) * 100, 1),
            'firstTowerRate': round((objective_totals['firstTowerCount'] / match_count) * 100, 1),
            'objectivesStolen': round(objective_totals['objectivesStolen'] / match_count, 2)
        }

        objective_participation = round((objective_averages['dragons'] + objective_averages['barons']) * 10, 1)

        # === Top Items ===
        top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        items_with_rates = [
            {
                'itemId': item_id,
                'pickRate': round((count / match_count) * 100, 1),
                'pickCount': count
            }
            for item_id, count in top_items
        ]

        # === Top Runes ===
        top_runes = sorted(rune_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        runes_with_rates = [
            {
                'runeId': rune_id,
                'pickRate': round((count / match_count) * 100, 1),
                'pickCount': count
            }
            for rune_id, count in top_runes
        ]

        # Sort performance trends by date (newest first for display)
        performance_trends.sort(key=lambda x: x.get('gameCreation', 0), reverse=True)

        # === Return Everything ===
        return {
            'success': True,
            'matchCount': match_count,
            'vision': {
                'averages': vision_averages,
                'totals': vision_totals
            },
            'objectives': {
                'averages': objective_averages,
                'participation': min(100, objective_participation),
                'totals': objective_totals
            },
            'items': {
                'topItems': items_with_rates
            },
            'runes': {
                'topRunes': runes_with_rates
            },
            'trends': {
                'matches': performance_trends[:20]  # Last 20 matches for charts
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Performance analytics error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vision-control")
async def get_vision_control_stats(request: VisionStatsRequest):
    """
    Get vision control statistics for a player across all matches

    Returns:
        - Average wards placed/killed/control wards
        - Vision score
        - Ward uptime and vision denial percentages
        - Game phase breakdown (early/mid/late)
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Fetch all matches with pagination
        matches = []
        last_evaluated_key = None

        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#'),
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#')
                )

            matches.extend(response['Items'])

            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        if not matches:
            raise HTTPException(status_code=404, detail="No matches found for player")

        # Aggregate vision stats
        total_stats = {
            'wardsPlaced': 0,
            'wardsKilled': 0,
            'controlWardsPlaced': 0,
            'stealthWardsPlaced': 0,
            'detectorWardsPlaced': 0,
            'visionScore': 0,
            'visionWardsBoughtInGame': 0,
            'gameDuration': 0
        }

        match_count = 0

        for match_item in matches:
            match_data = match_item.get('data', {})
            player_data = get_player_participant_data(match_data, request.puuid)

            if not player_data:
                continue

            match_count += 1

            # Aggregate basic stats (convert Decimal to int/float)
            total_stats['wardsPlaced'] += int(player_data.get('wardsPlaced', 0))
            total_stats['wardsKilled'] += int(player_data.get('wardsKilled', 0))
            total_stats['controlWardsPlaced'] += int(player_data.get('detectorWardsPlaced', 0))  # Control wards
            total_stats['stealthWardsPlaced'] += int(player_data.get('challenges', {}).get('stealthWardsPlaced', 0) or 0)
            total_stats['visionScore'] += int(player_data.get('visionScore', 0))
            total_stats['visionWardsBoughtInGame'] += int(player_data.get('visionWardsBoughtInGame', 0))

            game_duration = int(match_data.get('info', {}).get('gameDuration', 0))
            total_stats['gameDuration'] += game_duration

        if match_count == 0:
            raise HTTPException(status_code=404, detail="No valid match data found")

        # Calculate averages
        avg_stats = {
            'wardsPlaced': round(total_stats['wardsPlaced'] / match_count, 1),
            'wardsKilled': round(total_stats['wardsKilled'] / match_count, 1),
            'controlWards': round(total_stats['controlWardsPlaced'] / match_count, 1),
            'stealthWardsPlaced': round(total_stats['stealthWardsPlaced'] / match_count, 1),
            'detectorWardsPlaced': round(total_stats['controlWardsPlaced'] / match_count, 1),  # Same as control wards
            'visionScore': round(total_stats['visionScore'] / match_count, 1),
            'visionWardsBought': round(total_stats['visionWardsBoughtInGame'] / match_count, 1)
        }

        # Calculate ward uptime and vision denial (estimates)
        avg_game_duration_minutes = (total_stats['gameDuration'] / match_count) / 60
        max_possible_wards = avg_game_duration_minutes * 0.5  # Rough estimate
        ward_uptime = min(100, round((avg_stats['wardsPlaced'] / max_possible_wards) * 100)) if max_possible_wards > 0 else 0

        # Vision denial is based on wards killed vs wards placed
        vision_denial = round((avg_stats['wardsKilled'] / (avg_stats['wardsPlaced'] + avg_stats['wardsKilled'])) * 100) if (avg_stats['wardsPlaced'] + avg_stats['wardsKilled']) > 0 else 0

        return {
            'success': True,
            'matchCount': match_count,
            'averages': avg_stats,
            'wardUptime': ward_uptime,
            'visionDenial': vision_denial,
            'totals': total_stats
        }

    except HTTPException:
        raise
    except Exception as e:
        import logging
        import traceback
        logger = logging.getLogger(__name__)
        logger.error(f"Vision control error: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/objective-control")
async def get_objective_control_stats(request: VisionStatsRequest):
    """
    Get objective control statistics for a player

    Returns:
        - Dragon, Baron, Herald, Tower participation
        - Objective control rate
        - First blood/tower/objective rates
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Fetch all matches with pagination
        matches = []
        last_evaluated_key = None

        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#'),
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#')
                )

            matches.extend(response['Items'])

            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        if not matches:
            raise HTTPException(status_code=404, detail="No matches found")

        # Aggregate objective stats
        total_objectives = {
            'dragonTakedowns': 0,
            'baronTakedowns': 0,
            'turretTakedowns': 0,
            'firstBloodCount': 0,
            'firstTowerCount': 0,
            'inhibitorTakedowns': 0,
            'objectivesStolen': 0,
            'teamObjectives': 0
        }

        match_count = 0

        for match_item in matches:
            match_data = match_item.get('data', {})
            player_data = get_player_participant_data(match_data, request.puuid)

            if not player_data:
                continue

            match_count += 1

            # Get challenges data
            challenges = player_data.get('challenges', {})

            # Aggregate stats using participation (challenges) instead of just kills
            # Dragons: Use dragonTakedowns for participation
            total_objectives['dragonTakedowns'] += int(challenges.get('dragonTakedowns', 0) or 0)

            # Barons: Use teamBaronKills for participation
            total_objectives['baronTakedowns'] += int(challenges.get('teamBaronKills', 0) or 0)

            # Turrets and inhibitors from direct stats
            total_objectives['turretTakedowns'] += int(player_data.get('turretKills', 0))
            total_objectives['inhibitorTakedowns'] += int(player_data.get('inhibitorKills', 0))

            # First blood and first tower
            total_objectives['firstBloodCount'] += 1 if player_data.get('firstBloodKill') else 0
            total_objectives['firstTowerCount'] += 1 if player_data.get('firstTowerKill') else 0

            # Objectives stolen
            total_objectives['objectivesStolen'] += int(challenges.get('objectivesStolen', 0) or 0)
            total_objectives['teamObjectives'] += int(challenges.get('teamBaronKills', 0) or 0) + int(challenges.get('teamElderDragonKills', 0) or 0)

        if match_count == 0:
            raise HTTPException(status_code=404, detail="No valid match data")

        # Calculate averages
        avg_objectives = {
            'dragons': round(total_objectives['dragonTakedowns'] / match_count, 2),
            'barons': round(total_objectives['baronTakedowns'] / match_count, 2),
            'heralds': 0,  # Would need timeline data for accurate herald stats
            'towers': round(total_objectives['turretTakedowns'] / match_count, 2),
            'inhibitors': round(total_objectives['inhibitorTakedowns'] / match_count, 2),
            'firstBloodRate': round((total_objectives['firstBloodCount'] / match_count) * 100, 1),
            'firstTowerRate': round((total_objectives['firstTowerCount'] / match_count) * 100, 1),
            'objectivesStolen': round(total_objectives['objectivesStolen'] / match_count, 2)
        }

        # Calculate participation rate (rough estimate)
        participation = round((avg_objectives['dragons'] + avg_objectives['barons']) * 10, 1)  # Rough estimate

        return {
            'success': True,
            'matchCount': match_count,
            'averages': avg_objectives,
            'participation': min(100, participation),
            'totals': total_objectives
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/items-runes")
async def get_items_runes_stats(request: VisionStatsRequest):
    """
    Get most used items and runes for a player

    Returns:
        - Most picked core items with pick rates
        - Most used rune pages with pick rates
    """
    try:
        dynamodb = boto3.resource('dynamodb', region_name=os.getenv('AWS_REGION', 'us-east-1'))
        table = dynamodb.Table('lol-player-data')

        # Fetch all matches
        matches = []
        last_evaluated_key = None

        while True:
            if last_evaluated_key:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#'),
                    ExclusiveStartKey=last_evaluated_key
                )
            else:
                response = table.query(
                    KeyConditionExpression=Key('puuid').eq(request.puuid) & Key('dataType').begins_with('match#')
                )

            matches.extend(response['Items'])

            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break

        if not matches:
            raise HTTPException(status_code=404, detail="No matches found")

        # Track item and rune frequency
        item_counts = defaultdict(int)
        rune_counts = defaultdict(int)
        match_count = 0

        for match_item in matches:
            match_data = match_item.get('data', {})
            player_data = get_player_participant_data(match_data, request.puuid)

            if not player_data:
                continue

            match_count += 1

            # Count items (item slots 0-6)
            for i in range(7):
                item_id = player_data.get(f'item{i}', 0)
                if item_id > 0:
                    item_counts[item_id] += 1

            # Count runes
            perks = player_data.get('perks', {})
            primary_style = perks.get('styles', [{}])[0] if perks.get('styles') else {}

            # Primary rune tree
            if primary_style:
                for selection in primary_style.get('selections', []):
                    perk_id = selection.get('perk')
                    if perk_id:
                        rune_counts[perk_id] += 1

        if match_count == 0:
            raise HTTPException(status_code=404, detail="No valid match data")

        # Get top items (sorted by frequency)
        top_items = sorted(item_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        items_with_rates = [
            {
                'itemId': item_id,
                'pickRate': round((count / match_count) * 100, 1),
                'pickCount': count
            }
            for item_id, count in top_items
        ]

        # Get top runes
        top_runes = sorted(rune_counts.items(), key=lambda x: x[1], reverse=True)[:8]
        runes_with_rates = [
            {
                'runeId': rune_id,
                'pickRate': round((count / match_count) * 100, 1),
                'pickCount': count
            }
            for rune_id, count in top_runes
        ]

        return {
            'success': True,
            'matchCount': match_count,
            'topItems': items_with_rates,
            'topRunes': runes_with_rates
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
