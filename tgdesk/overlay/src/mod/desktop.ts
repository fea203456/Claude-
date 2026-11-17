/*
 * TgMod — the bridge to the desktop shell (Electron preload). Absent in a browser.
 */

export type TgModUnblockStatus = {
  state: 'off' | 'direct' | 'mapped' | 'failed' | 'scanning',
  ip?: string
};

type TgModDesktopBridge = {
  getUnblockStatus: () => Promise<TgModUnblockStatus>,
  setUnblockEnabled: (enabled: boolean) => Promise<void>,
  rescanUnblock: () => Promise<TgModUnblockStatus>,
  restart: () => void
};

export function getTgModDesktop(): TgModDesktopBridge | undefined {
  return (window as any).tgmodDesktop;
}
