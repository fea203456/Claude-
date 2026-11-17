/*
 * TgMod — avatar frames. Shared by id through the sync server, drawn here with CSS (`decor.scss`).
 */

export const TGMOD_FRAMES = ['neon', 'gold', 'fire', 'ice', 'emerald', 'mono', 'sakura'] as const;
export type TgModFrameId = typeof TGMOD_FRAMES[number];

export function isTgModFrame(id: string): id is TgModFrameId {
  return (TGMOD_FRAMES as readonly string[]).includes(id);
}
