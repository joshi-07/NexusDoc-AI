'use client';

import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  Bold,
  Italic,
  Code,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Terminal,
  Undo,
  Redo,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';

import { getWsUrl } from '../../lib/config';

const COLORS = [
  '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9',
  '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
  '#84cc16', '#eab308', '#f97316', '#ef4444'
];

export interface EditorHandle {
  insertContent: (content: string) => void;
}

interface CollaborativeEditorProps {
  documentId: string;
  roomCode?: string;
  initialTitle?: string;
  onStatsChange?: (stats: { characters: number; words: number }) => void;
}

export const CollaborativeEditor = forwardRef<EditorHandle, CollaborativeEditorProps>(
  ({ documentId, roomCode, initialTitle = 'Untitled Document', onStatsChange }, ref) => {
    const [ydoc, setYdoc] = useState<Y.Doc | null>(null);
    const [provider, setProvider] = useState<WebsocketProvider | null>(null);
    const [isConnected, setIsConnected] = useState<boolean>(false);
    const [collaborators, setCollaborators] = useState<Array<{ name: string; color: string }>>([]);
    const [currentUser, setCurrentUser] = useState<{ name: string; color: string }>({
      name: 'Architect',
      color: '#6366f1',
    });

    useEffect(() => {
      // Generate randomized collaborator identity
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      const randomId = Math.floor(100 + Math.random() * 900);
      const user = {
        name: `Engineer #${randomId}`,
        color: randomColor,
      };
      setCurrentUser(user);

      // Initialize Yjs Document & WebSocket Provider
      const doc = new Y.Doc();
      const wsUrl = getWsUrl();
      const roomChannel = roomCode ? `room-${roomCode}` : `crdt-${documentId}`;
      const wsProvider = new WebsocketProvider(wsUrl, roomChannel, doc);

      wsProvider.on('status', (event: { status: string }) => {
        setIsConnected(event.status === 'connected');
      });

      // Update cursor awareness presence
      wsProvider.awareness.setLocalStateField('user', user);

      const updateAwarenessUsers = () => {
        const states = wsProvider.awareness.getStates();
        const usersList: Array<{ name: string; color: string }> = [];
        states.forEach((state) => {
          if (state.user && state.user.name) {
            usersList.push(state.user);
          }
        });
        setCollaborators(usersList);
      };

      wsProvider.awareness.on('change', updateAwarenessUsers);

      setYdoc(doc);
      setProvider(wsProvider);

      return () => {
        wsProvider.destroy();
        doc.destroy();
      };
    }, [documentId, roomCode]);

    const editor = useEditor(
      {
        extensions: ydoc && provider
          ? [
              // Disable native history because Yjs handles collaborative undo/redo
              StarterKit.configure({
                history: false,
              }),
              Collaboration.configure({
                document: ydoc,
                field: 'default',
              }),
              CollaborationCursor.configure({
                provider: provider,
                user: currentUser,
              }),
            ]
          : [
              StarterKit,
            ],
        editorProps: {
          attributes: {
            class: 'focus:outline-none min-h-[500px] text-slate-200 text-base leading-relaxed',
          },
        },
        onUpdate: ({ editor }) => {
          if (onStatsChange) {
            const text = editor.getText();
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            onStatsChange({ characters: text.length, words });
          }
        },
      },
      [ydoc, provider]
    );

    useImperativeHandle(ref, () => ({
      insertContent: (content: string) => {
        if (editor) {
          editor.chain().focus().insertContent(`\n\n${content}\n\n`).run();
        }
      },
    }));

    if (!editor || !ydoc || !provider) {
      return (
        <div className="flex h-96 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-sm text-slate-400">Initializing CRDT Collaborative State...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-md">
        {/* Editor Toolbar & Collaboration Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 px-4 py-2.5 bg-slate-900/90 rounded-t-xl">
          {/* Formatting Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded transition ${editor.isActive('bold') ? 'bg-indigo-600/30 text-indigo-400 font-bold' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded transition ${editor.isActive('italic') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              className={`p-1.5 rounded transition ${editor.isActive('code') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Inline Code"
            >
              <Code className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-1.5 rounded transition ${editor.isActive('heading', { level: 1 }) ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-1.5 rounded transition ${editor.isActive('heading', { level: 2 }) ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded transition ${editor.isActive('bulletList') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded transition ${editor.isActive('orderedList') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-1.5 rounded transition ${editor.isActive('blockquote') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              className={`p-1.5 rounded transition ${editor.isActive('codeBlock') ? 'bg-indigo-600/30 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Code Block"
            >
              <Terminal className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-5 bg-slate-800 mx-1" />

            <button
              onClick={() => editor.chain().focus().undo().run()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>

          {/* Real-Time CRDT State & Peer Awareness */}
          <div className="flex items-center gap-3">
            {/* Sync Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border border-slate-800 bg-slate-950/70">
              {isConnected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Wifi className="w-3 h-3" /> Live CRDT Sync
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-amber-400 flex items-center gap-1">
                    <WifiOff className="w-3 h-3" /> Offline (Local-First)
                  </span>
                </>
              )}
            </div>

            {/* Collaborator Avatars */}
            <div className="flex items-center -space-x-1.5">
              {collaborators.map((user, idx) => (
                <div
                  key={idx}
                  title={`${user.name} (Online)`}
                  className="w-6 h-6 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </div>
              ))}
              {collaborators.length > 0 && (
                <span className="text-xs text-slate-400 pl-2 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {collaborators.length}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rich-Text Editing Canvas */}
        <div className="p-6 md:p-8 min-h-[500px]">
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  }
);

CollaborativeEditor.displayName = 'CollaborativeEditor';
