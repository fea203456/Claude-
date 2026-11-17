/*
 * TgMod — the mod's settings screen (Settings → Mod Settings).
 */

import {createSignal, For, onMount, Show} from 'solid-js';
import {i18n, LangPackKey} from '@lib/langPack';
import Section from '@components/section';
import Row from '@components/rowTsx';
import CheckboxFieldTsx from '@components/checkboxFieldTsx';
import {toastNew} from '@components/toast';
import {useAppSettings} from '@stores/appSettings';
import themeController from '@helpers/themeController';
import {TGMOD_THEMES, TgModTheme} from '@/mod/themes';
import {TGMOD_SETTINGS_INIT, TgModSettings} from '@/mod/settings';
import {getTgModCustomSound, setTgModCustomSound, setTgModCustomSoundEnabled, TGMOD_SOUND_MAX_SIZE} from '@/mod/sound';
import {getTgModDesktop, TgModUnblockStatus} from '@/mod/desktop';
import {useSuperTab} from '@components/solidJsTabs/superTabProvider';
import '@components/sidebarLeft/tabs/tgmod.scss';

const ThemeTile = (props: {theme: TgModTheme, selected: boolean, onClick: () => void}) => {
  const [background, accent, bubble] = props.theme.preview;
  return (
    <button
      type="button"
      class="tgmod-theme-tile"
      classList={{'is-selected': props.selected}}
      aria-pressed={props.selected}
      onClick={props.onClick}
    >
      <span class="tgmod-theme-tile-preview" style={{background}}>
        <span class="tgmod-theme-tile-bubble is-in" style={{background: accent}} />
        <span class="tgmod-theme-tile-bubble is-out" style={{background: bubble}} />
      </span>
      <span class="tgmod-theme-tile-name">{i18n(('TgMod.Theme.' + props.theme.id) as LangPackKey)}</span>
    </button>
  );
};

const ToggleRow = (props: {
  title: LangPackKey,
  checked: boolean,
  onChange: (checked: boolean) => void
}) => (
  <Row>
    <Row.CheckboxFieldToggle>
      <CheckboxFieldTsx checked={props.checked} toggle onChange={props.onChange} />
    </Row.CheckboxFieldToggle>
    <Row.Title>{i18n(props.title)}</Row.Title>
  </Row>
);

const TgModTab = () => {
  const [tab] = useSuperTab();
  const [appSettings, setAppSettings] = useAppSettings();
  const mod = (): TgModSettings => appSettings.tgmod ?? TGMOD_SETTINGS_INIT;
  const setMod = <K extends keyof TgModSettings>(key: K, value: TgModSettings[K]) => {
    if(!appSettings.tgmod) {
      setAppSettings('tgmod', {...TGMOD_SETTINGS_INIT, [key]: value});
      return;
    }

    setAppSettings('tgmod', key, value as any);
  };

  const selectTheme = async(theme: TgModTheme) => {
    await setMod('theme', theme.id);
    const isNight = themeController.isNight();
    if(theme.base === 'night' && !isNight) {
      await themeController.switchTheme('night');
    } else if(theme.base === 'day' && isNight) {
      await themeController.switchTheme('day');
    } else {
      themeController.setTheme();
    }
  };

  // * the sound
  const [hasSound, setHasSound] = createSignal(!!getTgModCustomSound());
  let fileInput!: HTMLInputElement;
  const onFile = () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if(!file) return;
    if(file.size > TGMOD_SOUND_MAX_SIZE) {
      toastNew({langPackKey: 'TgMod.Sound.TooBig'});
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTgModCustomSound(reader.result as string);
      setHasSound(true);
      setMod('customSound', true);
      setTgModCustomSoundEnabled(true);
      playSound();
    };
    reader.readAsDataURL(file);
  };
  const playSound = () => {
    const url = getTgModCustomSound();
    if(!url) return;
    const audio = new Audio(url);
    audio.volume = .5;
    audio.play().catch(() => {});
  };

  // * the desktop shell
  const desktop = getTgModDesktop();
  const [unblockStatus, setUnblockStatus] = createSignal<TgModUnblockStatus>();
  onMount(() => {
    desktop?.getUnblockStatus().then(setUnblockStatus);
  });
  const unblockStatusText = () => {
    const status = unblockStatus();
    if(!status) return;
    switch(status.state) {
      case 'off': return i18n('TgMod.Unblock.Status.Off');
      case 'direct': return i18n('TgMod.Unblock.Status.Direct');
      case 'mapped': return i18n('TgMod.Unblock.Status.Mapped', [status.ip]);
      case 'failed': return i18n('TgMod.Unblock.Status.Failed');
      default: return;
    }
  };

  return (
    <>
      <Section name="TgMod.Themes" caption="TgMod.Themes.Caption">
        <div class="tgmod-theme-grid">
          <For each={TGMOD_THEMES}>{(theme) => (
            <ThemeTile
              theme={theme}
              selected={mod().theme === theme.id}
              onClick={() => selectTheme(theme)}
            />
          )}</For>
        </div>
      </Section>

      <Section name="TgMod.Decor" caption="TgMod.Decor.Caption">
        <Row clickable={() => import('@components/solidJsTabs/tabs').then(({AppTgModDecorTab}) => tab.slider.createTab(AppTgModDecorTab).open())}>
          <Row.Icon icon="brush" />
          <Row.Title>{i18n('TgMod.Decor')}</Row.Title>
        </Row>
      </Section>

      <Section name="TgMod.Ghost" caption="TgMod.Ghost.Caption">
        <ToggleRow title="TgMod.Ghost.Online" checked={mod().ghostOnline} onChange={(v) => setMod('ghostOnline', v)} />
        <ToggleRow title="TgMod.Ghost.Read" checked={mod().ghostRead} onChange={(v) => setMod('ghostRead', v)} />
        <ToggleRow title="TgMod.Ghost.Typing" checked={mod().ghostTyping} onChange={(v) => setMod('ghostTyping', v)} />
        <ToggleRow title="TgMod.Ghost.Stories" checked={mod().ghostStories} onChange={(v) => setMod('ghostStories', v)} />
      </Section>

      <Section name="TgMod.Profile">
        <ToggleRow title="TgMod.ShowPeerId" checked={appSettings.showPeerIds} onChange={(v) => setAppSettings('showPeerIds', v)} />
      </Section>

      <Section name="TgMod.Sound" caption="TgMod.Sound.Caption">
        <Show when={hasSound()}>
          <ToggleRow
            title="TgMod.Sound.Custom"
            checked={mod().customSound}
            onChange={(v) => {
              setMod('customSound', v);
              setTgModCustomSoundEnabled(v);
            }}
          />
        </Show>
        <Row clickable={() => fileInput.click()}>
          <Row.Icon icon="download" />
          <Row.Title>{i18n('TgMod.Sound.Choose')}</Row.Title>
        </Row>
        <Show when={hasSound()}>
          <Row clickable={playSound}>
            <Row.Icon icon="play_filled" />
            <Row.Title>{i18n('TgMod.Sound.Test')}</Row.Title>
          </Row>
        </Show>
        <input
          ref={fileInput}
          type="file"
          accept="audio/mpeg,audio/ogg,audio/wav,.mp3,.ogg,.wav"
          class="hide"
          onChange={onFile}
        />
      </Section>

      <Show when={desktop}>
        <Section name="TgMod.Network" caption="TgMod.Unblock.Caption">
          <Row>
            <Row.CheckboxFieldToggle>
              <CheckboxFieldTsx
                checked={mod().unblock}
                toggle
                onChange={(v) => {
                  setMod('unblock', v);
                  desktop.setUnblockEnabled(v).then(() => desktop.getUnblockStatus()).then(setUnblockStatus);
                }}
              />
            </Row.CheckboxFieldToggle>
            <Row.Title>{i18n('TgMod.Unblock')}</Row.Title>
            <Show when={unblockStatusText()}>
              <Row.Subtitle>{unblockStatusText()}</Row.Subtitle>
            </Show>
          </Row>
          <Show when={mod().unblock}>
            <Row clickable={() => {
              setUnblockStatus({state: 'scanning'});
              desktop.rescanUnblock().then(setUnblockStatus);
            }}>
              <Row.Icon icon="rotate_right" />
              <Row.Title>{i18n('TgMod.Unblock.Rescan')}</Row.Title>
            </Row>
          </Show>
          <Row clickable={() => desktop.restart()}>
            <Row.Icon icon="rotate_right" />
            <Row.Title>{i18n('TgMod.Restart')}</Row.Title>
          </Row>
        </Section>
      </Show>
    </>
  );
};

export default TgModTab;
