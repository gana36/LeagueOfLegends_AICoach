"""
Year Recap Chat Agent with Tool-Calling Capabilities
Handles conversational queries about year-long performance and achievements
Supports dynamic data fetching and UI manipulation tools
"""

import boto3
import json
from typing import List, Dict, Optional, Any
import logging
import os
from decimal import Decimal

logger = logging.getLogger(__name__)


def convert_decimals(obj):
    """Recursively convert Decimal objects to float for JSON serialization"""
    if isinstance(obj, dict):
        return {k: convert_decimals(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_decimals(item) for item in obj]
    elif isinstance(obj, Decimal):
        return float(obj)
    return obj


class YearRecapChatAgent:
    def __init__(self):
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'
        )
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        self.tools = self._define_tools()

    def _define_tools(self) -> List[Dict]:
        """Define all available tools for the agent"""
        return [
            {
                "name": "get_champion_performance",
                "description": "Fetch detailed performance stats for a specific champion. Use this when the user asks about a specific champion's performance, win rate, or playstyle.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "champion_name": {
                            "type": "string",
                            "description": "The name of the champion (e.g., 'Yasuo', 'Ahri', 'Lee Sin')"
                        }
                    },
                    "required": ["champion_name"]
                }
            },
            {
                "name": "get_role_performance",
                "description": "Fetch performance stats filtered by role (Top, Jungle, Mid, Bot, Support). Use this when the user asks about performance in a specific role.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "role": {
                            "type": "string",
                            "enum": ["Top", "Jungle", "Mid", "Bot", "Support"],
                            "description": "The role to analyze"
                        }
                    },
                    "required": ["role"]
                }
            },
            {
                "name": "get_time_filtered_stats",
                "description": "Get stats for a specific time range (e.g., last 20 games, last 50 games). Use this when the user wants to analyze recent performance or a specific period.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "time_range": {
                            "type": "integer",
                            "description": "Number of recent matches to analyze (e.g., 20, 50, 100)"
                        }
                    },
                    "required": ["time_range"]
                }
            },
            {
                "name": "compare_champions",
                "description": "Compare performance between two or more champions. Use this when the user wants to know which champion they perform better with.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "champion_names": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of champion names to compare (2-5 champions)"
                        }
                    },
                    "required": ["champion_names"]
                }
            },
            {
                "name": "get_vision_details",
                "description": "Get detailed vision control statistics (wards placed, vision score, etc.). Use when the user asks about vision control or warding.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_objective_details",
                "description": "Get detailed objective control statistics (dragons, barons, towers). Use when the user asks about objective control or macro play.",
                "input_schema": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            },
            {
                "name": "get_filtered_heatmap_visualization",
                "description": "Fetch and display filtered heatmap data with ANY combination of filters. Use this when users ask to see specific events like 'show me Varus kills', 'where did I die on Yasuo', 'show Mid lane deaths', etc. This is the MOST POWERFUL tool - use it for ANY filtering request!",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "event_type": {
                            "type": "string",
                            "enum": ["kills", "deaths", "assists", "objectives"],
                            "description": "Type of events to show on heatmap"
                        },
                        "champion_name": {
                            "type": "string",
                            "description": "Filter by specific champion (e.g., 'Varus', 'Yasuo'). Leave empty for all champions."
                        },
                        "role": {
                            "type": "string",
                            "enum": ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"],
                            "description": "Filter by role. Leave empty for all roles."
                        },
                        "match_count": {
                            "type": "integer",
                            "description": "Number of recent matches to analyze (e.g., 'last 20 matches'). Leave empty for all matches."
                        },
                        "game_time_start": {
                            "type": "integer",
                            "description": "Start of game time range in MINUTES (e.g., 10 for 10th minute, 0 for start). Use with game_time_end for ranges like '10-15 minutes'."
                        },
                        "game_time_end": {
                            "type": "integer",
                            "description": "End of game time range in MINUTES (e.g., 15 for 15th minute, 45 for end). If user says 'at 15th minute', use start=14 and end=15 for that 1-minute window."
                        }
                    },
                    "required": ["event_type"]
                }
            },
            {
                "name": "analyze_player_performance",
                "description": "Perform comprehensive AI-powered analysis of player strengths, weaknesses, and trends. Use this when users ask 'how am I doing?', 'what should I improve?', 'analyze my performance', 'what are my strengths?', 'what are my weaknesses?', or any question about overall performance evaluation.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "analysis_type": {
                            "type": "string",
                            "enum": ["overall", "recent", "champion_specific", "role_specific"],
                            "description": "Type of analysis: 'overall' for all-time, 'recent' for recent matches, 'champion_specific' for a specific champion, 'role_specific' for a specific role"
                        },
                        "time_range": {
                            "type": "integer",
                            "description": "For 'recent' analysis, number of recent matches to analyze (e.g., 20, 50)"
                        },
                        "champion_name": {
                            "type": "string",
                            "description": "For 'champion_specific' analysis, the champion name"
                        },
                        "role": {
                            "type": "string",
                            "enum": ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"],
                            "description": "For 'role_specific' analysis, the role to analyze"
                        },
                        "rank": {
                            "type": "string",
                            "enum": ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"],
                            "description": "Player's rank for benchmark comparison. Defaults to GOLD if not specified."
                        }
                    },
                    "required": ["analysis_type"]
                }
            },
            {
                "name": "detect_gameplay_habits",
                "description": "Detect persistent gameplay habits - both good habits to celebrate and bad habits with actionable recommendations. Use this when users ask about 'habits', 'patterns', 'what do I do consistently', 'what are my tendencies', 'do I ward enough', 'am I passive', or any question about recurring behaviors.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "time_range": {
                            "type": "integer",
                            "description": "Number of recent matches to analyze for habits (default: 50). Use more matches for more reliable patterns."
                        },
                        "rank": {
                            "type": "string",
                            "enum": ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER", "GRANDMASTER", "CHALLENGER"],
                            "description": "Player's rank for context-aware habit detection. Defaults to GOLD if not specified."
                        }
                    },
                    "required": []
                }
            }
        ]

    def chat(self, message: str, year_recap_data: Dict, puuid: str, conversation_history: Optional[List[Dict]] = None) -> Dict:
        """
        Process year recap chat messages with tool-calling capabilities

        Args:
            message: User's question
            year_recap_data: Full year recap data including stats, heatmaps, etc
            puuid: Player's PUUID for data fetching
            conversation_history: Previous conversation messages

        Returns:
            Dict with response, tools used, UI actions, and updated conversation history
        """
        if conversation_history is None:
            conversation_history = []

        # Build context from year recap data
        context = self._build_year_context(year_recap_data)

        # System prompt for year recap assistant
        system_prompt = """You are an agentic League of Legends Year Recap Assistant with tool-calling capabilities. You help players understand their year-long journey, achievements, and growth.

Your capabilities:
- Answer questions about yearly performance, patterns, and milestones
- Use tools to fetch detailed data when users ask specific questions
- Use UI action tools to help users visualize data on the page
- Compare champions, roles, and time periods
- Highlight memorable moments and achievements
- Provide insights on champion pool, playstyle evolution, and trends

Important guidelines:
- When users ask about specific champions, roles, or time periods, USE THE APPROPRIATE TOOLS to fetch that data
- When it would help the user, use UI action tools (filter_by_champion, switch_heatmap_category, etc.)
- Keep responses concise (2-3 sentences)
- Focus on year-long trends and patterns
- Be encouraging and celebratory

Available context about the player's year:
""" + context

        # Build conversation messages
        messages = conversation_history + [{"role": "user", "content": message}]

        # Tool-calling loop
        tools_used = []
        ui_actions = []
        max_iterations = 5
        iteration = 0

        try:
            while iteration < max_iterations:
                iteration += 1

                # Call Bedrock with tools
                body = {
                    "anthropic_version": "bedrock-2023-05-31",
                    "max_tokens": 1000,
                    "temperature": 0.7,
                    "system": system_prompt,
                    "messages": messages,
                    "tools": self.tools
                }

                response = self.bedrock.invoke_model(
                    modelId=self.model_id,
                    body=json.dumps(body)
                )

                result = json.loads(response['body'].read())
                stop_reason = result.get('stop_reason')

                # Process response content
                assistant_message = {"role": "assistant", "content": []}
                response_text = ""
                has_tool_use = False

                for content in result.get('content', []):
                    if content.get('type') == 'text':
                        response_text += content['text']
                        assistant_message["content"].append(content)
                    elif content.get('type') == 'tool_use':
                        has_tool_use = True
                        tool_name = content['name']
                        tool_input = content['input']
                        tool_use_id = content['id']

                        logger.info(f"Agent using tool: {tool_name} with input: {tool_input}")

                        # Execute the tool
                        tool_result = self._execute_tool(tool_name, tool_input, puuid)

                        # Convert Decimals to float for JSON serialization
                        tool_result_converted = convert_decimals(tool_result)

                        tools_used.append({
                            "name": tool_name,
                            "input": tool_input,
                            "result": tool_result_converted
                        })

                        # Check if this is a UI action tool
                        if self._is_ui_action_tool(tool_name):
                            ui_actions.append({
                                "action": tool_name,
                                "params": tool_input
                            })

                        # Add tool use to assistant message
                        assistant_message["content"].append(content)

                        # Add tool result to messages
                        messages.append(assistant_message)
                        messages.append({
                            "role": "user",
                            "content": [{
                                "type": "tool_result",
                                "tool_use_id": tool_use_id,
                                "content": json.dumps(tool_result_converted)
                            }]
                        })
                        break

                # If no tool use, we're done
                if not has_tool_use:
                    messages.append(assistant_message)
                    break

            # Extract final response text
            final_response = response_text or "I'm here to help you understand your year! What would you like to know?"

            # Update conversation history (only include text messages for next iteration)
            # Important: Only keep user messages with string content and final assistant responses (not tool use messages)
            updated_history = []
            for msg in messages:
                if msg["role"] == "user" and isinstance(msg.get("content"), str):
                    # Only add user messages with string content (skip tool_result messages)
                    updated_history.append(msg)
                elif msg["role"] == "assistant":
                    # Check if this assistant message contains tool_use
                    has_tool_use_in_msg = False
                    text_content = ""

                    if isinstance(msg.get("content"), list):
                        for c in msg["content"]:
                            if c.get("type") == "tool_use":
                                has_tool_use_in_msg = True
                            elif c.get("type") == "text":
                                text_content += c["text"]
                    elif isinstance(msg.get("content"), str):
                        text_content = msg["content"]

                    # Only add assistant messages that don't contain tool_use (final responses only)
                    if text_content and not has_tool_use_in_msg:
                        updated_history.append({"role": "assistant", "content": text_content})

            return {
                "response": final_response,
                "conversation_history": updated_history,
                "tools_used": tools_used,
                "ui_actions": ui_actions
            }

        except Exception as e:
            logger.error(f"Error in year recap chat: {e}", exc_info=True)
            return {
                "response": "Sorry, I encountered an error processing your question. Please try again!",
                "conversation_history": conversation_history,
                "tools_used": tools_used,
                "ui_actions": ui_actions
            }

    def _build_year_context(self, year_recap_data: Dict) -> str:
        """Build a comprehensive context string from year recap data"""
        stats = year_recap_data.get('stats', {})
        heatmap_data = year_recap_data.get('heatmap_data', {})

        # Calculate total events
        total_deaths = stats.get('deaths_count', 0)
        total_kills = stats.get('kills_count', 0)
        total_assists = stats.get('assists_count', 0)
        total_objectives = stats.get('objectives_count', 0)
        total_matches = stats.get('total_matches', 0)

        # Calculate averages
        avg_deaths = round(total_deaths / total_matches, 2) if total_matches > 0 else 0
        avg_kills = round(total_kills / total_matches, 2) if total_matches > 0 else 0
        avg_assists = round(total_assists / total_matches, 2) if total_matches > 0 else 0
        avg_kda = round((total_kills + total_assists) / max(total_deaths, 1), 2)

        context_parts = [
            f"**Year Summary:**",
            f"- Total Matches: {total_matches}",
            f"- Total Kills: {total_kills} (avg {avg_kills}/game)",
            f"- Total Deaths: {total_deaths} (avg {avg_deaths}/game)",
            f"- Total Assists: {total_assists} (avg {avg_assists}/game)",
            f"- Yearly KDA: {avg_kda}",
            f"- Total Objectives: {total_objectives}",
            f"",
            f"**Play Patterns:**",
            f"- Most active event type: {self._get_most_active_event(stats)}",
            f"- Objective participation: {total_objectives} objectives secured",
        ]

        return "\n".join(context_parts)

    def _get_most_active_event(self, stats: Dict) -> str:
        """Determine which event type was most common"""
        events = {
            'Deaths': stats.get('deaths_count', 0),
            'Kills': stats.get('kills_count', 0),
            'Assists': stats.get('assists_count', 0),
            'Objectives': stats.get('objectives_count', 0)
        }

        if not any(events.values()):
            return "Unknown"

        max_event = max(events.items(), key=lambda x: x[1])
        return max_event[0]

    def _is_ui_action_tool(self, tool_name: str) -> bool:
        """Check if a tool is a UI action tool"""
        ui_action_tools = {
            'get_filtered_heatmap_visualization'
        }
        return tool_name in ui_action_tools

    def _execute_tool(self, tool_name: str, tool_input: Dict, puuid: str) -> Any:
        """Execute a tool and return the result"""
        try:
            if tool_name == "get_champion_performance":
                return self._get_champion_performance(puuid, tool_input['champion_name'])
            elif tool_name == "get_role_performance":
                return self._get_role_performance(puuid, tool_input['role'])
            elif tool_name == "get_time_filtered_stats":
                return self._get_time_filtered_stats(puuid, tool_input['time_range'])
            elif tool_name == "compare_champions":
                return self._compare_champions(puuid, tool_input['champion_names'])
            elif tool_name == "get_vision_details":
                return self._get_vision_details(puuid)
            elif tool_name == "get_objective_details":
                return self._get_objective_details(puuid)
            elif tool_name == "get_filtered_heatmap_visualization":
                return self._get_filtered_heatmap_visualization(puuid, tool_input)
            elif tool_name == "analyze_player_performance":
                return self._analyze_player_performance(puuid, tool_input)
            elif tool_name == "detect_gameplay_habits":
                return self._detect_gameplay_habits(puuid, tool_input)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
            return {"error": str(e)}

    def _get_champion_performance(self, puuid: str, champion_name: str) -> Dict:
        """Fetch performance stats for a specific champion"""
        import boto3
        from boto3.dynamodb.conditions import Key
        from collections import defaultdict

        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            # Fetch all matches
            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            # Filter matches for the champion
            champion_matches = []
            total_kills = 0
            total_deaths = 0
            total_assists = 0
            total_wins = 0
            total_gold = 0
            total_damage = 0
            total_vision = 0

            for match_item in matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid and participant.get('championName') == champion_name:
                        champion_matches.append(participant)
                        total_kills += participant.get('kills', 0)
                        total_deaths += participant.get('deaths', 0)
                        total_assists += participant.get('assists', 0)
                        total_wins += 1 if participant.get('win', False) else 0
                        total_gold += participant.get('goldEarned', 0)
                        total_damage += participant.get('totalDamageDealtToChampions', 0)
                        total_vision += participant.get('visionScore', 0)
                        break

            if not champion_matches:
                return {"error": f"No matches found for {champion_name}"}

            num_matches = len(champion_matches)
            win_rate = (total_wins / num_matches * 100) if num_matches > 0 else 0
            avg_kda = ((total_kills + total_assists) / max(total_deaths, 1)) if total_deaths > 0 else total_kills + total_assists

            return {
                "champion": champion_name,
                "matches": num_matches,
                "win_rate": round(win_rate, 1),
                "kda": round(avg_kda, 2),
                "avg_kills": round(total_kills / num_matches, 1),
                "avg_deaths": round(total_deaths / num_matches, 1),
                "avg_assists": round(total_assists / num_matches, 1),
                "avg_gold": round(total_gold / num_matches, 0),
                "avg_damage": round(total_damage / num_matches, 0),
                "avg_vision": round(total_vision / num_matches, 1)
            }

        except Exception as e:
            logger.error(f"Error fetching champion performance: {e}")
            return {"error": str(e)}

    def _get_role_performance(self, puuid: str, role: str) -> Dict:
        """Fetch performance stats for a specific role"""
        import boto3
        from boto3.dynamodb.conditions import Key

        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            # Role mapping
            role_map = {
                'Top': 'TOP',
                'Jungle': 'JUNGLE',
                'Mid': 'MIDDLE',
                'Bot': 'BOTTOM',
                'Support': 'UTILITY'
            }
            riot_role = role_map.get(role, role)

            # Fetch matches
            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            # Filter by role
            role_stats = {
                'matches': 0,
                'wins': 0,
                'total_kda': 0,
                'total_vision': 0,
                'total_damage': 0
            }

            for match_item in matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid and participant.get('teamPosition') == riot_role:
                        role_stats['matches'] += 1
                        role_stats['wins'] += 1 if participant.get('win', False) else 0
                        challenges = participant.get('challenges', {})
                        role_stats['total_kda'] += float(challenges.get('kda', 0))
                        role_stats['total_vision'] += participant.get('visionScore', 0)
                        role_stats['total_damage'] += participant.get('totalDamageDealtToChampions', 0)
                        break

            if role_stats['matches'] == 0:
                return {"error": f"No matches found for {role} role"}

            return {
                "role": role,
                "matches": role_stats['matches'],
                "win_rate": round((role_stats['wins'] / role_stats['matches']) * 100, 1),
                "avg_kda": round(role_stats['total_kda'] / role_stats['matches'], 2),
                "avg_vision": round(role_stats['total_vision'] / role_stats['matches'], 1),
                "avg_damage": round(role_stats['total_damage'] / role_stats['matches'], 0)
            }

        except Exception as e:
            logger.error(f"Error fetching role performance: {e}")
            return {"error": str(e)}

    def _get_time_filtered_stats(self, puuid: str, time_range: int) -> Dict:
        """Get stats for recent matches"""
        import boto3
        from boto3.dynamodb.conditions import Key

        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            # Fetch matches
            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            # Limit to time_range
            recent_matches = matches[:time_range]

            # Calculate stats
            stats = {
                'matches': 0,
                'wins': 0,
                'total_kda': 0,
                'total_vision': 0,
                'total_damage': 0
            }

            for match_item in recent_matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid:
                        stats['matches'] += 1
                        stats['wins'] += 1 if participant.get('win', False) else 0
                        challenges = participant.get('challenges', {})
                        stats['total_kda'] += float(challenges.get('kda', 0))
                        stats['total_vision'] += participant.get('visionScore', 0)
                        stats['total_damage'] += participant.get('totalDamageDealtToChampions', 0)
                        break

            if stats['matches'] == 0:
                return {"error": "No recent matches found"}

            return {
                "time_range": f"Last {time_range} matches",
                "matches": stats['matches'],
                "win_rate": round((stats['wins'] / stats['matches']) * 100, 1),
                "avg_kda": round(stats['total_kda'] / stats['matches'], 2),
                "avg_vision": round(stats['total_vision'] / stats['matches'], 1),
                "avg_damage": round(stats['total_damage'] / stats['matches'], 0)
            }

        except Exception as e:
            logger.error(f"Error fetching time filtered stats: {e}")
            return {"error": str(e)}

    def _compare_champions(self, puuid: str, champion_names: List[str]) -> Dict:
        """Compare performance between champions"""
        results = {}
        for champion in champion_names:
            results[champion] = self._get_champion_performance(puuid, champion)
        return {"comparison": results}

    def _get_vision_details(self, puuid: str) -> Dict:
        """Get detailed vision statistics"""
        import boto3
        from boto3.dynamodb.conditions import Key

        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            vision_totals = {
                'wards_placed': 0,
                'wards_killed': 0,
                'control_wards': 0,
                'vision_score': 0,
                'matches': 0
            }

            for match_item in matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid:
                        vision_totals['matches'] += 1
                        vision_totals['wards_placed'] += participant.get('wardsPlaced', 0)
                        vision_totals['wards_killed'] += participant.get('wardsKilled', 0)
                        vision_totals['control_wards'] += participant.get('detectorWardsPlaced', 0)
                        vision_totals['vision_score'] += participant.get('visionScore', 0)
                        break

            if vision_totals['matches'] == 0:
                return {"error": "No matches found"}

            return {
                "avg_wards_placed": round(vision_totals['wards_placed'] / vision_totals['matches'], 1),
                "avg_wards_killed": round(vision_totals['wards_killed'] / vision_totals['matches'], 1),
                "avg_control_wards": round(vision_totals['control_wards'] / vision_totals['matches'], 1),
                "avg_vision_score": round(vision_totals['vision_score'] / vision_totals['matches'], 1),
                "matches": vision_totals['matches']
            }

        except Exception as e:
            logger.error(f"Error fetching vision details: {e}")
            return {"error": str(e)}

    def _get_objective_details(self, puuid: str) -> Dict:
        """Get detailed objective statistics"""
        import boto3
        from boto3.dynamodb.conditions import Key

        try:
            dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
            table = dynamodb.Table('lol-player-data')

            matches = []
            last_evaluated_key = None

            while True:
                if last_evaluated_key:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#'),
                        ExclusiveStartKey=last_evaluated_key
                    )
                else:
                    response = table.query(
                        KeyConditionExpression=Key('puuid').eq(puuid) & Key('dataType').begins_with('match#')
                    )

                matches.extend(response['Items'])
                last_evaluated_key = response.get('LastEvaluatedKey')
                if not last_evaluated_key:
                    break

            objective_totals = {
                'dragons': 0,
                'barons': 0,
                'towers': 0,
                'first_blood': 0,
                'matches': 0
            }

            for match_item in matches:
                match_data = match_item.get('data', {})
                participants = match_data.get('info', {}).get('participants', [])

                for participant in participants:
                    if participant.get('puuid') == puuid:
                        objective_totals['matches'] += 1
                        challenges = participant.get('challenges', {})
                        objective_totals['dragons'] += int(challenges.get('dragonTakedowns', 0) or 0)
                        objective_totals['barons'] += int(challenges.get('teamBaronKills', 0) or 0)
                        objective_totals['towers'] += participant.get('turretKills', 0)
                        objective_totals['first_blood'] += 1 if participant.get('firstBloodKill') else 0
                        break

            if objective_totals['matches'] == 0:
                return {"error": "No matches found"}

            return {
                "avg_dragons": round(objective_totals['dragons'] / objective_totals['matches'], 2),
                "avg_barons": round(objective_totals['barons'] / objective_totals['matches'], 2),
                "avg_towers": round(objective_totals['towers'] / objective_totals['matches'], 2),
                "first_blood_rate": round((objective_totals['first_blood'] / objective_totals['matches']) * 100, 1),
                "matches": objective_totals['matches']
            }

        except Exception as e:
            logger.error(f"Error fetching objective details: {e}")
            return {"error": str(e)}

    def _get_filtered_heatmap_visualization(self, puuid: str, filters: Dict) -> Dict:
        """
        Fetch filtered heatmap data and return it for UI visualization.
        This is a UI action tool that will trigger frontend updates.
        """
        from services.heatmap_filter import filter_heatmap_events

        try:
            # Call the shared filtering logic directly (no HTTP request - avoids deadlock!)
            data = filter_heatmap_events(
                puuid=puuid,
                event_type=filters['event_type'],
                champion_name=filters.get('champion_name'),
                role=filters.get('role'),
                match_count=filters.get('match_count'),
                game_time_start=filters.get('game_time_start'),
                game_time_end=filters.get('game_time_end')
            )

            logger.info(f"Filtered heatmap: {data['total_events']} events from {data['matches_analyzed']} matches")

            return {
                "status": "success",
                "message": f"Fetched {data['total_events']} {filters['event_type']} events",
                "data": data,
                "filters_description": self._format_filters_description(filters)
            }

        except Exception as e:
            logger.error(f"Error fetching filtered heatmap: {e}", exc_info=True)
            return {"error": str(e)}

    def _analyze_player_performance(self, puuid: str, tool_input: Dict) -> Dict:
        """
        Perform AI-powered performance analysis using the StrengthAnalyzer
        """
        from services.strength_analyzer import StrengthAnalyzer

        try:
            analyzer = StrengthAnalyzer()

            analysis_type = tool_input.get('analysis_type', 'overall')
            time_range = tool_input.get('time_range')
            rank = tool_input.get('rank', 'GOLD')
            role = tool_input.get('role')

            # For champion-specific analysis, we need to filter the data differently
            # For now, we'll use the overall analysis but note this in the response
            if analysis_type == 'champion_specific':
                # TODO: Future enhancement - filter stats by champion
                logger.warning("Champion-specific analysis not yet fully implemented, using overall stats")

            result = analyzer.analyze_player_performance(
                puuid=puuid,
                rank=rank,
                role=role,
                analysis_type=analysis_type,
                time_range=time_range
            )

            if not result.get('success'):
                return {"error": result.get('error', 'Analysis failed')}

            # Format the result for the agent to present
            # Note: Decimal conversion happens at tool execution level
            return {
                "status": "success",
                "analysis_type": analysis_type,
                "rank": rank,
                "role": role,
                "matches_analyzed": result['player_stats'].get('matches_analyzed', 0),
                "overall_percentile": result['overall_percentile'],
                "strengths": result['strengths'],
                "weaknesses": result['weaknesses'],
                "ai_narrative": result['ai_narrative'],
                "recommendations": result['recommendations'],
                "player_stats": result['player_stats']
            }

        except Exception as e:
            logger.error(f"Error in performance analysis: {e}", exc_info=True)
            return {"error": str(e)}

    def _detect_gameplay_habits(self, puuid: str, tool_input: Dict) -> Dict:
        """Detect persistent gameplay habits"""
        try:
            from services.habits_detector import HabitsDetector

            time_range = tool_input.get('time_range', 50)
            rank = tool_input.get('rank', 'GOLD')

            detector = HabitsDetector()
            result = detector.detect_habits(
                puuid=puuid,
                time_range=time_range,
                rank=rank
            )

            if not result.get('success'):
                return {"error": result.get('error', 'Failed to detect habits')}

            return {
                "status": "success",
                "matches_analyzed": result['matches_analyzed'],
                "good_habits": result['good_habits'],
                "bad_habits": result['bad_habits'],
                "patterns": result['patterns']
            }

        except Exception as e:
            logger.error(f"Error detecting habits: {e}", exc_info=True)
            return {"error": str(e)}

    def _format_filters_description(self, filters: Dict) -> str:
        """Format filter description for display"""
        parts = [f"{filters['event_type']}"]

        if filters.get('champion_name'):
            parts.append(f"on {filters['champion_name']}")

        if filters.get('role'):
            parts.append(f"in {filters['role']} role")

        if filters.get('time_range'):
            parts.append(f"(last {filters['time_range']} matches)")

        return " ".join(parts)
