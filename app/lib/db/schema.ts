import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Enums
export const gameStatusEnum = pgEnum('game_status', ['processing', 'ready', 'failed']);
export const uploadStatusEnum = pgEnum('upload_status', [
  'started',
  'pdf_parsed',
  'ai_processing',
  'awaiting_review',
  'completed',
  'failed',
]);

// AI Generated Games Table
export const aiGeneratedGames = pgTable('ai_generated_games', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameSlug: varchar('game_slug', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description').notNull(),
  minPlayers: integer('min_players').notNull(),
  maxPlayers: integer('max_players').notNull(),
  status: gameStatusEnum('status').notNull().default('processing'),
  pdfUrl: text('pdf_url'), // Nullable - text submissions don't have PDFs
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  generationMetadata: jsonb('generation_metadata'),
});

// Game Definitions Table
export const gameDefinitions = pgTable('game_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => aiGeneratedGames.id, { onDelete: 'cascade' }),
  definition: jsonb('definition').notNull(),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Game Rules Table
export const gameRules = pgTable('game_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => aiGeneratedGames.id, { onDelete: 'cascade' }),
  rules: jsonb('rules').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Upload Logs Table
export const uploadLogs = pgTable('upload_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  gameId: uuid('game_id').references(() => aiGeneratedGames.id, { onDelete: 'set null' }),
  uploadTimestamp: timestamp('upload_timestamp').notNull().defaultNow(),
  status: uploadStatusEnum('status').notNull().default('started'),
  errorMessage: text('error_message'),
  userFingerprint: varchar('user_fingerprint', { length: 100 }),
  generationMetadata: jsonb('generation_metadata'),
});

// Type exports
export type AIGeneratedGame = typeof aiGeneratedGames.$inferSelect;
export type NewAIGeneratedGame = typeof aiGeneratedGames.$inferInsert;
export type GameDefinition = typeof gameDefinitions.$inferSelect;
export type NewGameDefinition = typeof gameDefinitions.$inferInsert;
export type GameRules = typeof gameRules.$inferSelect;
export type NewGameRules = typeof gameRules.$inferInsert;
export type UploadLog = typeof uploadLogs.$inferSelect;
export type NewUploadLog = typeof uploadLogs.$inferInsert;
