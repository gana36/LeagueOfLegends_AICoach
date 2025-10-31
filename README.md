# Rift Rewind

**Your personalized League of Legends year-end recap, powered by AWS and Riot Games API**

Built for the Rift Rewind Hackathon by AWS and Riot Games.

## Overview

Rift Rewind is an AI-powered application that generates personalized end-of-year recaps for League of Legends players. Using Amazon Bedrock's Claude AI and the Riot Games API, it analyzes match history to provide:

- **🤖 AI Coaching Agent** ⭐ NEW: Multi-step reasoning agent that analyzes your gameplay, identifies patterns, and creates personalized improvement plans
- **AI-Generated Narratives**: Personalized year-end stories celebrating your League journey
- **Performance Analytics**: Deep insights into playstyle, strengths, and areas for improvement
- **Visual Summaries**: Beautiful visualizations of stats, champions, and highlights
- **Shareable Content**: Social media-ready recaps to share with friends

## Architecture

### Tech Stack

**Backend:**
- FastAPI (Python 3.11+)
- Amazon Bedrock (Claude 3 Sonnet)
- Riot Games API
- Boto3 (AWS SDK)

**Frontend:**
- React 18
- Vite
- Tailwind CSS
- Framer Motion
- Recharts

**Infrastructure:**
- AWS Bedrock for AI generation
- Optional: AWS Lambda, S3, DynamoDB for production deployment

## Features

### 🤖 AI Coaching Agent (Powered by Amazon Bedrock Agents)
**The Star Feature - Goes Far Beyond op.gg!**

Our multi-step reasoning AI coach uses Amazon Bedrock's function calling to:
- **Analyze patterns** in your gameplay across multiple dimensions
- **Compare your stats** to target ranks (Gold → Diamond)
- **Recommend champions** based on identified weaknesses
- **Generate practice plans** with week-by-week improvement roadmaps
- **Answer questions** through natural conversation with context awareness

**Example Agent Flow:**
```
User: "Why am I stuck in Gold?"

Agent:
1. 🔧 Analyzes recent 20 games → Finds 38% win rate after 35 min
2. 🔧 Detects patterns → Vision score drops 40% in late game
3. 🔧 Compares to Platinum → Vision 33% below target rank
4. 🔧 Generates practice plan → 3-week vision improvement roadmap
5. 💬 Synthesizes: "Your late game vision needs work. Here's how..."
```

**Tools Available to the Agent:**
- `analyze_recent_performance` - Win rate trends, game length performance
- `detect_patterns` - Vision, damage, objective patterns
- `recommend_champions` - Champion pool suggestions based on weaknesses
- `compare_to_rank` - Stat-by-stat comparison to target rank
- `generate_practice_plan` - Structured weekly improvement plans

See [AI_AGENT_IMPLEMENTATION.md](AI_AGENT_IMPLEMENTATION.md) for technical details.

### AI-Powered Insights
- Personalized year-end narratives using Claude AI
- Playstyle analysis and recommendations
- Strengths and weaknesses identification
- Actionable improvement tips

### Performance Analytics
- Win rate and KDA tracking
- Champion mastery statistics
- Role performance analysis
- Highlight moments extraction

### Beyond op.gg
- Natural language storytelling about your League journey
- AI-generated insights that understand context
- Personalized recommendations based on playstyle
- Shareable social media content

## Getting Started

### Prerequisites

1. **Riot Games API Key**
   - Sign up at [Riot Developer Portal](https://developer.riotgames.com/)
   - Generate a development API key

2. **AWS Account**
   - Create an AWS account
   - Enable Amazon Bedrock
   - Request access to Claude 3 Sonnet model
   - Create IAM user with Bedrock permissions

3. **Python 3.11+** and **Node.js 18+**

### Installation

#### 1. Clone the repository

```bash
git clone <your-repo-url>
cd rift
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `backend/.env` with your credentials:

```env
RIOT_API_KEY=your_riot_api_key_here
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

#### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:8000
```

### Running the Application

#### Start Backend

```bash
cd backend
python main.py
```

Backend will run on `http://localhost:8000`

#### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

### Usage

1. Open `http://localhost:5173` in your browser
2. Enter your Riot ID (Game Name + Tag Line)
3. Select your region
4. Click "Generate My Recap"
5. Wait for AI to analyze your matches
6. View your personalized recap and insights

## API Endpoints

### Player Lookup
```
POST /api/player/lookup
```
Lookup player by Riot ID

### Match History
```
POST /api/matches/history
```
Get match history for a player

### Year Recap
```
POST /api/analysis/year-recap
```
Generate AI-powered year-end recap

### Insights
```
POST /api/analysis/insights
```
Generate performance insights

### Strengths & Weaknesses
```
POST /api/analysis/strengths-weaknesses
```
Analyze strengths and weaknesses

## AWS Services Used

### Amazon Bedrock
- **Model**: Claude 3 Sonnet
- **Use Cases**:
  - Generating personalized narratives
  - Analyzing playstyle patterns
  - Identifying strengths and weaknesses
  - Creating improvement recommendations

### AWS Tagging
All AWS resources are tagged with:
```
key: rift-rewind-hackathon
value: 2025
```

## Project Structure

```
rift/
├── backend/
│   ├── services/
│   │   ├── riot_api.py          # Riot API client
│   │   ├── bedrock_ai.py        # AWS Bedrock integration
│   │   └── match_analyzer.py    # Match analysis logic
│   ├── main.py                  # FastAPI application
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── pages/               # Page components
│   │   ├── services/            # API client
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## Development

### Backend Development

```bash
cd backend
uvicorn main:app --reload
```

### Frontend Development

```bash
cd frontend
npm run dev
```

### Building for Production

```bash
cd frontend
npm run build
```

## Deployment

### Option 1: AWS Amplify (Frontend)
1. Connect GitHub repository
2. Configure build settings
3. Deploy

### Option 2: AWS Lambda + API Gateway (Backend)
1. Package FastAPI app
2. Deploy to Lambda
3. Configure API Gateway

### Option 3: EC2
1. Launch EC2 instance
2. Install dependencies
3. Run with PM2/systemd

## Hackathon Requirements

✅ **AWS AI Services**: Amazon Bedrock (Claude 3 Sonnet)
✅ **Riot Games API**: Full match history integration
✅ **Insights**: Strengths, weaknesses, trends, playstyle analysis
✅ **Visualizations**: Stats cards, champion grids, performance tables
✅ **Year-end Recaps**: AI-generated narratives and summaries
✅ **Shareable Content**: Social media-ready recap pages
✅ **Beyond op.gg**: AI-powered storytelling and personalized insights

## Methodology

### Data Analysis
1. Fetch match history from Riot API
2. Calculate aggregate statistics (KDA, win rate, CS/min, etc.)
3. Identify patterns and trends
4. Extract highlight moments

### AI Generation
1. Structure match data into prompts
2. Send to Amazon Bedrock (Claude 3 Sonnet)
3. Generate personalized narratives
4. Parse and format AI responses

### Key Insights
- **Playstyle Analysis**: Aggressive vs. passive, carry vs. support
- **Strengths**: Consistent patterns of success
- **Weaknesses**: Areas with room for improvement
- **Trends**: Performance trajectory over time

## License

MIT License - See LICENSE file

## Acknowledgments

- **AWS** for Bedrock and AI services
- **Riot Games** for the League of Legends API
- Hackathon organizers and community

## Demo Video

[Link to demo video on YouTube]

## Live Demo

[Link to deployed application]

## Contact

[Your contact information]

---

Built with ❤️ for Rift Rewind Hackathon 2025
