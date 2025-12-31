'use client';

import { useState, useEffect } from 'react';
import { SKGameSession, SKRound, SKBonusDetails } from '@/types/game.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PlusCircle, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { calculateSKRoundScore } from '../skCalculations';
import { SKPlayerBonusInput } from './SKPlayerBonusInput';

interface SKScoreInputProps {
  game: SKGameSession;
  onAddRound: (
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>,
    bonusDetails: Record<string, SKBonusDetails>
  ) => void;
  editingRound?: SKRound | null;
  onUpdateRound?: (
    roundNumber: number,
    bids: Record<string, number>,
    tricks: Record<string, number>,
    bonuses: Record<string, number>,
    bonusDetails: Record<string, SKBonusDetails>
  ) => void;
  onCancelEdit?: () => void;
}

export function SKScoreInput({ game, onAddRound, editingRound, onUpdateRound, onCancelEdit }: SKScoreInputProps) {
  const [bids, setBids] = useState<Record<string, string>>(
    Object.fromEntries(game.players.map((p) => [p.id, '']))
  );
  const [tricks, setTricks] = useState<Record<string, string>>(
    Object.fromEntries(game.players.map((p) => [p.id, '']))
  );
  const [bonuses, setBonuses] = useState<Record<string, number>>(
    Object.fromEntries(game.players.map((p) => [p.id, 0]))
  );
  const [bonusDetails, setBonusDetails] = useState<Record<string, SKBonusDetails>>(
    Object.fromEntries(game.players.map((p) => [p.id, {
      yellow14: false,
      purple14: false,
      green14: false,
      black14: false,
      mermaidsCapturedByPirates: 0,
      piratesCapturedBySkullKing: 0,
      skullKingCapturedByMermaid: false,
      lootAlliances: [],
    }]))
  );

  // Track which player cards are expanded
  const [expandedPlayers, setExpandedPlayers] = useState<Record<string, boolean>>(
    Object.fromEntries(game.players.map((p) => [p.id, true]))
  );

  // Track which bonus sections are expanded
  const [expandedBonuses, setExpandedBonuses] = useState<Record<string, boolean>>(
    Object.fromEntries(game.players.map((p) => [p.id, false]))
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
      setBonusDetails(Object.fromEntries(
        game.players.map((p) => [p.id, editingRound.bonusDetails?.[p.id] || {
          yellow14: false,
          purple14: false,
          green14: false,
          black14: false,
          mermaidsCapturedByPirates: 0,
          piratesCapturedBySkullKing: 0,
          skullKingCapturedByMermaid: false,
          lootAlliances: [],
        }])
      ));
      // Expand all players and bonuses when editing
      setExpandedPlayers(Object.fromEntries(game.players.map((p) => [p.id, true])));
      setExpandedBonuses(Object.fromEntries(game.players.map((p) => [p.id, true])));
    }
  }, [editingRound, game.players]);

  const handleBidChange = (playerId: string, value: string) => {
    if (value === '' || (/^\d+$/.test(value) && parseInt(value) <= game.currentRound)) {
      setBids({ ...bids, [playerId]: value });
    }
  };

  const handleTrickChange = (playerId: string, value: string) => {
    // Basic validation: empty or valid number within round limit
    if (value !== '' && !(/^\d+$/.test(value) && parseInt(value) <= game.currentRound)) {
      return;
    }

    // Calculate total tricks won by other players
    const otherPlayersTricks = game.players
      .filter(p => p.id !== playerId)
      .reduce((sum, p) => {
        const playerTricks = parseInt(tricks[p.id] || '0', 10);
        return sum + playerTricks;
      }, 0);

    // Check if total tricks would exceed round number
    const newPlayerTricks = value === '' ? 0 : parseInt(value, 10);
    const totalTricks = otherPlayersTricks + newPlayerTricks;

    if (totalTricks > game.currentRound) {
      // Total tricks would exceed the round number, don't allow it
      return;
    }

    setTricks({ ...tricks, [playerId]: value });
  };

  const handleBonusChange = (playerId: string, value: number, details: SKBonusDetails) => {
    setBonuses(prev => ({ ...prev, [playerId]: value }));

    // Sync loot alliances bidirectionally
    setBonusDetails(prev => {
      const updated = { ...prev, [playerId]: details };

      // Get the current player's alliances
      const currentAlliances = details.lootAlliances || [];

      // For each player, update their alliances to sync with this player
      game.players.forEach(player => {
        if (player.id === playerId) return; // Skip the current player

        const otherPlayerDetails = updated[player.id] || {
          yellow14: false,
          purple14: false,
          green14: false,
          black14: false,
          mermaidsCapturedByPirates: 0,
          piratesCapturedBySkullKing: 0,
          skullKingCapturedByMermaid: false,
          lootAlliances: [],
        };

        const otherPlayerAlliances = otherPlayerDetails.lootAlliances || [];

        // If current player has this other player in their alliances
        if (currentAlliances.includes(player.id)) {
          // Make sure the other player also has current player in their alliances
          if (!otherPlayerAlliances.includes(playerId)) {
            updated[player.id] = {
              ...otherPlayerDetails,
              lootAlliances: [...otherPlayerAlliances, playerId],
            };
          }
        } else {
          // If current player doesn't have this other player in their alliances
          // Remove current player from other player's alliances
          if (otherPlayerAlliances.includes(playerId)) {
            updated[player.id] = {
              ...otherPlayerDetails,
              lootAlliances: otherPlayerAlliances.filter(id => id !== playerId),
            };
          }
        }
      });

      return updated;
    });
  };

  const togglePlayerExpanded = (playerId: string) => {
    setExpandedPlayers(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  const toggleBonusExpanded = (playerId: string) => {
    setExpandedBonuses(prev => ({ ...prev, [playerId]: !prev[playerId] }));
  };

  // Calculate what bonuses are available for a specific player
  const calculateBonusLimits = (currentPlayerId: string) => {
    // Start with max availability
    const limits = {
      yellow14Available: true,
      purple14Available: true,
      green14Available: true,
      black14Available: true,
      mermaidsRemaining: 2,
      piratesRemaining: 5,
      skullKingAvailable: true,
    };

    // Check what other players have claimed
    game.players.forEach((player) => {
      if (player.id === currentPlayerId) return; // Skip current player

      const playerBonusDetails = bonusDetails[player.id];
      if (!playerBonusDetails) return;

      // Check #14 cards
      if (playerBonusDetails.yellow14) limits.yellow14Available = false;
      if (playerBonusDetails.purple14) limits.purple14Available = false;
      if (playerBonusDetails.green14) limits.green14Available = false;
      if (playerBonusDetails.black14) limits.black14Available = false;

      // Count special cards
      limits.mermaidsRemaining -= playerBonusDetails.mermaidsCapturedByPirates;
      limits.piratesRemaining -= playerBonusDetails.piratesCapturedBySkullKing;
      if (playerBonusDetails.skullKingCapturedByMermaid) limits.skullKingAvailable = false;
    });

    // Ensure counts don't go negative
    limits.mermaidsRemaining = Math.max(0, limits.mermaidsRemaining);
    limits.piratesRemaining = Math.max(0, limits.piratesRemaining);

    return limits;
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
      onUpdateRound(editingRound.roundNumber, numericBids, numericTricks, bonuses, bonusDetails);
    } else {
      // Add new round
      onAddRound(numericBids, numericTricks, bonuses, bonusDetails);
    }

    // Reset
    setBids(Object.fromEntries(game.players.map((p) => [p.id, ''])));
    setTricks(Object.fromEntries(game.players.map((p) => [p.id, ''])));
    setBonuses(Object.fromEntries(game.players.map((p) => [p.id, 0])));
    setBonusDetails(Object.fromEntries(game.players.map((p) => [p.id, {
      yellow14: false,
      purple14: false,
      green14: false,
      black14: false,
      mermaidsCapturedByPirates: 0,
      piratesCapturedBySkullKing: 0,
      skullKingCapturedByMermaid: false,
      lootAlliances: [],
    }])));
    setExpandedPlayers(Object.fromEntries(game.players.map((p) => [p.id, true])));
    setExpandedBonuses(Object.fromEntries(game.players.map((p) => [p.id, false])));
  };

  const isFormValid = game.players.every((player) =>
    bids[player.id] !== '' && tricks[player.id] !== ''
  );

  const getPreviewScore = (playerId: string): number | null => {
    if (!bids[playerId] || !tricks[playerId]) return null;

    return calculateSKRoundScore({
      bid: parseInt(bids[playerId], 10),
      tricks: parseInt(tricks[playerId], 10),
      bonusPoints: bonuses[playerId] || 0,
      roundNumber: game.currentRound,
    });
  };

  const getRemainingTricks = (): number => {
    const totalTricks = game.players.reduce((sum, p) => {
      const playerTricks = parseInt(tricks[p.id] || '0', 10);
      return sum + playerTricks;
    }, 0);
    return game.currentRound - totalTricks;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {editingRound ? 'Edit ' : ''}Round {editingRound?.roundNumber || game.currentRound}
            </CardTitle>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {editingRound?.roundNumber || game.currentRound} card{(editingRound?.roundNumber || game.currentRound) > 1 ? 's' : ''} this round
            </p>
          </div>
          {!editingRound && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Tricks Not Won</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {getRemainingTricks()}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                (Escape/Kraken)
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Player Cards */}
          {game.players.map((player) => {
            const previewScore = getPreviewScore(player.id);
            const isExpanded = expandedPlayers[player.id];
            const isBonusExpanded = expandedBonuses[player.id];

            return (
              <div
                key={player.id}
                className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Player Card Header */}
                <button
                  onClick={() => togglePlayerExpanded(player.id)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {player.name}
                    </span>
                    {previewScore !== null && (
                      <span
                        className={`text-sm font-medium ${
                          previewScore > 0
                            ? 'text-green-600 dark:text-green-400'
                            : previewScore < 0
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {previewScore > 0 ? '+' : ''}{previewScore}
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>

                {/* Player Card Content */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {/* Bid and Tricks in a grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        label="Bid"
                        placeholder={`0-${game.currentRound}`}
                        value={bids[player.id]}
                        onChange={(e) => handleBidChange(player.id, e.target.value)}
                      />
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        label="Tricks Won"
                        placeholder={`0-${game.currentRound}`}
                        value={tricks[player.id]}
                        onChange={(e) => handleTrickChange(player.id, e.target.value)}
                      />
                    </div>

                    {/* Bonus Section Toggle */}
                    <button
                      onClick={() => toggleBonusExpanded(player.id)}
                      className="w-full py-2 px-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg flex items-center justify-between transition-colors"
                    >
                      <span className="text-sm font-medium">
                        Bonus Points {bonuses[player.id] > 0 && `(+${bonuses[player.id]})`}
                      </span>
                      {isBonusExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    {/* Bonus Input (Expandable) */}
                    {isBonusExpanded && (
                      <div className="mt-3">
                        <SKPlayerBonusInput
                          playerName={player.name}
                          playerId={player.id}
                          bid={bids[player.id]}
                          tricks={tricks[player.id]}
                          onBonusChange={(bonus, details) => handleBonusChange(player.id, bonus, details)}
                          initialBonusDetails={editingRound ? bonusDetails[player.id] : undefined}
                          bonusLimits={calculateBonusLimits(player.id)}
                          availablePlayers={game.players.filter(p => p.id !== player.id)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="flex-1"
            >
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
        </div>
      </CardContent>
    </Card>
  );
}
