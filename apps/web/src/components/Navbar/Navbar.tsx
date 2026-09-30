'use client';

import React, { useState } from 'react';
import {
  FileText,
  Sparkles,
  Plus,
  Activity,
  Share2,
  Copy,
  Check,
  Users,
  Hash,
} from 'lucide-react';
import { getApiUrl } from '../../lib/config';

interface NavbarProps {
  currentTitle: string;
  currentRoomCode: string;
  stats: { characters: number; words: number };
  onOpenDocModal: () => void;
  onOpenRoomModal: () => void;
}

export function Navbar({
  currentTitle,
  currentRoomCode,
  stats,
  onOpenDocModal,
  onOpenRoomModal,
}: NavbarProps) {
  const [copied, setCopied] = useState(false);
  const apiUrl = getApiUrl();

  const handleCopyInviteLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const inviteUrl = `${window.location.origin}?room=${currentRoomCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/85 backdrop-blur-md px-4 lg:px-8 py-2.5 flex items-center justify-between">
      {/* Brand & Room Info */}
      <div className="flex items-center gap-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-white">NexusDoc AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                CRDT
              </span>
            </div>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-800 hidden sm:block" />

        {/* Room Code Indicator with 1-Click Copy */}
        <div
          onClick={onOpenRoomModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-950/50 cursor-pointer transition group"
          title="Click to manage or invite friends to this room"
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-400">Room:</span>
            <span className="font-mono text-xs font-bold text-indigo-300 tracking-wider">
              {currentRoomCode}
            </span>
          </div>

          <button
            onClick={handleCopyInviteLink}
            className="p-1 rounded hover:bg-indigo-900/50 text-indigo-400 hover:text-indigo-200 transition"
            title="Copy Invite Link"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Document Selector Button */}
        <button
          onClick={onOpenDocModal}
          className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 text-xs text-slate-300 transition"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span className="max-w-[180px] truncate">{currentTitle}</span>
        </button>
      </div>

      {/* Center Stats */}
      <div className="hidden xl:flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>{stats.words} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span>{stats.characters} chars</span>
        </div>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Join / Switch Room Button */}
        <button
          onClick={onOpenRoomModal}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Invite / Room Code</span>
        </button>

        <a
          href={`${apiUrl}/api/health`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition hidden sm:flex"
          title="System Health & HNSW Telemetry"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
        </a>
      </div>
    </header>
  );
}
