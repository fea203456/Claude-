/*
 * TgMod — header effects for the showcase items, shared by id like the frames.
 */

export const TGMOD_EFFECTS = ['bubbles', 'orbit'] as const;
export type TgModEffectId = typeof TGMOD_EFFECTS[number];

export function isTgModEffect(id: string): id is TgModEffectId {
  return (TGMOD_EFFECTS as readonly string[]).includes(id);
}
