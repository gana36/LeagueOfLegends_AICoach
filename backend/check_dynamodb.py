"""
Check what data exists in DynamoDB
"""
import boto3
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('lol-player-data')

# Scan first 10 items to see what's in the table
response = table.scan(Limit=10)

print(f"Found {len(response['Items'])} items:")
print("=" * 60)

for item in response['Items']:
    puuid = item.get('puuid', 'Unknown')
    data_type = item.get('dataType', 'Unknown')
    print(f"PUUID: {puuid[:30]}...")
    print(f"DataType: {data_type}")
    print("-" * 60)

# Get unique PUUIDs
unique_puuids = set()
for item in response['Items']:
    unique_puuids.add(item.get('puuid', ''))

print(f"\nUnique PUUIDs found: {len(unique_puuids)}")
for puuid in list(unique_puuids)[:5]:
    # Count matches for this PUUID
    match_response = table.query(
        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
    )
    match_count = len(match_response['Items'])
    print(f"\nFull PUUID: {puuid}")
    print(f"Match count: {match_count}")
