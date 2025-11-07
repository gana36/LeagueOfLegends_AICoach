# Dynamic Player Search Integration - Complete Guide

## Overview

Your RIFT Analyzer now supports **dynamic player loading**! Users can search for any League of Legends player, and the system will:

1. ✅ Fetch player data from Riot API
2. ✅ Save data locally in organized folders
3. ✅ Upload match summaries to AWS DynamoDB
4. ✅ Upload match timelines to MongoDB Atlas
5. ✅ Update the frontend with the new player's data

---

## What Was Added

### Backend Components

#### 1. **Player Data Service** (`backend/services/player_data_service.py`)
- Fetches all player data from Riot API (account, summoner, matches, timelines, mastery, ranked, challenges)
- Saves data to filesystem in organized structure
- Uploads to DynamoDB and MongoDB Atlas
- Orchestrates the complete flow in `process_player()` method

#### 2. **Player API Endpoints** (`backend/api/player_api.py`)
- `POST /api/player/fetch` - Fetch and upload player data
- `GET /api/player/data/{puuid}` - Get player data from DynamoDB
- `GET /api/player/match/timeline/{match_id}` - Get timeline from MongoDB
- `GET /api/player/search/{game_name}/{tag_line}` - Search existing players

#### 3. **Updated Main App** (`backend/main.py`)
- Integrated new player router
- All endpoints now available

### Frontend Components

#### 1. **PlayerSearch Component** (`frontend/src/components/PlayerSearch.tsx`)
- Beautiful search form with:
  - Game Name input (e.g., "Sneaky")
  - Tag Line input (e.g., "NA1")
  - Match count selector (5, 10, 20, 50 matches)
- Real-time progress messages
- Error and success notifications
- Info box explaining what happens during search

#### 2. **Updated App.js** (`frontend/src/App.js`)
- Added "Load Player" button in navigation bar
- Shows current player name in header
- Modal overlay for player search
- Automatically updates Year Recap with new player data
- State management for dynamic player data

---

## How to Use

### Step 1: Start the Backend Server

```bash
cd backend
python main.py
```

The backend should start on `http://localhost:8000`

### Step 2: Start the Frontend

```bash
cd frontend
npm start
```

The frontend should open at `http://localhost:3000` (or `http://localhost:5173` for Vite)

### Step 3: Load a New Player

1. Click the **"Load Player"** button in the top-right corner of the navigation bar
2. Enter the player's information:
   - **Game Name**: e.g., "Doublelift", "Faker", "Sneaky"
   - **Tag Line**: e.g., "NA1", "Hide on bush", "KR1"
   - **Number of Matches**: Choose 5, 10, 20, or 50
3. Click **"Search & Load Player"**
4. Wait for the system to:
   - Fetch data from Riot API
   - Save to filesystem (`player_data/` folder)
   - Upload to DynamoDB
   - Upload timelines to MongoDB Atlas
   - Load data into the app

### Step 4: View Player Data

Once loaded, the player's data is available:
- **Match Analysis**: View individual match timelines (uses static data for now)
- **Year Recap**: Automatically loads the new player's year recap heatmap
- **Performance Analytics**: Shows performance metrics
- **Current Player**: Name displayed in top-right corner

---

## Data Flow Architecture

```
User Input (Game Name + Tag Line)
          ↓
Frontend PlayerSearch Component
          ↓
POST /api/player/fetch
          ↓
Player Data Service
          ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Riot API          Local Filesystem
(Fetch Data)      (Save Organized)
    ↓                   ↓
    └─────────┬─────────┘
              ↓
        ┌─────┴─────┐
        ↓           ↓
    DynamoDB    MongoDB Atlas
  (Summaries)   (Timelines)
        ↓           ↓
        └─────┬─────┘
              ↓
    GET /api/player/data/{puuid}
              ↓
      Frontend Display
```

---

## Folder Structure Created

When you load a player, the following structure is created:

```
player_data/
└── {GameName}_{TagLine}_{PUUID}/
    ├── account/
    │   └── account.json
    ├── summoner/
    │   └── summoner.json
    ├── match_summary/
    │   ├── match_1_{matchId}.json
    │   ├── match_2_{matchId}.json
    │   └── ...
    ├── match_timeline/
    │   ├── timeline_{matchId}.json
    │   └── ...
    ├── champion_mastery/
    │   └── champion.json
    ├── ranked/
    │   └── ranked.json
    ├── challenges/
    │   └── challenges.json
    └── README.json
```

---

## Database Structure

### DynamoDB Table: `lol-player-data`

**Primary Key:**
- Partition Key: `puuid` (String)
- Sort Key: `dataType` (String)

**DataType Values:**
- `account` - Player account info
- `summoner` - Summoner details
- `match#{matchId}` - Individual match summaries
- `champion_mastery` - Top champions
- `ranked` - Ranked stats
- `challenges` - Achievement data

### MongoDB Collection: `timelines`

**Document Structure:**
```json
{
  "matchId": "NA1_5080320781",
  "puuid": "...",
  "data": { /* full timeline object */ },
  "gameCreation": 1234567890,
  "gameDuration": 1800,
  "frameInterval": 60000,
  "frames": 30
}
```

---

## API Endpoints Reference

### Player Endpoints

#### Fetch Player Data
```
POST /api/player/fetch
Body: {
  "gameName": "Sneaky",
  "tagLine": "NA1",
  "matchCount": 10,
  "saveLocal": true
}
```

#### Get Player Data
```
GET /api/player/data/{puuid}
Returns: All player data from DynamoDB
```

#### Get Match Timeline
```
GET /api/player/match/timeline/{match_id}
Returns: Timeline data from MongoDB
```

#### Search Player
```
GET /api/player/search/{game_name}/{tag_line}
Returns: Player info if exists in database
```

---

## UI Features

### Navigation Bar
- **Current Player Display**: Shows loaded player name (e.g., "Sneaky#NA1")
- **Load Player Button**: Opens player search modal
- **Page Navigation**: Match Analysis, Year Recap, Performance Analytics

### Player Search Modal
- **Clean Design**: Modern card-based UI with gradient background
- **Input Validation**: Required fields, disabled state during loading
- **Progress Feedback**: Real-time status messages
- **Error Handling**: Clear error messages with retry capability
- **Success Confirmation**: Shows when player is successfully loaded
- **Close Button**: Red X button to close modal

### Features
- **Loading States**: Spinner and progress messages
- **Disabled Inputs**: During loading to prevent duplicate requests
- **Auto-Close**: Modal closes automatically on success
- **Info Box**: Explains what happens during search

---

## Next Steps (Optional Enhancements)

1. **Dynamic Match Display**: Update Match Analysis page to show matches from loaded player
2. **Player History**: Show list of recently loaded players
3. **Comparison Mode**: Compare multiple players side-by-side
4. **Match Selection**: Let users pick specific matches to analyze
5. **Caching**: Cache frequently accessed player data
6. **Pagination**: Handle players with 100+ matches
7. **Search Autocomplete**: Suggest players as you type

---

## Troubleshooting

### Issue: "Failed to fetch player data"
- **Cause**: Invalid Riot API key or player not found
- **Solution**: Check `.env` file for valid `RIOT_API_KEY`

### Issue: "Failed to upload to DynamoDB"
- **Cause**: AWS credentials not configured
- **Solution**: Verify AWS credentials in `.env` file

### Issue: "Failed to upload timelines"
- **Cause**: MongoDB connection string incorrect
- **Solution**: Check `MONGODB_CONNECTION_STRING` in `.env`

### Issue: Backend not responding
- **Cause**: Backend server not running
- **Solution**: Start backend with `python main.py`

### Issue: CORS errors in browser
- **Cause**: Frontend URL not in CORS allowed origins
- **Solution**: Check `main.py` CORS settings (currently allows localhost:3000 and localhost:5173)

---

## Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts and displays default player (Sneaky#NA1)
- [ ] "Load Player" button opens search modal
- [ ] Can enter player name and tag line
- [ ] Search button triggers API call
- [ ] Progress messages appear during loading
- [ ] Success message shows when complete
- [ ] Modal closes automatically
- [ ] Current player name updates in header
- [ ] Year Recap page loads new player's data
- [ ] Data saved to filesystem
- [ ] Data uploaded to DynamoDB
- [ ] Timelines uploaded to MongoDB

---

## Configuration

### Environment Variables Required

```bash
# Riot API
RIOT_API_KEY=your_key_here

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# MongoDB Atlas
MONGODB_CONNECTION_STRING=mongodb+srv://...
```

---

## Success! 🎉

You now have a fully functional dynamic player search system! Users can load any League of Legends player, and all their data will be fetched, saved, and displayed automatically.

**Enjoy analyzing players!**
