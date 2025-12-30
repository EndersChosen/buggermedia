'use client';

import { GameRules } from '@/types/game.types';
import { Modal } from '@/components/ui/Modal';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameName: string;
  rules: GameRules;
}

export function RulesModal({ isOpen, onClose, gameName, rules }: RulesModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${gameName} - How to Play`} size="lg">
      <div className="space-y-6">
        {/* Overview */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Overview</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{rules.overview}</p>
        </div>

        {/* Setup */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Setup</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {rules.setup.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Gameplay */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Gameplay</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {rules.gameplay.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Scoring */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Scoring</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
            {rules.scoring.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>

        {/* Winning */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Winning</h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{rules.winning}</p>
        </div>
      </div>
    </Modal>
  );
}
