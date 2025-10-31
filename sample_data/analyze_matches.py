"""
Sample script to analyze match data from CSV
"""
import pandas as pd
import numpy as np
from pathlib import Path

def load_match_data(csv_path: str) -> pd.DataFrame:
    """Load match data from CSV"""
    return pd.read_csv(csv_path)

def calculate_summary_stats(df: pd.DataFrame) -> dict:
    """Calculate summary statistics"""
    return {
        "total_games": len(df),
        "wins": df['win'].sum(),
        "losses": len(df) - df['win'].sum(),
        "win_rate": (df['win'].sum() / len(df)) * 100,
        "avg_kda": df['kda'].mean(),
        "avg_kills": df['kills'].mean(),
        "avg_deaths": df['deaths'].mean(),
        "avg_assists": df['assists'].mean(),
        "avg_cs_per_min": df['cs_per_min'].mean(),
        "avg_gold_per_min": df['gold_per_min'].mean(),
        "avg_damage_per_min": df['damage_per_min'].mean(),
        "avg_vision_per_min": df['vision_per_min'].mean(),
        "total_kills": df['kills'].sum(),
        "total_deaths": df['deaths'].sum(),
        "total_assists": df['assists'].sum(),
        "pentakills": df['penta_kills'].sum(),
        "quadrakills": df['quadra_kills'].sum(),
    }

def analyze_by_champion(df: pd.DataFrame) -> pd.DataFrame:
    """Analyze performance by champion"""
    champion_stats = df.groupby('champion_name').agg({
        'match_id': 'count',  # games played
        'win': 'sum',  # wins
        'kills': 'mean',
        'deaths': 'mean',
        'assists': 'mean',
        'kda': 'mean',
        'total_damage_dealt_to_champions': 'mean',
        'vision_score': 'mean'
    }).rename(columns={
        'match_id': 'games',
        'win': 'wins'
    })

    champion_stats['win_rate'] = (champion_stats['wins'] / champion_stats['games']) * 100
    champion_stats = champion_stats.sort_values('games', ascending=False)

    return champion_stats

def analyze_by_role(df: pd.DataFrame) -> pd.DataFrame:
    """Analyze performance by role"""
    role_stats = df.groupby('team_position').agg({
        'match_id': 'count',
        'win': 'sum',
        'kda': 'mean',
        'cs_per_min': 'mean',
        'damage_per_min': 'mean',
        'vision_per_min': 'mean'
    }).rename(columns={
        'match_id': 'games',
        'win': 'wins'
    })

    role_stats['win_rate'] = (role_stats['wins'] / role_stats['games']) * 100

    return role_stats

def analyze_game_length(df: pd.DataFrame) -> dict:
    """Analyze performance by game length"""
    # Short games (<25 min)
    short_games = df[df['game_duration'] < 1500]
    # Medium games (25-35 min)
    medium_games = df[(df['game_duration'] >= 1500) & (df['game_duration'] < 2100)]
    # Long games (>35 min)
    long_games = df[df['game_duration'] >= 2100]

    return {
        "short_games": {
            "count": len(short_games),
            "win_rate": (short_games['win'].sum() / len(short_games) * 100) if len(short_games) > 0 else 0,
            "avg_kda": short_games['kda'].mean() if len(short_games) > 0 else 0
        },
        "medium_games": {
            "count": len(medium_games),
            "win_rate": (medium_games['win'].sum() / len(medium_games) * 100) if len(medium_games) > 0 else 0,
            "avg_kda": medium_games['kda'].mean() if len(medium_games) > 0 else 0
        },
        "long_games": {
            "count": len(long_games),
            "win_rate": (long_games['win'].sum() / len(long_games) * 100) if len(long_games) > 0 else 0,
            "avg_kda": long_games['kda'].mean() if len(long_games) > 0 else 0
        }
    }

def find_best_and_worst_games(df: pd.DataFrame) -> dict:
    """Find best and worst performing games"""
    best_game = df.loc[df['kda'].idxmax()]
    worst_game = df.loc[df['kda'].idxmin()]
    highest_damage = df.loc[df['total_damage_dealt_to_champions'].idxmax()]

    return {
        "best_kda": {
            "champion": best_game['champion_name'],
            "kda": best_game['kda'],
            "kills": best_game['kills'],
            "deaths": best_game['deaths'],
            "assists": best_game['assists'],
            "win": best_game['win']
        },
        "worst_kda": {
            "champion": worst_game['champion_name'],
            "kda": worst_game['kda'],
            "kills": worst_game['kills'],
            "deaths": worst_game['deaths'],
            "assists": worst_game['assists'],
            "win": worst_game['win']
        },
        "highest_damage": {
            "champion": highest_damage['champion_name'],
            "damage": highest_damage['total_damage_dealt_to_champions'],
            "kills": highest_damage['kills'],
            "win": highest_damage['win']
        }
    }

def main():
    """Main analysis function"""
    # Load data
    csv_path = Path(__file__).parent / "sneaky_matches.csv"
    df = load_match_data(csv_path)

    print("="*60)
    print("LEAGUE OF LEGENDS MATCH ANALYSIS - SNEAKY#NA1")
    print("="*60)

    # Overall stats
    print("\n📊 OVERALL STATISTICS")
    print("-"*60)
    stats = calculate_summary_stats(df)
    print(f"Total Games: {stats['total_games']}")
    print(f"Record: {stats['wins']}W / {stats['losses']}L")
    print(f"Win Rate: {stats['win_rate']:.1f}%")
    print(f"Average KDA: {stats['avg_kda']:.2f}")
    print(f"Avg K/D/A: {stats['avg_kills']:.1f} / {stats['avg_deaths']:.1f} / {stats['avg_assists']:.1f}")
    print(f"CS/min: {stats['avg_cs_per_min']:.2f}")
    print(f"Gold/min: {stats['avg_gold_per_min']:.2f}")
    print(f"Damage/min: {stats['avg_damage_per_min']:.2f}")
    print(f"Vision/min: {stats['avg_vision_per_min']:.2f}")
    print(f"Pentakills: {stats['pentakills']}")
    print(f"Quadrakills: {stats['quadrakills']}")

    # Champion stats
    print("\n🎮 CHAMPION PERFORMANCE")
    print("-"*60)
    champ_stats = analyze_by_champion(df)
    print(champ_stats[['games', 'wins', 'win_rate', 'kda']].to_string())

    # Role stats
    print("\n📍 ROLE PERFORMANCE")
    print("-"*60)
    role_stats = analyze_by_role(df)
    print(role_stats[['games', 'wins', 'win_rate', 'kda']].to_string())

    # Game length analysis
    print("\n⏱️  PERFORMANCE BY GAME LENGTH")
    print("-"*60)
    game_length = analyze_game_length(df)
    print(f"Short Games (<25 min): {game_length['short_games']['count']} games, "
          f"{game_length['short_games']['win_rate']:.1f}% WR, "
          f"{game_length['short_games']['avg_kda']:.2f} KDA")
    print(f"Medium Games (25-35 min): {game_length['medium_games']['count']} games, "
          f"{game_length['medium_games']['win_rate']:.1f}% WR, "
          f"{game_length['medium_games']['avg_kda']:.2f} KDA")
    print(f"Long Games (>35 min): {game_length['long_games']['count']} games, "
          f"{game_length['long_games']['win_rate']:.1f}% WR, "
          f"{game_length['long_games']['avg_kda']:.2f} KDA")

    # Best/Worst games
    print("\n🏆 HIGHLIGHT GAMES")
    print("-"*60)
    highlights = find_best_and_worst_games(df)
    print(f"Best KDA: {highlights['best_kda']['champion']} - "
          f"{highlights['best_kda']['kills']}/{highlights['best_kda']['deaths']}/{highlights['best_kda']['assists']} "
          f"(KDA: {highlights['best_kda']['kda']:.2f})")
    print(f"Highest Damage: {highlights['highest_damage']['champion']} - "
          f"{highlights['highest_damage']['damage']:,.0f} damage")

    print("\n" + "="*60)

if __name__ == "__main__":
    main()
