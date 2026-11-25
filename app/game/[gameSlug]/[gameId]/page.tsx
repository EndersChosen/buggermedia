'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGame } from '@/context/GameContext';
import { isScoreCardSession, type ScoreCardSession } from '@/types/game.types';
import { ScoreCardPlay, type ScoreCardState } from '@/features/scorecard/ScoreCardPlay';
import { RulesPanel } from '@/features/scorecard/RulesPanel';
import { ThemeShell } from '@/components/theme/ThemeShell';
import { themeForCard } from '@/lib/themes';

export default function ScoreCardGamePage() {
  const params = useParams<{ gameSlug: string; gameId: string }>();
  const gameSlug = params?.gameSlug ?? '';
  const gameId = params?.gameId ?? '';

  if (gameId === 'legacy') {
    return <LegacyScorecard gameSlug={gameSlug} />;
  }
  return <SavedGame gameId={gameId} />;
}

function SavedGame({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { activeGames, updateGame, completeGame, deleteGame } = useGame();
  const session = activeGames.find((g) => g.id === gameId);

  if (!session) {
    return (
      <Message title="Game not found" body="This game isn't saved in this browser. It may have been finished or deleted.">
        <Button onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to games
        </Button>
      </Message>
    );
  }

  if (!isScoreCardSession(session)) {
    return (
      <Message
        title="This game can't be continued"
        body="It was started with an older version of the score card generator. Start a new game from the library instead."
      >
        <div className="flex gap-2 justify-center">
          <Button variant="secondary" onClick={() => router.push('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              deleteGame(session.id);
              router.push('/');
            }}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete it
          </Button>
        </div>
      </Message>
    );
  }

  const game: ScoreCardSession = session;
  const state: ScoreCardState = { rounds: game.rounds, sheet: game.sheet, draft: game.draft ?? null };

  const finish = () => {
    if (confirm('Finish this game? It will move to your completed games.')) {
      completeGame(game.id);
      router.push('/');
    }
  };

  return (
    <ThemeShell theme={themeForCard(game.card)}>
    <div className="space-y-6">
      <header className="flex items-center gap-3 min-w-0">
        <Button variant="secondary" size="sm" onClick={() => router.push('/')} aria-label="Back to games">
          <ArrowLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Games</span>
        </Button>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white truncate">{game.card.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {game.players.length} {game.card.playerLabel === 'team' ? 'teams' : 'players'} ·{' '}
            {game.card.winner === 'lowest' ? 'lowest' : 'highest'} score wins
          </p>
        </div>
      </header>

      <ScoreCardPlay
        card={game.card}
        players={game.players}
        state={state}
        onChange={(patch) => updateGame(game.id, patch as Partial<ScoreCardSession>)}
        onFinish={finish}
      />

      <RulesPanel card={game.card} />
    </div>
    </ThemeShell>
  );
}

function Message({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <div className="max-w-xl mx-auto text-center rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
      <p className="text-gray-600 dark:text-gray-300">{body}</p>
      {children}
    </div>
  );
}

/** Games made by the old HTML generator: shown in a locked-down sandbox. */
function LegacyScorecard({ gameSlug }: { gameSlug: string }) {
  const router = useRouter();
  const [name, setName] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${encodeURIComponent(gameSlug)}/definition`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data?.metadata?.name) setName(data.metadata.name);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [gameSlug]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="secondary" size="sm" onClick={() => router.push('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Games
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{name || 'Score card'}</h1>
      </div>
      <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/20 rounded-md p-3">
        This score card was made by an older version of the generator. Scores entered here aren&apos;t saved; regenerate
        the game from its rules for a saved, validated score card.
      </p>
      <iframe
        src={`/api/games/${encodeURIComponent(gameSlug)}/scorecard`}
        className="w-full h-[75vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-white"
        title={`${name || 'Legacy'} score card`}
        sandbox="allow-scripts allow-forms"
      />
    </div>
  );
}
