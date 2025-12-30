interface SKRoundTrackerProps {
  currentRound: number;
  completedRounds: number;
}

export function SKRoundTracker({ currentRound, completedRounds }: SKRoundTrackerProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((round) => {
        const isCompleted = round <= completedRounds;
        const isCurrent = round === currentRound;

        return (
          <div key={round} className="flex flex-col items-center gap-1">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                ${
                  isCompleted
                    ? 'bg-green-100 text-green-800 border-2 border-green-500'
                    : isCurrent
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-500'
                    : 'bg-gray-100 text-gray-400 border-2 border-gray-300'
                }
              `}
            >
              {round}
            </div>
            <span className="text-xs text-gray-500">{round} card{round > 1 ? 's' : ''}</span>
          </div>
        );
      })}
    </div>
  );
}
