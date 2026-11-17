// node --test test/  — runs the worker against an in-memory KV and a fake Telegram API
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import worker, {signToken, verifyToken, sniffMedia} from '../src/index.js';

function memoryKV() {
  const data = new Map();
  return {
    data,
    async get(key, type) {
      const entry = data.get(key);
      if(!entry) return null;
      if(type === 'json') return JSON.parse(entry.value);
      return entry.value;
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
}

const sent = [];
globalThis.fetch = async(url, init) => {
  sent.push({url: String(url), body: JSON.parse(init.body)});
  return new Response(JSON.stringify({ok: true, result: {username: 'tgmod_test_bot'}}));
};

const env = () => ({
  TGMOD: memoryKV(),
  BOT_TOKEN: '123:abc',
  BOT_USERNAME: 'tgmod_test_bot',
  WEBHOOK_SECRET: 'webhook-secret',
  TOKEN_SECRET: 'token-secret',
  ADMIN_TOKEN: 'admin-secret'
});

const call = (e, method, path, {body, headers = {}} = {}) => worker.fetch(new Request('https://sync.example' + path, {
  method,
  headers: {...(body && !(body instanceof Uint8Array) ? {'Content-Type': 'application/json'} : {}), ...headers},
  body: body instanceof Uint8Array ? body : body && JSON.stringify(body)
}), e);

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);

async function signIn(e, uid) {
  const {code} = await (await call(e, 'POST', '/v1/auth/start')).json();
  const hook = await call(e, 'POST', '/bot/webhook', {
    headers: {'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret'},
    body: {message: {text: '/start ' + code, from: {id: uid, is_bot: false}, chat: {type: 'private'}}}
  });
  assert.equal(hook.status, 200);
  const polled = await (await call(e, 'POST', '/v1/auth/poll', {body: {code}})).json();
  assert.equal(polled.state, 'confirmed');
  assert.equal(polled.user_id, uid);
  return polled.token;
}

test('tokens: a valid one verifies, a changed or expired one does not', async() => {
  const token = await signToken('s', {uid: 5, exp: 2e9});
  assert.equal((await verifyToken('s', token)).uid, 5);
  assert.equal(await verifyToken('other', token), undefined);
  const [body] = token.split('.');
  const forged = Buffer.from(JSON.stringify({uid: 6, exp: 2e9})).toString('base64url') + '.' + token.split('.')[1];
  assert.equal(await verifyToken('s', forged), undefined);
  assert.equal(await verifyToken('s', await signToken('s', {uid: 5, exp: 10})), undefined);
  assert.ok(body);
});

test('sign-in goes through the bot: the code alone is not enough', async() => {
  const e = env();
  const {code} = await (await call(e, 'POST', '/v1/auth/start')).json();
  assert.deepEqual(await (await call(e, 'POST', '/v1/auth/poll', {body: {code}})).json(), {state: 'pending'});

  // * a webhook call without Telegram's secret is refused
  const forged = await call(e, 'POST', '/bot/webhook', {
    body: {message: {text: '/start ' + code, from: {id: 1}, chat: {type: 'private'}}}
  });
  assert.equal(forged.status, 401);
  assert.deepEqual(await (await call(e, 'POST', '/v1/auth/poll', {body: {code}})).json(), {state: 'pending'});

  const hook = await call(e, 'POST', '/bot/webhook', {
    headers: {'X-Telegram-Bot-Api-Secret-Token': 'webhook-secret'},
    body: {message: {text: '/start ' + code, from: {id: 777, is_bot: false}, chat: {type: 'private'}}}
  });
  assert.equal(hook.status, 200);
  const polled = await (await call(e, 'POST', '/v1/auth/poll', {body: {code}})).json();
  assert.equal(polled.user_id, 777);
  assert.equal((await verifyToken('token-secret', polled.token)).uid, 777);
  // * the code is spent
  assert.equal((await call(e, 'POST', '/v1/auth/poll', {body: {code}})).status, 404);
});

test('a profile is published with own media and read by anyone', async() => {
  const e = env();
  const token = await signIn(e, 42);
  const auth = {Authorization: 'Bearer ' + token};

  const upload = await call(e, 'POST', '/v1/media', {body: PNG, headers: auth});
  assert.equal(upload.status, 200);
  const media = await upload.json();
  assert.equal(media.type, 'image/png');

  const put = await call(e, 'PUT', '/v1/profiles/me', {headers: auth, body: {frame: 'neon', effect: 'bubbles', banner: media.id, showcase: [media.id], gifts: [{gift_id: '5170145012310081615', model: 'Ruby', backdrop: 'Midnight'}, {gift_id: '42'}], caption: ' hi '}});
  assert.equal(put.status, 200);

  const profile = await (await call(e, 'GET', '/v1/profiles/42')).json();
  assert.equal(profile.frame, 'neon');
  assert.equal(profile.effect, 'bubbles');
  assert.equal(profile.label, 'TgMod');
  assert.equal(profile.caption, 'hi');
  assert.equal(profile.banner.url, 'https://sync.example/v1/media/' + media.id);
  assert.equal(profile.showcase.length, 1);
  assert.deepEqual(profile.gifts, [
    {gift_id: '5170145012310081615', model: 'Ruby', backdrop: 'Midnight'},
    {gift_id: '42', model: null, backdrop: null}
  ]);

  const file = await call(e, 'GET', '/v1/media/' + media.id);
  assert.equal(file.headers.get('Content-Type'), 'image/png');
  assert.equal(file.headers.get('X-Content-Type-Options'), 'nosniff');

  assert.equal((await call(e, 'DELETE', '/v1/profiles/me', {headers: auth})).status, 200);
  assert.equal((await call(e, 'GET', '/v1/profiles/42')).status, 404);
});

test('nobody can publish for someone else or use their files', async() => {
  const e = env();
  const alice = {Authorization: 'Bearer ' + await signIn(e, 1)};
  const bob = {Authorization: 'Bearer ' + await signIn(e, 2)};
  const media = await (await call(e, 'POST', '/v1/media', {body: PNG, headers: alice})).json();

  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {body: {frame: 'gold'}})).status, 401);
  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: {Authorization: 'Bearer x.y'}, body: {frame: 'gold'}})).status, 401);
  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: bob, body: {showcase: [media.id]}})).status, 400);
  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: bob, body: {frame: 'not-a-frame'}})).status, 400);
  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: bob, body: {effect: 'fireworks'}})).status, 400);
  // * gifts are references only: no numbers, owners or prices, and nothing that is not a catalogue id
  for(const gifts of [[{gift_id: 7}], [{gift_id: 'abc'}], [{gift_id: '1', model: '<b>x</b>'}], Array.from({length: 9}, () => ({gift_id: '1'}))]) {
    assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: bob, body: {gifts}})).status, 400);
  }
  const extra = await (await call(e, 'PUT', '/v1/profiles/me', {headers: bob, body: {gifts: [{gift_id: '1', num: 777, owner: 'durov', price: 1e6}]}})).json();
  assert.deepEqual(extra.gifts, [{gift_id: '1', model: null, backdrop: null}]);
});

test('only real images, videos and stickers are taken', async() => {
  assert.equal(await sniffMedia(PNG), 'image/png');
  assert.equal(await sniffMedia(new TextEncoder().encode('<svg onload=alert(1)>')), undefined);
  assert.equal(await sniffMedia(new TextEncoder().encode('<html>')), undefined);
  assert.equal(await sniffMedia(gzipSync(JSON.stringify({tgs: 1, layers: []}))), 'application/x-tgsticker');
  assert.equal(await sniffMedia(gzipSync('{"not": "lottie"}')), undefined);

  const e = env();
  const auth = {Authorization: 'Bearer ' + await signIn(e, 9)};
  assert.equal((await call(e, 'POST', '/v1/media', {body: new TextEncoder().encode('<svg/>'), headers: auth})).status, 415);
});

test('moderation removes a profile with its files and can ban', async() => {
  const e = env();
  const auth = {Authorization: 'Bearer ' + await signIn(e, 50)};
  const media = await (await call(e, 'POST', '/v1/media', {body: PNG, headers: auth})).json();
  await call(e, 'PUT', '/v1/profiles/me', {headers: auth, body: {showcase: [media.id]}});

  assert.equal((await call(e, 'DELETE', '/v1/admin/profiles/50?ban=1')).status, 401);
  const removed = await call(e, 'DELETE', '/v1/admin/profiles/50?ban=1', {headers: {Authorization: 'Bearer admin-secret'}});
  assert.equal(removed.status, 200);
  assert.equal((await call(e, 'GET', '/v1/media/' + media.id)).status, 404);
  assert.equal((await call(e, 'PUT', '/v1/profiles/me', {headers: auth, body: {frame: 'gold'}})).status, 403);
});
