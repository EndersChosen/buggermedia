import { useParams, useNavigate } from 'react-router-dom';
import { GameType } from '@/@types/game.types';
import { getGameDefinition } from '@/features/game-selection/gameRegistry';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ArrowLeft } from 'lucide-react';

export function RulesPage() {
  const { gameType } = useParams<{ gameType: GameType }>();
  const navigate = useNavigate();

  if (!gameType) {
    navigate('/');
    return null;
  }

  const game = getGameDefinition(gameType as GameType);
  const { rules } = game;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/')} size="sm">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Games
        </Button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-gray-900">{game.name}</h1>
        <p className="text-gray-600 mt-1">{game.description}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{rules.overview}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {rules.setup.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Gameplay</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {rules.gameplay.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            {rules.scoring.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Winning the Game</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed">{rules.winning}</p>
        </CardContent>
      </Card>
    </div>
  );
}
