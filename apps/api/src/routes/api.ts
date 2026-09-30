import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { docRepository, isPostgresConnected, inMemoryStore } from '../db';
import { enqueueDocumentEmbedding, isRedisConnected } from '../queue/embeddingQueue';
import { generateEmbedding, synthesizeRAGResponse } from '../services/aiService';

const router = Router();

// Validation Schemas
const uploadDocSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content cannot be empty'),
});

const searchSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  documentId: z.string().optional(),
  topK: z.number().int().positive().max(20).default(5),
});

const ragChatSchema = z.object({
  query: z.string().min(1, 'Prompt/query is required'),
  documentId: z.string().optional(),
});

/**
 * POST /api/documents/upload
 * Persists document and dispatches background embedding job to BullMQ
 */
router.post('/documents/upload', async (req: Request, res: Response) => {
  try {
    const parseResult = uploadDocSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.format() });
    }

    const { title, content } = parseResult.data;

    // 1. Persist document
    const doc = await docRepository.createDocument(title, content);

    // 2. Dispatch non-blocking BullMQ task
    await enqueueDocumentEmbedding({
      documentId: doc.id,
      title: doc.title,
      content,
    });

    return res.status(201).json({
      message: 'Document saved and queued for asynchronous HNSW vector indexing',
      document: doc,
    });
  } catch (err: any) {
    console.error('Error in /api/documents/upload:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * GET /api/documents
 * List all indexed documents
 */
router.get('/documents', async (_req: Request, res: Response) => {
  try {
    const docs = await docRepository.getAllDocuments();
    return res.json({ documents: docs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve documents', details: err.message });
  }
});

/**
 * GET /api/documents/:id
 * Retrieve a single document with its metadata
 */
router.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const doc = await docRepository.getDocument(req.params.id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    return res.json({ document: doc });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve document', details: err.message });
  }
});

/**
 * POST /api/search
 * High-performance vector similarity search using pgvector HNSW index
 */
router.post('/search', async (req: Request, res: Response) => {
  try {
    const parseResult = searchSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.format() });
    }

    const { query, documentId, topK } = parseResult.data;

    const startTime = Date.now();

    // 1. Generate high-dimensional embedding for query
    const queryVector = await generateEmbedding(query);

    // 2. Execute HNSW cosine similarity search (<=> operator)
    const results = await docRepository.searchSimilarChunks(queryVector, topK, documentId);

    const latencyMs = Date.now() - startTime;

    return res.json({
      query,
      resultsCount: results.length,
      latencyMs,
      indexingAlgorithm: 'HNSW (m=16, ef_construction=64, ef_search=40)',
      results,
    });
  } catch (err: any) {
    console.error('Error in /api/search:', err);
    return res.status(500).json({ error: 'Vector search failed', details: err.message });
  }
});

/**
 * POST /api/agent/rag-chat
 * Agentic RAG endpoint: queries HNSW index and synthesizes grounded response
 */
router.post('/agent/rag-chat', async (req: Request, res: Response) => {
  try {
    const parseResult = ragChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: parseResult.error.format() });
    }

    const { query, documentId } = parseResult.data;

    let docTitle: string | undefined;
    if (documentId) {
      const doc = await docRepository.getDocument(documentId);
      if (doc) docTitle = doc.title;
    }

    // 1. Retrieve top 4 most relevant semantic chunks via HNSW
    const queryVector = await generateEmbedding(query);
    const relevantChunks = await docRepository.searchSimilarChunks(queryVector, 4, documentId);

    // 2. Synthesize grounded answer
    const synthesis = await synthesizeRAGResponse(query, relevantChunks, docTitle);

    return res.json({
      query,
      answer: synthesis.answer,
      suggestedInsert: synthesis.suggestedInsert,
      citations: synthesis.citations,
      retrievedChunks: relevantChunks,
    });
  } catch (err: any) {
    console.error('Error in /api/agent/rag-chat:', err);
    return res.status(500).json({ error: 'Agentic RAG chat failed', details: err.message });
  }
});

/**
 * GET /api/health
 * System telemetry & health diagnostics
 */
router.get('/health', async (_req: Request, res: Response) => {
  const docs = await docRepository.getAllDocuments();
  let totalChunks = 0;
  for (const doc of docs) {
    totalChunks += doc.chunkCount;
  }

  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    services: {
      postgres: isPostgresConnected ? 'connected (pgvector + HNSW enabled)' : 'resilient-in-memory-mode',
      redis: isRedisConnected ? 'connected (BullMQ active)' : 'resilient-in-memory-queue',
      crdtWebSocket: 'active (/crdt, /ws)',
    },
    metrics: {
      totalDocuments: docs.length,
      totalChunksIndexed: totalChunks,
      embeddingDimensions: 1536,
      hnswParameters: {
        m: 16,
        ef_construction: 64,
        distanceMetric: 'Cosine (<=>)',
      },
    },
  });
});

export default router;
