'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  Send,
  ArrowDownToLine,
  Database,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  BookOpen,
} from 'lucide-react';
import { getApiUrl } from '../../lib/config';

interface AICopilotSidebarProps {
  documentId: string;
  onInsertToEditor: (content: string) => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestedInsert?: string;
  citations?: string[];
  latencyMs?: number;
}

interface SearchResult {
  id: string;
  documentId: string;
  chunkIndex: number;
  textContent: string;
  similarity: number;
}

export function AICopilotSidebar({ documentId, onInsertToEditor }: AICopilotSidebarProps) {
  const [activeTab, setActiveTab] = useState<'copilot' | 'inspector'>('copilot');

  // Copilot Chat State
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your embedded **NexusDoc AI Copilot**. I continuously index your workspace using PostgreSQL pgvector and HNSW graphs. Ask me any question or ask me to draft/summarize insights from your documents.',
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Vector Search Inspector State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLatency, setSearchLatency] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const apiUrl = getApiUrl();

  // Handle RAG Chat
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const userText = prompt.trim();
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', content: userText }]);
    setIsGenerating(true);

    const startTime = Date.now();

    try {
      const response = await fetch(`${apiUrl}/api/agent/rag-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userText,
          documentId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const elapsed = Date.now() - startTime;

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: data.answer,
          suggestedInsert: data.suggestedInsert,
          citations: data.citations,
          latencyMs: elapsed,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Failed to query RAG pipeline: ${err.message}. Please ensure the backend is running.`,
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Vector Search Inspector
  const handleVectorSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || isSearching) return;

    setIsSearching(true);
    try {
      const response = await fetch(`${apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery,
          documentId,
          topK: 5,
        }),
      });

      if (!response.ok) throw new Error('Search failed');

      const data = await response.json();
      setSearchResults(data.results || []);
      setSearchLatency(data.latencyMs);
    } catch (err: any) {
      console.error('Vector search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <aside className="w-full lg:w-96 flex flex-col border border-slate-800 bg-slate-900/70 rounded-xl backdrop-blur-md shadow-2xl h-[780px] overflow-hidden">
      {/* Sidebar Header & Tab Navigation */}
      <div className="border-b border-slate-800 bg-slate-900/90 p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                AI Copilot & Vector Engine
              </h2>
              <p className="text-[11px] text-slate-400">pgvector HNSW Sub-2ms Retrieval</p>
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/80 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setActiveTab('copilot')}
            className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              activeTab === 'copilot'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Agentic Copilot
          </button>
          <button
            onClick={() => setActiveTab('inspector')}
            className={`py-1.5 px-3 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 transition ${
              activeTab === 'inspector'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" /> Vector Inspector
          </button>
        </div>
      </div>

      {/* Tab Content: Agentic Copilot */}
      {activeTab === 'copilot' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex flex-col gap-1.5 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  {msg.role === 'user' ? 'You' : 'NexusDoc Copilot'}
                </div>

                <div
                  className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[92%] ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800/80 text-slate-200 border border-slate-700/60 rounded-bl-none shadow-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Grounded Citations */}
                  {msg.citations && msg.citations.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-col gap-1">
                      <span className="text-[10px] font-semibold text-indigo-300 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> Grounded Context Sources:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {msg.citations.map((cite, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded bg-slate-900/90 text-slate-300 border border-slate-700 text-[10px]"
                          >
                            {cite}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Insert to Document Action Button */}
                  {msg.suggestedInsert && (
                    <button
                      onClick={() => onInsertToEditor(msg.suggestedInsert!)}
                      className="mt-3 w-full py-1.5 px-2.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-medium flex items-center justify-center gap-1.5 transition"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Insert into Document Canvas
                    </button>
                  )}
                </div>

                {msg.latencyMs && (
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Retrieved in {msg.latencyMs}ms
                  </span>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 p-2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
                <span>Navigating HNSW proximity graph & synthesizing answer...</span>
              </div>
            )}
          </div>

          {/* Prompt Input Form */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask Copilot about your document..."
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Tab Content: Vector Search Inspector */}
      {activeTab === 'inspector' && (
        <div className="flex flex-col flex-1 overflow-hidden p-3 gap-3">
          {/* Indexing Algorithm Telemetry */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1 font-semibold text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400" /> Vector Index
              </span>
              <span className="text-indigo-400 font-mono">pgvector HNSW</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[10px]">
              <div>m = 16</div>
              <div>ef_construction = 64</div>
              <div>Metric: Cosine (&lt;=&gt;)</div>
              <div>Dimensions: 1536</div>
            </div>
          </div>

          {/* Search Query Input */}
          <form onSubmit={handleVectorSearch} className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Test semantic similarity..."
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition"
              title="Search Vectors"
            >
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Search Results Display */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {searchLatency !== null && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                <span>Top {searchResults.length} Nearest Chunks</span>
                <span className="text-emerald-400 font-mono flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {searchLatency}ms
                </span>
              </div>
            )}

            {searchResults.map((res, i) => (
              <div
                key={res.id || i}
                className="p-3 rounded-lg border border-slate-800 bg-slate-950/60 hover:border-slate-700 transition space-y-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">Chunk #{res.chunkIndex + 1}</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
                    {(res.similarity * 100).toFixed(1)}% Match
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-3 leading-relaxed">
                  {res.textContent}
                </p>
                <button
                  onClick={() => onInsertToEditor(`> ${res.textContent}`)}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 pt-1"
                >
                  <ArrowDownToLine className="w-3 h-3" /> Insert excerpt
                </button>
              </div>
            ))}

            {searchResults.length === 0 && !isSearching && (
              <div className="text-center py-12 text-slate-500 text-xs">
                Enter a query above to inspect HNSW nearest-neighbor vector embeddings in real time.
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
