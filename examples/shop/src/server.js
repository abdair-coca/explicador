// HTTP entry point: serves the login page and routes API calls.
import { createServer } from 'node:http';
import { handleLogin, handleLogout } from './api/auth-routes.js';
import { handleCart } from './api/cart-routes.js';
import { renderLoginPage } from './ui/login-page.js';

const routes = {
  'GET /': (req, res) => sendHtml(res, renderLoginPage()),
  'POST /api/login': handleLogin,
  'POST /api/logout': handleLogout,
  'GET /api/cart': handleCart,
};

export const server = createServer(async (req, res) => {
  const route = routes[`${req.method} ${new URL(req.url, 'http://localhost').pathname}`];
  if (!route) {
    res.writeHead(404).end();
    return;
  }
  try {
    await route(req, res);
  } catch (error) {
    console.error(error);
    res.writeHead(500).end();
  }
});

function sendHtml(res, html) {
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(html);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  server.listen(3000, '127.0.0.1', () => console.log('Shop on http://127.0.0.1:3000'));
}
