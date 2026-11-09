// Auth endpoints: parse the request, call the auth service, set or clear the session cookie.
import { login, logout } from '../auth/auth-service.js';
import { readJson, sendJson } from './http.js';
import { readSessionId } from './require-session.js';

export async function handleLogin(req, res) {
  const { email, password } = await readJson(req);
  if (typeof email !== 'string' || typeof password !== 'string') {
    sendJson(res, 400, { message: 'Email and password are required' });
    return;
  }
  const result = await login(email.trim().toLowerCase(), password);
  if (!result.ok) {
    // Same message for unknown email and wrong password, so accounts cannot be probed.
    sendJson(res, 401, { message: 'Wrong email or password' });
    return;
  }
  res.setHeader('set-cookie', `sid=${result.sessionId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
  sendJson(res, 200, { user: result.user });
}

export async function handleLogout(req, res) {
  const sessionId = readSessionId(req);
  if (sessionId) logout(sessionId);
  res.setHeader('set-cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
  sendJson(res, 204, {});
}
