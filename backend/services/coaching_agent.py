"""
Bedrock Coaching Agent - Multi-step reasoning agent for personalized coaching
"""
import boto3
import json
from typing import Dict, List, Optional
from services.agent_tools import AgentTools


class CoachingAgent:
    """
    AI Coaching Agent powered by Amazon Bedrock

    Uses Claude's function calling to:
    1. Understand user questions
    2. Decide which tools to call
    3. Execute multiple tools in sequence
    4. Synthesize insights into actionable coaching
    """

    def __init__(self, riot_client, region_name: str = "us-east-1"):
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name=region_name
        )
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        self.tools = AgentTools(riot_client)

        # Define available tools for the agent
        self.tool_definitions = [
            {
                "name": "analyze_recent_performance",
                "description": "Analyzes a player's recent match performance, including win rate trends, performance in different game lengths, and recent vs older performance. Use this to understand how the player has been performing lately.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "puuid": {
                            "type": "string",
                            "description": "The player's unique ID (PUUID)"
                        },
                        "games": {
                            "type": "integer",
                            "description": "Number of recent games to analyze (default 20)"
                        }
                    },
                    "required": ["puuid"]
                }
            },
            {
                "name": "detect_patterns",
                "description": "Detects recurring patterns in a player's gameplay including vision control, death patterns, damage consistency, and objective participation. Use this to identify specific weaknesses or strengths.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "puuid": {
                            "type": "string",
                            "description": "The player's unique ID (PUUID)"
                        },
                        "games": {
                            "type": "integer",
                            "description": "Number of games to analyze for patterns (default 30)"
                        }
                    },
                    "required": ["puuid"]
                }
            },
            {
                "name": "recommend_champions",
                "description": "Recommends champions based on the player's role and identified weaknesses. Use this after detecting patterns to suggest champion pool improvements.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "puuid": {
                            "type": "string",
                            "description": "The player's unique ID (PUUID)"
                        },
                        "role": {
                            "type": "string",
                            "description": "Player's main role (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)"
                        },
                        "weakness": {
                            "type": "string",
                            "description": "Identified weakness to address (early_game, late_game, vision, damage, tankiness)"
                        }
                    },
                    "required": ["puuid", "role", "weakness"]
                }
            },
            {
                "name": "compare_to_rank",
                "description": "Compares the player's statistics to benchmark stats for a target rank. Use this to show the player what they need to improve to reach their goal rank.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "puuid": {
                            "type": "string",
                            "description": "The player's unique ID (PUUID)"
                        },
                        "target_rank": {
                            "type": "string",
                            "description": "Target rank to compare against (gold, platinum, diamond, master)"
                        }
                    },
                    "required": ["puuid", "target_rank"]
                }
            },
            {
                "name": "generate_practice_plan",
                "description": "Generates a structured weekly practice plan based on identified weaknesses. Use this after identifying weaknesses to create an actionable improvement roadmap.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "weaknesses": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of weaknesses to address"
                        },
                        "timeframe_weeks": {
                            "type": "integer",
                            "description": "Number of weeks for the plan (default 3)"
                        }
                    },
                    "required": ["weaknesses"]
                }
            }
        ]

    async def chat(
        self,
        user_message: str,
        puuid: str,
        main_role: str = "MIDDLE",
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Main chat interface for the coaching agent

        Args:
            user_message: The user's question or request
            puuid: Player's unique ID
            main_role: Player's main role
            conversation_history: Previous messages in the conversation

        Returns:
            Dict with agent's response and tool calls made
        """
        if conversation_history is None:
            conversation_history = []

        # System prompt for the coaching agent
        system_prompt = f"""You are an expert League of Legends coach powered by AI. Your role is to help players improve by:

1. Analyzing their match data using the available tools
2. Identifying specific patterns and weaknesses
3. Providing actionable, personalized coaching advice
4. Creating structured improvement plans

The player you're coaching:
- PUUID: {puuid}
- Main Role: {main_role}

When answering questions:
- Use multiple tools to gather complete information
- Be specific and data-driven in your analysis
- Provide actionable advice, not generic tips
- Break down complex improvements into steps
- Be encouraging but honest about areas to improve

Available tools let you:
- Analyze recent performance and trends
- Detect patterns in gameplay
- Recommend champion pool changes
- Compare stats to target ranks
- Generate structured practice plans

Think step by step and use tools to gather data before giving advice."""

        # Build message history
        messages = conversation_history + [
            {
                "role": "user",
                "content": user_message
            }
        ]

        # Track tool use for response
        tools_used = []
        max_iterations = 5  # Prevent infinite loops

        for iteration in range(max_iterations):
            # Call Bedrock with tool definitions
            response = await self._call_bedrock(messages, system_prompt)

            # Check if agent wants to use tools
            if response.get("stop_reason") == "tool_use":
                # Extract tool calls
                tool_calls = [
                    content for content in response["content"]
                    if content.get("type") == "tool_use"
                ]

                # Execute tools
                tool_results = []
                for tool_call in tool_calls:
                    tool_name = tool_call["name"]
                    tool_input = tool_call["input"]
                    tool_id = tool_call["id"]

                    # Execute the tool
                    result = await self._execute_tool(tool_name, tool_input)
                    tools_used.append({
                        "name": tool_name,
                        "input": tool_input,
                        "result": result
                    })

                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": tool_id,
                        "content": json.dumps(result)
                    })

                # Add assistant response and tool results to conversation
                messages.append({
                    "role": "assistant",
                    "content": response["content"]
                })
                messages.append({
                    "role": "user",
                    "content": tool_results
                })

            else:
                # Agent has finished, extract final response
                final_text = ""
                for content in response["content"]:
                    if content.get("type") == "text":
                        final_text += content["text"]

                return {
                    "response": final_text,
                    "tools_used": tools_used,
                    "conversation_history": messages
                }

        # Max iterations reached
        return {
            "response": "I've analyzed your data but need more context. Could you rephrase your question?",
            "tools_used": tools_used,
            "conversation_history": messages
        }

    async def _call_bedrock(
        self,
        messages: List[Dict],
        system_prompt: str
    ) -> Dict:
        """Call Bedrock with tool definitions"""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4096,
            "temperature": 0.7,
            "system": system_prompt,
            "messages": messages,
            "tools": self.tool_definitions
        }

        response = self.bedrock.invoke_model(
            modelId=self.model_id,
            body=json.dumps(body)
        )

        return json.loads(response['body'].read())

    async def _execute_tool(self, tool_name: str, tool_input: Dict) -> Dict:
        """Execute a tool and return results"""
        try:
            if tool_name == "analyze_recent_performance":
                return await self.tools.analyze_recent_performance(**tool_input)
            elif tool_name == "detect_patterns":
                return await self.tools.detect_patterns(**tool_input)
            elif tool_name == "recommend_champions":
                return await self.tools.recommend_champions(**tool_input)
            elif tool_name == "compare_to_rank":
                return await self.tools.compare_to_rank(**tool_input)
            elif tool_name == "generate_practice_plan":
                return await self.tools.generate_practice_plan(**tool_input)
            else:
                return {"error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            return {"error": str(e)}

    async def quick_analysis(self, puuid: str, main_role: str = "MIDDLE") -> Dict:
        """Quick pre-defined analysis for demo purposes"""
        return await self.chat(
            user_message="Analyze my recent performance and tell me what I need to improve to rank up. Be specific and create an improvement plan.",
            puuid=puuid,
            main_role=main_role
        )
