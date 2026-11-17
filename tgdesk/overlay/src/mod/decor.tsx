/*
 * TgMod — other mod users' decoration in their profile: a frame around the avatar, a banner behind
 * the header, and a showcase of their stickers and pictures. Everything here is marked as TgMod's,
 * apart from Telegram's own profile data.
 */

import {createEffect, createResource, createSignal, For, on, onCleanup, Show} from 'solid-js';
import {i18n} from '@lib/langPack';
import Section from '@components/section';
import rootScope from '@lib/rootScope';
import {appSettings} from '@stores/appSettings';
import {getTgModProfile, getTgModSyncUrl, isTgModSignedIn, onTgModProfileUpdated, reportTgModProfile, TgModRemoteProfile} from '@/mod/sync';
import {toastNew} from '@components/toast';
import {TGMOD_FRAMES} from '@/mod/frames';
import {TgModMediaView} from '@/mod/media';
import {TgModFloatingItem, TgModHeaderEffect} from '@/mod/bubbles';
import {TgModGiftView} from '@/mod/media';
import '@/mod/decor.scss';

export {TgModMediaView};

function useTgModProfile(peerId: () => PeerId) {
  const [version, setVersion] = createSignal(0);
  const unsubscribe = onTgModProfileUpdated((userId) => {
    if(userId === peerId().toUserId()) setVersion((v) => v + 1);
  });
  onCleanup(unsubscribe);

  const [profile] = createResource(
    () => {
      const id = peerId();
      // * people only, and only with a server set up and others' decoration on
      if(!id?.isUser() || !getTgModSyncUrl()) return;
      void appSettings.tgmod?.showOthers;
      return {userId: id.toUserId(), version: version()};
    },
    ({userId, version}) => getTgModProfile(userId, version > 0)
  );
  return profile;
}

// * what floats in the header: the gifts worn as decoration first, then the showcase, ten at most
function floating(profile: TgModRemoteProfile): TgModFloatingItem[] {
  return [
    ...profile.gifts.map((gift) => ({gift})),
    ...profile.showcase.map((media) => ({media}))
  ].slice(0, 10);
}

/**
 * Lives inside the profile header (`.profile-avatars-container`): puts the frame's class on it and
 * the banner behind the avatar.
 */
export const TgModProfileHeader = (props: {peerId: PeerId, container: HTMLElement}) => {
  const profile = useTgModProfile(() => props.peerId);

  createEffect(on(profile, (value: TgModRemoteProfile | null | undefined) => {
    const {container} = props;
    for(const frame of TGMOD_FRAMES) {
      container.classList.toggle('tgmod-frame-' + frame, value?.frame === frame);
    }
    container.classList.toggle('tgmod-has-frame', !!value?.frame);
    container.classList.toggle('tgmod-has-banner', !!value?.banner);
  }));

  onCleanup(() => {
    const {container} = props;
    container.classList.remove('tgmod-has-frame', 'tgmod-has-banner', ...TGMOD_FRAMES.map((f) => 'tgmod-frame-' + f));
  });

  // * an element even without a banner: the header takes whatever this returns as its child
  return (
    <div class="tgmod-header-decor">
      <div class="tgmod-banner" classList={{'is-empty': !profile()?.banner}} aria-hidden="true">
        <Show when={profile()?.banner}>
          {(banner) => (
            <>
              <TgModMediaView media={banner()} class="tgmod-banner-media" />
              <div class="tgmod-banner-shade" />
            </>
          )}
        </Show>
      </div>
      <Show keyed when={profile()?.effect && floating(profile()).length ? profile() : undefined}>
        {(value) => (
          <TgModHeaderEffect effect={value.effect} items={floating(value)} container={props.container} />
        )}
      </Show>
      <Show when={profile() && (profile().frame || profile().banner || (profile().effect && floating(profile()).length))}>
        <div class="tgmod-header-badge">{i18n('TgMod.Showcase.Badge')}</div>
      </Show>
    </div>
  );
};

/** The showcase card under the profile's info. */
export const TgModShowcase = (props: {peerId: PeerId}) => {
  const profile = useTgModProfile(() => props.peerId);
  const items = () => profile()?.showcase ?? [];
  const gifts = () => profile()?.gifts ?? [];
  const isMe = () => props.peerId === rootScope.myId;
  const [reported, setReported] = createSignal(false);
  const report = () => {
    reportTgModProfile(props.peerId.toUserId(), 'profile').then(() => {
      setReported(true);
      toastNew({langPackKey: 'TgMod.Decor.Reported'});
    }, () => {});
  };

  return (
    <Show when={items().length || gifts().length || profile()?.caption}>
      <Section
        name="TgMod.Showcase"
        caption={isMe() ? 'TgMod.Showcase.CaptionMine' : 'TgMod.Showcase.Caption'}
        class="tgmod-showcase-section"
      >
        <Show when={profile()?.caption}>
          <div class="tgmod-showcase-caption" dir="auto">{profile().caption}</div>
        </Show>
        <div class="tgmod-showcase">
          <For each={gifts()}>{(gift) => (
            <div class="tgmod-showcase-item is-gift">
              <TgModGiftView gift={gift} size={96} />
            </div>
          )}</For>
          <For each={items()}>{(media) => (
            <div class="tgmod-showcase-item">
              <TgModMediaView media={media} size={96} />
            </div>
          )}</For>
        </div>
        <div class="tgmod-showcase-footer">
          <div class="tgmod-showcase-badge">{i18n('TgMod.Showcase.Badge')}</div>
          <Show when={!isMe() && isTgModSignedIn() && !reported()}>
            <button type="button" class="tgmod-showcase-report" onClick={report}>{i18n('TgMod.Decor.Report')}</button>
          </Show>
        </div>
      </Section>
    </Show>
  );
};
