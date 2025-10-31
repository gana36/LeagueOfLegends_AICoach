"""
EXAMPLE: How to Load and Join All CSV Data
This shows you exactly how to connect all 6 data sources to build insights
"""

import pandas as pd
from pathlib import Path

# Define data directory
DATA_DIR = Path(__file__).parent.parent / "sample_data"


def load_all_player_data(player_name="Sneaky"):
    """
    Load all CSV files and join them together for one player
    Returns a dictionary with all player data connected
    """

    print(f"\n{'='*60}")
    print(f"Loading data for player: {player_name}")
    print(f"{'='*60}\n")

    # ============= STEP 1: Load Account (WHO is this?) =============
    print("Step 1: Loading account data...")
    account = pd.read_csv(DATA_DIR / "sneaky_account.csv")
    puuid = account.iloc[0]['puuid']
    game_name = account.iloc[0]['game_name']
    tag_line = account.iloc[0]['tag_line']

    print(f"✓ Found player: {game_name} #{tag_line}")
    print(f"  PUUID: {puuid}")
    print(f"  This PUUID is the KEY to joining everything!\n")

    # ============= STEP 2: Load Summoner (HOW experienced?) =============
    print("Step 2: Loading summoner profile...")
    summoner = pd.read_csv(DATA_DIR / "sneaky_summoner.csv")
    summoner = summoner[summoner['puuid'] == puuid].iloc[0]
    summoner_id = summoner['id']
    summoner_level = summoner['summoner_level']

    print(f"✓ Summoner Level: {summoner_level}")
    print(f"  Summoner ID: {summoner_id}")
    print(f"  This Summoner ID is used for ranked data!\n")

    # ============= STEP 3: Load Matches (WHAT did they play?) =============
    print("Step 3: Loading match history...")
    matches = pd.read_csv(DATA_DIR / "sneaky_matches.csv")
    # Filter to this player only (CSV might have multiple players)
    player_matches = matches[matches['puuid'] == puuid]

    total_games = len(player_matches)
    wins = player_matches['win'].sum()
    losses = total_games - wins
    win_rate = (wins / total_games * 100) if total_games > 0 else 0

    print(f"✓ Loaded {total_games} matches")
    print(f"  Record: {wins}W - {losses}L ({win_rate:.1f}% WR)")
    print(f"  Average KDA: {player_matches['kda'].mean():.2f}\n")

    # ============= STEP 4: Load Champion Mastery (WHAT are they good at?) =============
    print("Step 4: Loading champion mastery...")
    mastery = pd.read_csv(DATA_DIR / "sneaky_champion_mastery.csv")
    player_mastery = mastery[mastery['puuid'] == puuid]

    # Sort by points
    player_mastery = player_mastery.sort_values('champion_points', ascending=False)
    top_champ = player_mastery.iloc[0]

    print(f"✓ Main champion: {top_champ['champion_name']}")
    print(f"  Mastery Points: {top_champ['champion_points']:,}")
    print(f"  Mastery Level: {top_champ['champion_level']}")
    print(f"  Total champions played: {len(player_mastery)}\n")

    # ============= STEP 5: Load Ranked (HOW good?) =============
    print("Step 5: Loading ranked data...")
    ranked = pd.read_csv(DATA_DIR / "sneaky_ranked.csv")
    # Use summoner_id to get ranked data
    player_ranked = ranked[ranked['summoner_id'] == summoner_id]

    if len(player_ranked) > 0:
        solo_queue = player_ranked[player_ranked['queue_type'] == 'RANKED_SOLO_5x5']
        if len(solo_queue) > 0:
            rank_entry = solo_queue.iloc[0]
            print(f"✓ Rank: {rank_entry['tier']} {rank_entry['rank']} ({rank_entry['league_points']} LP)")
            print(f"  Ranked Record: {rank_entry['wins']}W - {rank_entry['losses']}L")
            ranked_wr = (rank_entry['wins'] / (rank_entry['wins'] + rank_entry['losses']) * 100)
            print(f"  Ranked Win Rate: {ranked_wr:.1f}%\n")
    else:
        print("✓ No ranked data found (unranked player)\n")

    # ============= STEP 6: Load Challenges (WHAT achievements?) =============
    print("Step 6: Loading challenges/achievements...")
    challenges = pd.read_csv(DATA_DIR / "sneaky_challenges.csv")
    player_challenges = challenges[challenges['puuid'] == puuid]

    # Sort by rarity (lowest percentile = rarest)
    player_challenges = player_challenges.sort_values('percentile')
    rarest = player_challenges.iloc[0]

    print(f"✓ Total achievements: {len(player_challenges)}")
    print(f"  Rarest achievement: {rarest['challenge_name']}")
    print(f"  Level: {rarest['level']} (Top {rarest['percentile']:.1f}%)")
    print(f"  Master+ challenges: {len(player_challenges[player_challenges['level'] == 'MASTER'])}\n")

    print(f"{'='*60}")
    print("✅ ALL DATA LOADED AND JOINED!")
    print(f"{'='*60}\n")

    # Return everything in one dictionary
    return {
        'player_name': f"{game_name} #{tag_line}",
        'puuid': puuid,
        'summoner_level': summoner_level,
        'matches': player_matches,
        'mastery': player_mastery,
        'ranked': player_ranked,
        'challenges': player_challenges,
        'stats': {
            'total_games': total_games,
            'wins': wins,
            'losses': losses,
            'win_rate': win_rate,
            'main_champion': top_champ['champion_name'],
            'mastery_points': top_champ['champion_points']
        }
    }


def generate_year_recap(player_data):
    """
    Generate a year-end recap using ALL connected data
    This is what your app will do with AWS AI!
    """

    print("\n" + "="*60)
    print(f"   {player_data['player_name']}'s 2025 YEAR IN REVIEW")
    print("="*60 + "\n")

    # ========== OVERVIEW (from multiple sources) ==========
    print("📊 THE NUMBERS")
    print(f"   • Level {player_data['summoner_level']} Summoner")
    print(f"   • {player_data['stats']['total_games']} games played")
    print(f"   • {player_data['stats']['win_rate']:.1f}% overall win rate")

    avg_kda = player_data['matches']['kda'].mean()
    print(f"   • {avg_kda:.2f} average KDA")

    # ========== RANKED (from ranked.csv) ==========
    if len(player_data['ranked']) > 0:
        print("\n🏆 RANKED JOURNEY")
        solo = player_data['ranked'][player_data['ranked']['queue_type'] == 'RANKED_SOLO_5x5']
        if len(solo) > 0:
            rank = solo.iloc[0]
            print(f"   • Ended: {rank['tier']} {rank['rank']} ({rank['league_points']} LP)")
            print(f"   • Ranked Games: {rank['wins'] + rank['losses']}")
            if rank['hot_streak']:
                print(f"   • 🔥 CURRENTLY ON A HOT STREAK!")

    # ========== CHAMPION MASTERY (from mastery.csv) ==========
    print("\n👑 CHAMPION MASTERY")
    top_3 = player_data['mastery'].head(3)
    for idx, champ in enumerate(top_3.itertuples(), 1):
        print(f"   {idx}. {champ.champion_name} - {champ.champion_points:,} points (Lvl {champ.champion_level})")

    level_7_count = len(player_data['mastery'][player_data['mastery']['champion_level'] == 7])
    print(f"   • {level_7_count} champions at Mastery Level 7")

    # ========== MATCH PERFORMANCE (from matches.csv) ==========
    print("\n🎮 PERFORMANCE HIGHLIGHTS")

    # Best game
    best_game = player_data['matches'].loc[player_data['matches']['kda'].idxmax()]
    print(f"   • Best Game: {best_game['kills']}/{best_game['deaths']}/{best_game['assists']} on {best_game['champion_name']}")
    print(f"     KDA: {best_game['kda']:.1f}")

    # Multi-kills
    total_pentas = player_data['matches']['penta_kills'].sum()
    total_quadras = player_data['matches']['quadra_kills'].sum()
    if total_pentas > 0:
        print(f"   • ⚡ {int(total_pentas)} PENTAKILLS!")
    if total_quadras > 0:
        print(f"   • 🔥 {int(total_quadras)} Quadra Kills")

    # Average stats
    avg_damage = player_data['matches']['damage_per_min'].mean()
    avg_vision = player_data['matches']['vision_score'].mean()
    print(f"   • Average {avg_damage:.0f} damage/min")
    print(f"   • Average {avg_vision:.1f} vision score")

    # ========== CHALLENGES (from challenges.csv) ==========
    print("\n🏅 RARE ACHIEVEMENTS")
    top_challenges = player_data['challenges'].nsmallest(3, 'percentile')
    for challenge in top_challenges.itertuples():
        print(f"   • {challenge.challenge_name} ({challenge.level})")
        print(f"     Top {challenge.percentile:.1f}% of players")

    print("\n" + "="*60)
    print("       Generated using data from all 6 APIs!")
    print("="*60 + "\n")


def demonstrate_specific_joins():
    """
    Show specific examples of joining data to answer questions
    """

    print("\n" + "="*60)
    print("EXAMPLES: Answering Questions by Joining Data")
    print("="*60 + "\n")

    # Load data
    account = pd.read_csv(DATA_DIR / "sneaky_account.csv")
    matches = pd.read_csv(DATA_DIR / "sneaky_matches.csv")
    mastery = pd.read_csv(DATA_DIR / "sneaky_champion_mastery.csv")

    puuid = account.iloc[0]['puuid']

    # ========== QUESTION 1 ==========
    print("Q1: How many times did Sneaky play their main champion?")
    print("    Needs: matches.csv + mastery.csv\n")

    # Get main champion from mastery
    main_champ_name = mastery.sort_values('champion_points', ascending=False).iloc[0]['champion_name']

    # Count matches on that champion
    main_champ_matches = matches[matches['champion_name'] == main_champ_name]
    games_on_main = len(main_champ_matches)

    print(f"Answer: Sneaky played {main_champ_name} {games_on_main} times")
    print(f"Code: matches[matches['champion_name'] == '{main_champ_name}']\n")

    # ========== QUESTION 2 ==========
    print("Q2: What's their win rate on their top 3 champions?")
    print("    Needs: matches.csv + mastery.csv\n")

    top_3_champs = mastery.sort_values('champion_points', ascending=False).head(3)

    print("Answer:")
    for champ in top_3_champs.itertuples():
        champ_matches = matches[matches['champion_name'] == champ.champion_name]
        if len(champ_matches) > 0:
            wr = champ_matches['win'].mean() * 100
            games = len(champ_matches)
            print(f"  • {champ.champion_name}: {wr:.1f}% WR ({games} games)")

    print()

    # ========== QUESTION 3 ==========
    print("Q3: Did their performance improve over time?")
    print("    Needs: matches.csv only\n")

    # Split matches into first half and second half
    half = len(matches) // 2
    early_games = matches.iloc[:half]
    recent_games = matches.iloc[half:]

    early_kda = early_games['kda'].mean()
    recent_kda = recent_games['kda'].mean()

    print(f"Answer:")
    print(f"  • Early season KDA: {early_kda:.2f}")
    print(f"  • Recent KDA: {recent_kda:.2f}")

    if recent_kda > early_kda:
        improvement = ((recent_kda - early_kda) / early_kda * 100)
        print(f"  • 📈 IMPROVING! (+{improvement:.1f}%)")
    else:
        print(f"  • Performance declined slightly")

    print("\n" + "="*60 + "\n")


if __name__ == "__main__":
    print("\n")
    print("╔════════════════════════════════════════════════════════════╗")
    print("║       RIFT REWIND - DATA JOINING EXAMPLE                  ║")
    print("║       How to connect all 6 CSV files                      ║")
    print("╚════════════════════════════════════════════════════════════╝")

    # Load and join all data
    player_data = load_all_player_data("Sneaky")

    # Generate a recap using the joined data
    generate_year_recap(player_data)

    # Show specific join examples
    demonstrate_specific_joins()

    print("\n🎉 Now you know how to join the data!")
    print("💡 Use this pattern in your actual app with AWS Bedrock for AI narratives\n")
