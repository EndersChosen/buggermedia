import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { getDb, isDatabaseConfigured } from './app/lib/db';
import { aiGeneratedGames, uploadLogs } from './app/lib/db/schema';
import { desc } from 'drizzle-orm';

async function checkGames() {
  try {
    if (!isDatabaseConfigured()) {
      console.error(
        'Database not configured. Set POSTGRES_URL / DATABASE_URL (or POSTGRES_HOST/USER/PASSWORD/DATABASE) in .env.local.'
      );
      process.exit(1);
    }

    const db = getDb();

    console.log('\n=== Generated Games ===');
    const games = await db.select().from(aiGeneratedGames);
    console.log('Total:', games.length);
    games.forEach(game => {
      console.log(`- ${game.name} (${game.gameSlug}) - Status: ${game.status}`);
    });

    console.log('\n=== Upload Logs (Last 5) ===');
    const logs = await db.select().from(uploadLogs).orderBy(desc(uploadLogs.uploadTimestamp)).limit(5);
    logs.forEach(log => {
      console.log(`\nUpload ID: ${log.id}`);
      console.log(`Status: ${log.status}`);
      console.log(`Timestamp: ${log.uploadTimestamp}`);
      console.log(`Game ID: ${log.gameId}`);
      if (log.errorMessage) {
        console.log(`Error: ${log.errorMessage}`);
      }
    });
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

checkGames();
