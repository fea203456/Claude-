/*
 * TgMod — showing a decoration file: pictures and videos through blob URLs (tweb's CSP allows no other
 * origin for them), .tgs stickers through tweb's Lottie player.
 */

import {createResource, JSX, onCleanup, onMount, Show} from 'solid-js';
import apiManagerProxy from '@lib/apiManagerProxy';
import lottieLoader from '@lib/lottie/lottieLoader';
import type LottiePlayer from '@lib/lottie/lottiePlayer';
import type {TgModMedia} from '@/mod/sync';

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

