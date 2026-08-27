# Discord Music Link Archiver

This project is a web-based archive and management interface for music links shared within a Discord community. It consolidates daily song recommendations from curators and contributors into a searchable database.

> [!WARNING]
> This software is not designed for general personal use. It is custom-tailored specifically for this project's setup and database schema. No guarantee is provided that other people will be able to configure or use it properly.

## What This Project Does

1. **Legacy Seeding (One-Time)**: Historic music shares were read from Discord message logs (JSON) and user spreadsheets (CSV) to seed the initial database.
2. **Maintains a ScyllaDB Database**: Houses all tracks, user attributions, and timestamps across two Cassandra-style tables (partitioned by owner, and by id for point lookups).
3. **Enriches Track Metadata**: Automatically queries the YouTube oEmbed API to fetch clean song titles, artist names, and video IDs for raw URLs.
4. **Provides a Web Interface**: Displays the catalog of songs sorted by date, allows filtering by curator/contributor, and supports adding, editing, or deleting entries.
5. **Cross-User Search**: Typo-tolerant full-text search across a single user's tracks or everyone's at once, powered by Typesense.
6. **Exports Curated Lists**: Allows users to download clean CSVs of any contributor's song history directly from the browser.

## Tech Stack

- Runtime Environment: Node.js (pinned to `24.19.0` in Docker; see `.nvmrc` for local dev)
- Framework: SvelteKit (Svelte 5)
- Database: ScyllaDB via the official `cassandra-driver` (raw CQL, no ORM)
- Search: Typesense (fuzzy/typo-tolerant, indexed on every write)
- Cache & Rate Limiting: Valkey (read-through cache with generation-based invalidation, brute-force login throttling, session store)
- Auth: Login page + session cookie (not HTTP Basic Auth)
- Style System: Tailwind CSS v4 (Material Design 3 tokens)
- Deployment: Docker Compose, exposed publicly via Tailscale Funnel

## Getting Started

### Installation

Install dependencies:

```bash
pnpm install
```

### Running Locally

`pnpm dev` needs ScyllaDB reachable at `localhost:9042` — bring at least that service up first:

```bash
docker compose up -d scylla
pnpm dev
```

Typesense and Valkey aren't required for local dev (both degrade gracefully when unreachable — search falls back to substring matching, caching/rate-limiting just no-op), but bring up the full stack with `docker compose up -d` if you want them too.

Build the production bundle:

```bash
pnpm build
pnpm start
```

### Full Stack via Docker

The production deployment is the whole `docker-compose.yml` stack: the app, ScyllaDB, Typesense, and Valkey.

```bash
cp .env.example .env   # fill in BASIC_AUTH_USER/PASS, TYPESENSE_API_KEY, PUBLIC_ORIGIN
docker compose up -d
```

The app is bound to `127.0.0.1:8420` only — see `docker-compose.yml`'s comments for exposing it publicly via Tailscale Funnel. Auth is a login page backed by a Valkey-stored session cookie, not a browser Basic Auth popup.

### Database Schema

`src/lib/server/db/schema.ts` holds the CQL `CREATE TABLE` statements, applied automatically on boot (`ensureReady()` in `src/lib/server/init.ts`). There's no migration tooling — schema changes mean editing the DDL there and applying them manually against the running cluster (`cqlsh` or `nodetool`) if the change isn't additive.

Data lives in two tables, both kept in sync on every write via a logged `BATCH`:

- `songs_by_owner` — partitioned by `owner`, clustered by `sort_order`. The primary read path (a user's song list, pre-sorted for free).
- `songs_by_id` — partitioned by `id`. Denormalized lookup table for point reads/edits/deletes, since Cassandra-family databases can't query by a non-partition-key column.

### Backing Up the Database

ScyllaDB's native snapshot mechanism, taken via `nodetool` and archived out of the container:

```bash
docker compose exec scylla nodetool snapshot music_link -t backup_$(date +%Y-%m-%dT%H-%M-%SZ)
docker compose exec scylla bash -c "cd /var/lib/scylla/data/music_link && tar czf /tmp/backup.tar.gz */snapshots/backup_*"
docker cp music-link-scylla-1:/tmp/backup.tar.gz ./backups/scylla_backup_$(date +%Y-%m-%dT%H-%M-%SZ).tar.gz
docker compose exec scylla rm /tmp/backup.tar.gz
docker compose exec scylla nodetool clearsnapshot
```

Each archive includes `schema.cql` for every table. Restore procedure (tested end-to-end against a throwaway container):

1. Extract the archive locally; it contains one folder per table (`<table>-<uuid>/snapshots/<tag>/`), each with SSTable files and its own `schema.cql`.
2. Recreate the keyspace and run each table's `schema.cql` against the target cluster (`cqlsh -f`).
3. Copy each table's SSTable files (everything except `schema.cql`/`manifest.json`) into that table's data directory **under its `upload/` subfolder** — newer Scylla versions only pick up new SSTables from there, not the table directory root.
4. Run `nodetool refresh <keyspace> <table>` for each table. Check the server log for `Loaded N SSTables` — `Loaded 0` means the files weren't in `upload/`.
5. `SELECT COUNT(*)` to confirm the row count matches.

If restoring on the same machine and the AIO resource limit is exceeded (`Could not setup Async I/O`, common when the live Scylla is also running), raise it: `wsl -d docker-desktop sysctl -w fs.aio-max-nr=1048576` (Docker Desktop on Windows/WSL2 — adjust for other platforms).
