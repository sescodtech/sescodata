import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { BASE_URL } from './lib/api';

// Perf: kick off DNS lookup + TLS handshake to the API origin immediately,
// in parallel with the rest of the app bootstrapping, instead of waiting
// until the first fetch() call triggers it. Wrapped in try/catch since
// BASE_URL could theoretically be malformed via a misconfigured env var —
// this is a pure optimization and should never block the app from loading.
try {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = new URL(BASE_URL).origin;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
} catch {
  // Malformed BASE_URL — skip the hint, app still works normally.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
);
