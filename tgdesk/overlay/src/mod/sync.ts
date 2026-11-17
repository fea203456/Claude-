/*
 * TgMod — the sync server's client: reads other mod users' decoration, signs in through the bot and
 * publishes one's own. Runs on the page; the session token is kept per Telegram account and server.
 */

import rootScope from '@lib/rootScope';
import {bindManagersToSession} from '@lib/accounts/bindManagersToAccount';
import {appSettings} from '@stores/appSettings';
import {TGMOD_SETTINGS_INIT} from '@/mod/settings';
import {isTgModFrame, TgModFrameId} from '@/mod/frames';
import {isTgModEffect, TgModEffectId} from '@/mod/effects';
import pause from '@helpers/schedulers/pause';

export type TgModMedia = {
  id: string,
  type: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp' | 'video/webm' | 'application/x-tgsticker',
  url: string
};

export type TgModRemoteProfile = {
  user_id: number,
  version: number,
  label: 'TgMod',
  frame: TgModFrameId | null,
  effect: TgModEffectId | null,
  banner: TgModMedia | null,
  showcase: TgModMedia[],
  caption: string | null
};

export type TgModDraft = {
  frame: TgModFrameId | null,
  effect: TgModEffectId | null,
  banner: string | null,
  showcase: string[],
  caption: string | null
};

const PROFILE_TTL = 10 * 60e3;
const updateListeners = new Set<(userId: UserId) => void>();

/** Called when one's own decoration was published or cleared from this page. */
export function onTgModProfileUpdated(listener: (userId: UserId) => void) {
  updateListeners.add(listener);
  return () => updateListeners.delete(listener);
}

function notifyUpdated(userId: UserId) {
  updateListeners.forEach((listener) => listener(userId));
}
const cache = new Map<UserId, {at: number, promise: Promise<TgModRemoteProfile | null>}>();

function settings() {
  return appSettings.tgmod ?? TGMOD_SETTINGS_INIT;
}

export function getTgModSyncUrl(): string {
  const url = settings().syncUrl || (import.meta.env as any).VITE_TGMOD_SYNC_URL || '';
  return url.replace(/\/+$/, '');
}

function tokenKey() {
  return `tgmod_sync_token:${rootScope.myId}:${getTgModSyncUrl()}`;
}

export function getTgModSyncToken(): string | undefined {
  try {
    return localStorage.getItem(tokenKey()) || undefined;
  } catch(err) {}
}

function setToken(token: string | undefined) {
  try {
    if(token) localStorage.setItem(tokenKey(), token);
    else localStorage.removeItem(tokenKey());
  } catch(err) {}
}

export class TgModSyncError extends Error {
  constructor(public code: string, public status?: number) {
    super(code);
  }
}

async function request<T>(method: string, path: string, options: {body?: any, auth?: boolean} = {}): Promise<T> {
  const base = getTgModSyncUrl();
  if(!base) throw new TgModSyncError('NO_SERVER');
  const headers: Record<string, string> = {};
  if(options.auth) {
    const token = getTgModSyncToken();
    if(!token) throw new TgModSyncError('UNAUTHORIZED', 401);
    headers.Authorization = 'Bearer ' + token;
  }

  let body: BodyInit;
  if(options.body instanceof Blob) {
    body = options.body;
  } else if(options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(base + path, {method, headers, body});
  } catch(err) {
    throw new TgModSyncError('NETWORK');
  }

  const json = await response.json().catch((): any => ({}));
  if(!response.ok) {
    if(response.status === 401 && options.auth) setToken(undefined);
    throw new TgModSyncError(json.error || 'HTTP_' + response.status, response.status);
  }
  return json as T;
}

function sanitize(profile: TgModRemoteProfile): TgModRemoteProfile {
  const base = getTgModSyncUrl();
  // * media only from the configured server, and only of the kinds it serves
  const media = (m: TgModMedia) => m && typeof m.url === 'string' && m.url.startsWith(base + '/v1/media/') ? m : null;
  return {
    ...profile,
    frame: profile.frame && isTgModFrame(profile.frame) ? profile.frame : null,
    effect: profile.effect && isTgModEffect(profile.effect) ? profile.effect : null,
    banner: profile.banner && profile.banner.type !== 'application/x-tgsticker' ? media(profile.banner) : null,
    showcase: (profile.showcase || []).map(media).filter(Boolean).slice(0, 8),
    caption: typeof profile.caption === 'string' ? profile.caption.slice(0, 70) : null
  };
}

/** Someone's decoration, cached for a while; `null` when they have none. */
export function getTgModProfile(userId: UserId, force?: boolean): Promise<TgModRemoteProfile | null> {
  if(!getTgModSyncUrl() || (!settings().showOthers && userId !== rootScope.myId.toUserId())) {
    return Promise.resolve(null);
  }

  const cached = cache.get(userId);
  if(!force && cached && Date.now() - cached.at < PROFILE_TTL) {
    return cached.promise;
  }

  const promise = request<TgModRemoteProfile>('GET', '/v1/profiles/' + userId).then(sanitize, (err: TgModSyncError): null => {
    if(err.status === 404) return null;
    cache.delete(userId);
    return null;
  });
  cache.set(userId, {at: Date.now(), promise});
  return promise;
}

export function isTgModSignedIn() {
  return !!getTgModSyncToken();
}

/**
 * Asks the server for a one-time code and sends it to the bot as `/start <code>` from this account,
 * then waits for the bot to confirm who sent it.
 */
export async function signInTgModSync(onWaiting?: () => void): Promise<void> {
  // * the account this was started from, even if another one is switched to meanwhile
  const managers = bindManagersToSession(rootScope.managers);
  const {code, bot} = await request<{code: string, bot: string}>('POST', '/v1/auth/start');
  const botUser = await managers.appUsersManager.resolveUserByUsername(bot);
  if(!botUser || !botUser.pFlags?.bot) throw new TgModSyncError('BOT_NOT_FOUND');
  await managers.appMessagesManager.startBot(botUser.id, undefined, code);
  onWaiting?.();

  const deadline = Date.now() + 3 * 60e3;
  while(Date.now() < deadline) {
    await pause(2000);
    const result = await request<{state: string, token?: string}>('POST', '/v1/auth/poll', {body: {code}});
    if(result.state === 'confirmed' && result.token) {
      setToken(result.token);
      return;
    }
  }

  throw new TgModSyncError('TIMEOUT');
}

export function signOutTgModSync() {
  setToken(undefined);
}

export function uploadTgModMedia(file: Blob) {
  return request<TgModMedia>('POST', '/v1/media', {body: file, auth: true});
}

export async function publishTgModProfile(draft: TgModDraft) {
  const profile = sanitize(await request<TgModRemoteProfile>('PUT', '/v1/profiles/me', {body: draft, auth: true}));
  cache.set(profile.user_id, {at: Date.now(), promise: Promise.resolve(profile)});
  notifyUpdated(profile.user_id);
  return profile;
}

export async function clearTgModProfile() {
  await request('DELETE', '/v1/profiles/me', {auth: true});
  const myId = rootScope.myId.toUserId();
  cache.set(myId, {at: Date.now(), promise: Promise.resolve(null)});
  notifyUpdated(myId);
}

export function reportTgModProfile(userId: UserId, reason: string) {
  return request('POST', '/v1/reports', {body: {user_id: userId, reason}, auth: true});
}
