-- NexusDoc AI: pgvector HNSW High-Dimensional Vector Search Migration
-- Enables pgvector extension and builds the HNSW index for sub-2ms approximate nearest neighbor retrieval

CREATE EXTENSION IF NOT EXISTS vector;

-- Instantiate HNSW Index with cosine distance operator class
-- Tuning parameters: m=16 (bidirectional graph connections), ef_construction=64 (exploration list size)
CREATE INDEX IF NOT EXISTS document_chunks_hnsw_idx 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);
