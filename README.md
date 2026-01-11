# bscout

A simple business tagging and search app built with Next.js, Prisma, and NextAuth.

## Setup

1. Create an `.env` file from the example:

   ```bash
   cp .env.example .env
   ```

   Checklist for `.env` (fill these in manually):

   - `DATABASE_URL` (ex: `file:./dev.db`)
   - `NEXTAUTH_URL` (ex: `http://localhost:3000`)
   - `NEXTAUTH_SECRET` (generate with `openssl rand -base64 32`)
   - `OPENAI_API_KEY` (required for bulk spreadsheet imports)

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create the database and generate Prisma client:

   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. Run the app:

   ```bash
   npm run dev
   ```

Visit `http://localhost:3000`.

## Bulk import

Use the dashboard's “Bulk upload” card to upload a `.csv` or `.xlsx` file. The
server sends a preview to OpenAI to map columns into businesses, tags, and
websites. Preview before importing to verify the mapping.

## Seed demo data

This creates a demo user and a handful of tagged businesses.

```bash
npm run db:seed
```

Demo credentials:

- Email: `demo@bscout.test`
- Password: `demo1234`
