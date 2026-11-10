# ElimuLabs

ElimuLabs is a full-stack Next.js application. The App Router serves the React
interface and backend route handlers from the same project. PostgreSQL is the
source of truth for users, curriculum, generated documents, wallet balances,
transactions, and activity history.

## Local setup

1. Install Node.js 20.9 or newer and PostgreSQL.
2. Run `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to a PostgreSQL
   database you control. Set `APP_URL` to the URL where this app runs.
4. Run `npm run db:migrate` and `npm run db:seed`.
5. Run `npm run dev` and open `http://localhost:3000`.

The database migration creates the schema. The seed loads the grade and
learning-area list retained from the original site, a small Grade 7/8
Pre-Technical Studies strand sample, and one clearly general learning guide.
It is a starter dataset, not a complete or official curriculum import. Add
verified curriculum content and approved learning resources before relying on
other selections or presenting material as official.

## Optional integrations

- **Email:** Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
  `SMTP_PASSWORD`, and `SMTP_FROM` to enable verification and password-recovery
  email.
- **AI:** Set `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL`. Document and
  exam generation returns an explicit unavailable error when no key is set;
  failed generation is not charged.
- **M-Pesa:** Configure the Safaricom sandbox credentials in `.env`, use a
  publicly reachable HTTPS `APP_URL` for callbacks, and verify the setup in the
  provider sandbox before enabling production payments. Top-ups remain pending
  until the callback is validated. The website never requests an M-Pesa PIN.

Never commit `.env` or put service credentials in browser code. Use HTTPS and
deployment-managed secrets in production.

## Commands

- `npm run dev` — start Next.js in development.
- `npm run build` — generate the Prisma client and create a production build.
- `npm start` — serve the production build.
- `npm run db:migrate` — create/apply a local development migration.
- `npm run db:deploy` — apply committed migrations in deployment.
- `npm run db:seed` — load the starter curriculum.

The application cannot perform authenticated database workflows until a valid
PostgreSQL connection is configured and migrations have been applied. Email,
AI generation, and M-Pesa are also unavailable until their respective
providers are configured.
# elimulabs
