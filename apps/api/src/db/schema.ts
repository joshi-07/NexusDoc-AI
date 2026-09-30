import { pgTable, text, timestamp, uuid, integer, customType } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * Custom Drizzle type for PostgreSQL pgvector: vector(1536)
 */
export const vector1536 = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    if (typeof value !== 'string') return [];
    return value
      .replace(/[\[\]]/g, '')
      .split(',')
      .map((v) => parseFloat(v.trim()))
      .filter((v) => !isNaN(v));
  },
});

/**
 * Documents Table
 * Stores document metadata, raw markdown/rich-text content, and debounced Yjs CRDT binary snapshot.
 */
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  crdtState: text('crdt_state'), // Base64 encoded binary Yjs document state
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Document Chunks Table
 * Stores segmented semantic text blocks and 1536-dimensional vector embeddings for HNSW indexing.
 */
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  textContent: text('text_content').notNull(),
  embedding: vector1536('embedding'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, {
    fields: [documentChunks.documentId],
    references: [documents.id],
  }),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
