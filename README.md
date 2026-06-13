# Discord Music Link Archiver

This project is a web-based archive and management interface for music links shared within a Discord community. It consolidates daily song recommendations from curators and contributors into a searchable database.

> [!WARNING]
> This software is not designed for general personal use. It is custom-tailored specifically for this project's setup and database schema. No guarantee is provided that other people will be able to configure or use it properly.

## What This Project Does

1. **Legacy Seeding (One-Time)**: Historic music shares were read from Discord message logs (JSON) and user spreadsheets (CSV) to seed the initial database.
2. **Maintains a SQLite Database**: Houses all tracks, user attributions, and timestamps in a structured local SQLite database managed by Drizzle ORM.
3. **Enriches Track Metadata**: Automatically queries the YouTube oEmbed API to fetch clean song titles, artist names, and video IDs for raw URLs.
4. **Provides a Web Interface**: Displays the catalog of songs sorted by date, allows filtering by curator/contributor, and supports adding, editing, or deleting entries.
5. **Exports Curated Lists**: Allows users to download clean CSVs of any contributor's song history directly from the browser (this dynamic generation is fully functional).

## Tech Stack

- Runtime Environment: Node.js (v24)
- Framework: SvelteKit (Svelte 5)
- Database: SQLite via Better-SQLite3
- ORM: Drizzle ORM
- Style System: Tailwind CSS v4 (Material Design 3 tokens)

## Getting Started

### Installation

Install dependencies:

```bash
pnpm install
```

### Database Management

Schema definitions are located in `src/lib/server/db/schema.ts`. 

To generate a new SQL migration after changing the schema:

```bash
pnpm db:generate
```

To view and edit the database tables in your browser:

```bash
pnpm db:studio
```

*Note: Migrations run automatically when SvelteKit starts.*

### Running Locally

Start the development server:

```bash
pnpm dev
```

Build the production bundle:

```bash
pnpm build
pnpm start
```

### Backing Up the Database

To create a transaction-safe backup of the database:

1. Connect to the database and run a WAL checkpoint to commit outstanding transactions from the log to the main file:
   ```sql
   PRAGMA wal_checkpoint(TRUNCATE);
   ```
2. Copy the `music.db` file using SQLite's online backup API to prevent corruption.
