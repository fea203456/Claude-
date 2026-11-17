// Runs the worker on Node with an in-memory KV, for trying the mod against a local server:
//   node dev-server.mjs            (http://127.0.0.1:8787, data lost on exit)
// Secrets come from the environment, with throwaway defaults for local use only.
import http from 'node:http';
import worker from './src/index.js';

const data = new Map();
const kv = {
  async get(key, type) {
    const entry = data.get(key);
    if(!entry) return null;
    return type === 'json' ? JSON.parse(entry.value) : entry.value;
  },
  async getWithMetadata(key) {
    const entry = data.get(key);
    return entry ? {value: entry.value, metadata: entry.metadata} : {value: null, metadata: null};
  },
  async put(key, value, options = {}) {
    data.set(key, {value, metadata: options.metadata});
  },
  async delete(key) {
    data.delete(key);
  },
  async list({prefix}) {
    return {keys: [...data.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({name}))};
  }
};

const env = {
  TGMOD: kv,
  BOT_USERNAME: process.env.BOT_USERNAME || 'tgmod_local_bot',
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'local-webhook-secret',
  TOKEN_SECRET: process.env.TOKEN_SECRET || 'local-token-secret',
  ADMIN_TOKEN: process.env.ADMIN_TOKEN || 'local-admin-token'
};

// * without a bot token there is no Telegram to talk to: its replies are dropped
if(!env.BOT_TOKEN) {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (url, init) => String(url).startsWith('https://api.telegram.org/') ?
    Promise.resolve(new Response('{"ok":true,"result":{}}')) :
    realFetch(url, init);
}

const port = Number(process.env.PORT || 8787);
http.createServer(async(req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;
  const request = new Request(`http://127.0.0.1:${port}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
  });
  const response = await worker.fetch(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, '127.0.0.1', () => console.log(`tgmod-sync dev server on http://127.0.0.1:${port}`));
