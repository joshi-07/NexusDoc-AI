'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar/Navbar';
import { CollaborativeEditor, EditorHandle } from '../components/Editor/CollaborativeEditor';
import { AICopilotSidebar } from '../components/Sidebar/AICopilotSidebar';
import { DocumentModal } from '../components/Documents/DocumentModal';
import { ShieldCheck, Cpu, Database, Network } from 'lucide-react';

interface DocumentSummary {
  id: string;
  title: string;
  chunkCount: number;
  createdAt: string;
}

export default function WorkspacePage() {
  const editorRef = useRef<EditorHandle>(null);

  const [documents, setDocuments] = useState<DocumentSummary[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('default-workspace-doc');
  const [activeDocTitle, setActiveDocTitle] = useState<string>(
    'System Architecture: Distributed CRDTs & HNSW Vector Search'
  );
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [editorStats, setEditorStats] = useState<{ characters: number; words: number }>({
    characters: 0,
    words: 0,
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  // Fetch all indexed documents from backend
  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/documents`);
      if (res.ok) {
        const data = await res.json();
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents);
          // Set first document if still default
          if (activeDocId === 'default-workspace-doc') {
            setActiveDocId(data.documents[0].id);
            setActiveDocTitle(data.documents[0].title);
          }
        }
      }
    } catch (err) {
      console.warn('Backend not yet reachable for document list:', err);
    }
  };

  useEffect(() => {
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectDocument = (id: string, title: string) => {
    setActiveDocId(id);
    setActiveDocTitle(title);
  };

  const handleInsertToEditor = (content: string) => {
    if (editorRef.current) {
      editorRef.current.insertContent(content);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <Navbar
        currentTitle={activeDocTitle}
        stats={editorStats}
        onOpenDocModal={() => setIsDocModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: CRDT Collaborative Editor */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">{activeDocTitle}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Local-First Multi-User Canvas • Yjs Commutative Sync • 5s Debounced Postgres Persistence
              </p>
            </div>
          </div>

          <CollaborativeEditor
            key={activeDocId}
            ref={editorRef}
            documentId={activeDocId}
            initialTitle={activeDocTitle}
            onStatsChange={setEditorStats}
          />

          {/* Architectural Badge Footer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center gap-2.5">
              <Network className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-semibold text-slate-200">CRDT Sync</div>
                <div className="text-slate-400">&lt;50ms WebSockets</div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center gap-2.5">
              <Database className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-semibold text-slate-200">pgvector HNSW</div>
                <div className="text-slate-400">m=16, ef=64 (Cosine)</div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-semibold text-slate-200">BullMQ Queues</div>
                <div className="text-slate-400">Async Token Chunking</div>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-slate-800/80 bg-slate-900/40 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <div className="text-[11px]">
                <div className="font-semibold text-slate-200">Local-First</div>
                <div className="text-slate-400">Offline Resilience</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Copilot & Vector Search Inspector */}
        <AICopilotSidebar
          documentId={activeDocId}
          onInsertToEditor={handleInsertToEditor}
        />
      </main>

      {/* Document Switcher & Ingest Modal */}
      <DocumentModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        documents={documents}
        currentDocId={activeDocId}
        onSelectDocument={handleSelectDocument}
        onDocumentCreated={fetchDocuments}
      />
    </div>
  );
}
