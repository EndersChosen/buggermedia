import { SpadesGameState } from '../spadesTypes';

interface SpadesScoreBoardProps {
  gameState: SpadesGameState;
}

export function SpadesScoreBoard({ gameState }: SpadesScoreBoardProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-700">
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Hand</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team A Bid</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team A Tricks</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team A Score</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team B Bid</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team B Tricks</th>
            <th className="border border-gray-300 dark:border-gray-600 px-4 py-2">Team B Score</th>
          </tr>
        </thead>
        <tbody>
          {gameState.hands.map((hand) => (
            <tr key={hand.handNumber} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                {hand.handNumber}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                {hand.teamA.bid}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                {hand.teamA.tricks}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold">
                {hand.teamA.score}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                {hand.teamB.bid}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
                {hand.teamB.tricks}
              </td>
              <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center font-semibold">
                {hand.teamB.score}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="bg-gray-100 dark:bg-gray-700 font-bold">
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Total</td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" colSpan={2}></td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
              {gameState.totalScoreA}
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" colSpan={2}></td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
              {gameState.totalScoreB}
            </td>
          </tr>
          <tr>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2">Bags</td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" colSpan={2}></td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
              {gameState.bagsA}
            </td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2" colSpan={2}></td>
            <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center">
              {gameState.bagsB}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
