// Cart endpoint: only for logged-in users.
import { getCart } from '../cart/cart-service.js';
import { sendJson } from './http.js';
import { requireSession } from './require-session.js';

export async function handleCart(req, res) {
  const session = requireSession(req, res);
  if (!session) return;
  sendJson(res, 200, { cart: getCart(session.userId) });
}
