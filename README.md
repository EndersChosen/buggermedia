# Card Game Score Tracker

A modern, feature-rich web application for tracking scores in popular card games. Built with React, TypeScript, and Tailwind CSS.

## Features

- **Multiple Games**: Currently supports Cover Your Assets and Skull King
- **Smart Score Tracking**: Automatic calculations and running totals
- **Game Persistence**: All games saved to localStorage
- **Resume Capability**: Pick up where you left off
- **Rules Reference**: Built-in rules for each game
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Beautiful UI**: Modern design with Tailwind CSS

## Supported Games

### Cover Your Assets
- 2-6 players
- Race to $1,000,000
- Simple cumulative scoring
- Winner detection

### Skull King
- 2-6 players
- 10 rounds of trick-taking
- Bid prediction gameplay
- Complex scoring with bonuses
- Automatic score calculation

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **Icons**: Lucide React
- **State Management**: React Context API
- **Persistence**: Browser localStorage

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd buggermedia
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

The production build will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

## How to Use

### Starting a New Game

1. Click on a game card from the home page
2. Enter player names (2-6 players depending on the game)
3. Click "Start Game"

### Playing a Game

**Cover Your Assets:**
- Enter dollar amounts for each player each round
- First to $1,000,000 wins

**Skull King:**
- Round 1: Enter bids (predictions)
- Round 2: Enter actual tricks won
- Round 3: Enter bonus points (optional)
- Repeat for all 10 rounds

### Managing Games

- **Continue**: Resume any active game from the home page
- **Delete**: Remove games you're done with
- **View Rules**: Access game rules anytime during play
- **End Game**: Complete and save a game to history

## Project Structure

```
src/
├── @types/           # TypeScript type definitions
├── components/       # Reusable UI components
│   ├── ui/          # Basic UI elements
│   └── layout/      # Layout components
├── features/        # Feature-based modules
│   ├── game-selection/
│   ├── cover-your-assets/
│   ├── skull-king/
│   └── rules/
├── hooks/           # Custom React hooks
├── context/         # React Context providers
├── utils/           # Utility functions
└── pages/           # Page components
```

## Adding New Games

The app is designed to be extensible. To add a new game:

1. Define game types in `src/@types/game.types.ts`
2. Create feature folder `src/features/your-game/`
3. Implement game components and logic
4. Add to game registry `src/features/game-selection/gameRegistry.ts`
5. Add route in `src/App.tsx`

## Browser Support

- Chrome/Edge (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)

## Data Storage

All game data is stored in your browser's localStorage:
- `cardgames:active` - Active games
- `cardgames:completed` - Completed games
- `cardgames:settings` - App settings

**Note**: Clearing browser data will delete all saved games.

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Game rules from official sources
- Icons by Lucide
- UI inspiration from modern web design patterns
