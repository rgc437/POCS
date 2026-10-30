const crypto = require('node:crypto');
const http = require('node:http');

const host = process.env.HOST || 'localhost';
const port = Number(process.env.PORT) || 3000;
const sessions = new Set();
const allowedOrigins = new Set(
  (process.env.WEB_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
    .split(',')
    .map((origin) => origin.trim()),
);

function sendJson(response, statusCode, body, extraHeaders = {}) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    ...extraHeaders,
  });
  response.end(JSON.stringify(body));
}

function corsHeaders(request) {
  const origin = request.headers.origin;

  if (!origin || !allowedOrigins.has(origin)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
}

function getSessionCookie(request) {
  const cookie = (request.headers.cookie || '')
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith('sample_session='));

  return cookie ? cookie.slice('sample_session='.length) : null;
}

function getAuthorizationValues(request) {
  const authorization = request.headers.authorization;

  if (!authorization || Array.isArray(authorization)) {
    return { basic: null, bearer: null };
  }

  const values = authorization.split(',').map((value) => value.trim());
  const basic = values.find((value) => /^Basic\s+/i.test(value));
  const bearer = values.find((value) => /^Bearer\s+/i.test(value));

  return {
    basic: basic ? basic.replace(/^Basic\s+/i, '').trim() : null,
    bearer: bearer ? bearer.replace(/^Bearer\s+/i, '').trim() : null,
  };
}

function logRequestHeaders(request, url) {
  const headers = { ...request.headers };

  if (process.env.NODE_ENV === 'production') {
    for (const name of ['auth', 'authorization', 'basic', 'cookie']) {
      if (headers[name]) {
        headers[name] = '[REDACTED]';
      }
    }
  }

  console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
  console.log(headers);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url, `http://${request.headers.host || `${host}:${port}`}`);
  const cors = corsHeaders(request);
  logRequestHeaders(request, url);

  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      ...cors,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    response.end();
    return;
  }

  if (request.method === 'POST' && url.pathname === '/api/cookie') {
    const sessionId = crypto.randomUUID();
    const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    sessions.add(sessionId);

    sendJson(
      response,
      200,
      { message: 'HTTP-only cookie set successfully.' },
      {
        ...cors,
        'Set-Cookie': `sample_session=${sessionId}; HttpOnly; Path=/; SameSite=Lax; Max-Age=3600${secure}; override=false;`,
      },
    );
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/cookie') {
    const sessionId = getSessionCookie(request);
    sendJson(
      response,
      200,
      { hasSessionCookie: Boolean(sessionId && sessions.has(sessionId)) },
      cors,
    );
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/protected') {
    const { basic, bearer } = getAuthorizationValues(request);

    if (!bearer || !sessions.has(bearer)) {
      sendJson(
        response,
        401,
        { authenticated: false, message: 'A valid Bearer credential is required.' },
        cors,
      );
      return;
    }

    if (!basic) {
      sendJson(
        response,
        400,
        { authenticated: false, message: 'A Basic credential is required.' },
        cors,
      );
      return;
    }

    sendJson(
      response,
      200,
      {
        authenticated: true,
        receivedAuthorizationHeader: true,
        message: 'Protected API received Basic and Bearer credentials in the Authorization header.',
      },
      cors,
    );
    return;
  }

  if (request.method === 'DELETE' && url.pathname === '/api/cookie') {
    const sessionId = getSessionCookie(request);
    if (sessionId) {
      sessions.delete(sessionId);
    }

    sendJson(
      response,
      200,
      { message: 'HTTP-only cookie cleared.' },
      {
        ...cors,
        'Set-Cookie': 'sample_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0',
      },
    );
    return;
  }

  if (request.method === 'GET' && url.pathname === '/') {
    sendJson(response, 200, {
      message: 'Sample HTTP-only cookie API',
      endpoints: {
        set: 'POST /api/cookie',
        check: 'GET /api/cookie',
        protected: 'GET /api/protected (Authorization: Basic <id>, Bearer <token>)',
        clear: 'DELETE /api/cookie',
      },
    });
    return;
  }

  sendJson(response, 404, { message: 'Not found' }, cors);
});

server.listen(port, host, () => {
  console.log(`Sample Node.js app listening at http://${host}:${port}`);
});
