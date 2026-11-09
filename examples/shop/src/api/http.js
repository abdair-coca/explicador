// Small JSON helpers shared by the routes.
const MAX_BODY = 10_000;

export async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > MAX_BODY) throw new Error('Body too large');
  }
  try {
    return JSON.parse(body || '{}');
  } catch {
    return {};
  }
}

export function sendJson(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(status === 204 ? undefined : JSON.stringify(value));
}
