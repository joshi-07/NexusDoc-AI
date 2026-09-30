'use client';

import React from 'react';
import {
  FileText,
  Sparkles,
  ChevronDown,
  Plus,
  Activity,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { getApiUrl } from '../../lib/config';

interface NavbarProps {
  currentTitle: string;
  stats: { characters: number; words: number };
  onOpenDocModal: () => void;
}

export function Navbar({ currentTitle, stats, onOpenDocModal }: NavbarProps) {
  const apiUrl = getApiUrl();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 lg:px-8 py-3 flex items-center justify-between">
      {/* Brand & Active Document */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-white">NexusDoc AI</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                CRDT + RAG
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Agentic Collaborative Knowledge Platform</p>
          </div>
        </div>

        <div className="w-[1px] h-6 bg-slate-800 hidden md:block" />

        {/* Document Selector Button */}
        <button
          onClick={onOpenDocModal}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:border-slate-700 text-xs text-slate-200 transition"
        >
          <FileText className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-medium max-w-[180px] sm:max-w-[260px] truncate">{currentTitle}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Center Stats */}
      <div className="hidden lg:flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          <span>{stats.words} words</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          <span>{stats.characters} characters</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenDocModal}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5 shadow transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Document</span>
        </button>

        <a
          href={`${apiUrl}/api/health`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 transition"
          title="System Health & HNSW Telemetry"
        >
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden xl:inline text-[11px]">System Status</span>
        </a>
      </div>
    </header>
  );
}
