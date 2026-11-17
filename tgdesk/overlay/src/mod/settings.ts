/*
 * TgMod — modifications on top of tweb (Telegram Web K).
 * Licensed under GPL v3, like tweb itself.
 */

export type TgModThemeId = 'none' | 'neon' | 'amoled' | 'glass' | 'sunset' | 'mint';

export type TgModSettings = {
  theme: TgModThemeId,
  // * ghost mode: each switch keeps one kind of request from reaching the server
  ghostOnline: boolean,
  ghostRead: boolean,
  ghostTyping: boolean,
  ghostStories: boolean,
  customSound: boolean,
  // * the desktop app only: route Telegram Web through a working Telegram IP
  unblock: boolean,
  // * profile decoration shared between mod users
  syncUrl: string,
  showOthers: boolean
};

export const TGMOD_SETTINGS_INIT: TgModSettings = {
  theme: 'neon',
  ghostOnline: false,
  ghostRead: false,
  ghostTyping: false,
  ghostStories: false,
  customSound: false,
  unblock: true,
  syncUrl: '',
  showOthers: true
};

/**
 * Reads the mod settings inside the MTProto worker, where `appSettings` is not available:
 * the worker's own state manager holds the same settings object the UI writes to.
 */
export function getTgModSettingsFromState(appStateManager: {getState: () => Promise<any>} | undefined): TgModSettings {
  const state = (appStateManager as any)?.state;
  return state?.settings?.tgmod ?? TGMOD_SETTINGS_INIT;
}
