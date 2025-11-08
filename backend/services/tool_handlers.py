"""
Tool handlers for match chat agent.
Clean separation between navigation, display, and card view tools.
"""

from typing import Dict, List, Optional


class ToolHandlers:
    """Handles all tool call processing for the match chat agent."""
    
    @staticmethod
    def process_tool_call(tool_name: str, tool_input: Dict, context: Dict) -> Optional[Dict]:
        """Route tool calls to appropriate handlers."""
        
        # Navigation tools
        if tool_name == 'navigate_to_timestamp':
            return ToolHandlers._handle_navigate_to_timestamp(tool_input, context)
        elif tool_name == 'navigate_to_event':
            return ToolHandlers._handle_navigate_to_event(tool_input, context)
        
        # Display tools
        elif tool_name == 'show_players':
            return ToolHandlers._handle_show_players(tool_input, context)
        elif tool_name == 'show_event_timeline':
            return ToolHandlers._handle_show_event_timeline(tool_input, context)
        elif tool_name == 'toggle_map_filter':
            return ToolHandlers._handle_toggle_map_filter(tool_input, context)
        
        # Card view tools
        elif tool_name == 'open_dragon_card':
            return ToolHandlers._handle_open_dragon_card(tool_input, context)
        elif tool_name == 'open_kill_card':
            return ToolHandlers._handle_open_kill_card(tool_input, context)
        elif tool_name == 'open_player_card':
            return ToolHandlers._handle_open_player_card(tool_input, context)
        elif tool_name == 'open_frame_events_card':
            return ToolHandlers._handle_open_frame_events_card(tool_input, context)
        
        return None
    
    # ===== Navigation Tools =====
    
    @staticmethod
    def _handle_navigate_to_timestamp(tool_input: Dict, context: Dict) -> Dict:
        """Navigate to a specific timestamp."""
        minutes = tool_input['minutes']
        reason = tool_input.get('reason', f'Navigate to {minutes} minutes')
        
        return {
            'type': 'navigate_timeline',
            'requiresPermission': True,
            'params': {'frameIndex': int(minutes)},
            'description': reason
        }
    
    @staticmethod
    def _handle_navigate_to_event(tool_input: Dict, context: Dict) -> Optional[Dict]:
        """Navigate to a specific event by type and index."""
        event_type = tool_input['event_type']
        index = tool_input['index']
        events = context.get('events', {})
        
        # Map event type to event list
        event_map = {
            'dragon': events.get('dragons', []),
            'baron': events.get('barons', []),
            'tower': events.get('towers', []),
            'herald': events.get('heralds', []),
            'kill': events.get('kills', [])
        }
        
        event_list = event_map.get(event_type, [])
        if not event_list or index >= len(event_list):
            return None
        
        event = event_list[index]
        frame_index = event.get('frameIndex', 0)
        timestamp = event.get('timestamp', 0)
        
        # Build actions list (always navigate first)
        actions = [
            {
                'type': 'navigate_timeline',
                'params': {'frameIndex': frame_index}
            }
        ]

        # Determine which event toggle to enable for context
        toggle_map = {
            'dragon': 'objectives',
            'baron': 'objectives',
            'herald': 'objectives',
            'tower': 'objectives',
            'kill': 'kills'
        }
        toggle_event_type = toggle_map.get(event_type)
        if toggle_event_type:
            actions.append({
                'type': 'toggle_event',
                'params': {
                    'eventType': toggle_event_type,
                    'enabled': True
                }
            })

        description = f"Navigate to {event_type} #{index + 1} at {timestamp:.1f} minutes"
        if toggle_event_type:
            description += f" (showing {toggle_event_type})"

        return {
            'type': 'multi_action' if len(actions) > 1 else 'navigate_timeline',
            'requiresPermission': True,
            'actions': actions if len(actions) > 1 else None,
            'params': None if len(actions) > 1 else {'frameIndex': frame_index},
            'description': description
        }
    
    # ===== Display Tools =====
    
    @staticmethod
    def _handle_show_players(tool_input: Dict, context: Dict) -> Dict:
        """Display filtered and sorted player list."""
        filter_type = tool_input['filter']
        sort_by = tool_input.get('sort_by', 'kda')
        players = context.get('players', [])
        main_player = context.get('mainPlayer', {})
        
        # Filter players
        if filter_type == 'my_team':
            filtered = [p for p in players if p.get('team') == main_player.get('team')]
        elif filter_type == 'enemy_team':
            enemy_team = 'red' if main_player.get('team') == 'blue' else 'blue'
            filtered = [p for p in players if p.get('team') == enemy_team]
        elif filter_type == 'blue_team':
            filtered = [p for p in players if p.get('team') == 'blue']
        elif filter_type == 'red_team':
            filtered = [p for p in players if p.get('team') == 'red']
        else:  # all
            filtered = players
        
        # Sort players
        sort_key_map = {
            'kda': lambda p: p.get('stats', {}).get('kda', {}).get('ratio', 0),
            'kills': lambda p: p.get('stats', {}).get('kda', {}).get('kills', 0),
            'damage': lambda p: p.get('stats', {}).get('damage', {}).get('dealt', 0),
            'gold': lambda p: p.get('stats', {}).get('gold', {}).get('earned', 0)
        }
        sorted_players = sorted(filtered, key=sort_key_map.get(sort_by, sort_key_map['kda']), reverse=True)

        # Always show list and sync map filter
        actions: List[Dict] = [
            {
                'type': 'display_players',
                'requiresPermission': False,
                'params': {
                    'players': sorted_players,
                    'filter': filter_type,
                    'sortBy': sort_by
                }
            }
        ]

        # Include map filter toggle when relevant
        map_filters = {'my_team', 'enemy_team', 'all', 'blue_team', 'red_team'}
        if filter_type in map_filters:
            actions.append({
                'type': 'toggle_map_filter',
                'requiresPermission': False,
                'params': {
                    'filter': filter_type,
                    'show': True
                }
            })

        if len(actions) == 1:
            return {**actions[0], 'description': f"Showing {filter_type.replace('_', ' ')} players sorted by {sort_by}"}

        return {
            'type': 'multi_action',
            'requiresPermission': False,
            'actions': actions,
            'description': f"Showing {filter_type.replace('_', ' ')} players sorted by {sort_by}"
        }
    
    @staticmethod
    def _handle_toggle_map_filter(tool_input: Dict, context: Dict) -> Dict:
        """Toggle player filter on the map."""
        filter_type = tool_input['filter']
        show = tool_input.get('show', True)
        
        return {
            'type': 'toggle_map_filter',
            'requiresPermission': False,
            'params': {
                'filter': filter_type,
                'show': show
            },
            'description': f"{'Showing' if show else 'Hiding'} {filter_type.replace('_', ' ')} on map"
        }
    
    @staticmethod
    def _handle_show_event_timeline(tool_input: Dict, context: Dict) -> Dict:
        """Display full timeline of events."""
        event_type = tool_input['event_type']
        filter_type = tool_input.get('filter', 'all')
        events = context.get('events', {})
        main_player = context.get('mainPlayer', {})
        
        # Get event list
        event_list = events.get(event_type, [])
        
        # Filter if needed
        if filter_type == 'my_team':
            event_list = [e for e in event_list if e.get('team') == main_player.get('team')]
        elif filter_type == 'enemy_team':
            enemy_team = 'red' if main_player.get('team') == 'blue' else 'blue'
            event_list = [e for e in event_list if e.get('team') == enemy_team]
        
        return {
            'type': 'display_event_timeline',
            'requiresPermission': False,
            'params': {
                'eventType': event_type,
                'events': event_list,
                'filter': filter_type
            },
            'description': f"Showing {event_type} timeline ({len(event_list)} events)"
        }
    
    # ===== Card View Tools =====
    
    @staticmethod
    def _handle_open_dragon_card(tool_input: Dict, context: Dict) -> Optional[Dict]:
        """Open detailed dragon kill card."""
        index = tool_input['index']
        dragons = context.get('events', {}).get('dragons', [])
        
        if index >= len(dragons):
            return None
        
        dragon = dragons[index]
        return {
            'type': 'open_card',
            'requiresPermission': False,
            'params': {
                'cardType': 'dragon',
                'data': dragon,
                'index': index
            },
            'description': f"Opening dragon #{index + 1} details"
        }
    
    @staticmethod
    def _handle_open_kill_card(tool_input: Dict, context: Dict) -> Optional[Dict]:
        """Open detailed champion kill card."""
        index = tool_input['index']
        kills = context.get('events', {}).get('kills', [])
        
        if index >= len(kills):
            return None
        
        kill = kills[index]
        return {
            'type': 'open_card',
            'requiresPermission': False,
            'params': {
                'cardType': 'kill',
                'data': kill,
                'index': index
            },
            'description': f"Opening kill #{index + 1} details"
        }
    
    @staticmethod
    def _handle_open_player_card(tool_input: Dict, context: Dict) -> Optional[Dict]:
        """Open detailed player profile card."""
        player_id = tool_input.get('player_id')
        player_name = tool_input.get('player_name')
        players = context.get('players', [])
        
        # Find player by ID or name
        player = None
        if player_id:
            player = next((p for p in players if p.get('id') == player_id), None)
        elif player_name:
            player = next((p for p in players if p.get('name', '').lower() == player_name.lower()), None)
        
        if not player:
            return None
        
        return {
            'type': 'open_card',
            'requiresPermission': False,
            'params': {
                'cardType': 'player',
                'data': player
            },
            'description': f"Opening profile for {player.get('name', 'Unknown')}"
        }
    
    @staticmethod
    def _handle_open_frame_events_card(tool_input: Dict, context: Dict) -> Dict:
        """Open card showing all events at a specific frame."""
        frame_index = tool_input.get('frame_index', context.get('currentFrame', 0))
        events = context.get('events', {})
        
        # Collect all events at this frame
        frame_events = {
            'kills': [k for k in events.get('kills', []) if k.get('frameIndex') == frame_index],
            'dragons': [d for d in events.get('dragons', []) if d.get('frameIndex') == frame_index],
            'barons': [b for b in events.get('barons', []) if b.get('frameIndex') == frame_index],
            'towers': [t for t in events.get('towers', []) if t.get('frameIndex') == frame_index]
        }
        
        total_events = sum(len(v) for v in frame_events.values())
        
        return {
            'type': 'open_card',
            'requiresPermission': False,
            'params': {
                'cardType': 'frame_events',
                'data': frame_events,
                'frameIndex': frame_index
            },
            'description': f"Showing {total_events} events at frame {frame_index}"
        }
