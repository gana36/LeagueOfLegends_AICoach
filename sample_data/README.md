# Sample Match Data for Sneaky#NA1

This folder contains sample League of Legends match data for testing and development.

## Files

### 📊 sneaky_matches.csv
Sample match data with 8 games for player Sneaky#NA1

**Data Highlights:**
- 8 total games
- Mix of ADC champions (Varus, Kai'Sa, Jhin, Caitlyn, Jinx, Ezreal, Ashe)
- 1 mid lane game (Xerath)
- Includes all available fields from Riot Games API
- Contains wins and losses for realistic distribution

### 📖 DATA_DICTIONARY.md
Complete field reference with descriptions of all 70+ fields in the CSV:
- Match metadata
- Player identity
- Combat stats (kills, deaths, assists, damage)
- Economy (gold, CS)
- Vision control
- Objectives (dragons, barons, towers)
- Items and spells
- Calculated metrics

### 🐍 analyze_matches.py
Python script to analyze the match data:
- Overall statistics
- Per-champion performance
- Per-role analysis
- Game length analysis
- Best/worst games

## Usage

### Run the Analysis Script

```bash
cd sample_data
python analyze_matches.py
```

**Output Example:**
```
============================================================
LEAGUE OF LEGENDS MATCH ANALYSIS - SNEAKY#NA1
============================================================

📊 OVERALL STATISTICS
------------------------------------------------------------
Total Games: 8
Record: 6W / 2L
Win Rate: 75.0%
Average KDA: 7.15
Avg K/D/A: 10.5 / 4.2 / 10.0
CS/min: 7.56
Gold/min: 498.72
Damage/min: 1071.59
Vision/min: 1.38
Pentakills: 1
Quadrakills: 1

🎮 CHAMPION PERFORMANCE
------------------------------------------------------------
...
```

### Load Data in Python

```python
import pandas as pd

# Load the CSV
df = pd.read_csv('sneaky_matches.csv')

# Basic stats
print(f"Total games: {len(df)}")
print(f"Win rate: {df['win'].mean() * 100:.1f}%")
print(f"Average KDA: {df['kda'].mean():.2f}")

# Filter by champion
jinx_games = df[df['champion_name'] == 'Jinx']
print(f"Jinx win rate: {jinx_games['win'].mean() * 100:.1f}%")

# Analyze game length
long_games = df[df['game_duration'] > 2000]
print(f"Long game win rate: {long_games['win'].mean() * 100:.1f}%")
```

### Use for ML Training

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# Load data
df = pd.read_csv('sneaky_matches.csv')

# Select features for win prediction
features = [
    'kills', 'deaths', 'assists',
    'total_damage_dealt_to_champions',
    'gold_earned', 'cs_per_min',
    'vision_score', 'turret_kills'
]

X = df[features]
y = df['win']

# Train model
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
model = RandomForestClassifier()
model.fit(X_train, y_train)

print(f"Model accuracy: {model.score(X_test, y_test):.2f}")
```

## Data Characteristics

### Realistic Match Distribution
- **Win Rate**: 75% (6W-2L) - Slightly above average to show strong performance
- **Champions**: Focus on ADC role with one mid lane game
- **Game Lengths**: Mix of short (27 min), medium (30-35 min), and long (36+ min) games
- **KDA Range**: 1.63 to 30.0 (realistic variance)
- **Special Achievements**:
  - 1 Pentakill (Xerath game)
  - 1 Quadrakill (Xerath game)
  - Multiple triple kills

### Key Patterns in Data
1. **Xerath Game** - Exceptional performance (20/1/10, 30.0 KDA, 71k damage)
2. **Loss Games** - Ashe (4/8/9) and Caitlyn (6/7/7) losses show realistic underperformance
3. **Vision Scores** - Range from 38-52, realistic for ADC players
4. **Damage Output** - Higher on long-range champions (Xerath: 71k, Kai'Sa: 35k)

## Extending the Dataset

### Add More Records
To add more games, maintain the same CSV structure and ensure:
- Unique `match_id` for each game
- Realistic stat distributions
- Consistent `puuid` for the player
- Proper game timestamps

### Generate Synthetic Data
You can use the existing records as templates:
```python
import pandas as pd
import numpy as np

df = pd.read_csv('sneaky_matches.csv')

# Create variations of existing games
for idx in range(10):
    new_game = df.iloc[idx % len(df)].copy()
    new_game['match_id'] = f"NA1_4567890{130+idx}"
    new_game['kills'] = max(0, int(np.random.normal(new_game['kills'], 2)))
    new_game['deaths'] = max(1, int(np.random.normal(new_game['deaths'], 1)))
    # ... adjust other fields
```

## Use Cases

1. **Testing Agent Tools**
   - Use this data to test the coaching agent
   - Verify pattern detection algorithms
   - Test champion recommendations

2. **ML Model Development**
   - Train win prediction models
   - Build playstyle clustering
   - Develop anomaly detection

3. **UI Development**
   - Test data visualization components
   - Populate charts and graphs
   - Demo mode data

4. **API Testing**
   - Mock Riot API responses
   - Test data processing pipelines
   - Validate calculations

## Notes

- This is **sample data** for development/testing
- Real Riot API data will have additional fields
- Timestamps are approximated
- Item IDs are realistic but may not match current patch
- Use the real Riot API for production data
