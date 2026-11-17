/*
 * TgMod — other mod users' decoration in their profile: a frame around the avatar, a banner behind
 * the header, and a showcase of their stickers and pictures. Everything here is marked as TgMod's,
 * apart from Telegram's own profile data.
 */

import {createEffect, createResource, createSignal, For, JSX, on, onCleanup, onMount, Show} from 'solid-js';
import {i18n} from '@lib/langPack';
import Section from '@components/section';
import rootScope from '@lib/rootScope';
import apiManagerProxy from '@lib/apiManagerProxy';
import lottieLoader from '@lib/lottie/lottieLoader';
import type LottiePlayer from '@lib/lottie/lottiePlayer';
import {appSettings} from '@stores/appSettings';
import {getTgModProfile, getTgModSyncUrl, isTgModSignedIn, onTgModProfileUpdated, reportTgModProfile, TgModMedia, TgModRemoteProfile} from '@/mod/sync';
import {toastNew} from '@components/toast';
import {TGMOD_FRAMES} from '@/mod/frames';
import '@/mod/decor.scss';

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

const TgsView = (props: {url: string, size: number}) => {
  let container!: HTMLDivElement;
  let player: LottiePlayer;
  let destroyed = false;
  onMount(async() => {
    try {
      const response = await fetch(props.url, {referrerPolicy: 'no-referrer'});
      const data = await response.arrayBuffer();
      const json = await apiManagerProxy.invokeCrypto('gzipUncompress', data);
      if(destroyed) return;
      player = await lottieLoader.loadAnimationWorker({
        container,
        animationData: new Blob([json as any]),
        loop: true,
        autoplay: true,
        width: props.size,
        height: props.size,
        needUpscale: true,
        name: 'tgmod:' + props.url
      });
      if(destroyed) player.remove();
    } catch(err) {
      container.classList.add('is-failed');
    }
  });
  onCleanup(() => {
    destroyed = true;
    player?.remove();
  });
  return <div ref={container} class="tgmod-media tgmod-media-tgs" />;
};

// * the page's CSP lets pictures and videos come only from itself and `blob:`, so the files are fetched
// * and shown from blobs; the response must be of the type the server said the file is
const blobUrls = new Map<string, Promise<string>>();
function getMediaBlobUrl(media: TgModMedia) {
  let promise = blobUrls.get(media.id);
  if(!promise) {
    promise = fetch(media.url, {referrerPolicy: 'no-referrer'}).then(async(response) => {
      if(!response.ok || response.headers.get('Content-Type') !== media.type) throw new Error('TGMOD_BAD_MEDIA');
      return URL.createObjectURL(new Blob([await response.arrayBuffer()], {type: media.type}));
    });
    promise.catch(() => blobUrls.delete(media.id));
    blobUrls.set(media.id, promise);
  }
  return promise;
}

const BlobMedia = (props: {media: TgModMedia, class?: string}) => {
  const [src] = createResource(() => props.media, (media) => getMediaBlobUrl(media).catch((): string => undefined));
  const className = () => 'tgmod-media ' + (props.class ?? '');
  return (
    <Show when={src()} fallback={<div class={className() + ' is-loading'} />}>
      <Show
        when={props.media.type === 'video/webm'}
        fallback={<img class={className()} src={src()} alt="" decoding="async" draggable={false} />}
      >
        <video class={className()} src={src()} muted loop autoplay playsinline disablepictureinpicture />
      </Show>
    </Show>
  );
};

export const TgModMediaView = (props: {media: TgModMedia, size?: number, class?: string}): JSX.Element => {
  const size = () => props.size ?? 96;
  return (
    <Show
      when={props.media.type === 'application/x-tgsticker'}
      fallback={<BlobMedia media={props.media} class={props.class} />}
    >
      <TgsView url={props.media.url} size={size()} />
    </Show>
  );
};

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
  );
};

/** The showcase card under the profile's info. */
export const TgModShowcase = (props: {peerId: PeerId}) => {
  const profile = useTgModProfile(() => props.peerId);
  const items = () => profile()?.showcase ?? [];
  const isMe = () => props.peerId === rootScope.myId;
  const [reported, setReported] = createSignal(false);
  const report = () => {
    reportTgModProfile(props.peerId.toUserId(), 'profile').then(() => {
      setReported(true);
      toastNew({langPackKey: 'TgMod.Decor.Reported'});
    }, () => {});
  };

  return (
    <Show when={items().length || profile()?.caption}>
      <Section
        name="TgMod.Showcase"
        caption={isMe() ? 'TgMod.Showcase.CaptionMine' : 'TgMod.Showcase.Caption'}
        class="tgmod-showcase-section"
      >
        <Show when={profile()?.caption}>
          <div class="tgmod-showcase-caption" dir="auto">{profile().caption}</div>
        </Show>
        <div class="tgmod-showcase">
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
