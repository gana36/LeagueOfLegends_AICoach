from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import logging
from dotenv import load_dotenv

from services.riot_api import RiotAPIClient
from services.bedrock_ai import BedrockAIService
from services.match_analyzer import MatchAnalyzer
from services.coaching_agent import CoachingAgent
from services.timeline_aggregator import TimelineAggregator
from services.demo_data import (
    DEMO_PLAYER,
    DEMO_YEAR_RECAP,
    DEMO_INSIGHTS,
    DEMO_STRENGTHS_WEAKNESSES
)
from api.player_api import router as player_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="Rift Rewind API", version="1.0.0")

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(player_router)

# Initialize services
riot_client = RiotAPIClient(api_key=os.getenv("RIOT_API_KEY"))

# Initialize Bedrock service (optional - some features won't work if unavailable)
try:
    bedrock_service = BedrockAIService()
    logger.info("Bedrock AI service initialized successfully")
except Exception as e:
    logger.warning(f"Bedrock AI service initialization failed: {e}")
    logger.warning("AI-powered features will be unavailable")
    bedrock_service = None

match_analyzer = MatchAnalyzer(riot_client, bedrock_service) if bedrock_service else None
coaching_agent = CoachingAgent(riot_client) if riot_client else None
timeline_aggregator = TimelineAggregator()


class PlayerRequest(BaseModel):
    game_name: str
    tag_line: str
    region: str = "americas"


class MatchAnalysisRequest(BaseModel):
    puuid: str
    match_count: int = 20


class CoachingChatRequest(BaseModel):
    puuid: str
    message: str
    main_role: str = "MIDDLE"
    conversation_history: Optional[List[dict]] = None


class QuickCoachingRequest(BaseModel):
    puuid: str
    main_role: str = "MIDDLE"


class MasteryRequest(BaseModel):
    puuid: str
    platform: str = "na1"


class RankedRequest(BaseModel):
    summoner_id: str
    platform: str = "na1"


class ChallengesRequest(BaseModel):
    puuid: str
    platform: str = "na1"


class YearRecapHeatmapRequest(BaseModel):
    puuid: str
    player_name: str = "Player"


@app.get("/")
async def root():
    return {
        "message": "Rift Rewind API - Powered by AWS and Riot Games",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/api/player/lookup")
async def lookup_player(request: PlayerRequest):
    """Look up a player by Riot ID (game name + tag line)"""
    try:
        account = await riot_client.get_account_by_riot_id(
            request.game_name,
            request.tag_line,
            request.region
        )
        return account
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Player not found: {str(e)}")


@app.post("/api/matches/history")
async def get_match_history(request: MatchAnalysisRequest):
    """Get match history for a player"""
    try:
        matches = await riot_client.get_match_history(
            request.puuid,
            count=request.match_count
        )
        return {"matches": matches, "count": len(matches)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching matches: {str(e)}")


@app.post("/api/analysis/year-recap")
async def generate_year_recap(request: MatchAnalysisRequest):
    """Generate AI-powered year-end recap for a player"""
    if not match_analyzer:
        raise HTTPException(status_code=503, detail="AI service unavailable - Bedrock not initialized")
    try:
        logger.info(f"Generating year recap for PUUID: {request.puuid[:8]}...")
        recap = await match_analyzer.generate_year_recap(
            request.puuid,
            match_count=request.match_count
        )
        logger.info(f"Successfully generated recap with {recap.get('total_matches', 0)} matches")
        return recap
    except Exception as e:
        logger.error(f"Error generating recap: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating recap: {str(e)}")


@app.post("/api/analysis/insights")
async def generate_insights(request: MatchAnalysisRequest):
    """Generate AI-powered insights about player performance"""
    if not match_analyzer:
        raise HTTPException(status_code=503, detail="AI service unavailable - Bedrock not initialized")
    try:
        insights = await match_analyzer.generate_insights(
            request.puuid,
            match_count=request.match_count
        )
        return insights
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating insights: {str(e)}")


@app.post("/api/analysis/strengths-weaknesses")
async def analyze_strengths_weaknesses(request: MatchAnalysisRequest):
    """Analyze persistent strengths and weaknesses"""
    if not match_analyzer:
        raise HTTPException(status_code=503, detail="AI service unavailable - Bedrock not initialized")
    try:
        analysis = await match_analyzer.analyze_strengths_weaknesses(
            request.puuid,
            match_count=request.match_count
        )
        return analysis
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing player: {str(e)}")


# ============= CHAMPION MASTERY ENDPOINTS =============

@app.post("/api/mastery/top-champions")
async def get_top_champions(request: MasteryRequest):
    """Get player's top champions by mastery points"""
    try:
        masteries = await riot_client.get_top_champion_masteries(
            request.puuid,
            count=10,
            platform=request.platform
        )
        return {"masteries": masteries, "count": len(masteries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching masteries: {str(e)}")


@app.post("/api/mastery/all")
async def get_all_masteries(request: MasteryRequest):
    """Get all champion mastery data for a player"""
    try:
        masteries = await riot_client.get_champion_mastery_by_puuid(
            request.puuid,
            platform=request.platform
        )
        return {"masteries": masteries, "count": len(masteries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching masteries: {str(e)}")


@app.post("/api/mastery/score")
async def get_mastery_score(request: MasteryRequest):
    """Get player's total mastery score"""
    try:
        score = await riot_client.get_champion_mastery_score(
            request.puuid,
            platform=request.platform
        )
        return {"total_score": score}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching mastery score: {str(e)}")


# ============= RANKED/LEAGUE ENDPOINTS =============

@app.post("/api/ranked/entries")
async def get_ranked_entries(request: RankedRequest):
    """Get ranked league entries (Solo/Duo, Flex, etc.)"""
    try:
        entries = await riot_client.get_league_entries_by_summoner(
            request.summoner_id,
            platform=request.platform
        )
        return {"entries": entries, "count": len(entries)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching ranked data: {str(e)}")


# ============= CHALLENGES ENDPOINTS =============

@app.post("/api/challenges/player")
async def get_player_challenges(request: ChallengesRequest):
    """Get all challenge/achievement data for a player"""
    try:
        challenges = await riot_client.get_player_challenges(
            request.puuid,
            platform=request.platform
        )
        return challenges
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching challenges: {str(e)}")


@app.get("/api/challenges/config")
async def get_challenges_config(platform: str = "na1"):
    """Get configuration for all available challenges"""
    try:
        config = await riot_client.get_challenge_config(platform=platform)
        return {"challenges": config, "count": len(config)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching challenge config: {str(e)}")


# ============= YEAR RECAP HEATMAP ENDPOINTS =============

@app.post("/api/year-recap/heatmap")
async def get_year_recap_heatmap(request: YearRecapHeatmapRequest):
    """
    Generate year recap heatmap data by aggregating all timeline events.

    This endpoint dynamically reads timeline data from Sneaky_data/matches/timelines
    and aggregates location-based events (deaths, kills, assists, objectives) for
    the specified player.

    Returns heatmap data suitable for visualization on the map.
    """
    try:
        logger.info(f"Generating year recap heatmap for PUUID: {request.puuid[:8]}...")
        heatmap_data = timeline_aggregator.generate_heatmap_data(
            target_puuid=request.puuid,
            player_name=request.player_name
        )
        logger.info(f"Heatmap generated: {heatmap_data['stats']['total_matches']} matches, "
                   f"{heatmap_data['stats']['deaths_count']} deaths, "
                   f"{heatmap_data['stats']['kills_count']} kills")
        return heatmap_data
    except Exception as e:
        logger.error(f"Error generating heatmap: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating heatmap: {str(e)}")


# ============= AI COACHING AGENT ENDPOINTS =============

@app.post("/api/agent/chat")
async def agent_chat(request: CoachingChatRequest):
    """
    Chat with the AI coaching agent

    The agent will:
    - Analyze your match data using multiple tools
    - Identify patterns and weaknesses
    - Provide personalized coaching advice
    - Create improvement plans
    """
    if not coaching_agent:
        raise HTTPException(status_code=503, detail="AI service unavailable - Coaching agent not initialized")
    try:
        logger.info(f"Agent chat request: {request.message}")
        response = await coaching_agent.chat(
            user_message=request.message,
            puuid=request.puuid,
            main_role=request.main_role,
            conversation_history=request.conversation_history
        )
        logger.info(f"Agent used {len(response['tools_used'])} tools")
        return response
    except Exception as e:
        logger.error(f"Error in agent chat: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error in coaching agent: {str(e)}")


@app.post("/api/agent/quick-analysis")
async def agent_quick_analysis(request: QuickCoachingRequest):
    """
    Get a quick comprehensive analysis from the coaching agent

    The agent will automatically:
    - Analyze recent performance
    - Detect patterns
    - Compare to target rank
    - Generate improvement plan
    """
    if not coaching_agent:
        raise HTTPException(status_code=503, detail="AI service unavailable - Coaching agent not initialized")
    try:
        logger.info(f"Quick analysis for PUUID: {request.puuid[:8]}...")
        response = await coaching_agent.quick_analysis(
            puuid=request.puuid,
            main_role=request.main_role
        )
        logger.info(f"Quick analysis complete with {len(response['tools_used'])} tools")
        return response
    except Exception as e:
        logger.error(f"Error in quick analysis: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error in quick analysis: {str(e)}")


# ============= DEMO MODE ENDPOINTS =============

@app.get("/api/demo/player")
async def get_demo_player():
    """Get demo player data for testing"""
    logger.info("Returning demo player data")
    return DEMO_PLAYER


@app.get("/api/demo/year-recap")
async def get_demo_year_recap():
    """Get demo year recap for testing"""
    logger.info("Returning demo year recap")
    return DEMO_YEAR_RECAP


@app.get("/api/demo/insights")
async def get_demo_insights():
    """Get demo insights for testing"""
    logger.info("Returning demo insights")
    return DEMO_INSIGHTS


@app.get("/api/demo/strengths-weaknesses")
async def get_demo_strengths_weaknesses():
    """Get demo strengths and weaknesses for testing"""
    logger.info("Returning demo strengths and weaknesses")
    return DEMO_STRENGTHS_WEAKNESSES


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
