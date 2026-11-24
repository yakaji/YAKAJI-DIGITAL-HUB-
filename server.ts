import express from 'express';
import http from 'node:http';
import path from 'node:path';
import { WebSocketServer, type WebSocket } from 'ws';
import { handler } from './index';
import {
  getStoredMedia,
  registerWsBroadcaster,
  type RouteContext,
} from './server/appdeploy-sdk';
import {
  isSafeCookieMutation,
  readCookieValue,
  SESSION_COOKIE_NAME,
  verifySessionToken,
} from './server/auth-utils';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

function compileRoutePattern(pattern: string) {
  const [method, rawPath] = pattern.split(' ');
  const paramNames: string[] = [];
  const regexStr =
    '^' +
    rawPath
      .split('/')
      .map((segment) => {
        if (segment.startsWith(':')) {
          paramNames.push(segment.slice(1));
          return '([^/]+)';
        }
        return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/') +
    '/?$';
  return {
    method: method.toUpperCase(),
    regex: new RegExp(regexStr),
    paramNames,
    stack: handler[pattern],
  };
}

const compiledRoutes = Object.keys(handler).map(compileRoutePattern);

// Serve uploaded media stored via storage.write
app.use('/_storage', (req, res) => {
  const rawKey = decodeURIComponent(req.path.replace(/^\/+/, ''));
  const asset = getStoredMedia(rawKey);
  if (!asset) {
    res.status(404).send('Media not found');
    return;
  }
  res.setHeader('Content-Type', asset.contentType || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(asset.buffer);
});

// Dispatch /api/* and /share/* routes to the marketplace router from index.ts
app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api/') && !req.path.startsWith('/share/')) {
    next();
    return;
  }

  const reqMethod = req.method.toUpperCase();
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const cookieToken = readCookieValue(req.headers.cookie, SESSION_COOKIE_NAME) || '';
  const usingCookieAuth = !bearerToken && Boolean(cookieToken);
  if (usingCookieAuth && !isSafeCookieMutation(req)) {
    res.status(403).json({ error: 'Cross-origin mutation rejected.', message: 'Cross-origin mutation rejected.' });
    return;
  }
  const user = verifySessionToken(bearerToken || cookieToken);

  for (const route of compiledRoutes) {
    if (route.method !== reqMethod) continue;
    const match = route.regex.exec(req.path);
    if (!match) continue;

    const params: Record<string, string> = {};
    route.paramNames.forEach((name, idx) => {
      try {
        params[name] = decodeURIComponent(match[idx + 1] || '');
      } catch {
        params[name] = match[idx + 1] || '';
      }
    });

    const query: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === 'string') query[k] = v;
      else if (Array.isArray(v) && typeof v[0] === 'string') query[k] = v[0];
    }

    const ctx: RouteContext = {
      req,
      res,
      params,
      query,
      body: req.body ?? {},
      user,
    };

    try {
      for (const fn of route.stack) {
        const result = await fn(ctx);
        if (result) {
          const status = result.statusCode || 200;
          if (result.headers) {
            for (const [hk, hv] of Object.entries(result.headers)) {
              res.setHeader(hk, hv);
            }
          }
          if (typeof result.body === 'string') {
            res.status(status).send(result.body);
          } else {
            res.status(status).json(result.body);
          }
          return;
        }
      }
      res.status(204).end();
      return;
    } catch (err) {
      console.error('Route handler error:', req.method, req.path, err);
      res.status(500).json({ error: 'Internal server error', message: 'Internal server error' });
      return;
    }
  }

  res.status(404).json({ error: 'Route not found', message: 'Route not found' });
});

async function startServer() {
  const server = http.createServer(app);

  // Multiplex WebSocket server on port 3000 at /ws
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientsByConn = new Map<string, { socket: WebSocket; userId?: string }>();

  wss.on('connection', (socket, req) => {
    const connId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let userId: string | undefined;
    try {
      const url = new URL(req.url || '/', 'http://localhost');
      const queryToken = url.searchParams.get('token') || undefined;
      const cookieToken = readCookieValue(req.headers.cookie, SESSION_COOKIE_NAME);
      userId = verifySessionToken(queryToken || cookieToken)?.userId;
    } catch {
      userId = undefined;
    }
    clientsByConn.set(connId, { socket, userId });
    socket.send(JSON.stringify({ type: 'connected', connectionId: connId }));
    socket.on('close', () => {
      clientsByConn.delete(connId);
    });
  });

  registerWsBroadcaster(
    (connectionIds, message) => {
      const payload = JSON.stringify(message);
      for (const id of connectionIds) {
        const client = clientsByConn.get(id);
        if (client && client.socket.readyState === 1) {
          client.socket.send(payload);
        }
      }
    },
    (userIds, message) => {
      const targetSet = new Set(userIds);
      const payload = JSON.stringify(message);
      let count = 0;
      for (const client of clientsByConn.values()) {
        if (client.userId && targetSet.has(client.userId) && client.socket.readyState === 1) {
          client.socket.send(payload);
          count++;
        }
      }
      return count;
    }
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Yakaji Digital Hub running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
