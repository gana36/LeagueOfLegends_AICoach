# Rift Rewind

Rift Rewind is an AI-powered League of Legends coaching companion that helps players reflect on a full year of matches, understand persistent habits, and plan their next climb. Inspired by the Rift Rewind challenge, the project combines Riot Games match data with Amazon Bedrock to deliver data-rich retrospectives that feel personal and actionable.

## Project Highlights

- **End-of-Year Recap:** Generates narrative summaries, highlight reels, and stat-driven callouts tailored to each player’s season.
- **AI Coaching Agent:** Conversational assistant powered by Claude 3 Sonnet that diagnoses recurring patterns, benchmarks against custom goals, and proposes practice plans.
- **Insightful Visualizations:** Charts, timelines, and champion breakdowns that show progress across roles, objectives, and play phases.
- **Highlight Explorer:** On-demand deep dives into standout matches with quick links to event timelines and performance summaries.
- **Share-Ready Moments:** Auto-generated summary cards designed for quick posting to Discord, X, and other social channels.
- **Low-Latency Experience:** LocalStorage caching, lazy loading, and pre-aggregated analytics for responsive navigation across pages.

## Architecture Overview

```
LeagueOfLegends_AICoach/
├── backend/
│   ├── main.py                # FastAPI entrypoint and routing
│   ├── services/
│   │   ├── riot_api.py        # Riot API integrations
│   │   ├── bedrock_ai.py      # Bedrock client and prompt orchestration
│   │   └── match_analyzer.py  # Feature engineering and insight logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.js             # Application shell and routing
│   │   ├── components/        # Visualization, chat, and recap UI
│   │   └── services/          # API client wrappers and caching helpers
│   └── package.json
└── README.md
```

The backend provides secure endpoints for player lookup, match ingestion, analytics, and narrative generation. The frontend (React + Vite) orchestrates data fetching, renders insight dashboards, and exposes the conversational coaching agent.

## Data & Insight Pipeline

1. **Match Acquisition:** Fetch a full-year match list and individual match data through the League Developer API. Responses are cached in-memory server-side and in localStorage per player to minimize redundant calls.
2. **Feature Engineering:** Compute aggregate metrics such as win rate by game length, damage share, vision score trends, objective control windows, and champion proficiency.
3. **Trend Detection:** Surface recurring strengths and weaknesses, identify breakout champions, and measure momentum across the season.
4. **Insight Synthesis:** Produce structured summaries (strengths, weaknesses, highlight matches) that feed the AI agent, recap generator, and visualization components.
5. **Presentation:** Deliver charts, tables, and narratives to the frontend, enabling players to explore both at-a-glance dashboards and deep-dive analyses.

## AI Coaching Agent

- Uses Claude 3 Sonnet via Amazon Bedrock with tool-calling to pull real-time analytics, compare stat baselines, and assemble practice roadmaps.
- Maintains conversational context so players can ask follow-up questions (“What changed after I swapped to jungle?”).
- Offers timeline navigation requests (e.g., jump to first dragon, baron calls) after obtaining user confirmation.
- Applies guardrails to keep responses grounded in verified match data.

## Frontend Experience

- Built with React 18, Vite, Tailwind CSS, Framer Motion, and Recharts.
- Match selector caches up to 100 matches per player with manual refresh controls.
- Year recap, performance analytics, and narrative views rely on cached API responses for instant reloads within defined time windows.
- Right sidebar hosts the coaching chat, highlight timeline, and quick action shortcuts.

## Backend Services & APIs

- **FastAPI** application orchestrates Riot API calls, analytics, and Bedrock interactions.
- Core endpoints:
  - `POST /api/player/lookup` – Resolve a player by Riot ID.
  - `POST /api/matches/history` – Retrieve cached or live match lists.
  - `POST /api/analysis/year-recap` – Generate a narrative recap and highlight set.
  - `POST /api/analysis/insights` – Return structured strengths, weaknesses, and trend metrics.
  - `POST /api/chat/match-analysis` – Converse with the AI coaching agent.
- Analytics modules normalize and aggregate match data before exposing it to the frontend or Bedrock prompts.

## AWS Integration

- **Amazon Bedrock (Claude 3 Sonnet):** Generates personalized narratives, contextual coaching feedback, and highlight commentary.
- **Boto3 Client Utilities:** Handle authentication, prompt construction, and retry logic for Bedrock calls.
- **Identity and Access Management:** Granular IAM policies restrict Bedrock access to the required models and operations.
- **Deployment-Ready Extensions:** The architecture supports running the API on AWS Lambda behind API Gateway, persisting derived analytics in DynamoDB, and storing shareable assets in Amazon S3. Resources can be tagged with `key=rift-rewind-hackathon`, `value=2025` for traceability.

## Getting Started

### Prerequisites

1. Riot Games Developer API key (create at the [Riot Developer Portal](https://developer.riotgames.com/)).
2. AWS account with Amazon Bedrock enabled and access to Claude 3 Sonnet.
3. Python 3.11+ and Node.js 18+ installed locally.

### Installation

```bash
git clone <your-public-repo-url>
cd LeagueOfLegends_AICoach
```

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Populate `backend/.env`:

```env
RIOT_API_KEY=your_riot_api_key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

#### Frontend Setup

```bash
cd ../frontend
npm install
cp .env.example .env
```

Set the API base URL in `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

## Local Development

Run the backend and frontend in separate terminals.

```bash
# Backend
cd backend
uvicorn main:app --reload

# Frontend
cd frontend
npm run dev
```

Visit `http://localhost:5173`, enter your Riot ID (Game Name + Tag Line), and explore the generated recap.

## Testing

- Frontend: `npm test` covers core components, selectors, and data mappers.
- Backend: `pytest` validates Riot API wrappers, analytics calculations, and Bedrock orchestration.
- Logging: Match caching and AI prompts emit debug logs for diagnosing cache effectiveness and response quality.

## Deployment Notes

- **Backend:** Containerize for ECS/Fargate or package as Lambda functions with API Gateway. Store secrets in AWS Systems Manager Parameter Store or AWS Secrets Manager.
- **Frontend:** Build with `npm run build` and deploy to Amazon S3 + CloudFront, AWS Amplify, or any static host.
- **Observability:** Monitor with Amazon CloudWatch metrics and structured logging; integrate X-Ray or OpenTelemetry if distributed tracing is needed.

## License

This project is released under the MIT License. See the accompanying `LICENSE` file for full terms.

## Acknowledgments

- AWS for Amazon Bedrock and supporting tooling.
- Riot Games for providing League of Legends developer APIs and datasets.
- The Rift Rewind community for inspiration and feedback throughout development.
