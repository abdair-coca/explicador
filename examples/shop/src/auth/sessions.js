// In-memory session store. Sessions expire after one hour and are lost on restart.
import { randomBytes } from 'node:crypto';

const TTL_MS = 60 * 60 * 1000;
const sessions = new Map();

export function createSession(userId) {
  const id = randomBytes(24).toString('hex');
  sessions.set(id, { userId, expiresAt: Date.now() + TTL_MS });
  return id;
}

export function findSession(id) {
  const session = sessions.get(id);
  if (!session) return undefined;
  if (session.expiresAt < Date.now()) {
    sessions.delete(id);
    return undefined;
  }
  return session;
}

export function deleteSession(id) {
  sessions.delete(id);
}
