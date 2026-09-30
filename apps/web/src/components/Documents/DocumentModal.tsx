'use client';

import React, { useState } from 'react';
import { Plus, FileText, Check, Upload, X, RefreshCw } from 'lucide-react';

interface DocumentInfo {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

interface DocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentInfo[];
  currentDocId: string;
  onSelectDocument: (id: string, title: string) => void;
  onDocumentCreated: () => void;
}

export function DocumentModal({
  isOpen,
  onClose,
  documents,
  currentDocId,
  onSelectDocument,
  onDocumentCreated,
}: DocumentModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      setErrorMessage('Please provide both a title and document content.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          content: newContent.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to upload document (Status: ${response.status})`);
      }

      const data = await response.json();
      onDocumentCreated();
      onSelectDocument(data.document.id, data.document.title);
      setNewTitle('');
      setNewContent('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading document');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-900/80">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100">Document Management & Workspace</h3>
              <p className="text-xs text-slate-400">Select active document or ingest new notes into pgvector</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('list')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'list'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Existing Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 text-xs font-semibold border-b-2 transition flex items-center gap-1 ${
              activeTab === 'create'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> Upload & Index New
          </button>
        </div>

        {/* Tab 1: Documents List */}
        {activeTab === 'list' && (
          <div className="p-5 max-h-[420px] overflow-y-auto space-y-2.5">
            {documents.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No documents indexed yet. Upload a document to start!
              </div>
            ) : (
              documents.map((doc) => {
                const isSelected = doc.id === currentDocId;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onSelectDocument(doc.id, doc.title);
                      onClose();
                    }}
                    className={`p-3.5 rounded-lg border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-indigo-500/80 bg-indigo-950/30'
                        : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-md ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-200 line-clamp-1">{doc.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                            {doc.chunkCount} vector chunks
                          </span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="p-1 rounded-full bg-indigo-500/20 text-indigo-400">
                        <Check className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Upload New Document */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateDocument} className="p-5 space-y-4">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Document Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Distributed Database Architecture & Consistency Models"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Document Content (Markdown / Text)
              </label>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Paste or write notes, technical specifications, or research content to be chunked into 500-token blocks and indexed with HNSW..."
                rows={7}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            <div className="p-3 rounded-lg bg-indigo-950/20 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
              <Upload className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
              <span>
                Submitting this document triggers an asynchronous BullMQ queue task. It will automatically segment text into 500-token semantic chunks, generate 1536-dimensional vector embeddings, and construct the HNSW proximity graph.
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Ingesting & Indexing...
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" /> Ingest Document
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
