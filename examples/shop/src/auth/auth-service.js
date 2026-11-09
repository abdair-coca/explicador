// Login use case: find the user, check the password, open a session.
import { findUserByEmail } from '../db/users.js';
import { verifyPassword } from './password.js';
import { createSession, deleteSession } from './sessions.js';

export async function login(email, password) {
  const user = findUserByEmail(email);
  // Verify against a dummy hash when the user does not exist, so timing does not reveal it.
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const valid = await verifyPassword(password, hash);
  if (!user || !valid) return { ok: false };
  const sessionId = createSession(user.id);
  return { ok: true, sessionId, user: { id: user.id, name: user.name } };
}

export function logout(sessionId) {
  deleteSession(sessionId);
}

const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '0'.repeat(128);
