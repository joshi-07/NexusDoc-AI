'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../components/Navbar/Navbar';
import { CollaborativeEditor, EditorHandle } from '../components/Editor/CollaborativeEditor';
import { AICopilotSidebar } from '../components/Sidebar/AICopilotSidebar';
import { DocumentModal } from '../components/Documents/DocumentModal';
import { RoomModal } from '../components/Rooms/RoomModal';
import { ShieldCheck, Cpu, Database, Network, Users } from 'lucide-react';
import { getApiUrl } from '../lib/config';

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
  const [roomCode, setRoomCode] = useState<string>('NX-ALPHA');
  const [recentRooms, setRecentRooms] = useState<string[]>(['NX-ALPHA']);
  const [isDocModalOpen, setIsDocModalOpen] = useState<boolean>(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState<boolean>(false);
  const [editorStats, setEditorStats] = useState<{ characters: number; words: number }>({
    characters: 0,
    words: 0,
  });

  const apiUrl = getApiUrl();

  // Initialize Room from URL Query Parameter or LocalStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');

      let savedRecent: string[] = [];
      try {
        const stored = localStorage.getItem('nexus_recent_rooms');
        if (stored) savedRecent = JSON.parse(stored);
      } catch (e) {}

      if (urlRoom) {
        const cleaned = urlRoom.toUpperCase();
        setRoomCode(cleaned);
        const updated = Array.from(new Set([cleaned, ...savedRecent])).slice(0, 5);
        setRecentRooms(updated);
        localStorage.setItem('nexus_recent_rooms', JSON.stringify(updated));
      } else {
        const lastRoom = localStorage.getItem('nexus_last_room') || 'NX-MAIN';
        setRoomCode(lastRoom);
        const updated = Array.from(new Set([lastRoom, ...savedRecent])).slice(0, 5);
        setRecentRooms(updated);
      }
    }
  }, []);

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

  const handleJoinRoom = (newCode: string, customTitle?: string) => {
    const cleanedCode = newCode.toUpperCase();
    setRoomCode(cleanedCode);

    if (customTitle) {
      setActiveDocTitle(customTitle);
    }

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('room', cleanedCode);
      window.history.pushState({}, '', url.toString());

      localStorage.setItem('nexus_last_room', cleanedCode);
      const updated = Array.from(new Set([cleanedCode, ...recentRooms])).slice(0, 5);
      setRecentRooms(updated);
      localStorage.setItem('nexus_recent_rooms', JSON.stringify(updated));
    }
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
        currentRoomCode={roomCode}
        stats={editorStats}
        onOpenDocModal={() => setIsDocModalOpen(true)}
        onOpenRoomModal={() => setIsRoomModalOpen(true)}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8 flex flex-col lg:flex-row gap-6">
        {/* Left Column: CRDT Collaborative Editor */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white">{activeDocTitle}</h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  {roomCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Private CRDT Room • Real-Time Commutative State • Sub-50ms Sync
              </p>
            </div>

            <button
              onClick={() => setIsRoomModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 text-xs font-medium text-indigo-400 flex items-center gap-1.5 transition"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Invite Friends to {roomCode}</span>
            </button>
          </div>

          <CollaborativeEditor
            key={`${activeDocId}-${roomCode}`}
            ref={editorRef}
            documentId={activeDocId}
            roomCode={roomCode}
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
                <div className="font-semibold text-slate-200">Room Isolation</div>
                <div className="text-slate-400">Scoped Yjs Channels</div>
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

      {/* Room Code Management & Invite Modal */}
      <RoomModal
        isOpen={isRoomModalOpen}
        onClose={() => setIsRoomModalOpen(false)}
        currentRoomCode={roomCode}
        onJoinRoom={handleJoinRoom}
        recentRooms={recentRooms}
      />

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
