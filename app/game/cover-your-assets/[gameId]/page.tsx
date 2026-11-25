import { CoverYourAssetsGame } from '@/features/cover-your-assets/CoverYourAssetsGame';
import { ThemeShell } from '@/components/theme/ThemeShell';

export default function GamePage() {
  return (
    <ThemeShell theme="vault">
      <CoverYourAssetsGame />
    </ThemeShell>
  );
}
