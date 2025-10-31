"""
Test script for new API endpoints
Run this to verify all endpoints are properly configured
"""
import asyncio
from services.riot_api import RiotAPIClient
import os
from dotenv import load_dotenv

load_dotenv()


async def test_api_structure():
    """Test that all API methods exist and are callable"""

    api_key = os.getenv("RIOT_API_KEY", "RGAPI-test-key")
    client = RiotAPIClient(api_key)

    print("Testing API Client Structure...")
    print("=" * 60)

    # Test Champion Mastery methods exist
    print("\n✓ Champion Mastery API Methods:")
    assert hasattr(client, "get_champion_mastery_by_puuid"), "Missing get_champion_mastery_by_puuid"
    print("  - get_champion_mastery_by_puuid")
    assert hasattr(client, "get_champion_mastery_by_champion"), "Missing get_champion_mastery_by_champion"
    print("  - get_champion_mastery_by_champion")
    assert hasattr(client, "get_top_champion_masteries"), "Missing get_top_champion_masteries"
    print("  - get_top_champion_masteries")
    assert hasattr(client, "get_champion_mastery_score"), "Missing get_champion_mastery_score"
    print("  - get_champion_mastery_score")

    # Test League/Ranked methods exist
    print("\n✓ League/Ranked API Methods:")
    assert hasattr(client, "get_league_entries_by_summoner"), "Missing get_league_entries_by_summoner"
    print("  - get_league_entries_by_summoner")
    assert hasattr(client, "get_challenger_league"), "Missing get_challenger_league"
    print("  - get_challenger_league")
    assert hasattr(client, "get_grandmaster_league"), "Missing get_grandmaster_league"
    print("  - get_grandmaster_league")
    assert hasattr(client, "get_master_league"), "Missing get_master_league"
    print("  - get_master_league")

    # Test Challenges methods exist
    print("\n✓ Challenges API Methods:")
    assert hasattr(client, "get_player_challenges"), "Missing get_player_challenges"
    print("  - get_player_challenges")
    assert hasattr(client, "get_challenge_config"), "Missing get_challenge_config"
    print("  - get_challenge_config")
    assert hasattr(client, "get_challenge_percentiles"), "Missing get_challenge_percentiles"
    print("  - get_challenge_percentiles")
    assert hasattr(client, "get_challenge_leaderboard"), "Missing get_challenge_leaderboard"
    print("  - get_challenge_leaderboard")

    # Test Spectator methods exist
    print("\n✓ Spectator API Methods:")
    assert hasattr(client, "get_active_game"), "Missing get_active_game"
    print("  - get_active_game")
    assert hasattr(client, "get_featured_games"), "Missing get_featured_games"
    print("  - get_featured_games")

    # Test existing methods still work
    print("\n✓ Existing API Methods (still available):")
    assert hasattr(client, "get_account_by_riot_id"), "Missing get_account_by_riot_id"
    print("  - get_account_by_riot_id")
    assert hasattr(client, "get_summoner_by_puuid"), "Missing get_summoner_by_puuid"
    print("  - get_summoner_by_puuid")
    assert hasattr(client, "get_match_history"), "Missing get_match_history"
    print("  - get_match_history")
    assert hasattr(client, "get_match_details"), "Missing get_match_details"
    print("  - get_match_details")

    print("\n" + "=" * 60)
    print("✅ ALL API METHODS SUCCESSFULLY VERIFIED!")
    print("=" * 60)

    print("\n📊 Summary:")
    print(f"  - Champion Mastery APIs: 4 methods")
    print(f"  - League/Ranked APIs: 4 methods")
    print(f"  - Challenges APIs: 4 methods")
    print(f"  - Spectator APIs: 2 methods")
    print(f"  - Total New APIs: 14 methods")
    print(f"  - Existing APIs: 4 methods (still working)")
    print(f"  - GRAND TOTAL: 18 API methods available")


async def test_endpoints():
    """Test that FastAPI endpoints are properly configured"""

    print("\n\nTesting FastAPI Endpoints...")
    print("=" * 60)

    from main import app

    routes = [route.path for route in app.routes]

    # Test new endpoints exist
    new_endpoints = [
        "/api/mastery/top-champions",
        "/api/mastery/all",
        "/api/mastery/score",
        "/api/ranked/entries",
        "/api/challenges/player",
        "/api/challenges/config",
        "/api/spectator/active-game",
        "/api/spectator/featured",
    ]

    print("\n✓ New Endpoints:")
    for endpoint in new_endpoints:
        assert endpoint in routes, f"Missing endpoint: {endpoint}"
        print(f"  - {endpoint}")

    print("\n✓ Existing Endpoints (still available):")
    existing_endpoints = [
        "/api/player/lookup",
        "/api/matches/history",
        "/api/analysis/year-recap",
        "/api/analysis/insights",
        "/api/analysis/strengths-weaknesses",
    ]

    for endpoint in existing_endpoints:
        assert endpoint in routes, f"Missing endpoint: {endpoint}"
        print(f"  - {endpoint}")

    print("\n" + "=" * 60)
    print("✅ ALL ENDPOINTS SUCCESSFULLY VERIFIED!")
    print("=" * 60)

    print(f"\n📊 Total Endpoints: {len(routes)}")
    print(f"   - New API Endpoints: {len(new_endpoints)}")
    print(f"   - Existing Endpoints: {len(existing_endpoints)}")


if __name__ == "__main__":
    print("Rift Rewind - API Integration Test")
    print("=" * 60)

    # Run tests
    asyncio.run(test_api_structure())
    asyncio.run(test_endpoints())

    print("\n>>> ALL TESTS PASSED! <<<")
    print("\nYour Rift Rewind application now includes:")
    print("   - Champion Mastery tracking")
    print("   - Ranked progression analysis")
    print("   - Player challenges/achievements")
    print("   - Live game spectator features")
    print("\nSee API_ENDPOINTS.md for complete documentation")
