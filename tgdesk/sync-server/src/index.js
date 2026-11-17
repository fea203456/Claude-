// TgMod Sync: keeps each mod user's profile decoration (avatar frame, banner, showcase) so other
// mod users can see it. A Cloudflare Worker with one KV namespace; no other storage.
//
// Who is who is proven by Telegram itself: the client asks for a one-time code, the user sends it
// to the bot as `/start <code>`, and the bot's webhook (authenticated by Telegram's secret header)
// learns the sender's real user id from the update. Only then does the client get a session token.

const FRAMES = ['neon', 'gold', 'fire', 'ice', 'emerald', 'mono', 'sakura'];
const EFFECTS = ['bubbles', 'orbit'];
const SHOWCASE_MAX = 8;
const MEDIA_MAX_BYTES = 2 * 1024 * 1024;
const MEDIA_PER_USER = 24;
const TOKEN_TTL = 90 * 24 * 3600;
const AUTH_TTL = 600;
const CAPTION_MAX = 70;

const JSON_HEADERS = {'Content-Type': 'application/json; charset=utf-8'};
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400'
};

class HttpError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {status, headers: {...JSON_HEADERS, ...CORS_HEADERS, ...extra}});
}

// * base64url without padding
function b64url(bytes) {
  let binary = '';
  for(const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(text) {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((text.length + 3) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign', 'verify']);
}

export async function signToken(secret, payload) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(body));
  return body + '.' + b64url(signature);
}

export async function verifyToken(secret, token, now = Date.now() / 1000) {
  const [body, signature] = (token || '').split('.');
  if(!body || !signature) return;
  let ok = false;
  try {
    ok = await crypto.subtle.verify('HMAC', await hmacKey(secret), fromB64url(signature), new TextEncoder().encode(body));
  } catch(err) {
    return;
  }
  if(!ok) return;
  const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
  if(typeof payload.uid !== 'number' || !(payload.exp > now)) return;
  return payload;
}

function timingSafeEqual(a, b) {
  if(typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for(let i = 0; i < a.length; ++i) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function randomCode() {
  return b64url(crypto.getRandomValues(new Uint8Array(18)));
}

async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// * what the bytes really are; the declared type is not trusted
export async function sniffMedia(bytes) {
  const b = new Uint8Array(bytes);
  const starts = (...sig) => sig.every((v, i) => b[i] === v);
  if(starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'image/png';
  if(starts(0xff, 0xd8, 0xff)) return 'image/jpeg';
  if(starts(0x47, 0x49, 0x46, 0x38)) return 'image/gif';
  if(starts(0x52, 0x49, 0x46, 0x46) && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  if(starts(0x1a, 0x45, 0xdf, 0xa3)) return 'video/webm';
  if(starts(0x1f, 0x8b)) {
    // * a Telegram animated sticker: gzipped Lottie JSON with "tgs": 1
    try {
      const stream = new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'));
      const reader = stream.getReader();
      let text = '';
      let size = 0;
      const decoder = new TextDecoder();
      for(;;) {
        const {done, value} = await reader.read();
        if(done) break;
        size += value.length;
        if(size > 8 * 1024 * 1024) return;
        text += decoder.decode(value, {stream: true});
      }
      const lottie = JSON.parse(text);
      if(lottie && lottie.tgs === 1 && Array.isArray(lottie.layers)) return 'application/x-tgsticker';
    } catch(err) {}
  }
}

async function readJson(request) {
  try {
    return await request.json();
  } catch(err) {
    throw new HttpError(400, 'BAD_JSON');
  }
}

async function requireUser(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const payload = auth.startsWith('Bearer ') && await verifyToken(env.TOKEN_SECRET, auth.slice(7));
  if(!payload) throw new HttpError(401, 'UNAUTHORIZED');
  if(await env.TGMOD.get('banned:' + payload.uid)) throw new HttpError(403, 'BANNED');
  return payload.uid;
}

function requireAdmin(request, env) {
  const auth = request.headers.get('Authorization') || '';
  if(!env.ADMIN_TOKEN || !timingSafeEqual(auth, 'Bearer ' + env.ADMIN_TOKEN)) throw new HttpError(401, 'UNAUTHORIZED');
}

function mediaUrl(origin, id) {
  return `${origin}/v1/media/${id}`;
}

// * the stored profile, with the media resolved, as the clients read it
function presentProfile(origin, userId, stored) {
  const media = (item) => item && {id: item.id, type: item.type, url: mediaUrl(origin, item.id)};
  return {
    user_id: userId,
    version: stored.version,
    updated_at: stored.updated_at,
    label: 'TgMod',
    frame: stored.frame ?? null,
    effect: stored.effect ?? null,
    banner: media(stored.banner) ?? null,
    showcase: (stored.showcase || []).map(media),
    caption: stored.caption ?? null
  };
}

// * a user's uploads: [{id, type}], oldest first
async function getOwnerIndex(env, uid) {
  return (await env.TGMOD.get('owner:' + uid, 'json')) || [];
}

async function telegram(env, method, params) {
  const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(params)
  });
  return response.json();
}

const routes = [];
const route = (method, pattern, handler) => routes.push({method, pattern, handler});

route('GET', /^\/$/, async(request, env) => json({service: 'tgmod-sync', bot: env.BOT_USERNAME || null}));

// * one-time code for the bot
route('POST', /^\/v1\/auth\/start$/, async(request, env) => {
  if(!env.BOT_USERNAME) throw new HttpError(503, 'BOT_NOT_CONFIGURED');
  const code = randomCode();
  await env.TGMOD.put('auth:' + code, JSON.stringify({state: 'pending'}), {expirationTtl: AUTH_TTL});
  return json({code, bot: env.BOT_USERNAME, expires_in: AUTH_TTL});
});

route('POST', /^\/v1\/auth\/poll$/, async(request, env) => {
  const {code} = await readJson(request);
  if(typeof code !== 'string' || !/^[A-Za-z0-9_-]{16,64}$/.test(code)) throw new HttpError(400, 'BAD_CODE');
  const record = JSON.parse(await env.TGMOD.get('auth:' + code) || 'null');
  if(!record) throw new HttpError(404, 'CODE_EXPIRED');
  if(record.state !== 'confirmed') return json({state: 'pending'});
  await env.TGMOD.delete('auth:' + code);
  const now = Math.floor(Date.now() / 1000);
  const token = await signToken(env.TOKEN_SECRET, {uid: record.uid, iat: now, exp: now + TOKEN_TTL});
  return json({state: 'confirmed', token, user_id: record.uid});
});

// * Telegram -> bot. The secret header is set by `setWebhook` and only Telegram knows it.
route('POST', /^\/bot\/webhook$/, async(request, env) => {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  if(!env.WEBHOOK_SECRET || !timingSafeEqual(secret || '', env.WEBHOOK_SECRET)) throw new HttpError(401, 'UNAUTHORIZED');
  const update = await readJson(request);
  const message = update.message;
  const from = message?.from;
  const match = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})$/.exec(message?.text || '');
  if(!from || from.is_bot || message.chat?.type !== 'private') return json({ok: true});

  if(!match) {
    await telegram(env, 'sendMessage', {chat_id: from.id, text: 'Это бот входа TgMod. Войти можно из настроек мода: «Оформление профиля» → «Войти».'});
    return json({ok: true});
  }

  const key = 'auth:' + match[1];
  const record = JSON.parse(await env.TGMOD.get(key) || 'null');
  if(record?.state === 'pending') {
    await env.TGMOD.put(key, JSON.stringify({state: 'confirmed', uid: from.id}), {expirationTtl: AUTH_TTL});
    await telegram(env, 'sendMessage', {chat_id: from.id, text: '✅ Вход в TgMod подтверждён. Можно вернуться в приложение.'});
  } else {
    await telegram(env, 'sendMessage', {chat_id: from.id, text: 'Код входа устарел. Попробуйте войти ещё раз.'});
  }
  return json({ok: true});
});

route('GET', /^\/v1\/profiles\/(\d{1,20})$/, async(request, env, [, userId]) => {
  const stored = await env.TGMOD.get('profile:' + userId, 'json');
  if(!stored) return json({error: 'NOT_FOUND'}, 404, {'Cache-Control': 'public, max-age=120'});
  const origin = new URL(request.url).origin;
  return json(presentProfile(origin, +userId, stored), 200, {'Cache-Control': 'public, max-age=60'});
});

route('PUT', /^\/v1\/profiles\/me$/, async(request, env) => {
  const uid = await requireUser(request, env);
  const body = await readJson(request);

  const frame = body.frame ?? null;
  if(frame !== null && !FRAMES.includes(frame)) throw new HttpError(400, 'BAD_FRAME');

  const effect = body.effect ?? null;
  if(effect !== null && !EFFECTS.includes(effect)) throw new HttpError(400, 'BAD_EFFECT');

  const caption = body.caption ?? null;
  if(caption !== null && (typeof caption !== 'string' || caption.length > CAPTION_MAX)) throw new HttpError(400, 'BAD_CAPTION');

  const owned = await getOwnerIndex(env, uid);
  const resolveOwned = async(id) => {
    const item = typeof id === 'string' && owned.find((m) => m.id === id);
    if(!item) throw new HttpError(400, 'BAD_MEDIA');
    return {id: item.id, type: item.type};
  };

  const banner = body.banner ? await resolveOwned(body.banner) : null;
  if(banner && banner.type === 'application/x-tgsticker') throw new HttpError(400, 'BAD_BANNER');
  const ids = Array.isArray(body.showcase) ? body.showcase : [];
  if(ids.length > SHOWCASE_MAX) throw new HttpError(400, 'TOO_MANY');
  const showcase = [];
  for(const id of ids) showcase.push(await resolveOwned(id));

  const previous = await env.TGMOD.get('profile:' + uid, 'json');
  const stored = {
    version: (previous?.version || 0) + 1,
    updated_at: new Date().toISOString(),
    frame,
    effect,
    banner,
    showcase,
    caption: caption?.trim() || null
  };
  await env.TGMOD.put('profile:' + uid, JSON.stringify(stored));
  return json(presentProfile(new URL(request.url).origin, uid, stored));
});

route('DELETE', /^\/v1\/profiles\/me$/, async(request, env) => {
  const uid = await requireUser(request, env);
  await env.TGMOD.delete('profile:' + uid);
  return json({ok: true});
});

route('POST', /^\/v1\/media$/, async(request, env) => {
  const uid = await requireUser(request, env);
  const declared = Number(request.headers.get('Content-Length') || 0);
  if(declared > MEDIA_MAX_BYTES) throw new HttpError(413, 'TOO_LARGE');
  const bytes = await request.arrayBuffer();
  if(!bytes.byteLength) throw new HttpError(400, 'EMPTY');
  if(bytes.byteLength > MEDIA_MAX_BYTES) throw new HttpError(413, 'TOO_LARGE');
  const type = await sniffMedia(bytes);
  if(!type) throw new HttpError(415, 'UNSUPPORTED_TYPE');

  // * the owner is part of the id, so two users uploading the same file each own their copy
  const id = (await sha256Hex(new Uint8Array([...new TextEncoder().encode(uid + ':'), ...new Uint8Array(bytes)]))).slice(0, 40);
  const index = await getOwnerIndex(env, uid);
  if(!index.some((m) => m.id === id)) {
    // * a full list drops its oldest file that no published profile uses
    if(index.length >= MEDIA_PER_USER) {
      const profile = await env.TGMOD.get('profile:' + uid, 'json');
      const used = new Set([profile?.banner?.id, ...(profile?.showcase || []).map((m) => m.id)].filter(Boolean));
      const drop = index.find((old) => !used.has(old.id));
      if(!drop) throw new HttpError(429, 'MEDIA_LIMIT');
      index.splice(index.indexOf(drop), 1);
      await env.TGMOD.delete('media:' + drop.id);
    }
    await env.TGMOD.put('media:' + id, bytes, {metadata: {type, owner: uid, size: bytes.byteLength}});
    index.push({id, type});
    await env.TGMOD.put('owner:' + uid, JSON.stringify(index));
  }

  return json({id, type, url: mediaUrl(new URL(request.url).origin, id)});
});

route('GET', /^\/v1\/media\/([0-9a-f]{40})$/, async(request, env, [, id]) => {
  const result = await env.TGMOD.getWithMetadata('media:' + id, 'arrayBuffer');
  if(!result?.value) return json({error: 'NOT_FOUND'}, 404);
  return new Response(result.value, {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': result.metadata.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Content-Disposition': 'inline'
    }
  });
});

route('POST', /^\/v1\/reports$/, async(request, env) => {
  const uid = await requireUser(request, env);
  const {user_id: target, reason} = await readJson(request);
  if(!Number.isSafeInteger(target) || target <= 0) throw new HttpError(400, 'BAD_USER');
  await env.TGMOD.put(`report:${target}:${uid}`, JSON.stringify({
    reason: String(reason || '').slice(0, 200),
    at: new Date().toISOString()
  }), {expirationTtl: 90 * 24 * 3600});
  return json({ok: true});
});

// * moderation: list reports, remove a profile and its files, and keep its owner from publishing again
route('GET', /^\/v1\/admin\/reports$/, async(request, env) => {
  requireAdmin(request, env);
  const list = await env.TGMOD.list({prefix: 'report:', limit: 1000});
  return json(list.keys.map((k) => k.name));
});

route('DELETE', /^\/v1\/admin\/profiles\/(\d{1,20})$/, async(request, env, [, userId]) => {
  requireAdmin(request, env);
  const index = await getOwnerIndex(env, userId);
  await Promise.all(index.map((m) => env.TGMOD.delete('media:' + m.id)));
  await env.TGMOD.delete('owner:' + userId);
  await env.TGMOD.delete('profile:' + userId);
  if(new URL(request.url).searchParams.get('ban') === '1') await env.TGMOD.put('banned:' + userId, '1');
  return json({ok: true, removed_media: index.length});
});

// * one-time setup from a browser: points the bot's webhook here
route('GET', /^\/setup$/, async(request, env) => {
  const url = new URL(request.url);
  if(!env.ADMIN_TOKEN || !timingSafeEqual(url.searchParams.get('token') || '', env.ADMIN_TOKEN)) throw new HttpError(401, 'UNAUTHORIZED');
  const me = await telegram(env, 'getMe', {});
  const webhook = await telegram(env, 'setWebhook', {
    url: url.origin + '/bot/webhook',
    secret_token: env.WEBHOOK_SECRET,
    allowed_updates: ['message'],
    drop_pending_updates: true
  });
  return json({bot: me.result?.username, bot_username_setting: env.BOT_USERNAME, webhook});
});

export default {
  async fetch(request, env) {
    if(request.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS_HEADERS});
    const {pathname} = new URL(request.url);
    for(const {method, pattern, handler} of routes) {
      const match = pattern.exec(pathname);
      if(match && method === request.method) {
        try {
          return await handler(request, env, match);
        } catch(err) {
          if(err instanceof HttpError) return json({error: err.code}, err.status);
          console.error(err);
          return json({error: 'INTERNAL'}, 500);
        }
      }
    }
    return json({error: 'NOT_FOUND'}, 404);
  }
};
