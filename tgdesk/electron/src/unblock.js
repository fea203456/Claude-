// "Bypass blocking": find an address of Telegram's web front-ends that answers from this network,
// and have Chromium resolve *.web.telegram.org to it (`--host-resolver-rules`). Nothing in the
// system is changed and no traffic leaves for anyone but Telegram: a candidate is accepted only when
// it completes a TLS handshake with Telegram's own valid certificate for the web host.
const tls = require('tls');
const https = require('https');
const fs = require('fs');

const PROBE_HOST = 'kws2.web.telegram.org';
const HOSTS = ['web.telegram.org', 'kws1.web.telegram.org', 'kws2.web.telegram.org', 'kws4.web.telegram.org'];

// * Telegram's published ranges (https://core.telegram.org/resources/cidr.txt), the web front-ends first
const CANDIDATE_RANGES = [
  '149.154.167.0/24',
  '149.154.166.0/24',
  '149.154.164.0/24',
  '149.154.165.0/24',
  '149.154.175.0/24',
  '91.108.56.0/24',
  '91.108.4.0/24',
  '91.108.8.0/24',
  '91.108.12.0/24',
  '91.108.16.0/24',
  '91.108.20.0/24',
  '91.105.192.0/24',
  '185.76.151.0/24'
];

// * the DNS-over-HTTPS resolvers asked by address, so a poisoned system DNS cannot answer for them
const DOH = [
  'https://1.1.1.1/dns-query',
  'https://8.8.8.8/resolve'
];

function expandRange(cidr) {
  const [base, bits] = cidr.split('/');
  const parts = base.split('.').map(Number);
  const start = ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  const count = 2 ** (32 - Number(bits));
  const out = [];
  for(let i = 1; i < count - 1; ++i) {
    const n = start + i;
    out.push([n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.'));
  }
  return out;
}

// * a TLS handshake that only succeeds with a certificate valid for the web host
function probe({ip, servername = PROBE_HOST, timeout = 2500}) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => {
      if(done) return;
      done = true;
      socket.destroy();
      resolve(ok);
    };
    const socket = tls.connect({
      host: ip ?? servername,
      port: 443,
      servername,
      ALPNProtocols: ['http/1.1'],
      rejectUnauthorized: true
    }, () => finish(socket.authorized));
    socket.setTimeout(timeout, () => finish(false));
    socket.once('error', () => finish(false));
  });
}

function dohLookup(endpoint, name, timeout = 3000) {
  return new Promise((resolve) => {
    const url = `${endpoint}?name=${encodeURIComponent(name)}&type=A`;
    const req = https.get(url, {headers: {accept: 'application/dns-json'}, timeout}, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve((json.Answer || []).filter((a) => a.type === 1).map((a) => a.data));
        } catch(err) {
          resolve([]);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve([]));
  });
}

async function firstWorking(candidates, concurrency = 48) {
  let index = 0;
  let found;
  const worker = async() => {
    while(!found && index < candidates.length) {
      const ip = candidates[index++];
      if(await probe({ip})) {
        found ??= ip;
      }
    }
  };
  await Promise.all(Array.from({length: concurrency}, worker));
  return found;
}

/**
 * @returns {Promise<{state: 'direct' | 'mapped' | 'failed', ip?: string}>}
 */
async function findRoute({lastIp} = {}) {
  if(await probe({ip: undefined, timeout: 4000})) {
    return {state: 'direct'};
  }

  if(lastIp && await probe({ip: lastIp})) {
    return {state: 'mapped', ip: lastIp};
  }

  const fromDoh = (await Promise.all(
    DOH.flatMap((endpoint) => HOSTS.map((host) => dohLookup(endpoint, host)))
  )).flat();
  const unique = (list) => [...new Set(list)];
  const viaDoh = await firstWorking(unique(fromDoh), 8);
  if(viaDoh) {
    return {state: 'mapped', ip: viaDoh};
  }

  const scanned = await firstWorking(unique(CANDIDATE_RANGES.flatMap(expandRange)));
  return scanned ? {state: 'mapped', ip: scanned} : {state: 'failed'};
}

function hostResolverRules(ip) {
  return `MAP *.web.telegram.org ${ip}, MAP web.telegram.org ${ip}`;
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch(err) {
    return fallback;
  }
}

function writeJson(file, value) {
  try {
    fs.writeFileSync(file, JSON.stringify(value, null, 2));
  } catch(err) {
    console.error('tgmod: could not save', file, err);
  }
}

module.exports = {findRoute, hostResolverRules, readJson, writeJson, probe, expandRange};
