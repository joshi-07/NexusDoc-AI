import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { docRepository } from '../db';
import { chunkDocument, generateEmbedding } from '../services/aiService';

dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const QUEUE_NAME = 'document-embedding-queue';

export interface DocumentJobData {
  documentId: string;
  title: string;
  content: string;
}

export let isRedisConnected = false;
let redisConnection: IORedis | null = null;
let embeddingQueue: Queue<DocumentJobData> | null = null;
let embeddingWorker: Worker<DocumentJobData> | null = null;

// In-memory fallback queue for local development if Redis is offline
const inMemoryJobQueue: DocumentJobData[] = [];
let isProcessingInMemory = false;

/**
 * Initializes Redis connection and BullMQ queue and worker.
 */
export function initBullMQ(): void {
  try {
    redisConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      connectTimeout: 2000,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop reconnecting after 3 failed tries
        }
        return Math.min(times * 500, 2000);
      },
    });

    redisConnection.on('connect', () => {
      console.log('✅ Connected to Redis for BullMQ');
      isRedisConnected = true;
    });

    redisConnection.on('error', (err) => {
      if (!isRedisConnected) {
        // Suppress repeated connection logs when Redis is offline
      } else {
        console.warn('⚠️ Redis error:', err.message);
      }
      isRedisConnected = false;
    });

    // Create BullMQ Queue with exponential backoff retry configuration
    embeddingQueue = new Queue<DocumentJobData>(QUEUE_NAME, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000, // 1s, 2s, 4s backoff
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    embeddingQueue.on('error', () => {
      // Suppress unhandled queue connection errors when Redis is not available locally
    });

    // Create BullMQ Worker
    embeddingWorker = new Worker<DocumentJobData>(
      QUEUE_NAME,
      async (job: Job<DocumentJobData>) => {
        console.log(`🚀 [BullMQ] Processing embedding job for document "${job.data.title}" (ID: ${job.data.documentId})`);
        await processDocumentEmbedding(job.data.documentId, job.data.content);
        console.log(`✅ [BullMQ] Completed embedding job for document: ${job.data.documentId}`);
      },
      {
        connection: redisConnection,
        concurrency: 5,
      }
    );

    embeddingWorker.on('error', () => {
      // Suppress unhandled worker connection errors when Redis is not available locally
    });

    embeddingWorker.on('failed', (job, err) => {
      console.error(`❌ [BullMQ] Job ${job?.id} failed with error:`, err.message);
    });
  } catch (err: any) {
    console.warn('ℹ️ Redis connection not established. Operating in resilient in-memory job processing mode.');
    isRedisConnected = false;
  }
}

/**
 * Core chunking and embedding processor logic.
 */
export async function processDocumentEmbedding(documentId: string, content: string): Promise<number> {
  const textChunks = chunkDocument(content);
  if (textChunks.length === 0) return 0;

  console.log(`📦 Segmented document into ${textChunks.length} semantic chunks. Generating high-dimensional embeddings...`);

  const chunksToSave: Array<{
    documentId: string;
    chunkIndex: number;
    textContent: string;
    embedding: number[];
  }> = [];

  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    const embedding = await generateEmbedding(chunkText);
    chunksToSave.push({
      documentId,
      chunkIndex: i,
      textContent: chunkText,
      embedding,
    });
  }

  await docRepository.saveChunks(chunksToSave);
  console.log(`💾 Persisted ${chunksToSave.length} vector-indexed chunks to database.`);
  return chunksToSave.length;
}

/**
 * Enqueue a document for asynchronous background chunking and vector indexing.
 */
export async function enqueueDocumentEmbedding(data: DocumentJobData): Promise<void> {
  if (isRedisConnected && embeddingQueue) {
    try {
      await embeddingQueue.add('embed-document', data);
      return;
    } catch (err) {
      console.warn('Failed to add job to BullMQ queue, falling back to local worker:', err);
    }
  }

  // Resilient in-memory asynchronous worker fallback
  inMemoryJobQueue.push(data);
  processInMemoryQueue();
}

async function processInMemoryQueue() {
  if (isProcessingInMemory) return;
  isProcessingInMemory = true;

  while (inMemoryJobQueue.length > 0) {
    const job = inMemoryJobQueue.shift();
    if (job) {
      try {
        console.log(`🚀 [AsyncWorker] Processing embedding task for "${job.title}" (${job.documentId})`);
        await processDocumentEmbedding(job.documentId, job.content);
        console.log(`✅ [AsyncWorker] Finished embedding task for ${job.documentId}`);
      } catch (err: any) {
        console.error(`❌ [AsyncWorker] Error processing job:`, err.message);
      }
    }
  }

  isProcessingInMemory = false;
}
