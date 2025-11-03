# League of Legends Replay Analyzer

A professional React application for analyzing League of Legends match replays with interactive timeline visualization.

## Features

- **Interactive Map**: Real-time player positions and event markers on Summoner's Rift
- **Timeline Scrubber**: Navigate through match frames with playback controls
- **Participant Details**: Comprehensive modal showing all player stats (Combat, Economy, Events, Timeline)
- **Frame Events**: Detailed event viewer with filtering and League-themed terminology
- **Professional UI**: Clean design with SVG icons and proper LoL theming

## Setup

```bash
cd frontend
npm install
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000)

## Tech Stack

- React 18
- Tailwind CSS
- Create React App

## Project Structure

```
frontend/
├── public/
│   ├── assets/
│   │   └── map.png          # Summoner's Rift map
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── LeftSidebar.js
│   │   ├── MapArea.js
│   │   ├── RightSidebar.js
│   │   ├── TimelineBar.js
│   │   ├── ParticipantDetailsModal.js
│   │   └── FrameEventsModal.js
│   ├── data/
│   │   └── match-data.json
│   ├── App.js
│   ├── index.js
│   └── index.css
├── package.json
├── tailwind.config.js
└── postcss.config.js
```

## Available Scripts

- `npm start` - Run development server
- `npm build` - Build for production
- `npm test` - Run tests
