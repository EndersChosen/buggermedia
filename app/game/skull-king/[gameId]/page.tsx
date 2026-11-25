import { SkullKingGame } from '@/features/skull-king/SkullKingGame';
import { ThemeShell } from '@/components/theme/ThemeShell';

export default function GamePage() {
  return (
    <ThemeShell theme="pirate">
      <SkullKingGame />
    </ThemeShell>
  );
}
