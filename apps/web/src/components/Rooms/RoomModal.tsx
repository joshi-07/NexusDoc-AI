'use client';

import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Plus,
  ArrowRight,
  X,
  Share2,
  Sparkles,
  Hash,
} from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomCode: string;
  onJoinRoom: (roomCode: string, docTitle?: string) => void;
  recentRooms: string[];
}

export function RoomModal({
  isOpen,
  onClose,
  currentRoomCode,
  onJoinRoom,
  recentRooms,
}: RoomModalProps) {
  const [activeTab, setActiveTab] = useState<'share' | 'join' | 'create'>('share');
  const [inputCode, setInputCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}?room=${currentRoomCode}`
    : `http://localhost:3000?room=${currentRoomCode}`;

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCodeOnly = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(currentRoomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let cleaned = inputCode.trim();
    if (!cleaned) {
      setErrorMsg('Please enter a valid Room Code or Invite Link.');
      return;
    }

    // If user pasted a full URL, extract ?room=
    if (cleaned.includes('room=')) {
      const match = cleaned.match(/room=([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        cleaned = match[1];
      }
    }

    cleaned = cleaned.toUpperCase();
    onJoinRoom(cleaned);
    setInputCode('');
    setErrorMsg('');
    onClose();
  };

  const handleCreateNewRoom = (e: React.FormEvent) => {
    e.preventDefault();
    // Generate a clean 6-character room code like NX-7B29
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const newCode = `NX-${randomHex}`;
    const title = newTitle.trim() || `Collaborative Session (${newCode})`;
    onJoinRoom(newCode, title);
    setNewTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm sm:text-base">
                Collaboration Rooms & Invite
              </h3>
              <p className="text-xs text-slate-400">Invite friends or switch to another private coding room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-3 border-b border-slate-800 bg-slate-950/60 p-1.5 gap-1.5">
          <button
            onClick={() => { setActiveTab('share'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'share'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" /> Invite / Current
          </button>
          <button
            onClick={() => { setActiveTab('join'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'join'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Hash className="w-3.5 h-3.5" /> Join Code
          </button>
          <button
            onClick={() => { setActiveTab('create'); setErrorMsg(''); }}
            className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" /> New Room
          </button>
        </div>

        {/* Tab 1: Share Current Room */}
        {activeTab === 'share' && (
          <div className="p-6 space-y-5">
            <div className="text-center space-y-2">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Current Room Code
              </span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-indigo-400 bg-slate-950 px-4 py-2 rounded-xl border border-indigo-500/30 shadow-inner">
                  {currentRoomCode}
                </span>
                <button
                  onClick={handleCopyCodeOnly}
                  className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
                  title="Copy Room Code"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Direct Share Link Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Shareable Direct Invite Link
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy Link
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs text-indigo-300/90 leading-relaxed flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <span>
                Send this link or code to your friend. When they open it, their browser connects to this exact CRDT room with live cursor tracking and document sync!
              </span>
            </div>
          </div>
        )}

        {/* Tab 2: Join with Code */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinSubmit} className="p-6 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Enter Room Code or Invite Link
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. NX-4821 or paste invite link"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-xs sm:text-sm text-slate-200 uppercase font-mono placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition"
            >
              Enter Room <ArrowRight className="w-4 h-4" />
            </button>

            {/* Recent Rooms */}
            {recentRooms.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                  Recently Visited Rooms:
                </span>
                <div className="flex flex-wrap gap-2">
                  {recentRooms.map((room) => (
                    <button
                      key={room}
                      type="button"
                      onClick={() => {
                        onJoinRoom(room);
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 hover:border-indigo-500 hover:text-indigo-400 transition"
                    >
                      {room}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        )}

        {/* Tab 3: Create New Room */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateNewRoom} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Session Topic / Document Title (Optional)
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. System Design Interview / Algorithm Notes"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 leading-relaxed">
              Creating a new room generates an isolated CRDT document session with its own unique room code. Only people you share the code with will have access to this document.
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" /> Generate & Launch Room
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
