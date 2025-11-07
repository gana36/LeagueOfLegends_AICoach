import json
import boto3
import os
import time
from decimal import Decimal
from typing import Any, Dict, List
from boto3.dynamodb.types import TypeSerializer
from pathlib import Path
from datetime import datetime

class DynamoDBUploader:
    def __init__(self, region_name='us-east-1'):
        """Initialize DynamoDB client and serializer"""
        self.dynamodb = boto3.client('dynamodb', region_name=region_name)
        self.dynamodb_resource = boto3.resource('dynamodb', region_name=region_name)
        self.serializer = TypeSerializer()

    def convert_floats_to_decimal(self, obj: Any) -> Any:
        """Convert float to Decimal for DynamoDB compatibility"""
        if isinstance(obj, float):
            return Decimal(str(obj))
        elif isinstance(obj, dict):
            return {k: self.convert_floats_to_decimal(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.convert_floats_to_decimal(item) for item in obj]
        return obj

    def create_tables_if_not_exist(self):
        """Create DynamoDB tables with new structure"""
        tables = {
            'lol-player-data': {
                'KeySchema': [
                    {'AttributeName': 'puuid', 'KeyType': 'HASH'},      # Partition key (player)
                    {'AttributeName': 'dataType', 'KeyType': 'RANGE'}   # Sort key (account, matches, etc.)
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'puuid', 'AttributeType': 'S'},
                    {'AttributeName': 'dataType', 'AttributeType': 'S'}
                ]
            },
            'lol-static-data': {
                'KeySchema': [
                    {'AttributeName': 'dataType', 'KeyType': 'HASH'}
                ],
                'AttributeDefinitions': [
                    {'AttributeName': 'dataType', 'AttributeType': 'S'}
                ]
            }
        }

        existing_tables = self.dynamodb.list_tables()['TableNames']

        for table_name, schema in tables.items():
            if table_name not in existing_tables:
                print(f"Creating table: {table_name}")
                try:
                    params = {
                        'TableName': table_name,
                        'KeySchema': schema['KeySchema'],
                        'AttributeDefinitions': schema['AttributeDefinitions'],
                        'BillingMode': 'PAY_PER_REQUEST'  # On-demand pricing, scales automatically
                    }

                    self.dynamodb.create_table(**params)
                    print(f"Table {table_name} created. Waiting for table to be active...")

                    # Wait for table to be created
                    waiter = self.dynamodb.get_waiter('table_exists')
                    waiter.wait(TableName=table_name)
                    print(f"Table {table_name} is now active")
                except Exception as e:
                    print(f"Error creating table {table_name}: {e}")
            else:
                print(f"Table {table_name} already exists")

    def batch_write_items(self, table_name: str, items: List[Dict]):
        """Write items in batches to DynamoDB (max 25 items per batch)"""
        table = self.dynamodb_resource.Table(table_name)
        batch_size = 25
        total_items = len(items)

        print(f"Uploading {total_items} items to {table_name}")

        for i in range(0, total_items, batch_size):
            batch = items[i:i + batch_size]

            with table.batch_writer() as writer:
                for item in batch:
                    try:
                        # Convert floats to Decimal
                        item = self.convert_floats_to_decimal(item)

                        # Check item size before writing
                        item_size = len(json.dumps(item, default=str))
                        if item_size > 380000:  # 380KB threshold
                            print(f"[WARN] Skipping large item: {item.get('dataType', 'unknown')} ({item_size:,} bytes)")
                            continue

                        writer.put_item(Item=item)
                    except Exception as e:
                        print(f"[ERROR] Failed to write item to {table_name}: {e}")
                        print(f"  Item keys: puuid={item.get('puuid', 'N/A')}, dataType={item.get('dataType', 'N/A')}")
                        print(f"  Item size: {len(json.dumps(item, default=str)):,} bytes")

            print(f"Uploaded {min(i + batch_size, total_items)}/{total_items} items to {table_name}")

    def upload_account_data(self, data_dir: str, puuid: str, player_name: str):
        """Upload account data"""
        account_file = os.path.join(data_dir, 'account', 'account.json')
        if os.path.exists(account_file):
            with open(account_file, 'r', encoding='utf-8') as f:
                account_data = json.load(f)

                item = {
                    'puuid': puuid,
                    'dataType': 'account',
                    'playerName': player_name,  # Add player name for easy reference
                    'data': account_data,
                    'uploadedAt': datetime.utcnow().isoformat()
                }

                self.batch_write_items('lol-player-data', [item])
                print("[OK] Account data uploaded")

    def upload_summoner_data(self, data_dir: str, puuid: str):
        """Upload summoner data"""
        summoner_file = os.path.join(data_dir, 'summoner', 'summoner.json')
        if os.path.exists(summoner_file):
            with open(summoner_file, 'r', encoding='utf-8') as f:
                summoner_data = json.load(f)

                item = {
                    'puuid': puuid,
                    'dataType': 'summoner',
                    'data': summoner_data,
                    'uploadedAt': datetime.utcnow().isoformat()
                }

                self.batch_write_items('lol-player-data', [item])
                print("[OK] Summoner data uploaded")

    def upload_matches_data(self, data_dir: str, puuid: str):
        """Upload match data - each match as a separate item"""
        matches_dir = os.path.join(data_dir, 'match_summary')
        if not os.path.exists(matches_dir):
            print("[WARN] No match_summary folder found")
            return

        match_files = [f for f in os.listdir(matches_dir)
                      if f.startswith('match_') and f.endswith('.json')]

        matches = []
        for match_file in match_files:
            with open(os.path.join(matches_dir, match_file), 'r', encoding='utf-8') as f:
                match_data = json.load(f)

                # Extract matchId
                if 'metadata' in match_data and 'matchId' in match_data['metadata']:
                    match_id = match_data['metadata']['matchId']
                else:
                    # Extract from filename: match_1_NA1_5080320781.json
                    # Remove 'match_' prefix and '.json' suffix
                    temp = match_file.replace('match_', '').replace('.json', '')
                    # Remove the number prefix (e.g., "1_" from "1_NA1_5080320781")
                    parts = temp.split('_', 1)
                    match_id = parts[1] if len(parts) > 1 else temp

                item = {
                    'puuid': puuid,
                    'dataType': f'match#{match_id}',  # Use prefix to group all matches
                    'matchId': match_id,
                    'data': match_data,
                    'uploadedAt': datetime.utcnow().isoformat()
                }
                matches.append(item)

        if matches:
            self.batch_write_items('lol-player-data', matches)
            print(f"[OK] {len(matches)} matches uploaded")

    def upload_champion_mastery_data(self, data_dir: str, puuid: str):
        """Upload champion mastery data as a single item"""
        mastery_file = os.path.join(data_dir, 'champion_mastery', 'champion.json')
        if os.path.exists(mastery_file):
            with open(mastery_file, 'r', encoding='utf-8') as f:
                mastery_data = json.load(f)

                item = {
                    'puuid': puuid,
                    'dataType': 'champion_mastery',
                    'data': mastery_data,  # Store entire list
                    'championCount': len(mastery_data) if isinstance(mastery_data, list) else 1,
                    'uploadedAt': datetime.utcnow().isoformat()
                }

                self.batch_write_items('lol-player-data', [item])
                print(f"[OK] Champion mastery data uploaded ({item['championCount']} champions)")

    def upload_ranked_data(self, data_dir: str, puuid: str):
        """Upload ranked data"""
        ranked_file = os.path.join(data_dir, 'ranked', 'ranked.json')
        if os.path.exists(ranked_file):
            with open(ranked_file, 'r', encoding='utf-8') as f:
                ranked_data = json.load(f)

                if ranked_data:  # Only upload if not empty
                    item = {
                        'puuid': puuid,
                        'dataType': 'ranked',
                        'data': ranked_data,
                        'uploadedAt': datetime.utcnow().isoformat()
                    }

                    self.batch_write_items('lol-player-data', [item])
                    print("[OK] Ranked data uploaded")
                else:
                    print("[WARN] Ranked data is empty (player not ranked)")

    def upload_challenges_data(self, data_dir: str, puuid: str):
        """Upload player challenges data"""
        challenges_file = os.path.join(data_dir, 'challenges', 'challenges.json')
        if os.path.exists(challenges_file):
            with open(challenges_file, 'r', encoding='utf-8') as f:
                challenges_data = json.load(f)

                item = {
                    'puuid': puuid,
                    'dataType': 'challenges',
                    'data': challenges_data,
                    'uploadedAt': datetime.utcnow().isoformat()
                }

                self.batch_write_items('lol-player-data', [item])
                print("[OK] Challenges data uploaded")

    def upload_static_data(self, data_dir: str):
        """Upload static/reference data (items, runes, challenge configs) - SHARED by all players"""
        print("\n" + "="*60)
        print("Uploading static reference data (shared by all players)...")
        print("="*60 + "\n")

        static_files = {
            'items': 'item.json',
            'runes': 'runesReforged.json',
            'challenge_config': 'challenges/challenge_config.json'
        }

        MAX_ITEM_SIZE = 350_000  # 350KB limit (DynamoDB max is 400KB, leave buffer)

        for data_type, file_path in static_files.items():
            full_path = os.path.join(data_dir, file_path)
            if os.path.exists(full_path):
                file_size = os.path.getsize(full_path)

                # Check if file is too large
                if file_size > MAX_ITEM_SIZE:
                    print(f"[WARN] Skipping {data_type} ({file_size:,} bytes) - exceeds DynamoDB 400KB limit")
                    print(f"   Recommendation: Store large static files in S3 or serve from CDN")
                    print(f"   File location: {full_path}")
                    continue

                with open(full_path, 'r', encoding='utf-8') as f:
                    static_data = json.load(f)

                    # Double-check serialized size
                    test_record = {
                        'dataType': data_type,
                        'data': static_data,
                        'description': f'Static reference data for {data_type}',
                        'uploadedAt': datetime.utcnow().isoformat()
                    }

                    # Estimate size after conversion to DynamoDB format
                    serialized_size = len(json.dumps(test_record, default=str))

                    if serialized_size > MAX_ITEM_SIZE:
                        print(f"[WARN] Skipping {data_type} ({serialized_size:,} bytes after serialization) - too large")
                        print(f"   Recommendation: Store in S3 or split into chunks")
                        continue

                    self.batch_write_items('lol-static-data', [test_record])
                    print(f"[OK] Static data ({data_type}) uploaded - available to all players")

    def upload_all_data(self, data_dir: str, puuid: str, player_name: str):
        """Upload all data from the Sneaky_data directory"""
        print(f"\n{'='*60}")
        print(f"Starting upload for Player: {player_name}")
        print(f"PUUID: {puuid}")
        print(f"{'='*60}\n")

        # Upload player-specific data to lol-player-data table
        self.upload_account_data(data_dir, puuid, player_name)
        self.upload_summoner_data(data_dir, puuid)
        self.upload_matches_data(data_dir, puuid)
        self.upload_champion_mastery_data(data_dir, puuid)
        self.upload_ranked_data(data_dir, puuid)
        self.upload_challenges_data(data_dir, puuid)

        # Upload static/reference data to lol-static-data table
        self.upload_static_data(data_dir)

        print(f"\n{'='*60}")
        print(f"Upload complete!")
        print(f"{'='*60}\n")

    def query_player_data(self, puuid: str, data_type: str = None):
        """
        Query player data examples

        Args:
            puuid: Player's PUUID
            data_type: Optional - specific data type to fetch
                      - 'account', 'summoner', 'ranked', 'challenges', 'champion_mastery'
                      - 'match#' to get all matches
                      - 'match#NA1_5080320781' to get specific match
        """
        table = self.dynamodb_resource.Table('lol-player-data')

        if data_type:
            if data_type.startswith('match#'):
                if data_type == 'match#':
                    # Get all matches
                    response = table.query(
                        KeyConditionExpression='puuid = :puuid AND begins_with(dataType, :dtype)',
                        ExpressionAttributeValues={
                            ':puuid': puuid,
                            ':dtype': 'match#'
                        }
                    )
                else:
                    # Get specific match
                    response = table.get_item(Key={'puuid': puuid, 'dataType': data_type})
                    return response.get('Item')
            else:
                # Get specific data type
                response = table.get_item(Key={'puuid': puuid, 'dataType': data_type})
                return response.get('Item')
        else:
            # Get all data for player
            response = table.query(
                KeyConditionExpression='puuid = :puuid',
                ExpressionAttributeValues={':puuid': puuid}
            )

        return response.get('Items', [])


def main():
    """Main function to run the upload"""
    # Configuration
    DATA_DIR = 'Sneaky_data'  # Relative to backend directory
    REGION = 'us-east-1'  # Change to your AWS region

    # Read PUUID and player name from account file
    account_file = os.path.join(DATA_DIR, 'account', 'account.json')
    with open(account_file, 'r', encoding='utf-8') as f:
        account_data = json.load(f)
        puuid = account_data.get('puuid')
        player_name = f"{account_data.get('gameName', 'Unknown')}#{account_data.get('tagLine', 'NA1')}"

    if not puuid:
        print("Error: Could not find PUUID in account data")
        return

    # Initialize uploader
    uploader = DynamoDBUploader(region_name=REGION)

    # Create tables
    print("Creating DynamoDB tables if they don't exist...")
    uploader.create_tables_if_not_exist()

    print("\n" + "="*60)
    print("Tables are ready. Starting data upload...")
    print("="*60 + "\n")

    # Small delay to ensure tables are fully ready
    print("Waiting 2 seconds for tables to be fully ready...")
    time.sleep(2)

    # Upload all data
    uploader.upload_all_data(DATA_DIR, puuid, player_name)

    print("\n[SUCCESS] All data has been uploaded to DynamoDB successfully!")
    print("\n" + "="*60)
    print("DATABASE STRUCTURE")
    print("="*60)
    print("\nTable 1: lol-player-data (Player-specific data)")
    print("   Structure: puuid (partition) + dataType (sort key)")
    print("   Data types for Sneaky:")
    print("     - account           (account info)")
    print("     - summoner          (summoner info)")
    print("     - ranked            (ranked stats)")
    print("     - challenges        (player challenges)")
    print("     - champion_mastery  (all champion masteries)")
    print("     - match#<matchId>   (individual matches - 57 items)")
    print("\nTable 2: lol-static-data (Reference data - shared by ALL players)")
    print("   Structure: dataType (primary key)")
    print("   Data types:")
    print("     - runes             (runesReforged.json - for mapping)")
    print("   Note: Large files (items, challenge_config) skipped due to 400KB limit")
    print("         Keep these files locally or use S3/CDN for serving")
    print("\n" + "="*60)
    print("QUERY EXAMPLES")
    print("="*60)
    print("""
# Get all Sneaky's data:
response = table.query(
    KeyConditionExpression='puuid = :puuid',
    ExpressionAttributeValues={':puuid': 'YOUR_PUUID'}
)

# Get specific data (e.g., account):
response = table.get_item(
    Key={'puuid': 'YOUR_PUUID', 'dataType': 'account'}
)

# Get all matches:
response = table.query(
    KeyConditionExpression='puuid = :puuid AND begins_with(dataType, :dtype)',
    ExpressionAttributeValues={':puuid': 'YOUR_PUUID', ':dtype': 'match#'}
)

# Get specific match:
response = table.get_item(
    Key={'puuid': 'YOUR_PUUID', 'dataType': 'match#NA1_5080320781'}
)

# Get static data (items for ANY player):
response = static_table.get_item(
    Key={'dataType': 'items'}
)
""")
    print("\n[SUCCESS] Your data is now organized in DynamoDB like the Sneaky_data folder!")


if __name__ == "__main__":
    main()
