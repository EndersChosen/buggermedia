# Card Game Score Tracker

Score keeping for tabletop games at [cards.buggermedia.com](https://cards.buggermedia.com). It ships hand-built trackers for Skull King, Cover Your Assets and Spades, and an AI score card creator for everything else: describe a game's scoring or upload its rule book, review the generated score card, and play.

Built with Next.js 16 (App Router), React 19, TypeScript and Tailwind CSS 4. Deployed on Vercel from `main`.

## How the AI score cards work

1. **Input** (`/create`): a typed description or pasted rules, or a rule book file. PDFs and images up to 4 MB are sent to the model as-is (so tables and scanned pages work). Text/Markdown files, and PDFs too large to upload, are read in the browser with pdf.js and sent as text.
2. **Generation** (`POST /api/scorecards/generate`): one synchronous request. The model returns a JSON **score card** (schema in `app/lib/scorecard/schema.ts`); the server validates it and, if anything is wrong, sends the errors back to the model to fix (up to 3 attempts).
3. **Review**: the person tries the card with sample players, edits anything by hand, or asks the AI for changes, then saves it to their browser and optionally publishes it to the shared library (Postgres).
4. **Play**: a deterministic engine scores the card. No model-written code ever runs.

### Score card schema

- `layout: "rounds"` — the same inputs every round (Hearts, Oh Hell, Rummy…). `roundScore` is an expression for one player's points that round; `roundChecks` sanity-check a round across players.
- `layout: "categories"` — a one-off sheet (Yahtzee, Ticket to Ride…). Each field is a row worth points (`scoreExpression` converts counts into points); `bonuses` are computed rows.
- `end`: fixed rounds (or a formula on player count), first to a target score, manual, or sheet complete. `winner`: highest or lowest.
- `examples`: worked examples from the rules (inputs and expected points). Validation replays them through the formulas, which catches logic mistakes the schema can't.

Expressions use a small, safe language (`app/lib/scorecard/expression.ts`): numbers, arithmetic, comparisons, `&& || !`, `?:`, `min/max/abs/floor/ceil/round/clamp/if`, and cross-player aggregates `sumAll/maxAll/minAll/countAll/rankOf` whose argument is evaluated per player (e.g. `countAll(tricks == bid)`).

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # Vitest: expression language, engine, validator, rate limiter
npm run lint
npm run build
```

### Environment variables (`.env.local`)

| Variable | Used for |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude models (default: Claude Opus 5.5) |
| `OPENAI_API_KEY` | Optional GPT-5.2 option |
| `POSTGRES_URL` / `DATABASE_URL` | Shared library of published score cards (optional; without it cards are saved per browser only) |
| `KV_REST_API_URL` + `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`) | Upstash Redis for rate limits shared across serverless instances. Without them, limits are in-memory per instance (fine locally, not a real quota in production). |
| `AI_DAILY_GENERATION_LIMIT` | Optional site-wide cap on AI generations + refinements per 24 h (default 200) |

### Rate limits (`app/lib/server/rate-limit.ts`)

- AI generate/refine: 20 per IP per hour, plus the site-wide daily cap above. Only requests that would reach the model count.
- Publishing to the shared library: 10 per IP per hour.

Limits use an Upstash sliding window when Redis is configured. If Redis is missing, errors or times out, the in-memory window is used instead.

**Careful:** if `.env.local` points at the production database, local runs read and write the live shared library. To test locally without it, add a `.env.development.local` with empty `POSTGRES_URL=`, `DATABASE_URL=`, `POSTGRES_HOST=`, `POSTGRES_USER=`, `POSTGRES_PASSWORD=` and `POSTGRES_DATABASE=` lines.

## Project structure

```
app/
  api/scorecards/generate   AI generation endpoint (create + refine)
  api/scorecards/models     Which AI models are configured
  api/games                 Shared library: list (GET) and publish (POST)
  create/                   Create / review / edit page
  game/[gameSlug]/[gameId]  Play a score card game (and legacy HTML cards)
  features/scorecard/       Score card UI: play, editor, rules panel
  features/create/          Create flow, in-browser PDF text extraction
  lib/scorecard/            Schema, expression language, engine, validator (+ tests)
  lib/ai/                   Prompts, model list, generation with repair loop
  features/skull-king, cover-your-assets, spades   Hand-built trackers
```

Game sessions and personal score cards are stored in the browser's localStorage (`cardgames:active`, `cardgames:completed`, `cardgames:customCards`).

## License

MIT License - see LICENSE.
