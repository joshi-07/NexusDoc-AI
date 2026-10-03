import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api';
import { initDatabase, docRepository } from './db';
import { initBullMQ, enqueueDocumentEmbedding } from './queue/embeddingQueue';
import { initCrdtWebSocketServer } from './websocket/crdtServer';

dotenv.config();

const PORT = parseInt(process.env.PORT || '4000', 10);
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount REST API
app.use('/api', apiRouter);

// Root greeting & Render health check probe
app.get('/', (_req, res) => {
  res.json({
    name: 'NexusDoc AI Backend API',
    description: 'Agentic RAG Knowledge Platform with CRDT-based Real-Time Collaboration',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

const server = http.createServer(app);

// Attach CRDT WebSocket Server (y-websocket protocol)
initCrdtWebSocketServer(server);

async function startServer() {
  console.log('------------------------------------------------------------');
  console.log('⚡ Starting NexusDoc AI Orchestration Engine...');
  console.log('------------------------------------------------------------');

  // Initialize DB and Queues
  await initDatabase();
  initBullMQ();

  // Seed sample architecture document if no documents exist
  try {
    const existingDocs = await docRepository.getAllDocuments();
    if (existingDocs.length === 0) {
      console.log('🌱 Seeding initial technical document for Agentic RAG indexing...');
      const seedDoc = await docRepository.createDocument(
        'System Architecture: Distributed CRDTs & HNSW Vector Search',
        `# NexusDoc AI: Distributed Systems Architecture Overview

## 1. Conflict-Free Replicated Data Types (CRDTs)
Traditional collaborative editors rely heavily on Operational Transformation (OT) which mandates a centralized sequencer. In contrast, NexusDoc AI leverages state-based and operation-based CRDTs via Yjs. Every character insertion and deletion preserves mathematical commutativity, allowing clients to merge offline edits deterministically. Deleted characters are tracked as tombstones to guarantee positional convergence across concurrent operations.

## 2. High-Dimensional Spatial Indexing with HNSW
To power real-time Retrieval-Augmented Generation (RAG), text chunks are embedded into 1536-dimensional floating point vectors. We utilize PostgreSQL with pgvector configured with Hierarchical Navigable Small World (HNSW) proximity graph indexing (m=16, ef_construction=64). HNSW provides logarithmic time complexity O(log N) for Approximate Nearest Neighbor (ANN) search, maintaining over 98% recall under continuous streaming inserts.

## 3. Asynchronous Job Decoupling via BullMQ
Embedding generation and document chunking are computationally intensive. We offload these tasks to background BullMQ workers backed by Redis. BullMQ utilizes Redis Pub/Sub mechanisms to notify workers instantly while guaranteeing exponential backoff retries on transient external API rate limits.

## 4. Debounced PostgreSQL State Durability
WebSocket synchronization updates are broadcast immediately to connected clients with sub-50ms latency. In parallel, binary document state updates are debounced on a 5-second interval and committed to PostgreSQL, guaranteeing durability without locking the Node.js event loop.`
      );

      // Enqueue for background embedding
      await enqueueDocumentEmbedding({
        documentId: seedDoc.id,
        title: seedDoc.title,
        content: seedDoc.content,
      });
    }
  } catch (seedErr: any) {
    console.warn('Notice during document seed:', seedErr.message);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`============================================================`);
    console.log(`🚀 NexusDoc AI Backend Server running at http://localhost:${PORT}`);
    console.log(`🔌 CRDT WebSocket Synchronization active at ws://localhost:${PORT}/crdt`);
    console.log(`🩺 Health & Diagnostic Check: http://localhost:${PORT}/api/health`);
    console.log(`============================================================`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
