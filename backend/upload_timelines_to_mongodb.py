"""
Upload match timelines to MongoDB Atlas (for files > 400KB that don't fit in DynamoDB)
Uses MongoDB Atlas free tier (512 MB storage)
"""

import json
import os
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class MongoDBTimelineUploader:
    def __init__(self, connection_string):
        """
        Initialize MongoDB Atlas connection

        Connection string format (from MongoDB Atlas):
        mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
        """
        print("Connecting to MongoDB Atlas...")
        try:
            self.client = MongoClient(connection_string)

            # Test connection
            self.client.admin.command('ping')
            print("[OK] Connected to MongoDB Atlas successfully")

            # Use database
            self.db = self.client['lol_timelines']

        except ConnectionFailure as e:
            print(f"[ERROR] Failed to connect to MongoDB Atlas: {e}")
            raise

    def create_indexes(self):
        """Create indexes for efficient queries"""
        print("\nCreating indexes...")

        # Timelines collection indexes
        self.db.timelines.create_index([("matchId", ASCENDING)], unique=True)
        self.db.timelines.create_index([("puuid", ASCENDING)])
        self.db.timelines.create_index([
            ("puuid", ASCENDING),
            ("gameCreation", DESCENDING)
        ])

        print("[OK] Created indexes on 'timelines' collection")

    def upload_timelines(self, data_dir: str, puuid: str):
        """Upload all match timelines"""
        timeline_dir = os.path.join(data_dir, 'match_timeline')

        if not os.path.exists(timeline_dir):
            print("[WARN] No match_timeline folder found")
            return 0

        timeline_files = [f for f in os.listdir(timeline_dir)
                         if f.endswith('.json')]

        if not timeline_files:
            print("[WARN] No timeline files found")
            return 0

        print(f"\nUploading {len(timeline_files)} timeline files...")

        uploaded = 0
        skipped_large = 0
        skipped_exists = 0

        for i, timeline_file in enumerate(timeline_files, 1):
            file_path = os.path.join(timeline_dir, timeline_file)
            file_size = os.path.getsize(file_path)

            # Extract match ID from filename: timeline_NA1_5080320781.json
            match_id = timeline_file.replace('timeline_', '').replace('.json', '')

            # Check if already exists
            if self.db.timelines.find_one({'matchId': match_id}):
                skipped_exists += 1
                continue

            with open(file_path, 'r', encoding='utf-8') as f:
                timeline_data = json.load(f)

            # Create document
            doc = {
                'matchId': match_id,
                'puuid': puuid,
                'data': timeline_data,
                'uploadedAt': datetime.utcnow(),
                'fileSize': file_size
            }

            # Extract metadata if available
            if 'metadata' in timeline_data:
                doc['metadata'] = timeline_data['metadata']

            if 'info' in timeline_data:
                info = timeline_data['info']
                doc['gameCreation'] = info.get('gameCreation')
                doc['gameDuration'] = info.get('gameDuration')
                doc['frameInterval'] = info.get('frameInterval')
                doc['frames'] = len(info.get('frames', []))

            # Check document size (16 MB limit in MongoDB)
            doc_size = len(json.dumps(doc, default=str))
            if doc_size > 15_000_000:  # 15 MB threshold
                print(f"[WARN] Timeline {match_id} too large ({doc_size:,} bytes / {doc_size/1024/1024:.2f} MB), skipping")
                skipped_large += 1
                continue

            # Insert document
            try:
                self.db.timelines.insert_one(doc)
                uploaded += 1

                if i % 10 == 0:
                    print(f"  Progress: {i}/{len(timeline_files)} ({file_size:,} bytes / {file_size/1024:.2f} KB)")

            except Exception as e:
                print(f"[ERROR] Failed to upload {match_id}: {e}")

        print(f"\n[OK] Uploaded {uploaded} timelines")
        if skipped_exists > 0:
            print(f"[INFO] Skipped {skipped_exists} existing timelines")
        if skipped_large > 0:
            print(f"[WARN] Skipped {skipped_large} timelines (too large)")

        return uploaded

    def get_timeline(self, match_id: str):
        """Get a specific timeline"""
        return self.db.timelines.find_one(
            {'matchId': match_id},
            {'_id': 0}
        )

    def get_timelines_by_player(self, puuid: str, limit: int = 50):
        """Get all timelines for a player"""
        return list(self.db.timelines.find(
            {'puuid': puuid},
            {'_id': 0}
        ).sort('gameCreation', -1).limit(limit))

    def get_stats(self):
        """Get collection statistics"""
        count = self.db.timelines.count_documents({})

        # Calculate total size
        pipeline = [
            {'$group': {
                '_id': None,
                'totalSize': {'$sum': '$fileSize'},
                'avgSize': {'$avg': '$fileSize'},
                'maxSize': {'$max': '$fileSize'}
            }}
        ]

        stats = list(self.db.timelines.aggregate(pipeline))

        result = {
            'count': count,
            'totalSize': stats[0]['totalSize'] if stats else 0,
            'avgSize': stats[0]['avgSize'] if stats else 0,
            'maxSize': stats[0]['maxSize'] if stats else 0
        }

        return result


def main():
    """Main function to upload timelines"""

    print("="*60)
    print("MongoDB Atlas Upload Script - Match Timelines Only")
    print("="*60)

    # Configuration
    DATA_DIR = 'Sneaky_data'

    # Get MongoDB Atlas connection string from environment variables
    MONGODB_CONNECTION_STRING = os.getenv('MONGODB_CONNECTION_STRING')

    if not MONGODB_CONNECTION_STRING:
        print("[ERROR] MONGODB_CONNECTION_STRING not found in environment variables!")
        print("\nSteps to fix:")
        print("1. Create a .env file in the backend/ directory (or update existing one)")
        print("2. Add this line to .env:")
        print("   MONGODB_CONNECTION_STRING=mongodb+srv://username:password@cluster.mongodb.net/")
        print("\n3. Get your connection string from MongoDB Atlas:")
        print("   - Go to https://cloud.mongodb.com/")
        print("   - Create a free cluster (if you haven't)")
        print("   - Click 'Connect' → 'Connect your application'")
        print("   - Copy the connection string")
        print("   - Replace username:password with your actual credentials")
        print("\n4. Run this script again")
        return

    if "username:password" in MONGODB_CONNECTION_STRING or "<password>" in MONGODB_CONNECTION_STRING:
        print("[ERROR] Please update your .env file with actual MongoDB credentials!")
        print("\nUpdate MONGODB_CONNECTION_STRING in .env file with your real connection string")
        return

    # Read player info
    account_file = os.path.join(DATA_DIR, 'account', 'account.json')

    if not os.path.exists(account_file):
        print(f"[ERROR] Account file not found: {account_file}")
        return

    with open(account_file, 'r', encoding='utf-8') as f:
        account_data = json.load(f)
        puuid = account_data.get('puuid')
        player_name = f"{account_data.get('gameName')}#{account_data.get('tagLine')}"

    if not puuid:
        print("[ERROR] Could not find PUUID in account data")
        return

    print(f"Player: {player_name}")
    print(f"PUUID: {puuid}\n")

    # Connect and upload
    try:
        uploader = MongoDBTimelineUploader(MONGODB_CONNECTION_STRING)

        # Create indexes
        uploader.create_indexes()

        # Upload timelines
        print("\n" + "="*60)
        print(f"Uploading timelines for: {player_name}")
        print("="*60)

        count = uploader.upload_timelines(DATA_DIR, puuid)

        # Show statistics
        stats = uploader.get_stats()

        print("\n" + "="*60)
        print("MONGODB ATLAS STATISTICS")
        print("="*60)
        print(f"Total timelines: {stats['count']}")
        print(f"Total size: {stats['totalSize']:,} bytes ({stats['totalSize']/1024/1024:.2f} MB)")
        print(f"Average size: {stats['avgSize']:,.0f} bytes ({stats['avgSize']/1024:.2f} KB)")
        print(f"Largest timeline: {stats['maxSize']:,} bytes ({stats['maxSize']/1024:.2f} KB)")

        print("\n" + "="*60)
        print("QUERY EXAMPLES")
        print("="*60)
        print("""
Python Backend:
```python
from pymongo import MongoClient

client = MongoClient('your_connection_string')
db = client['lol_timelines']

# Get specific timeline
timeline = db.timelines.find_one({'matchId': 'NA1_5080320781'})

# Get all timelines for player
timelines = db.timelines.find({'puuid': 'YOUR_PUUID'}).sort('gameCreation', -1)

# Get recent timelines
recent = db.timelines.find({'puuid': 'YOUR_PUUID'}).sort('gameCreation', -1).limit(10)
```

JavaScript/Node.js:
```javascript
const { MongoClient } = require('mongodb');

const client = new MongoClient('your_connection_string');
await client.connect();
const db = client.db('lol_timelines');

// Get timeline
const timeline = await db.collection('timelines').findOne({ matchId: 'NA1_5080320781' });

// Get all timelines for player
const timelines = await db.collection('timelines')
  .find({ puuid: 'YOUR_PUUID' })
  .sort({ gameCreation: -1 })
  .toArray();
```
""")

        print("\n" + "="*60)
        print("INTEGRATION WITH DYNAMODB")
        print("="*60)
        print("""
Store timeline reference in DynamoDB match items:

DynamoDB match document:
{
  "puuid": "BQD2G_...",
  "dataType": "match#NA1_5080320781",
  "matchId": "NA1_5080320781",
  "championName": "Jinx",
  "win": true,
  "hasTimeline": true,                    ← Flag
  "timelineInMongoDB": true,              ← Flag
  "data": { match summary data }
}

Backend API:
```python
# 1. Query DynamoDB for match summary
match = dynamodb_table.get_item(
    Key={'puuid': puuid, 'dataType': f'match#{match_id}'}
)['Item']

# 2. If timeline exists, fetch from MongoDB
if match.get('hasTimeline'):
    timeline = mongodb_db.timelines.find_one({'matchId': match_id})
    return {
        'match': match,
        'timeline': timeline
    }
```

Frontend:
```javascript
// Fetch match from your backend API
const response = await fetch(`/api/match/${matchId}`);
const { match, timeline } = await response.json();

// match = from DynamoDB
// timeline = from MongoDB (if available)
```
""")

        print("\n[SUCCESS] Timelines uploaded to MongoDB Atlas!")
        print(f"\nFree tier usage: {stats['totalSize']/1024/1024:.2f} MB / 512 MB")

    except Exception as e:
        print(f"\n[ERROR] Upload failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
