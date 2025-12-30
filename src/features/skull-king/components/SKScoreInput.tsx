import { useState, useEffect } from 'react';
import { SKGameSession, SKRound } from '@/@types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PlusCircle, ChevronRight, Save, X } from 'lucide-react';
import { calculateSKRoundScore } from '../skCalculations';
import { SKPlayerBonusInput } from './SKPlayerBonusInput';

interface SKScoreInputProps {
  game: SKGameSession;
  onAddRound: (
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>
  ) => void;
  editingRound?: SKRound | null;
  onUpdateRound?: (
    roundNumber: number,
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>
  ) => void;
  onCancelEdit?: () => void;
}

type InputStep = 'bids' | 'tricks' | 'bonuses';

export function SKScoreInput({ game, onAddRound, editingRound, onUpdateRound, onCancelEdit }: SKScoreInputProps) {
  const [step, setStep] = useState<InputStep>('bids');
  const [bids, setBids] = useState<Record<string, string>>(
    Object.fromEntries(game.players.map((p) => [p.id, '']))
  );
  const [tricks, setTricks] = useState<Record<string, string>>(
    Object.fromEntries(game.players.map((p) => [p.id, '']))
  );
  const [bonuses, setBonuses] = useState<Record<string, number>>(
    Object.fromEntries(game.players.map((p) => [p.id, 0]))
  );

  // Pre-fill data when editing
  useEffect(() => {
    if (editingRound) {
      setBids(Object.fromEntries(
        game.players.map((p) => [p.id, String(editingRound.bids[p.id] || 0)])
      ));
      setTricks(Object.fromEntries(
        game.players.map((p) => [p.id, String(editingRound.tricks[p.id] || 0)])
      ));
      setBonuses(Object.fromEntries(
        game.players.map((p) => [p.id, editingRound.bonuses[p.id] || 0])
      ));
      setStep('bids');
    }
  }, [editingRound, game.players]);

  const handleBidChange = (playerId: string, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= game.currentRound)) {
      setBids({ ...bids, [playerId]: value });
    }
  };

  const handleTrickChange = (playerId: string, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= game.currentRound)) {
      setTricks({ ...tricks, [playerId]: value });
    }
  };

  const handleBonusChange = (playerId: string, value: number) => {
    setBonuses({ ...bonuses, [playerId]: value });
  };

  const handleNextStep = () => {
    if (step === 'bids') {
      setStep('tricks');
    } else if (step === 'tricks') {
      setStep('bonuses');
    }
  };

  const handleSubmit = () => {
    const numericBids: Record<string, number> = {};
    const numericTricks: Record<string, number> = {};

    game.players.forEach((player) => {
      numericBids[player.id] = parseInt(bids[player.id] || '0', 10);
      numericTricks[player.id] = parseInt(tricks[player.id] || '0', 10);
    });

    if (editingRound && onUpdateRound) {
      // Update existing round
      onUpdateRound(editingRound.roundNumber, numericBids, numericTricks, bonuses);
    } else {
      // Add new round
      onAddRound(numericBids, numericTricks, bonuses);
    }

    // Reset
    setStep('bids');
    setBids(Object.fromEntries(game.players.map((p) => [p.id, ''])));
    setTricks(Object.fromEntries(game.players.map((p) => [p.id, ''])));
    setBonuses(Object.fromEntries(game.players.map((p) => [p.id, 0])));
  };

  const isBidsValid = game.players.every((player) => bids[player.id] !== '');
  const isTricksValid = game.players.every((player) => tricks[player.id] !== '');

  const getPreviewScore = (playerId: string): number | null => {
    if (!bids[playerId] || !tricks[playerId]) return null;

    return calculateSKRoundScore({
      bid: parseInt(bids[playerId], 10),
      tricks: parseInt(tricks[playerId], 10),
      bonusPoints: bonuses[playerId] || 0,
      roundNumber: game.currentRound,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {editingRound ? 'Edit ' : ''}Round {editingRound?.roundNumber || game.currentRound} - {step === 'bids' ? 'Enter Bids' : step === 'tricks' ? 'Enter Tricks' : 'Enter Bonuses'}
        </CardTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {editingRound?.roundNumber || game.currentRound} card{(editingRound?.roundNumber || game.currentRound) > 1 ? 's' : ''} this round
          {step === 'bids' && ' - How many tricks will you win?'}
          {step === 'tricks' && ' - How many tricks did you actually win?'}
          {step === 'bonuses' && ' - Bonus points (optional)'}
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {step === 'bids' && (
            <>
              {game.players.map((player) => (
                <Input
                  key={player.id}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  label={player.name}
                  placeholder={`Bid (0-${game.currentRound})`}
                  value={bids[player.id]}
                  onChange={(e) => handleBidChange(player.id, e.target.value)}
                  helperText={`Max bid: ${game.currentRound}`}
                />
              ))}
              <Button
                onClick={handleNextStep}
                disabled={!isBidsValid}
                className="w-full mt-4"
              >
                Next: Enter Tricks
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </>
          )}

          {step === 'tricks' && (
            <>
              {game.players.map((player) => {
                const previewScore = getPreviewScore(player.id);
                return (
                  <div key={player.id}>
                    <Input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      label={`${player.name} (bid: ${bids[player.id]})`}
                      placeholder={`Tricks won (0-${game.currentRound})`}
                      value={tricks[player.id]}
                      onChange={(e) => handleTrickChange(player.id, e.target.value)}
                    />
                    {previewScore !== null && (
                      <p
                        className={`text-sm mt-1 font-medium ${
                          previewScore > 0
                            ? 'text-green-600 dark:text-green-400'
                            : previewScore < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        Score: {previewScore > 0 ? '+' : ''}
                        {previewScore}
                      </p>
                    )}
                  </div>
                );
              })}
              <div className="flex gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setStep('bids')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNextStep}
                  disabled={!isTricksValid}
                  className="flex-1"
                >
                  Next: Bonuses
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </>
          )}

          {step === 'bonuses' && (
            <>
              <div className="space-y-4">
                {game.players.map((player) => {
                  const previewScore = getPreviewScore(player.id);
                  return (
                    <div key={player.id} className="space-y-2">
                      <SKPlayerBonusInput
                        playerName={player.name}
                        bid={bids[player.id]}
                        tricks={tricks[player.id]}
                        onBonusChange={(bonus) => handleBonusChange(player.id, bonus)}
                      />
                      {previewScore !== null && (
                        <p
                          className={`text-sm font-medium text-center ${
                            previewScore > 0
                              ? 'text-green-600 dark:text-green-400'
                              : previewScore < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          Final Score: {previewScore > 0 ? '+' : ''}
                          {previewScore}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-3 mt-4">
                <Button
                  variant="secondary"
                  onClick={() => setStep('tricks')}
                  className="flex-1"
                >
                  Back
                </Button>
                {editingRound && onCancelEdit && (
                  <Button
                    variant="secondary"
                    onClick={onCancelEdit}
                    className="flex-1"
                  >
                    <X className="w-5 h-5 mr-2" />
                    Cancel
                  </Button>
                )}
                <Button onClick={handleSubmit} className="flex-1">
                  {editingRound ? (
                    <>
                      <Save className="w-5 h-5 mr-2" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-5 h-5 mr-2" />
                      Complete Round
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
