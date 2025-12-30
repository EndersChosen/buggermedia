import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GameProvider } from './context/GameContext';
import { Layout } from './components/layout/Layout';
import { HomePage } from './pages/HomePage';
import { CoverYourAssetsGame } from './features/cover-your-assets/CoverYourAssetsGame';
import { SkullKingGame } from './features/skull-king/SkullKingGame';
import { RulesPage } from './features/rules/RulesPage';

function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="game/cover-your-assets/:gameId" element={<CoverYourAssetsGame />} />
            <Route path="game/skull-king/:gameId" element={<SkullKingGame />} />
            <Route path="rules/:gameType" element={<RulesPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GameProvider>
  );
}

export default App;
