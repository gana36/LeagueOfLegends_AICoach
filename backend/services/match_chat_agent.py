"""
Match Chat Agent - AI assistant for match analysis with agentic capabilities
"""
import boto3
import json
import logging
import boto3
from typing import Dict, List, Optional
from .tool_handlers import ToolHandlers

logger = logging.getLogger(__name__)


class MatchChatAgent:
    def __init__(self):
        self.bedrock = boto3.client(
            service_name='bedrock-runtime',
            region_name='us-east-1'
        )
        self.model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
        
        self.tools = [
            # Navigation Tools
            {
                "name": "navigate_to_timestamp",
                "description": "Jump to a specific time in the match timeline. Use when user explicitly asks to go to a specific time or event.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "minutes": {
                            "type": "number",
                            "description": "Time in minutes to navigate to"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Brief description of what's at this timestamp (e.g., 'Second dragon kill')"
                        }
                    },
                    "required": ["minutes"]
                }
            },
            {
                "name": "navigate_to_event",
                "description": "Jump to a specific event by type and index. Use when user asks to see a numbered event (e.g., 'second dragon', 'first baron').",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "event_type": {
                            "type": "string",
                            "enum": ["dragon", "baron", "tower", "herald", "kill"],
                            "description": "Type of event"
                        },
                        "index": {
                            "type": "number",
                            "description": "Which occurrence (0 for first, 1 for second, etc.)"
                        }
                    },
                    "required": ["event_type", "index"]
                }
            },
            
            # Display Tools
            {
                "name": "show_players",
                "description": "Display a list of players with their stats. Use when user wants to see player information.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "filter": {
                            "type": "string",
                            "enum": ["all", "my_team", "enemy_team", "blue_team", "red_team"],
                            "description": "Which players to show"
                        },
                        "sort_by": {
                            "type": "string",
                            "enum": ["kda", "kills", "damage", "gold"],
                            "description": "How to sort the player list"
                        }
                    },
                    "required": ["filter"]
                }
            },
            {
                "name": "show_event_timeline",
                "description": "Display a full timeline of specific events. Use when user wants to see all occurrences of an event type.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "event_type": {
                            "type": "string",
                            "enum": ["dragons", "barons", "towers", "kills", "deaths", "objectives"],
                            "description": "Type of events to show"
                        },
                        "filter": {
                            "type": "string",
                            "enum": ["all", "my_team", "enemy_team"],
                            "description": "Optional filter for events"
                        }
                    },
                    "required": ["event_type"]
                }
            },
            {
                "name": "toggle_map_filter",
                "description": "Toggle visibility of player groups on the map. Use when user wants to show/hide specific teams or players on the map.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "filter": {
                            "type": "string",
                            "enum": ["my_team", "enemy_team", "all", "blue_team", "red_team"],
                            "description": "Which player group to toggle"
                        },
                        "show": {
                            "type": "boolean",
                            "description": "Whether to show (true) or hide (false) the group. Defaults to true."
                        }
                    },
                    "required": ["filter"]
                }
            },
            
            # Card View Tools
            {
                "name": "open_dragon_card",
                "description": "Open a detailed card view for a specific dragon kill. Use when user wants detailed info about a dragon.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "index": {
                            "type": "number",
                            "description": "Which dragon (0 for first, 1 for second, etc.)"
                        }
                    },
                    "required": ["index"]
                }
            },
            {
                "name": "open_kill_card",
                "description": "Open a detailed card view for a specific champion kill. Use when user wants details about a kill.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "index": {
                            "type": "number",
                            "description": "Which kill event (index in kill history)"
                        }
                    },
                    "required": ["index"]
                }
            },
            {
                "name": "open_player_card",
                "description": "Open a detailed card view for a specific player. Use when user wants full player details. You can identify player by name from context.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "player_id": {
                            "type": "number",
                            "description": "Player participant ID (optional if player_name is provided)"
                        },
                        "player_name": {
                            "type": "string",
                            "description": "Player name (optional if player_id is provided)"
                        }
                    },
                    "required": []
                }
            },
            {
                "name": "open_frame_events_card",
                "description": "Open a card showing all events that occurred at the current frame/timestamp. Use when user asks 'what happened here' or 'show me this moment'.",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "frame_index": {
                            "type": "number",
                            "description": "Optional: specific frame to show events for (defaults to current frame)"
                        }
                    },
                    "required": []
                }
            }
        ]
    
    async def chat(
        self,
        message: str,
        context: Dict,
        conversation_history: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Main chat interface
        
        Args:
            message: User's message
            context: Match context from frontend
            conversation_history: Previous conversation
            
        Returns:
            Dict with response and optional action
        """
        if conversation_history is None:
            conversation_history = []
        
        # Build system prompt with context
        system_prompt = self._build_system_prompt(context)
        
        # Build messages - handle tool_result continuation
        # If the last message in history has tool_use, we need to prepend tool_result to new message
        if conversation_history and len(conversation_history) > 0:
            last_msg = conversation_history[-1]
            if last_msg.get('role') == 'assistant':
                # Check if assistant used tools
                content_list = last_msg.get('content', [])
                if isinstance(content_list, list):
                    has_tool_use = any(c.get('type') == 'tool_use' for c in content_list)
                    
                    if has_tool_use:
                        # Extract tool_use IDs and create tool_results
                        tool_results = []
                        for c in content_list:
                            if c.get('type') == 'tool_use':
                                tool_results.append({
                                    "type": "tool_result",
                                    "tool_use_id": c['id'],
                                    "content": "Action was shown to user"
                                })
                        
                        # Combine tool_results with new message in ONE user message
                        user_content = tool_results + [{"type": "text", "text": message}]
                        messages = conversation_history + [{"role": "user", "content": user_content}]
                    else:
                        # No tools, just add regular user message
                        messages = conversation_history + [{"role": "user", "content": message}]
                else:
                    messages = conversation_history + [{"role": "user", "content": message}]
            else:
                # Last message was user, just add new message
                messages = conversation_history + [{"role": "user", "content": message}]
        else:
            # First message
            messages = [{"role": "user", "content": message}]
        
        try:
            # Call Bedrock
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1024,
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
            
            # Extract response and actions
            response_text = ""
            actions = []
            tool_uses = []
            assistant_content = []
            
            for content in result.get('content', []):
                if content.get('type') == 'text':
                    response_text += content['text']
                    assistant_content.append(content)
                elif content.get('type') == 'tool_use':
                    tool_action = ToolHandlers.process_tool_call(
                        content['name'],
                        content.get('input', {}),
                        context
                    )
                    if tool_action:
                        actions.append(tool_action)
                    tool_uses.append(content)
                    assistant_content.append(content)
            
            # Handle single or multiple actions
            action = None
            if len(actions) == 1:
                action = actions[0]
                if action.get('description'):
                    response_text = action['description']
            elif len(actions) > 1:
                # Multiple actions - create a multi_action wrapper
                action = {
                    'type': 'multi_action',
                    'actions': actions,
                    'requiresPermission': any(a.get('requiresPermission') for a in actions),
                    'description': ' '.join(a.get('description', '') for a in actions if a.get('description'))
                }
                response_text = action['description']
            
            # Build proper conversation history
            # Just add the assistant message - tool_result will be added with next user message
            new_history = messages + [{"role": "assistant", "content": assistant_content}]
            
            return {
                "response": response_text or "I can help you analyze this match. What would you like to know?",
                "action": action,
                "conversation_history": new_history
            }
            
        except Exception as e:
            logger.error(f"Chat error: {e}", exc_info=True)
            return {
                "response": "I encountered an error processing your request. Please try again.",
                "action": None,
                "conversation_history": messages
            }
    
    def _build_system_prompt(self, context: Dict) -> str:
        """Build system prompt with match context"""
        main_player = context.get('mainPlayer', {})
        teams = context.get('teams', {})
        events = context.get('events', {})
        timeline = context.get('timeline', {})
        
        return f"""You are Rift Copilot, an AI assistant for League of Legends match analysis.

Match snapshot:
- Match ID: {context.get('matchId')}
- Current time: {context.get('currentTime')}
- Duration: {context.get('durationMinutes')} minutes
- Main player: {main_player.get('name')} ({main_player.get('champion')}) on the {main_player.get('team')} team
- Main player stats: {main_player.get('stats')}

Team overview:
- Blue team: {teams.get('blue')}
- Red team: {teams.get('red')}

Timeline insight:
- Current slice: {timeline.get('current')}
- Summary slices (sampled): {timeline.get('summary')}

Event summary:
- Totals: {events.get('totals')}
- First blood: {events.get('firstBlood')}
- Dragons: {events.get('dragons')}
- Barons: {events.get('barons')}
- Tower events: {events.get('towers')}
- Recent events near timeline: {events.get('recent')}

Instructions:
1. Answer questions about players, teams, objectives, timeline swings, and strategy directly from context.
2. Use tools ONLY for explicit actions:
   - navigate_to_timestamp / navigate_to_event: When user asks to "go to" or "show me" a specific time/event
   - show_players / show_event_timeline: When user wants to see lists or full timelines
   - open_*_card: When user wants detailed info about a specific event/player
3. Format responses with markdown for clarity (bold player names, use lists for rankings, etc.).
4. Maintain conversational context—track what events or players were discussed in previous messages and reference them in follow-ups.
5. Be conversational and natural—don't mention tools or context sources in your responses.

Quick Facts (pre-computed for fast reference):
{self._format_quick_facts(context.get('quickFacts', {}))}

**Critical Instructions:**
1. ALWAYS answer stat/comparison questions directly from context—do NOT use tools for these.

2. **YOU MUST USE TOOLS** for these explicit actions (NEVER say you can't do these):
   - Navigation: "take me to X", "go to X", "jump to X" → navigate_to_timestamp or navigate_to_event
   - Show players: "show my team", "list players" → show_players
   - Map visibility: "show them on map", "display on map" → toggle_map_filter
   - Open cards: "open X card", "show X details" → open_player_card, open_dragon_card, open_kill_card, open_frame_events_card
   - Event timeline: "show all dragons", "list kills" → show_event_timeline

3. **Multi-action requests** - Use multiple tools when needed:
   - "show all players at 15:00" → navigate_to_timestamp(15) + show_players(filter='all')
   - "go to second dragon and open its card" → navigate_to_event(dragon, 1) + open_dragon_card(1)

4. **NEVER say** "I don't have access to", "I can't", or "unfortunately" when asked to use a tool. Just use the tool.

5. Be concise and conversational. Use markdown formatting (bold, lists, etc.).

6. Format numbers clearly (e.g., "16/4/12" for KDA, "42,186 damage").

7. Pay attention to conversation history for follow-up questions (e.g., "open his card" → identify player from previous message).

8. For objective events, include killer and assister names when available."""

    def _format_quick_facts(self, quick_facts: Dict) -> str:
        """Format quick facts into readable text for the system prompt."""
        if not quick_facts:
            return "No quick facts available."

        lines = []
        team_leaders = quick_facts.get('teamLeaders', {})
        objectives = quick_facts.get('objectives', {})
        comparison = quick_facts.get('teamComparison', {})

        # Blue team leaders
        blue = team_leaders.get('blue', {})
        if blue.get('highestKDA'):
            lines.append(f"Blue Team Highest KDA: {blue['highestKDA']['player']} - {blue['highestKDA']['value']}")
        if blue.get('mostKills'):
            lines.append(f"Blue Team Most Kills: {blue['mostKills']['player']} - {blue['mostKills']['value']}")
        if blue.get('mostDamage'):
            lines.append(f"Blue Team Most Damage: {blue['mostDamage']['player']} - {blue['mostDamage']['value']}")

        lines.append("")

        # Red team leaders
        red = team_leaders.get('red', {})
        if red.get('highestKDA'):
            lines.append(f"Red Team Highest KDA: {red['highestKDA']['player']} - {red['highestKDA']['value']}")
        if red.get('mostKills'):
            lines.append(f"Red Team Most Kills: {red['mostKills']['player']} - {red['mostKills']['value']}")
        if red.get('mostDamage'):
            lines.append(f"Red Team Most Damage: {red['mostDamage']['player']} - {red['mostDamage']['value']}")

        lines.append("")

        # Objectives
        if objectives.get('dragons'):
            d = objectives['dragons']
            lines.append(f"Dragons: {d.get('total', 0)} total (Blue: {d.get('blueTeam', 0)}, Red: {d.get('redTeam', 0)}) - First: {d.get('first', 'None')}")
        if objectives.get('barons'):
            b = objectives['barons']
            lines.append(f"Barons: {b.get('total', 0)} total (Blue: {b.get('blueTeam', 0)}, Red: {b.get('redTeam', 0)}) - First: {b.get('first', 'None')}")
        if objectives.get('towers'):
            t = objectives['towers']
            lines.append(f"Towers: {t.get('total', 0)} total (Blue: {t.get('blueTeam', 0)}, Red: {t.get('redTeam', 0)}) - First: {t.get('first', 'None')}")

        lines.append("")

        # Team comparison
        if comparison:
            lines.append(f"Team Kills: {comparison.get('kills', 'N/A')}")
            lines.append(f"Team Gold: {comparison.get('gold', 'N/A')}")
            lines.append(f"Team Damage: {comparison.get('damage', 'N/A')}")

        return "\n".join(lines)

    def _process_tool_call(self, tool_call: Dict, context: Dict) -> Optional[Dict]:
        """Process tool calls and return action with multiple steps"""
        tool_name = tool_call['name']
        tool_input = tool_call['input']
        
        if tool_name == 'find_event':
            event_type = tool_input['event_type']
            event_summary = context.get('eventSummary', {})
            events = context.get('events', {})
            players = context.get('players', [])
            
            if event_type == 'first_blood':
                event = event_summary.get('firstBlood')
                if event:
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": event['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "kills", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": f"Jump to first blood at {event['timestamp']:.1f} minutes",
                        "summary": self._summarize_kills(events.get('kills', []), players, highlight_index=0)
                    }
            
            elif event_type == 'first_dragon':
                dragons = event_summary.get('dragons', [])
                if dragons:
                    dragon = dragons[0]
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": dragon['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "objectives", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": f"Jump to first dragon at {dragon['timestamp']:.1f} minutes",
                        "summary": self._summarize_dragons(events.get('dragons', []), highlight_index=0)
                    }
            
            elif event_type == 'first_baron':
                barons = event_summary.get('barons', [])
                if barons:
                    highlight_index = 0
                    baron = barons[highlight_index]
                    return {
                        "type": "navigate_timeline",
                        "params": {"frameIndex": baron['frameIndex']},
                        "requiresPermission": True,
                        "description": f"Jump to first baron at {baron['timestamp']:.1f} minutes",
                        "summary": self._summarize_barons(events.get('barons', []), highlight_index=highlight_index)
                    }
            
            elif event_type == 'first_tower':
                tower = event_summary.get('firstTower')
                towers = events.get('towers', [])
                if tower:
                    try:
                        highlight_index = towers.index(tower)
                    except ValueError:
                        highlight_index = 0
                    return {
                        "type": "navigate_timeline",
                        "params": {"frameIndex": tower['frameIndex']},
                        "requiresPermission": True,
                        "description": f"Jump to first tower at {tower['timestamp']:.1f} minutes",
                        "summary": self._summarize_towers(events.get('towers', []), highlight_index=highlight_index)
                    }
            elif event_type == 'dragon_history':
                dragons = events.get('dragons', [])
                if dragons:
                    highlight_index = self._resolve_event_index(
                        dragons,
                        context,
                        tool_input
                    )
                    target_dragon = dragons[highlight_index]
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": target_dragon['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "objectives", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": (
                            f"Review dragon #{highlight_index + 1} at {target_dragon['timestamp']:.1f} minutes"
                            if isinstance(target_dragon.get('timestamp'), (int, float))
                            else "Review the next dragon take"
                        ),
                        "summary": self._summarize_dragons(dragons, highlight_index=highlight_index)
                    }

            elif event_type == 'baron_history':
                barons = events.get('barons', [])
                if barons:
                    highlight_index = self._resolve_event_index(barons, context, tool_input)
                    target_baron = barons[highlight_index]
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": target_baron['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "objectives", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": (
                            f"Review baron #{highlight_index + 1} at {target_baron['timestamp']:.1f} minutes"
                            if isinstance(target_baron.get('timestamp'), (int, float))
                            else "Review the next baron take"
                        ),
                        "summary": self._summarize_barons(barons, highlight_index=highlight_index)
                    }

            elif event_type == 'tower_history':
                towers = events.get('towers', [])
                if towers:
                    highlight_index = self._resolve_event_index(towers, context, tool_input)
                    target_tower = towers[highlight_index]
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": target_tower['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "objectives", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": (
                            f"Review tower #{highlight_index + 1} at {target_tower['timestamp']:.1f} minutes"
                            if isinstance(target_tower.get('timestamp'), (int, float))
                            else "Review the next tower take"
                        ),
                        "summary": self._summarize_towers(towers, highlight_index=highlight_index)
                    }

            elif event_type == 'kill_history':
                kills = events.get('kills', [])
                if kills:
                    highlight_index = self._resolve_event_index(kills, context, tool_input)
                    target_kill = kills[highlight_index]
                    return {
                        "type": "multi_action",
                        "actions": [
                            {
                                "type": "navigate_timeline",
                                "params": {"frameIndex": target_kill['frameIndex']}
                            },
                            {
                                "type": "toggle_event",
                                "params": {"eventType": "kills", "enabled": True}
                            }
                        ],
                        "requiresPermission": True,
                        "description": (
                            f"Review kill #{highlight_index + 1} at {target_kill['timestamp']:.1f} minutes"
                            if isinstance(target_kill.get('timestamp'), (int, float))
                            else "Review the next kill"
                        ),
                        "summary": self._summarize_kills(kills, players, highlight_index=highlight_index)
                    }

        elif tool_name == 'navigate_timeline':
            target = tool_input['target'].lower()

            # Try to extract event from target
            if 'first blood' in target:
                return self._process_tool_call(
                    {'name': 'find_event', 'input': {'event_type': 'first_blood'}},
                    context
                )
            elif 'dragon' in target:
                params = {'event_type': 'dragon_history'}
                if 'next' in target or 'after' in target:
                    params['after_frame_index'] = context.get('currentFrame')
                return self._process_tool_call(
                    {'name': 'find_event', 'input': params},
                    context
                )
            elif 'baron' in target:
                params = {'event_type': 'baron_history'}
                if 'next' in target or 'after' in target:
                    params['after_frame_index'] = context.get('currentFrame')
                return self._process_tool_call(
                    {'name': 'find_event', 'input': params},
                    context
                )
            elif 'tower' in target:
                params = {'event_type': 'tower_history'}
                if 'next' in target or 'after' in target or 'another' in target:
                    params['after_frame_index'] = context.get('currentFrame')
                return self._process_tool_call(
                    {'name': 'find_event', 'input': params},
                    context
                )
            elif 'kill' in target or 'fight' in target:
                params = {'event_type': 'kill_history'}
                if 'next' in target or 'after' in target:
                    params['after_frame_index'] = context.get('currentFrame')
                return self._process_tool_call(
                    {'name': 'find_event', 'input': params},
                    context
                )
            elif 'each dragon' in target or 'dragon history' in target:
                return self._process_tool_call(
                    {'name': 'find_event', 'input': {'event_type': 'dragon_history'}},
                    context
                )
            elif 'each baron' in target or 'baron history' in target:
                return self._process_tool_call(
                    {'name': 'find_event', 'input': {'event_type': 'baron_history'}},
                    context
                )
            elif 'each tower' in target or 'tower history' in target:
                return self._process_tool_call(
                    {'name': 'find_event', 'input': {'event_type': 'tower_history'}},
                    context
                )

        return None

    def _resolve_event_index(self, events_list: List[Dict], context: Dict, tool_input: Dict) -> int:
        """Determine which event the model is trying to highlight."""
        if not events_list:
            return 0

        # Explicit index from the tool call (1-based for human readability)
        index = tool_input.get('index')
        if index is not None:
            try:
                idx = int(index) - 1
                if 0 <= idx < len(events_list):
                    return idx
            except (TypeError, ValueError):
                pass

        # After-frame targeting
        after_frame = tool_input.get('after_frame_index')
        if after_frame is None:
            after_frame = context.get('currentFrame')

        if after_frame is not None:
            for idx, event in enumerate(events_list):
                frame_index = event.get('frameIndex')
                if frame_index is not None and frame_index > after_frame:
                    return idx

        # After in-game minutes
        after_time = tool_input.get('after_time')
        if after_time is not None:
            for idx, event in enumerate(events_list):
                timestamp = event.get('timestamp')
                if isinstance(timestamp, (int, float)) and timestamp > after_time:
                    return idx

        # Default to last dragon if everything else fails
        return len(events_list) - 1

    def _summarize_dragons(self, dragons: List[Dict], highlight_index: Optional[int] = None) -> str:
        if not dragons:
            return "No dragons have been taken yet in this match."

        lines = []
        for idx, dragon in enumerate(dragons, 1):
            team = dragon.get('team')
            if not team:
                team = 'unknown'
            team_label = 'Blue team' if team == 'blue' else ('Red team' if team == 'red' else 'A team')
            dragon_type = dragon.get('dragonType', 'dragon').replace('_', ' ').title()
            timestamp = dragon.get('timestamp')
            time_label = f"{timestamp:.1f} minutes" if isinstance(timestamp, (int, float)) else "an unknown time"
            marker = "👉 " if highlight_index is not None and idx - 1 == highlight_index else ""
            lines.append(f"{idx}. {marker}{team_label} secured a {dragon_type} at {time_label}.")

        header = "Here's the dragon timeline I found:"
        if highlight_index is not None:
            highlighted_number = highlight_index + 1
            footer = f"Click Allow to jump to dragon #{highlighted_number} so we can review that fight together."
        else:
            footer = "Click Allow to jump to the first take so we can review the fight together."
        return "\n".join([header, *lines, "", footer])

    def _summarize_barons(self, barons: List[Dict], highlight_index: Optional[int] = None) -> str:
        if not barons:
            return "No barons have been secured yet in this match."

        lines = []
        for idx, baron in enumerate(barons, 1):
            team = baron.get('team')
            team_label = 'Blue team' if team == 'blue' else ('Red team' if team == 'red' else 'A team')
            timestamp = baron.get('timestamp')
            time_label = f"{timestamp:.1f} minutes" if isinstance(timestamp, (int, float)) else "an unknown time"
            marker = "👉 " if highlight_index is not None and idx - 1 == highlight_index else ""
            lines.append(f"{idx}. {marker}{team_label} claimed Baron at {time_label}.")

        header = "Here's the Baron timeline:"
        if highlight_index is not None:
            footer = f"Click Allow to jump to baron #{highlight_index + 1} for a closer look."
        else:
            footer = "Click Allow to review the opening Baron fight."
        return "\n".join([header, *lines, "", footer])

    def _summarize_towers(self, towers: List[Dict], highlight_index: Optional[int] = None) -> str:
        if not towers:
            return "No towers have fallen yet in this match."

        lane_labels = {
            'TOP_LANE': 'top lane',
            'MID_LANE': 'mid lane',
            'BOT_LANE': 'bot lane',
            'BOTTOM_LANE': 'bot lane'
        }

        lines = []
        for idx, tower in enumerate(towers, 1):
            team = tower.get('killerTeam')
            team_label = 'Blue team' if team == 'blue' else ('Red team' if team == 'red' else 'A team')
            lane = lane_labels.get(tower.get('laneType'), 'a lane')
            timestamp = tower.get('timestamp')
            time_label = f"{timestamp:.1f} minutes" if isinstance(timestamp, (int, float)) else "an unknown time"
            marker = "👉 " if highlight_index is not None and idx - 1 == highlight_index else ""
            lines.append(f"{idx}. {marker}{team_label} took a tower in {lane} at {time_label}.")

        header = "Here's the tower timeline:"
        if highlight_index is not None:
            footer = f"Click Allow to jump to tower #{highlight_index + 1} to see the push."
        else:
            footer = "Click Allow to review the first tower takedown."
        return "\n".join([header, *lines, "", footer])

    def _summarize_kills(self, kills: List[Dict], players: List[Dict], highlight_index: Optional[int] = None) -> str:
        if not kills:
            return "No champion kills have happened yet in this match."

        player_map = {player['id']: player for player in players if player.get('id') is not None}

        lines = []
        for idx, kill in enumerate(kills, 1):
            killer = kill.get('killer')
            victim = kill.get('victim')
            killer_info = player_map.get(killer, {})
            victim_info = player_map.get(victim, {})
            killer_name = kill.get('killerName') or killer_info.get('name') or f"Player {killer}"
            victim_name = kill.get('victimName') or victim_info.get('name') or f"Player {victim}"
            team = kill.get('killerTeam')
            team_label = 'Blue team' if team == 'blue' else ('Red team' if team == 'red' else 'A team')
            timestamp = kill.get('timestamp')
            time_label = f"{timestamp:.1f} minutes" if isinstance(timestamp, (int, float)) else "an unknown time"
            marker = "👉 " if highlight_index is not None and idx - 1 == highlight_index else ""
            lines.append(
                f"{idx}. {marker}{team_label}'s {killer_name} eliminated {victim_name} at {time_label}."
            )

        header = "Here's the kill timeline:"
        if highlight_index is not None:
            footer = f"Click Allow to jump to kill #{highlight_index + 1} so we can break down the play."
        else:
            footer = "Click Allow to jump to the first kill and analyze it."
        return "\n".join([header, *lines, "", footer])

    def _generate_action_description(self, action: Dict, context: Dict) -> str:
        """Generate a descriptive response for an action"""
        if not action:
            return ""

        description = action.get('description', '')
        event_summary = context.get('eventSummary', {})
        
        summary_text = action.get('summary')
        if summary_text:
            return summary_text

        # Extract time from description
        if 'first blood' in description.lower():
            fb = event_summary.get('firstBlood')
            if fb:
                killer_id = fb.get('killer')
                victim_id = fb.get('victim')
                players = context.get('players', [])
                killer = next((p for p in players if p['id'] == killer_id), None)
                victim = next((p for p in players if p['id'] == victim_id), None)
                
                killer_name = killer['name'] if killer else f"Player {killer_id}"
                victim_name = victim['name'] if victim else f"Player {victim_id}"
                time_label = f"{fb['timestamp']:.1f} minutes" if isinstance(fb.get('timestamp'), (int, float)) else "that moment"
                return f"First blood was secured by {killer_name} against {victim_name} at {time_label}. Click Allow and I'll jump the timeline there and highlight the kills overlay."

        if 'dragon' in description.lower():
            dragons = event_summary.get('dragons', [])
            if dragons:
                first_dragon = dragons[0]
                dragon_type = first_dragon.get('dragonType', 'dragon').replace('_', ' ').title()
                return f"The first dragon ({dragon_type}) was secured at {first_dragon['timestamp']:.1f} minutes. Click Allow to review how that fight unfolded."

        if 'baron' in description.lower():
            barons = event_summary.get('barons', [])
            if barons:
                first_baron = barons[0]
                return f"Baron Nashor was taken at {first_baron['timestamp']:.1f} minutes. Click Allow and I'll move the timeline to that power spike."

        if 'tower' in description.lower():
            tower = event_summary.get('firstTower')
            if tower:
                return f"First tower fell at {tower['timestamp']:.1f} minutes, giving the attackers extra gold and map control."

        return description or "I found a moment worth reviewing."
