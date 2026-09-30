# NexusDoc AI 🚀
> **NexusDoc AI is a local-first collaborative workspace uniting Yjs CRDT real-time synchronization with an Agentic RAG engine. Features conflict-free multi-user editing, BullMQ background indexing, and sub-2ms pgvector HNSW similarity search with an autonomous AI Copilot that inspects context and inserts grounded insights directly into the active canvas.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-pgvector-blue)](https://github.com/pgvector/pgvector)
[![CRDT](https://img.shields.io/badge/CRDT-Yjs-orange)](https://github.com/yjs/yjs)
[![Queue](https://img.shields.io/badge/Queue-BullMQ-red)](https://bullmq.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6)](https://www.typescriptlang.org/)

---

## 🏛️ System Architecture

```
                                  NexusDoc AI Architecture
                                  
 [Browser Client 1]  [Browser Client 2]
         │                    │
         └────────┬───────────┘
                  │ WebSockets (<50ms CRDT Sync)
                  ▼
         ┌───────────────────┐
         │  apps/api         │ ──(5s Debounce)──► [PostgreSQL: documents]
         │  (Node.js/Express)│
         └────────┬──────────┘
                  │ 
                  ├─► POST /api/documents/upload ──► [Redis: BullMQ Queue]
                  │                                         │
                  │                                         ▼
                  │                                [BullMQ Worker Pool]
                  │                                         │
                  │                                         ├─► Token Sliding Chunker (~500 tokens)
                  │                                         ├─► OpenAI / Embeddings Generator
                  │                                         ▼
                  │                                [PostgreSQL: document_chunks]
                  │                                         │
                  │                                         ▼
                  │                              [HNSW Index: m=16, ef_c=64]
                  │
                  └─► POST /api/agent/rag-chat ◄── (Cosine Search <=> Sub-2ms)
```

For complete mathematical formulation, algorithmic benchmarks (HNSW vs IVFFlat), and resume impact guides, read [ARCHITECTURE.md](ARCHITECTURE.md).

---

## ⚡ Core Engineering Highlights

1. **Distributed State Synchronization (CRDTs):**
   - Implements Yjs (YATA algorithm) commutative data structures.
   - Completely eliminates central locking servers (Operational Transformation).
   - Local-first architecture: edits are optimistically recorded and deterministically converged across network partitions.
   - Multi-cursor presence awareness with collaborator identity and colors.
   - 5-second debounced state flushes to PostgreSQL `documents.crdt_state`.

2. **High-Dimensional Vector Search (pgvector + HNSW):**
   - High-dimensional spatial indexing using Hierarchical Navigable Small World (HNSW) proximity graphs ($O(\log N)$ traversal).
   - Index parameters tuned for real-time collaborative updates: `m = 16`, `ef_construction = 64`, `ef_search = 40`.
   - Continuous-insert stability without requiring blocking `REINDEX` operations.

3. **Asynchronous Microservices Queue (BullMQ + Redis):**
   - Offloads CPU-intensive document chunking and remote embedding network calls from the Node.js event loop.
   - 3-tier exponential backoff retry mechanism (`attempts: 3`, `backoff: 1000ms * 2^attempt`).
   - Resilient in-memory fallback adapter for offline development.

4. **Next.js & Tiptap Collaborative Canvas:**
   - Headless Tiptap rich-text editor bound to `Y.Doc` with `@tiptap/extension-collaboration` and cursor awareness.
   - Integrated AI Copilot sidebar with real-time vector search inspector.
   - One-click **"Insert into Document Canvas"** workflow.

---

## 📂 Repository Layout

```
NexusDoc-AI/
├── apps/
│   ├── api/                      # Backend Service (Node.js / Express / TypeScript)
│   │   ├── src/
│   │   │   ├── db/               # Drizzle ORM schema, pgvector HNSW queries & migrations
│   │   │   ├── queue/            # BullMQ worker & Redis background embedding queue
│   │   │   ├── routes/           # REST API endpoints (/upload, /search, /rag-chat, /health)
│   │   │   ├── services/         # Chunker, OpenAI/vector generator, RAG synthesis
│   │   │   ├── websocket/        # y-websocket server with 5s debounced persistence
│   │   │   └── server.ts         # Main server bootstrap
│   │   └── package.json
│   │
│   └── web/                      # Frontend Application (Next.js 14 / App Router)
│       ├── src/
│       │   ├── app/              # App router pages, layout, and global styling
│       │   └── components/
│       │       ├── Editor/       # Tiptap collaborative canvas & Yjs cursor awareness
│       │       ├── Sidebar/      # AI Copilot & Vector Search Inspector
│       │       ├── Documents/    # Document ingestion modal
│       │       └── Navbar/       # Workspace header & telemetry stats
│       └── package.json
│
├── docker-compose.yml            # PostgreSQL 15 (pgvector) + Redis 7 alpine
├── ARCHITECTURE.md               # In-depth technical architecture & resume guide
├── .env.example                  # Environment configuration template
└── package.json                  # Monorepo workspaces manifest
```

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js 18+ (tested on Node v20 and v24)
- npm or pnpm
- Docker (optional for PostgreSQL + Redis; includes built-in offline simulation mode!)

### 1. Clone & Install
```bash
git clone https://github.com/joshi-07/NexusDoc-AI.git
cd NexusDoc-AI
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional: add your `OPENAI_API_KEY` to `.env` to enable live GPT-4o-mini and OpenAI embeddings. If omitted, NexusDoc AI runs with deterministic local embeddings and offline synthesis out of the box).*

### 3. (Optional) Start Infrastructure with Docker
```bash
docker compose up -d
```
This spins up:
- PostgreSQL 15 with `pgvector` on port `5432`
- Redis on port `6379`

### 4. Run Development Servers
Start both backend API and frontend canvas simultaneously:
```bash
npm run dev
```

Or run them individually:
```bash
# Terminal 1: Backend API (port 4000)
npm run dev:api

# Terminal 2: Frontend Canvas (port 3000)
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/documents/upload` | Ingests document and enqueues BullMQ background chunking & vector indexing |
| `GET` | `/api/documents` | Lists all documents with chunk counts and metadata |
| `GET` | `/api/documents/:id` | Retrieves single document details and state |
| `POST` | `/api/search` | Performs sub-2ms HNSW vector similarity search (`query`, `documentId?`, `topK`) |
| `POST` | `/api/agent/rag-chat` | Synthesizes grounded AI answer with citations and document insert suggestions |
| `GET` | `/api/health` | Diagnostic status of PostgreSQL, pgvector, Redis, and CRDT WebSockets |
| `WS` | `/crdt/:docId` | WebSocket connection for real-time Yjs CRDT synchronization |

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
