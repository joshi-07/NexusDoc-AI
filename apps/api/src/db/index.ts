import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://nexus_user:nexus_password@localhost:5432/nexusdoc_db';

export let isPostgresConnected = false;
let client: postgres.Sql | null = null;
export let db: ReturnType<typeof drizzle> | null = null;

// In-Memory store fallback for local development when PostgreSQL is not running
interface InMemoryDoc {
  id: string;
  title: string;
  content: string;
  crdtState?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InMemoryChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  textContent: string;
  embedding: number[];
  createdAt: Date;
}

export const inMemoryStore = {
  documents: new Map<string, InMemoryDoc>(),
  chunks: new Map<string, InMemoryChunk>(),
};

/**
 * Initializes database connection and verifies pgvector support.
 */
export async function initDatabase(): Promise<boolean> {
  try {
    client = postgres(connectionString, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 3,
      onnotice: () => {}, // Suppress notices
    });

    // Test connection
    await client`SELECT 1`;
    db = drizzle(client, { schema });
    isPostgresConnected = true;
    console.log('✅ PostgreSQL connected successfully with Drizzle ORM');

    // Attempt to verify/create vector extension and tables
    try {
      await client`CREATE EXTENSION IF NOT EXISTS vector;`;
      await client`
        CREATE TABLE IF NOT EXISTS documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          content TEXT NOT NULL DEFAULT '',
          crdt_state TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `;
      await client`
        CREATE TABLE IF NOT EXISTS document_chunks (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          chunk_index INTEGER NOT NULL,
          text_content TEXT NOT NULL,
          embedding vector(1536),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
        );
      `;
      await client`
        CREATE INDEX IF NOT EXISTS document_chunks_hnsw_idx 
        ON document_chunks 
        USING hnsw (embedding vector_cosine_ops) 
        WITH (m = 16, ef_construction = 64);
      `;
      console.log('✅ pgvector extension and HNSW index confirmed');
    } catch (tblErr: any) {
      console.warn('⚠️ Notice during table/HNSW initialization:', tblErr.message);
    }

    return true;
  } catch (err: any) {
    console.warn('ℹ️ PostgreSQL not available (Docker might be starting or stopped). Using in-memory resilient storage adapter.');
    isPostgresConnected = false;
    db = null;
    return false;
  }
}

/**
 * Abstracted Document Operations that work seamlessly in both PostgreSQL and in-memory fallback.
 */
export const docRepository = {
  async createDocument(title: string, content: string = ''): Promise<{ id: string; title: string; content: string; createdAt: Date }> {
    const now = new Date();
    const id = randomUUID();

    if (isPostgresConnected && client) {
      try {
        const rows = await client`
          INSERT INTO documents (id, title, content, created_at, updated_at)
          VALUES (${id}, ${title}, ${content}, ${now}, ${now})
          RETURNING id, title, content, created_at as "createdAt"
        `;
        return rows[0] as any;
      } catch (err) {
        console.error('Postgres insert failed, falling back to memory store:', err);
      }
    }

    // In-memory fallback
    const doc: InMemoryDoc = { id, title, content, crdtState: null, createdAt: now, updatedAt: now };
    inMemoryStore.documents.set(id, doc);
    return { id: doc.id, title: doc.title, content: doc.content, createdAt: doc.createdAt };
  },

  async getDocument(id: string): Promise<InMemoryDoc | null> {
    if (isPostgresConnected && client) {
      try {
        const rows = await client`
          SELECT id, title, content, crdt_state as "crdtState", created_at as "createdAt", updated_at as "updatedAt"
          FROM documents WHERE id = ${id}
        `;
        if (rows.length > 0) return rows[0] as any;
      } catch (err) {
        console.error('Postgres getDocument failed:', err);
      }
    }
    return inMemoryStore.documents.get(id) || null;
  },

  async getAllDocuments(): Promise<Array<{ id: string; title: string; content: string; chunkCount: number; createdAt: Date; updatedAt: Date }>> {
    if (isPostgresConnected && client) {
      try {
        const rows = await client`
          SELECT 
            d.id, 
            d.title, 
            d.content, 
            d.created_at as "createdAt", 
            d.updated_at as "updatedAt",
            COUNT(c.id)::int as "chunkCount"
          FROM documents d
          LEFT JOIN document_chunks c ON d.id = c.document_id
          GROUP BY d.id
          ORDER BY d.created_at DESC
        `;
        return rows as any;
      } catch (err) {
        console.error('Postgres getAllDocuments failed:', err);
      }
    }

    // In-memory fallback
    const result: any[] = [];
    for (const doc of inMemoryStore.documents.values()) {
      let count = 0;
      for (const ch of inMemoryStore.chunks.values()) {
        if (ch.documentId === doc.id) count++;
      }
      result.push({
        id: doc.id,
        title: doc.title,
        content: doc.content,
        chunkCount: count,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      });
    }
    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  async saveCrdtState(id: string, base64State: string): Promise<void> {
    const now = new Date();
    if (isPostgresConnected && client) {
      try {
        await client`
          UPDATE documents 
          SET crdt_state = ${base64State}, updated_at = ${now}
          WHERE id = ${id}
        `;
        return;
      } catch (err) {
        console.error('Postgres saveCrdtState failed:', err);
      }
    }

    const doc = inMemoryStore.documents.get(id);
    if (doc) {
      doc.crdtState = base64State;
      doc.updatedAt = now;
    }
  },

  async saveChunks(chunks: Array<{ documentId: string; chunkIndex: number; textContent: string; embedding: number[] }>): Promise<void> {
    const now = new Date();
    if (isPostgresConnected && client && chunks.length > 0) {
      try {
        for (const ch of chunks) {
          const id = randomUUID();
          const vectorStr = `[${ch.embedding.join(',')}]`;
          await client`
            INSERT INTO document_chunks (id, document_id, chunk_index, text_content, embedding, created_at)
            VALUES (${id}, ${ch.documentId}, ${ch.chunkIndex}, ${ch.textContent}, ${vectorStr}::vector, ${now})
          `;
        }
        return;
      } catch (err) {
        console.error('Postgres saveChunks failed:', err);
      }
    }

    // In-memory fallback
    for (const ch of chunks) {
      const id = randomUUID();
      inMemoryStore.chunks.set(id, {
        id,
        documentId: ch.documentId,
        chunkIndex: ch.chunkIndex,
        textContent: ch.textContent,
        embedding: ch.embedding,
        createdAt: now,
      });
    }
  },

  async searchSimilarChunks(queryVector: number[], topK: number = 5, documentId?: string): Promise<Array<{ id: string; documentId: string; chunkIndex: number; textContent: string; similarity: number }>> {
    if (isPostgresConnected && client) {
      try {
        const vectorStr = `[${queryVector.join(',')}]`;
        // Execute Cosine Distance with HNSW index (<=> operator)
        // 1 - (embedding <=> queryVector) yields Cosine Similarity in [0, 1]
        let rows;
        if (documentId) {
          rows = await client`
            SET LOCAL hnsw.ef_search = 40;
            SELECT 
              id, 
              document_id as "documentId", 
              chunk_index as "chunkIndex", 
              text_content as "textContent",
              1 - (embedding <=> ${vectorStr}::vector) as similarity
            FROM document_chunks
            WHERE document_id = ${documentId}
            ORDER BY embedding <=> ${vectorStr}::vector ASC
            LIMIT ${topK};
          `;
        } else {
          rows = await client`
            SET LOCAL hnsw.ef_search = 40;
            SELECT 
              id, 
              document_id as "documentId", 
              chunk_index as "chunkIndex", 
              text_content as "textContent",
              1 - (embedding <=> ${vectorStr}::vector) as similarity
            FROM document_chunks
            ORDER BY embedding <=> ${vectorStr}::vector ASC
            LIMIT ${topK};
          `;
        }
        return rows as any;
      } catch (err) {
        console.error('Postgres vector similarity query failed, falling back to in-memory cosine search:', err);
      }
    }

    // In-memory cosine search implementation
    const cosineSim = (a: number[], b: number[]): number => {
      let dot = 0;
      let magA = 0;
      let magB = 0;
      for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
      }
      if (magA === 0 || magB === 0) return 0;
      return dot / (Math.sqrt(magA) * Math.sqrt(magB));
    };

    const scoredChunks: Array<{ id: string; documentId: string; chunkIndex: number; textContent: string; similarity: number }> = [];

    for (const chunk of inMemoryStore.chunks.values()) {
      if (documentId && chunk.documentId !== documentId) continue;
      const sim = cosineSim(queryVector, chunk.embedding);
      scoredChunks.push({
        id: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        textContent: chunk.textContent,
        similarity: parseFloat(sim.toFixed(4)),
      });
    }

    scoredChunks.sort((a, b) => b.similarity - a.similarity);
    return scoredChunks.slice(0, topK);
  },
};
