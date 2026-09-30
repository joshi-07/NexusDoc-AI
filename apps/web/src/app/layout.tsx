import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NexusDoc AI — Agentic RAG & Collaborative CRDT Canvas',
  description: 'Enterprise-grade local-first real-time collaborative workspace with HNSW vector search and autonomous AI Copilot.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
