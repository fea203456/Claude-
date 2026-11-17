/*
 * TgMod — Mod Settings → Profile Decoration: sign in to the sync server and publish a frame,
 * a banner and a showcase that other mod users see in this account's profile.
 */

import {createSignal, For, onMount, Show} from 'solid-js';
import {i18n, LangPackKey} from '@lib/langPack';
import Section from '@components/section';
import Row from '@components/rowTsx';
import CheckboxFieldTsx from '@components/checkboxFieldTsx';
import Button from '@components/buttonTsx';
import {InputFieldTsx} from '@components/inputFieldTsx';
import type InputField from '@components/inputField';
import {toastNew} from '@components/toast';
import confirmationPopup from '@components/confirmationPopup';
import rootScope from '@lib/rootScope';
import {useAppSettings} from '@stores/appSettings';
import {TGMOD_SETTINGS_INIT} from '@/mod/settings';
import {TGMOD_FRAMES, TgModFrameId} from '@/mod/frames';
import {TGMOD_EFFECTS, TgModEffectId} from '@/mod/effects';
import {
  clearTgModProfile,
  getTgModProfile,
  getTgModSyncUrl,
  isTgModSignedIn,
  publishTgModProfile,
  signInTgModSync,
  signOutTgModSync,
  TgModMedia,
  TgModSyncError,
  uploadTgModMedia
} from '@/mod/sync';
import {TgModMediaView} from '@/mod/decor';
import '@components/sidebarLeft/tabs/tgmod.scss';

const MAX_SIZE = 2 * 1024 * 1024;
const SHOWCASE_MAX = 8;

const showError = (err: unknown) => {
  toastNew({langPackKey: 'TgMod.Decor.Error', langPackArguments: [(err as TgModSyncError)?.code ?? String(err)]});
};

const TgModDecorTab = () => {
  const [appSettings, setAppSettings] = useAppSettings();
  const mod = () => appSettings.tgmod ?? TGMOD_SETTINGS_INIT;

  const [serverUrl, setServerUrl] = createSignal(getTgModSyncUrl());
  const [signedIn, setSignedIn] = createSignal(isTgModSignedIn());
  const [signingIn, setSigningIn] = createSignal(false);
  const [busy, setBusy] = createSignal(false);

  const [frame, setFrame] = createSignal<TgModFrameId | null>(null);
  const [effect, setEffect] = createSignal<TgModEffectId | null>('bubbles');
  const [banner, setBanner] = createSignal<TgModMedia | null>(null);
  const [showcase, setShowcase] = createSignal<TgModMedia[]>([]);
  let captionField: InputField;

  const loadMine = async() => {
    if(!getTgModSyncUrl()) return;
    const profile = await getTgModProfile(rootScope.myId.toUserId(), true);
    setFrame(profile?.frame ?? null);
    if(profile) setEffect(profile.effect ?? null);
    setBanner(profile?.banner ?? null);
    setShowcase(profile?.showcase ?? []);
    if(captionField) captionField.value = profile?.caption ?? '';
  };
  onMount(loadMine);

  const saveServer = (url: string) => {
    url = url.trim().replace(/\/+$/, '');
    if(url && !/^https:\/\/[^\s/]+/.test(url) && !/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?/.test(url)) {
      toastNew({langPackKey: 'TgMod.Decor.Error', langPackArguments: ['https://…']});
      return;
    }
    setAppSettings('tgmod', {...mod(), syncUrl: url});
    setServerUrl(url);
    setSignedIn(isTgModSignedIn());
    loadMine();
  };

  const signIn = async() => {
    setSigningIn(true);
    try {
      await signInTgModSync();
      setSignedIn(true);
      await loadMine();
    } catch(err) {
      showError(err);
    } finally {
      setSigningIn(false);
    }
  };

  const pickFile = (accept: string, onPicked: (file: File) => void) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if(!file) return;
      if(file.size > MAX_SIZE) {
        toastNew({langPackKey: 'TgMod.Decor.Error', langPackArguments: ['> 2 MB']});
        return;
      }
      onPicked(file);
    }, {once: true});
    input.click();
  };

  const upload = async(file: File) => {
    setBusy(true);
    toastNew({langPackKey: 'TgMod.Decor.Uploading'});
    try {
      return await uploadTgModMedia(file);
    } catch(err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const chooseBanner = () => pickFile('image/png,image/jpeg,image/gif,image/webp,video/webm', async(file) => {
    const media = await upload(file);
    if(media) setBanner(media);
  });

  const addToShowcase = () => pickFile('image/png,image/jpeg,image/gif,image/webp,video/webm,.tgs', async(file) => {
    const media = await upload(file);
    if(media && !showcase().some((m) => m.id === media.id)) setShowcase([...showcase(), media].slice(0, SHOWCASE_MAX));
  });

  const publish = async() => {
    setBusy(true);
    try {
      await publishTgModProfile({
        frame: frame(),
        effect: effect(),
        banner: banner()?.id ?? null,
        showcase: showcase().map((m) => m.id),
        caption: captionField?.value.trim() || null
      });
      toastNew({langPackKey: 'TgMod.Decor.Published'});
    } catch(err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async() => {
    await confirmationPopup({
      titleLangKey: 'TgMod.Decor.Clear',
      descriptionLangKey: 'TgMod.Decor.Caption',
      button: {langKey: 'Delete', isDanger: true}
    });
    setBusy(true);
    try {
      await clearTgModProfile();
      setFrame(null);
      setBanner(null);
      setShowcase([]);
      if(captionField) captionField.value = '';
      toastNew({langPackKey: 'TgMod.Decor.Cleared'});
    } catch(err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Section name="TgMod.Decor.Server" caption="TgMod.Decor.ServerCaption">
        <div class="tgmod-decor-server">
          <InputFieldTsx
            name="tgmod-sync-url"
            label="TgMod.Decor.Server"
            placeholder="TgMod.Decor.ServerPlaceholder"
            plainText
            value={serverUrl()}
            instanceRef={(field) => {
              field.input.addEventListener('change', () => saveServer(field.value));
            }}
          />
        </div>
      </Section>

      <Show when={serverUrl()}>
        <Section caption="TgMod.Decor.SignIn.Caption">
          <Show
            when={signedIn()}
            fallback={
              <Row clickable={signingIn() ? undefined : signIn}>
                <Row.Icon icon="lock" />
                <Row.Title>{i18n(signingIn() ? 'TgMod.Decor.SignIn.Waiting' : 'TgMod.Decor.SignIn')}</Row.Title>
              </Row>
            }
          >
            <Row clickable={() => { signOutTgModSync(); setSignedIn(false); }}>
              <Row.Icon icon="lockoff" />
              <Row.Title>{i18n('TgMod.Decor.SignOut')}</Row.Title>
              <Row.Subtitle>{i18n('TgMod.Decor.SignedIn')}</Row.Subtitle>
            </Row>
          </Show>
        </Section>

        <Section name="TgMod.Decor.Frame">
          <div class="tgmod-theme-grid">
            <button
              type="button"
              class="tgmod-theme-tile"
              classList={{'is-selected': !frame()}}
              onClick={() => setFrame(null)}
            >
              <span class="tgmod-frame-swatch-wrap"><span class="tgmod-frame-swatch" /></span>
              <span class="tgmod-theme-tile-name">{i18n('TgMod.Decor.Frame.none')}</span>
            </button>
            <For each={TGMOD_FRAMES}>{(id) => (
              <button
                type="button"
                class="tgmod-theme-tile"
                classList={{'is-selected': frame() === id}}
                onClick={() => setFrame(id)}
              >
                <span class={'tgmod-frame-swatch-wrap tgmod-frame-' + id}><span class="tgmod-frame-swatch" /></span>
                <span class="tgmod-theme-tile-name">{i18n(('TgMod.Frame.' + id) as LangPackKey)}</span>
              </button>
            )}</For>
          </div>
        </Section>

        <Section name="TgMod.Decor.Effect" caption="TgMod.Decor.Effect.Caption">
          <For each={[null, ...TGMOD_EFFECTS] as (TgModEffectId | null)[]}>{(id) => (
            <Row clickable={() => setEffect(id)}>
              <Row.Icon icon={effect() === id ? 'check' : 'animations'} />
              <Row.Title>{i18n(('TgMod.Effect.' + (id ?? 'none')) as LangPackKey)}</Row.Title>
            </Row>
          )}</For>
        </Section>

        <Section name="TgMod.Decor.Banner">
          <Show when={banner()}>
            <div class="tgmod-decor-banner-preview">
              <TgModMediaView media={banner()} class="tgmod-banner-media" />
            </div>
          </Show>
          <Row clickable={signedIn() && !busy() ? chooseBanner : undefined} fakeDisabled={!signedIn()}>
            <Row.Icon icon="image" />
            <Row.Title>{i18n('TgMod.Decor.Banner.Choose')}</Row.Title>
          </Row>
          <Show when={banner()}>
            <Row clickable={() => setBanner(null)}>
              <Row.Icon icon="delete" />
              <Row.Title>{i18n('TgMod.Decor.Banner.Remove')}</Row.Title>
            </Row>
          </Show>
        </Section>

        <Section name="TgMod.Decor.Showcase" caption="TgMod.Decor.Showcase.Caption">
          <Show when={showcase().length}>
            <div class="tgmod-decor-showcase">
              <For each={showcase()}>{(media) => (
                <button
                  type="button"
                  class="tgmod-decor-showcase-item"
                  aria-label="Remove"
                  onClick={() => setShowcase(showcase().filter((m) => m.id !== media.id))}
                >
                  <TgModMediaView media={media} size={72} />
                  <span class="tgmod-decor-showcase-remove">×</span>
                </button>
              )}</For>
            </div>
          </Show>
          <Show when={showcase().length < SHOWCASE_MAX}>
            <Row clickable={signedIn() && !busy() ? addToShowcase : undefined} fakeDisabled={!signedIn()}>
              <Row.Icon icon="add" />
              <Row.Title>{i18n('TgMod.Decor.Showcase.Add')}</Row.Title>
            </Row>
          </Show>
          <div class="tgmod-decor-caption">
            <InputFieldTsx
              name="tgmod-caption"
              label="TgMod.Decor.Text"
              plainText
              maxLength={70}
              instanceRef={(field) => captionField = field}
            />
          </div>
        </Section>

        <Section>
          <div class="tgmod-decor-actions">
            <Button primaryFilled text="TgMod.Decor.Publish" disabled={!signedIn() || busy()} onClick={publish} />
          </div>
          <Show when={signedIn()}>
            <Row clickable={busy() ? undefined : clearAll}>
              <Row.Icon icon="delete" class="danger" />
              <Row.Title class="danger">{i18n('TgMod.Decor.Clear')}</Row.Title>
            </Row>
          </Show>
        </Section>

        <Section name="TgMod.Decor.ShowOthers" caption="TgMod.Decor.ShowOthers.Caption">
          <Row>
            <Row.CheckboxFieldToggle>
              <CheckboxFieldTsx
                checked={mod().showOthers}
                toggle
                onChange={(v) => setAppSettings('tgmod', {...mod(), showOthers: v})}
              />
            </Row.CheckboxFieldToggle>
            <Row.Title>{i18n('TgMod.Decor.ShowOthers')}</Row.Title>
          </Row>
        </Section>
      </Show>
    </>
  );
};

export default TgModDecorTab;
