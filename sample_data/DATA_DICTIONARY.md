# League of Legends Match Data - Field Dictionary

## Match Metadata
| Field | Type | Description |
|-------|------|-------------|
| match_id | string | Unique match identifier (e.g., NA1_4567890123) |
| game_duration | int | Game length in seconds |
| game_creation | long | Unix timestamp (milliseconds) when game was created |
| game_mode | string | Game mode (CLASSIC, ARAM, etc.) |
| game_type | string | Type of game (MATCHED_GAME, CUSTOM_GAME, etc.) |
| queue_id | int | Queue type identifier (420 = Ranked Solo/Duo) |
| platform_id | string | Server platform (NA1, EUW1, KR, etc.) |

## Player Identity
| Field | Type | Description |
|-------|------|-------------|
| puuid | string | Player's unique encrypted ID |
| summoner_name | string | Player's in-game name |
| champion_name | string | Champion played (e.g., Varus, Jinx) |
| champion_id | int | Unique champion identifier |
| team_id | int | Team number (100 = Blue, 200 = Red) |
| team_position | string | Role (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY) |
| individual_position | string | Actual position played |

## Win/Loss
| Field | Type | Description |
|-------|------|-------------|
| win | boolean | True if player won, False if lost |

## Combat Stats - Kills/Deaths/Assists
| Field | Type | Description |
|-------|------|-------------|
| kills | int | Number of enemy champions killed |
| deaths | int | Number of times player died |
| assists | int | Number of kill assists |
| kda | float | (Kills + Assists) / Deaths ratio |
| largest_killing_spree | int | Most kills without dying |
| largest_multi_kill | int | Highest multi-kill (2=double, 3=triple, etc.) |
| double_kills | int | Number of double kills |
| triple_kills | int | Number of triple kills |
| quadra_kills | int | Number of quadra kills |
| penta_kills | int | Number of penta kills |

## Damage Stats
| Field | Type | Description |
|-------|------|-------------|
| total_damage_dealt | int | Total damage to all targets |
| total_damage_dealt_to_champions | int | Damage specifically to champions |
| physical_damage_dealt_to_champions | int | Physical damage to champions |
| magic_damage_dealt_to_champions | int | Magic damage to champions |
| true_damage_dealt_to_champions | int | True damage to champions |
| total_damage_taken | int | Total damage received |
| damage_self_mitigated | int | Damage prevented (shields, armor, etc.) |

## Healing & Sustain
| Field | Type | Description |
|-------|------|-------------|
| total_heal | int | Total HP healed |
| total_units_healed | int | Number of units healed (self + allies) |
| total_time_spent_dead | int | Seconds spent dead |

## Economy
| Field | Type | Description |
|-------|------|-------------|
| gold_earned | int | Total gold earned |
| gold_spent | int | Total gold spent on items |
| total_minions_killed | int | Lane minions killed (CS) |
| neutral_minions_killed | int | Jungle monsters killed |

## Vision & Map Control
| Field | Type | Description |
|-------|------|-------------|
| vision_score | int | Overall vision contribution score |
| wards_placed | int | Total wards placed |
| wards_killed | int | Enemy wards destroyed |
| control_wards_purchased | int | Pink/Control wards bought |
| vision_wards_bought_in_game | int | Vision wards purchased |
| detector_wards_placed | int | Oracle lens uses |
| sight_wards_bought_in_game | int | Yellow trinket wards |

## Objectives
| Field | Type | Description |
|-------|------|-------------|
| turret_kills | int | Turrets destroyed |
| inhibitor_kills | int | Inhibitors destroyed |
| dragon_kills | int | Dragons killed/assisted |
| baron_kills | int | Baron Nashors killed/assisted |
| rift_herald_kills | int | Rift Heralds killed/assisted |
| objectives_stolen | int | Epic monsters stolen (smite steals) |
| nexus_kills | int | Nexus destroyed (winning objective) |
| turret_plates_taken | int | Turret plates taken (pre-14 min) |

## First Blood/Objective Bonuses
| Field | Type | Description |
|-------|------|-------------|
| first_blood_kill | int | Got first blood (1 or 0) |
| first_blood_assist | int | Assisted first blood (1 or 0) |
| first_tower_kill | int | Got first tower (1 or 0) |
| first_tower_assist | int | Assisted first tower (1 or 0) |

## Character Progression
| Field | Type | Description |
|-------|------|-------------|
| champ_level | int | Final champion level (max 18) |

## Items
| Field | Type | Description |
|-------|------|-------------|
| item0-6 | int | Item IDs in each slot (0-6) |
| consumables_purchased | int | Potions/elixirs bought |

## Summoner Spells
| Field | Type | Description |
|-------|------|-------------|
| summoner1_id | int | First summoner spell ID (4=Flash, 7=Heal, etc.) |
| summoner2_id | int | Second summoner spell ID |
| summoner1_casts | int | Times spell 1 was used |
| summoner2_casts | int | Times spell 2 was used |

## Ability Usage
| Field | Type | Description |
|-------|------|-------------|
| spell1_casts | int | Q ability casts |
| spell2_casts | int | W ability casts |
| spell3_casts | int | E ability casts |
| spell4_casts | int | R (ultimate) ability casts |

## Calculated Metrics (Per Minute)
| Field | Type | Description |
|-------|------|-------------|
| cs_per_min | float | Creep score (CS) per minute |
| gold_per_min | float | Gold earned per minute |
| damage_per_min | float | Damage to champions per minute |
| vision_per_min | float | Vision score per minute |

## Sample Item IDs
Common items you'll see:
- 6672: Kraken Slayer
- 3031: Infinity Edge
- 3094: Rapid Firecannon
- 3036: Lord Dominik's Regards
- 3046: Phantom Dancer
- 3508: Essence Reaver
- 3072: Bloodthirster
- 3340: Warding Totem (trinket)
- 6653: Liandry's Anguish
- 3020: Sorcerer's Shoes
- 3135: Void Staff

## Sample Summoner Spell IDs
- 4: Flash
- 7: Heal
- 11: Smite
- 14: Ignite
- 3: Exhaust
- 12: Teleport

## Queue IDs
- 420: Ranked Solo/Duo
- 440: Ranked Flex
- 400: Normal Draft
- 430: Normal Blind
- 450: ARAM

## Data Usage Examples

### Win Rate Calculation
```python
win_rate = (wins / total_games) * 100
```

### KDA Calculation
```python
kda = (kills + assists) / max(deaths, 1)
```

### CS Per Minute
```python
cs_per_min = (total_minions_killed + neutral_minions_killed) / (game_duration / 60)
```

### Vision Score Per Minute
```python
vision_per_min = vision_score / (game_duration / 60)
```

### Early Game Performance (First 15 min)
Filter matches and look at:
- Gold differential at 15 min
- CS differential at 15 min
- First blood participation
- Turret plates taken

### Late Game Performance (After 30 min)
Filter matches > 1800 seconds and analyze:
- Death rate after 30 min
- Vision score in late game
- Baron/Dragon participation
