import { SpadesGame } from '@/features/spades/SpadesGame';
import { ThemeShell } from '@/components/theme/ThemeShell';

export default function GamePage() {
  return (
    <ThemeShell theme="felt">
      <SpadesGame />
    </ThemeShell>
  );
}
