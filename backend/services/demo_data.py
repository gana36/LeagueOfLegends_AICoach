"""Demo data for testing without API calls"""

DEMO_PLAYER = {
    "puuid": "demo_player_puuid_12345",
    "gameName": "DemoSummoner",
    "tagLine": "DEMO"
}

DEMO_YEAR_RECAP = {
    "narrative": """Greetings, Summoner! As we bid farewell to another exhilarating year on the Rift, it's time to reflect on your journey through the hallowed halls of League of Legends.

This year, you stepped onto the Fields of Justice with determination and passion, playing 127 games across the season. Your journey showcased resilience and growth, with a solid 54.3% win rate that speaks to your improving game sense and mechanical skill.

You found your calling in the bot lane, maining ADC with champions like Jinx, Caitlyn, and Kai'Sa becoming extensions of your will. Your average KDA of 3.8 demonstrates your ability to balance aggression with survival, securing 8.2 kills per game while dying only 4.6 times. The 2,847 total kills you racked up this year tell a story of countless teamfights won and objectives secured.

Your highlight reel includes 3 pentakills, with your best performance being a legendary 18/2/12 Jinx game where you dealt over 45,000 damage. These moments of brilliance shine through the stats, reminding us that League is about those clutch plays and game-changing teamfights.

As we embark on a new season, remember that improvement is a journey, not a destination. Your growth this year from a 48% to a 58% win rate in recent games shows you're on the right path. Keep pushing, keep learning, and let your legend continue to unfold on the Rift!""",
    "stats": {
        "games_played": 127,
        "wins": 69,
        "losses": 58,
        "win_rate": 54.3,
        "avg_kills": 8.2,
        "avg_deaths": 4.6,
        "avg_assists": 9.4,
        "avg_kda": 3.8,
        "total_kills": 1041,
        "total_deaths": 584,
        "total_assists": 1194,
        "damage_per_min": 642,
        "gold_per_min": 398,
        "cs_per_min": 7.2,
        "top_champions": [
            "Jinx", "Caitlyn", "Kai'Sa", "Ezreal", "Jhin",
            "Miss Fortune", "Ashe", "Vayne", "Lucian", "Aphelios"
        ],
        "main_role": "BOTTOM"
    },
    "total_matches": 127,
    "highlights": {
        "best_game": {
            "champion": "Jinx",
            "kda": 15.0,
            "kills": 18,
            "deaths": 2,
            "assists": 12
        },
        "pentakills": 3,
        "highest_damage": 45234
    }
}

DEMO_INSIGHTS = {
    "playstyle_analysis": """Based on your match history, you exhibit a calculated and scaling-focused playstyle. As an ADC main, you understand the importance of farming and reaching your power spikes before making aggressive plays.

You tend to favor hypercarry champions like Jinx and Kai'Sa, indicating a preference for late-game insurance and teamfight dominance. Your average damage per minute of 642 is solid, showing you're consistently participating in fights and contributing to your team's success.

Your KDA of 3.8 suggests you've learned the crucial ADC lesson of staying alive to deal damage. You're not overly aggressive early but excel in extended teamfights where your positioning and target selection shine.

One unique characteristic is your adaptability - your champion pool includes both traditional carries and utility ADCs like Ashe, showing flexibility in team compositions. Your CS/min of 7.2 indicates strong fundamentals, though there's room for optimization in lane phase farming.

Overall, you're a team-oriented player who excels at converting advantages into wins through consistent damage output and smart positioning.""",
    "player_stats": {
        "win_rate": 54.3,
        "avg_kda": 3.8,
        "avg_kills": 8.2,
        "avg_deaths": 4.6,
        "avg_assists": 9.4,
        "damage_per_min": 642,
        "gold_per_min": 398,
        "main_role": "BOTTOM"
    },
    "champion_stats": [
        {"champion": "Jinx", "games": 28, "wins": 17, "win_rate": 60.7, "avg_kda": 4.2},
        {"champion": "Caitlyn", "games": 22, "wins": 13, "win_rate": 59.1, "avg_kda": 3.9},
        {"champion": "Kai'Sa", "games": 19, "wins": 11, "win_rate": 57.9, "avg_kda": 4.1},
        {"champion": "Ezreal", "games": 15, "wins": 7, "win_rate": 46.7, "avg_kda": 3.2},
        {"champion": "Jhin", "games": 12, "wins": 7, "win_rate": 58.3, "avg_kda": 3.7},
        {"champion": "Miss Fortune", "games": 10, "wins": 5, "win_rate": 50.0, "avg_kda": 3.5},
        {"champion": "Ashe", "games": 8, "wins": 4, "win_rate": 50.0, "avg_kda": 3.3},
        {"champion": "Vayne", "games": 6, "wins": 2, "win_rate": 33.3, "avg_kda": 2.8},
        {"champion": "Lucian", "games": 4, "wins": 2, "win_rate": 50.0, "avg_kda": 3.4},
        {"champion": "Aphelios", "games": 3, "wins": 1, "win_rate": 33.3, "avg_kda": 2.9}
    ],
    "performance_trends": {
        "average_kda": 3.8,
        "recent_kda": 4.3,
        "trending_up": True,
        "kda_variance": 1.2
    }
}

DEMO_STRENGTHS_WEAKNESSES = {
    "strengths": [
        "Excellent late-game teamfighting and positioning on hypercarry champions",
        "Consistent CS numbers showing strong laning fundamentals (7.2 CS/min average)",
        "High assist participation (9.4 avg) indicating strong team coordination and awareness"
    ],
    "weaknesses": [
        "Tendency to play too passively in early game, missing opportunities for lane pressure",
        "Lower win rate on mobile/mechanical champions like Vayne and Ezreal",
        "Vision score could be improved - placing more control wards would increase map control"
    ],
    "improvement_tips": [
        "Practice aggressive trading patterns in lane phase to build early leads - focus on auto-attack spacing and ability combos in practice tool",
        "Dedicate 10 games to improving your Vayne mechanics - she's crucial for tank-heavy enemy compositions",
        "Set a goal of 2 control wards per back and track your vision score - aim for 1.5-2 vision score per minute",
        "Watch high-level ADC VODs focusing on wave management - learning when to freeze vs push can create more CS advantages",
        "Practice kiting drills in practice tool for 10 minutes before ranked games - smooth kiting increases DPS by 20-30%"
    ],
    "stats": {
        "win_rate": 54.3,
        "main_role": "BOTTOM",
        "avg_kda": 3.8
    }
}
