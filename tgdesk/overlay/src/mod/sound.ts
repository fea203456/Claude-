/*
 * TgMod — the user's own notification sound, kept in this browser's storage only.
 */

const STORAGE_KEY = 'tgmod_notification_sound';
export const TGMOD_SOUND_MAX_SIZE = 1024 * 1024;

let enabled = false;

export function setTgModCustomSoundEnabled(value: boolean) {
  enabled = value;
}

export function getTgModCustomSound(): string | undefined {
  try {
    return localStorage.getItem(STORAGE_KEY) || undefined;
  } catch(err) {
    return undefined;
  }
}

export function setTgModCustomSound(dataUrl: string | undefined) {
  try {
    if(dataUrl) localStorage.setItem(STORAGE_KEY, dataUrl);
    else localStorage.removeItem(STORAGE_KEY);
  } catch(err) {
    console.error('TgMod: could not store the sound', err);
  }
}

/** Used by `AudioAssetPlayer`: the user's file in place of the stock notification sound. */
export function getTgModAssetOverride(fileName: string): string | undefined {
  if(!enabled || fileName !== 'notification.mp3') {
    return;
  }

  return getTgModCustomSound();
}
