/*
 * TgMod — themes. A mod theme paints over the theme tweb has just applied: its palette goes through
 * `themeController.applyAppColor`, so the derived variables (`-rgb`, `light-`, `dark-`) follow, and its
 * outgoing bubbles through tweb's own gradient. Decorations live in `themes.scss` under `html.tgmod-<id>`.
 */

import type {AppColorName} from '@helpers/themeController';
import type {TgModThemeId} from '@/mod/settings';
import {applyOutgoingMessageGradient, getOutgoingMessageGradient} from '@helpers/outgoingMessageGradient';
import {hexToRgb} from '@helpers/color';
import '@/mod/themes.scss';

export type TgModTheme = {
  id: TgModThemeId,
  // * the base tweb mode the palette is made for; 'any' themes only decorate
  base: 'night' | 'day' | 'any',
  colors?: Partial<Record<AppColorName, string>>,
  // * the outgoing bubbles' gradient, top to bottom
  bubbles?: string[],
  bubblesAnimated?: boolean,
  // * three colours for the picker's preview tile
  preview: [string, string, string]
};

export const TGMOD_THEMES: TgModTheme[] = [{
  id: 'none',
  base: 'any',
  preview: ['#ffffff', '#3390ec', '#eeffde']
}, {
  id: 'neon',
  base: 'night',
  colors: {
    'primary-color': '#a66bff',
    'link-color': '#5ad7ff',
    'background-color': '#0e0b1f',
    'surface-color': '#161229',
    'body-background-color': '#0a0817',
    'border-color': '#2a2450',
    'input-search-background-color': '#1d1838',
    'message-background-color': '#1d1838',
    'message-out-background-color': '#5b2fc9',
    'message-out-primary-color': '#e6dcff',
    'primary-text-color': '#f3efff',
    'secondary-text-color': '#8f88b8',
    'secondary-color': '#8f88b8'
  },
  bubbles: ['#7b3ff2', '#5b2fc9', '#2d7ff9', '#0fb5e8'],
  bubblesAnimated: true,
  preview: ['#0e0b1f', '#a66bff', '#2d7ff9']
}, {
  id: 'amoled',
  base: 'night',
  colors: {
    'background-color': '#000000',
    'surface-color': '#000000',
    'body-background-color': '#000000',
    'border-color': '#1c1c1c',
    'input-search-background-color': '#121212',
    'message-background-color': '#141414',
    'message-out-background-color': '#22344d',
    'secondary-text-color': '#8a8a8a',
    'secondary-color': '#8a8a8a'
  },
  preview: ['#000000', '#3390ec', '#22344d']
}, {
  id: 'glass',
  base: 'any',
  preview: ['#c9d6ff', '#e2e2ff', '#7f9cf5']
}, {
  id: 'sunset',
  base: 'day',
  colors: {
    'primary-color': '#f2622e',
    'link-color': '#d9481a',
    'background-color': '#fff5ee',
    'surface-color': '#fffaf6',
    'body-background-color': '#fbe6da',
    'border-color': '#f1d6c8',
    'input-search-background-color': '#fbece3',
    'message-background-color': '#ffffff',
    'message-out-background-color': '#ffdcc8',
    'message-out-primary-color': '#c2410c',
    'secondary-text-color': '#9a7769',
    'secondary-color': '#9a7769'
  },
  bubbles: ['#ffe3c4', '#ffd2c2', '#ffc9d6'],
  preview: ['#fff5ee', '#f2622e', '#ffc9d6']
}, {
  id: 'mint',
  base: 'day',
  colors: {
    'primary-color': '#14a689',
    'link-color': '#0f8a72',
    'background-color': '#f1faf7',
    'surface-color': '#ffffff',
    'body-background-color': '#e2f3ed',
    'border-color': '#d3ebe2',
    'input-search-background-color': '#e9f6f1',
    'message-background-color': '#ffffff',
    'message-out-background-color': '#d3f4e8',
    'message-out-primary-color': '#0f8a72',
    'secondary-text-color': '#668a80',
    'secondary-color': '#668a80'
  },
  preview: ['#f1faf7', '#14a689', '#d3f4e8']
}];

export function getTgModTheme(id: TgModThemeId) {
  return TGMOD_THEMES.find((theme) => theme.id === id) ?? TGMOD_THEMES[0];
}

type ColorApplier = {
  applyAppColor: (options: {name: AppColorName, hex: string, element: HTMLElement, isNight?: boolean}) => void
};

/**
 * Called by `themeController._setTheme` right after the stock theme is applied.
 * Returns whether the palette was applied (it is skipped while the mode does not match).
 */
export function applyTgModTheme(controller: ColorApplier, id: TgModThemeId, isNight: boolean) {
  const root = document.documentElement;
  for(const theme of TGMOD_THEMES) {
    root.classList.toggle('tgmod-' + theme.id, theme.id === id && id !== 'none');
  }

  const theme = getTgModTheme(id);
  const matches = theme.base === 'any' || (theme.base === 'night') === isNight;
  root.classList.toggle('tgmod-themed', id !== 'none' && matches);
  if(!theme.colors || !matches) {
    return false;
  }

  for(const name in theme.colors) {
    controller.applyAppColor({
      name: name as AppColorName,
      hex: theme.colors[name as AppColorName],
      element: root,
      isNight
    });
  }

  if(theme.bubbles) {
    const textColor = hexToRgb(theme.colors['primary-text-color'] ?? (isNight ? '#ffffff' : '#000000'));
    const colors = theme.bubbles.map((hex) => parseInt(hex.slice(1), 16));
    applyOutgoingMessageGradient(root, getOutgoingMessageGradient(colors, !!theme.bubblesAnimated, textColor));
  }

  return true;
}
