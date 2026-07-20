// ============================================================
// Vercel serverless entrypoint for the SescoHub backend.
//
// Vercel only turns files inside /api into serverless functions — the
// Express app in server/src/app.ts is unchanged, we just wrap it here
// instead of calling app.listen() (server/src/server.ts is still used
// for local `npm run dev` and is untouched).
//
// This file is a catch-all: any request to /api/* (e.g. /api/auth/login,
// /api/admin/users/123/role) is routed here by Vercel automatically
// because of the `[...path]` filename — no vercel.json rewrite needed
// for this part.
// ============================================================

import mongoose from 'mongoose';
import serverless from 'serverless-http';
import { app } from '../server/src/app';

// Serverless functions can be reused ("warm") across requests on the same
// instance. Reconnecting to MongoDB on every single request would be slow
// and would eventually exhaust your Atlas connection limit. We cache the
// connection promise at module scope so a warm instance reuses it, and
// only reconnect if a cold start (or a dropped connection) requires it.
let dbConnection: Promise<typeof mongoose> | null = null;

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return; // already connected
  if (!dbConnection) {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sescohub';
    dbConnection = mongoose.connect(mongoUri);
  }
  await dbConnection;
}

const expressHandler = serverless(app);

export default async function handler(req: any, res: any) {
  try {
    await ensureDbConnected();
  } catch (err) {
    // Reset so the next invocation tries again instead of reusing a dead promise.
    dbConnection = null;
    console.error('MongoDB connection failed in serverless function:', err);
    res.status(500).json({ success: false, error: 'Database connection failed' });
    return;
  }

  return expressHandler(req, res);
}
