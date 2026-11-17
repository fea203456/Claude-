/*
 * TgMod — turning a decoration gift reference into what to draw: the gift's sticker from Telegram's
 * catalogue, or for a collectible's look the named model's sticker and backdrop colours from the
 * gift's upgrade preview. Only the picture is used; nothing here owns, sends or upgrades a gift.
 */

import rootScope from '@lib/rootScope';
import type {MyDocument} from '@appManagers/appDocsManager';
import type {MyStarGift, StarGiftUpgradePreview} from '@appManagers/appGiftsManager';
import type {TgModGiftRef} from '@/mod/sync';

export type TgModGiftLook = {
  doc: MyDocument,
  title: string,
  // * a collectible's backdrop: centre and edge colours
  backdrop?: {center: string, edge: string}
};

let catalogue: Promise<MyStarGift[]>;
const previews = new Map<string, Promise<StarGiftUpgradePreview | undefined>>();

const toHex = (color: number) => '#' + (color >>> 0 & 0xffffff).toString(16).padStart(6, '0');

export function getTgModGiftCatalogue(): Promise<MyStarGift[]> {
  if(!catalogue) {
    catalogue = Promise.resolve(rootScope.managers.appGiftsManager.getStarGiftOptions())
    .then((list) => (list || []).filter((gift, i, all) => gift.raw._ === 'starGift' && all.findIndex((g) => g.raw.id === gift.raw.id) === i));
    catalogue.catch((): void => { catalogue = undefined; });
  }
  return catalogue;
}

export function getTgModGiftPreview(giftId: string): Promise<StarGiftUpgradePreview | undefined> {
  let promise = previews.get(giftId);
  if(!promise) {
    promise = Promise.resolve(rootScope.managers.appGiftsManager.getUpgradePreview(giftId)).catch((): undefined => undefined);
    previews.set(giftId, promise);
  }
  return promise;
}

export function canTgModGiftLookCollectible(gift: MyStarGift) {
  return gift.raw._ === 'starGift' && !!gift.raw.upgrade_stars;
}

export async function resolveTgModGift(ref: TgModGiftRef): Promise<TgModGiftLook | undefined> {
  const list = await getTgModGiftCatalogue().catch((): MyStarGift[] => []);
  const gift = list.find((g) => String(g.raw.id) === ref.gift_id);
  if(!gift) return;
  const title = (gift.raw._ === 'starGift' && gift.raw.title) || '';
  if(ref.model || ref.backdrop) {
    const preview = await getTgModGiftPreview(ref.gift_id);
    const model = preview?.models.find((m) => m.name === ref.model);
    const backdrop = preview?.backdrops.find((b) => b.name === ref.backdrop);
    if(model) {
      return {
        doc: model.document as MyDocument,
        title,
        backdrop: backdrop ? {center: toHex(backdrop.center_color), edge: toHex(backdrop.edge_color)} : undefined
      };
    }
  }
  return {doc: gift.sticker, title};
}
