import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import * as Y from 'yjs';
import { docRepository } from '../db';
// @ts-ignore
import { setupWSConnection, setPersistence, getYDoc } from 'y-websocket/bin/utils';

// Debounce timer map for each document ID
const debouncedSaveTimers = new Map<string, NodeJS.Timeout>();
const DEBOUNCE_PERSIST_MS = 5000;

/**
 * Configure PostgreSQL / Local DB debounced persistence provider for Yjs
 */
export function setupCrdtPersistence(): void {
  setPersistence({
    provider: 'postgresql-crdt-adapter',
    bindState: async (docName: string, ydoc: Y.Doc) => {
      console.log(`📡 [CRDT] Binding state for room: ${docName}`);

      try {
        // Retrieve persisted document state from PostgreSQL
        const doc = await docRepository.getDocument(docName);
        if (doc && doc.crdtState) {
          const binaryUpdate = Buffer.from(doc.crdtState, 'base64');
          Y.applyUpdate(ydoc, new Uint8Array(binaryUpdate));
          console.log(`📦 [CRDT] Restored persisted state (${binaryUpdate.length} bytes) for document: ${docName}`);
        } else if (doc && doc.content) {
          // If no binary CRDT state exists yet but initial text content exists, populate Y.Text
          const ytext = ydoc.getText('default');
          if (ytext.length === 0) {
            ytext.insert(0, doc.content);
          }
        }
      } catch (err: any) {
        console.warn(`⚠️ [CRDT] Error loading persisted state for ${docName}:`, err.message);
      }

      // Debounced listener: persist Yjs state every 5 seconds on document mutations
      ydoc.on('update', () => {
        if (debouncedSaveTimers.has(docName)) {
          clearTimeout(debouncedSaveTimers.get(docName)!);
        }

        const timer = setTimeout(async () => {
          debouncedSaveTimers.delete(docName);
          try {
            const stateUpdate = Y.encodeStateAsUpdate(ydoc);
            const base64State = Buffer.from(stateUpdate).toString('base64');
            await docRepository.saveCrdtState(docName, base64State);
            console.log(`💾 [CRDT] Debounced 5s state flushed to DB for doc: ${docName} (${stateUpdate.byteLength} bytes)`);
          } catch (saveErr: any) {
            console.error(`❌ [CRDT] Failed to persist state for ${docName}:`, saveErr.message);
          }
        }, DEBOUNCE_PERSIST_MS);

        debouncedSaveTimers.set(docName, timer);
      });
    },
    writeState: async (docName: string, ydoc: Y.Doc) => {
      // Immediate flush on shutdown or unload
      try {
        const stateUpdate = Y.encodeStateAsUpdate(ydoc);
        const base64State = Buffer.from(stateUpdate).toString('base64');
        await docRepository.saveCrdtState(docName, base64State);
        console.log(`💾 [CRDT] writeState immediate flush for doc: ${docName}`);
      } catch (err: any) {
        console.error(`❌ [CRDT] writeState failed for ${docName}:`, err.message);
      }
    },
  });
}

/**
 * Initializes WebSocket Server attached to the main Express HTTP server.
 */
export function initCrdtWebSocketServer(server: http.Server): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  setupCrdtPersistence();

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    // Only handle WebSocket connections destined for CRDT paths (e.g. /ws or /crdt)
    if (url.pathname.startsWith('/crdt') || url.pathname.startsWith('/ws')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    // Extract document ID from path /crdt/:docId or query parameter ?room=:docId
    let docName = url.searchParams.get('room');
    if (!docName) {
      const parts = url.pathname.split('/').filter(Boolean);
      docName = parts[parts.length - 1] || 'default-room';
    }

    console.log(`⚡ [CRDT] Client connected to collaborative room: "${docName}"`);

    // Delegate to y-websocket connection handler with awareness & sync protocol
    setupWSConnection(ws, req, {
      docName,
      gc: true,
    });
  });

  return wss;
}
