// Reads the session cookie and resolves it to a live session.
import { findSession } from '../auth/sessions.js';
import { sendJson } from './http.js';

export function readSessionId(req) {
  const cookie = req.headers.cookie ?? '';
  return /(?:^|;\s*)sid=([a-f0-9]+)/.exec(cookie)?.[1];
}

export function requireSession(req, res) {
  const sessionId = readSessionId(req);
  const session = sessionId ? findSession(sessionId) : undefined;
  if (!session) sendJson(res, 401, { message: 'Log in first' });
  return session;
}
