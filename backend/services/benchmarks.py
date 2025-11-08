"""
Benchmark Data for League of Legends Player Analysis
Provides rank-based and role-adjusted performance benchmarks
"""

# Rank-based average statistics
# Data based on typical performance metrics per rank tier
RANK_BENCHMARKS = {
    "IRON": {
        "avg_kda": 1.8,
        "avg_vision_score": 12.0,
        "avg_cs_per_min": 4.2,
        "avg_damage_per_min": 450,
        "avg_gold_per_min": 280,
        "avg_win_rate": 48.0,
        "avg_kills_per_game": 5.5,
        "avg_deaths_per_game": 7.2,
        "avg_assists_per_game": 6.8
    },
    "BRONZE": {
        "avg_kda": 2.1,
        "avg_vision_score": 15.0,
        "avg_cs_per_min": 4.8,
        "avg_damage_per_min": 520,
        "avg_gold_per_min": 310,
        "avg_win_rate": 49.0,
        "avg_kills_per_game": 6.2,
        "avg_deaths_per_game": 6.8,
        "avg_assists_per_game": 7.5
    },
    "SILVER": {
        "avg_kda": 2.5,
        "avg_vision_score": 18.0,
        "avg_cs_per_min": 5.3,
        "avg_damage_per_min": 580,
        "avg_gold_per_min": 340,
        "avg_win_rate": 50.0,
        "avg_kills_per_game": 6.8,
        "avg_deaths_per_game": 6.2,
        "avg_assists_per_game": 8.2
    },
    "GOLD": {
        "avg_kda": 2.8,
        "avg_vision_score": 21.0,
        "avg_cs_per_min": 5.8,
        "avg_damage_per_min": 640,
        "avg_gold_per_min": 370,
        "avg_win_rate": 51.0,
        "avg_kills_per_game": 7.3,
        "avg_deaths_per_game": 5.8,
        "avg_assists_per_game": 8.9
    },
    "PLATINUM": {
        "avg_kda": 3.1,
        "avg_vision_score": 24.0,
        "avg_cs_per_min": 6.3,
        "avg_damage_per_min": 700,
        "avg_gold_per_min": 400,
        "avg_win_rate": 52.0,
        "avg_kills_per_game": 7.8,
        "avg_deaths_per_game": 5.3,
        "avg_assists_per_game": 9.5
    },
    "DIAMOND": {
        "avg_kda": 3.4,
        "avg_vision_score": 27.0,
        "avg_cs_per_min": 6.8,
        "avg_damage_per_min": 760,
        "avg_gold_per_min": 430,
        "avg_win_rate": 53.0,
        "avg_kills_per_game": 8.2,
        "avg_deaths_per_game": 4.9,
        "avg_assists_per_game": 10.1
    },
    "MASTER": {
        "avg_kda": 3.7,
        "avg_vision_score": 30.0,
        "avg_cs_per_min": 7.3,
        "avg_damage_per_min": 820,
        "avg_gold_per_min": 460,
        "avg_win_rate": 54.0,
        "avg_kills_per_game": 8.6,
        "avg_deaths_per_game": 4.5,
        "avg_assists_per_game": 10.7
    },
    # Default for unranked or unknown
    "UNRANKED": {
        "avg_kda": 2.5,
        "avg_vision_score": 18.0,
        "avg_cs_per_min": 5.3,
        "avg_damage_per_min": 580,
        "avg_gold_per_min": 340,
        "avg_win_rate": 50.0,
        "avg_kills_per_game": 6.8,
        "avg_deaths_per_game": 6.2,
        "avg_assists_per_game": 8.2
    }
}

# Role-based modifiers
# Multipliers to adjust expectations based on role
ROLE_MODIFIERS = {
    "UTILITY": {  # Support
        "vision_score_multiplier": 1.5,
        "cs_per_min_multiplier": 0.3,
        "damage_multiplier": 0.7,
        "gold_multiplier": 0.75,
        "kills_multiplier": 0.6,
        "assists_multiplier": 1.4
    },
    "JUNGLE": {
        "vision_score_multiplier": 1.2,
        "cs_per_min_multiplier": 0.75,
        "damage_multiplier": 0.9,
        "gold_multiplier": 0.9,
        "kills_multiplier": 1.0,
        "assists_multiplier": 1.2
    },
    "MIDDLE": {
        "vision_score_multiplier": 0.9,
        "cs_per_min_multiplier": 1.0,
        "damage_multiplier": 1.2,
        "gold_multiplier": 1.05,
        "kills_multiplier": 1.1,
        "assists_multiplier": 0.95
    },
    "TOP": {
        "vision_score_multiplier": 0.8,
        "cs_per_min_multiplier": 1.1,
        "damage_multiplier": 1.0,
        "gold_multiplier": 1.0,
        "kills_multiplier": 0.95,
        "assists_multiplier": 0.85
    },
    "BOTTOM": {  # ADC
        "vision_score_multiplier": 0.7,
        "cs_per_min_multiplier": 1.2,
        "damage_multiplier": 1.3,
        "gold_multiplier": 1.15,
        "kills_multiplier": 1.2,
        "assists_multiplier": 0.9
    }
}


def get_rank_benchmarks(rank: str) -> dict:
    """
    Get benchmark statistics for a specific rank

    Args:
        rank: Player's rank (IRON, BRONZE, SILVER, GOLD, etc.)

    Returns:
        Dictionary of benchmark statistics
    """
    rank = rank.upper()
    return RANK_BENCHMARKS.get(rank, RANK_BENCHMARKS["UNRANKED"])


def get_role_adjusted_benchmarks(rank: str, role: str) -> dict:
    """
    Get role-adjusted benchmark statistics

    Args:
        rank: Player's rank
        role: Player's primary role (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)

    Returns:
        Dictionary of role-adjusted benchmarks
    """
    base_benchmarks = get_rank_benchmarks(rank)
    role = role.upper()

    if role not in ROLE_MODIFIERS:
        return base_benchmarks

    modifiers = ROLE_MODIFIERS[role]
    adjusted = {}

    # Apply modifiers
    for metric, value in base_benchmarks.items():
        if "vision" in metric and "vision_score_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["vision_score_multiplier"]
        elif "cs_per_min" in metric and "cs_per_min_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["cs_per_min_multiplier"]
        elif "damage" in metric and "damage_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["damage_multiplier"]
        elif "gold" in metric and "gold_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["gold_multiplier"]
        elif "kills" in metric and "kills_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["kills_multiplier"]
        elif "assists" in metric and "assists_multiplier" in modifiers:
            adjusted[metric] = value * modifiers["assists_multiplier"]
        else:
            adjusted[metric] = value

    return adjusted


def calculate_percentile(player_value: float, benchmark_value: float) -> int:
    """
    Calculate percentile ranking based on comparison to benchmark

    Args:
        player_value: Player's stat value
        benchmark_value: Benchmark average for rank/role

    Returns:
        Percentile (0-100)
    """
    if benchmark_value == 0:
        return 50  # Neutral if no benchmark

    difference_pct = ((player_value - benchmark_value) / benchmark_value) * 100

    # Map percentage difference to percentile
    if difference_pct >= 40:
        return 95  # Top 5%
    elif difference_pct >= 30:
        return 90  # Top 10%
    elif difference_pct >= 20:
        return 80  # Top 20%
    elif difference_pct >= 10:
        return 70  # Top 30%
    elif difference_pct >= 5:
        return 60  # Above average
    elif difference_pct >= -5:
        return 50  # Average
    elif difference_pct >= -10:
        return 40  # Below average
    elif difference_pct >= -20:
        return 30  # Bottom 30%
    elif difference_pct >= -30:
        return 20  # Bottom 20%
    else:
        return 10  # Bottom 10%


def get_percentile_label(percentile: int) -> str:
    """
    Get human-readable label for percentile

    Args:
        percentile: Percentile value (0-100)

    Returns:
        Label like "Exceptional", "Above Average", etc.
    """
    if percentile >= 90:
        return "Exceptional"
    elif percentile >= 75:
        return "Great"
    elif percentile >= 60:
        return "Above Average"
    elif percentile >= 40:
        return "Average"
    elif percentile >= 25:
        return "Below Average"
    else:
        return "Needs Work"


def calculate_rank_from_tier_division(tier: str, division: str) -> str:
    """
    Calculate simplified rank from tier and division

    Args:
        tier: Rank tier (IRON, BRONZE, etc.)
        division: Division (I, II, III, IV)

    Returns:
        Simplified rank name
    """
    # For simplicity, use tier as rank
    return tier.upper()
