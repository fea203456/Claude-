/*
 * TgMod — the showcase items floating in the profile header.
 *
 * "bubbles": each item sits in a soap bubble that drifts, wobbles, bumps into the others and keeps
 * off the avatar; now and then one swells and floats over everything, and a click swells it too.
 * "orbit": the items circle the avatar on a tilted ellipse.
 *
 * Plain DOM moved by transforms from one requestAnimationFrame loop; it stops while the header is
 * out of sight or expanded, and stands still with the system's reduced motion or power saving.
 */

import {createEffect, For, onCleanup, onMount} from 'solid-js';
import liteMode from '@helpers/liteMode';
import type {TgModGiftRef, TgModMedia} from '@/mod/sync';
import type {TgModEffectId} from '@/mod/effects';
import {TgModGiftView, TgModMediaView} from '@/mod/media';

export type TgModFloatingItem = {media: TgModMedia, gift?: undefined} | {gift: TgModGiftRef, media?: undefined};
import '@/mod/bubbles.scss';

type Body = {
  el: HTMLElement,
  x: number,
  y: number,
  vx: number,
  vy: number,
  r: number,
  phase: number,
  swell: number,
  swellTarget: number,
  swellUntil: number
};

const BASE_RADIUS = 30;
const SPEED = 26;
const SWELL_SCALE = 2.3;
const SWELL_MS = 2600;

type Avatar = {x: number, y: number, r: number};

function readAvatar(container: HTMLElement, width: number, height: number): Avatar {
  const avatar = container.querySelector<HTMLElement>('.profile-avatars-avatar.active');
  const box = container.getBoundingClientRect();
  if(avatar && box.width) {
    const rect = avatar.getBoundingClientRect();
    if(rect.width) {
      return {x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2, r: rect.width / 2};
    }
  }
  return {x: width / 2, y: height * .3, r: 60};
}

function isCollapsed(container: HTMLElement) {
  return !!container.closest('.profile-container')?.classList.contains('is-collapsed');
}

export const TgModHeaderEffect = (props: {effect: TgModEffectId, items: TgModFloatingItem[], container: HTMLElement}) => {
  let layer!: HTMLDivElement;
  let bodies: Body[] = [];
  let frame = 0;
  let last = 0;
  let width = 0;
  let height = 0;
  let avatar: Avatar = {x: 0, y: 0, r: 60};
  let avatarReadAt = 0;
  let visible = true;
  let nextSwellAt = 0;
  const still = () => !liteMode.isAvailable('motion');

  // * the bubbles keep above the row of buttons, so they never cover them
  const measure = () => {
    width = props.container.clientWidth;
    height = props.container.clientHeight;
    const actions = props.container.querySelector<HTMLElement>('.profile-actions');
    if(actions) {
      const top = actions.getBoundingClientRect().top - props.container.getBoundingClientRect().top;
      if(top > 120) height = Math.min(height, top - 6);
    }
    avatar = readAvatar(props.container, width, height);
  };

  const place = (body: Body, scale: number, sx = 1, sy = 1) => {
    body.el.style.transform = `translate3d(${body.x - body.r}px, ${body.y - body.r}px, 0) scale(${scale * sx}, ${scale * sy})`;
    body.el.style.zIndex = body.swell > 1.2 ? '3' : '1';
  };

  // * a start for each item around the avatar, not on it
  const scatter = () => {
    bodies.forEach((body, i) => {
      const angle = (i / bodies.length) * Math.PI * 2 + .4;
      const distance = avatar.r + BASE_RADIUS * 2.2 + (i % 2) * 22;
      body.x = Math.min(Math.max(avatar.x + Math.cos(angle) * distance * 1.6, body.r), width - body.r);
      body.y = Math.min(Math.max(avatar.y + Math.sin(angle) * distance * .8, body.r), height - body.r);
      const heading = Math.random() * Math.PI * 2;
      body.vx = Math.cos(heading) * SPEED;
      body.vy = Math.sin(heading) * SPEED;
      place(body, 1);
    });
  };

  const swell = (body: Body, now: number) => {
    body.swellTarget = SWELL_SCALE;
    body.swellUntil = now + SWELL_MS;
  };

  const stepBubbles = (dt: number, now: number) => {
    if(now > nextSwellAt && bodies.length) {
      swell(bodies[Math.floor(Math.random() * bodies.length)], now);
      nextSwellAt = now + 5500 + Math.random() * 4000;
    }

    for(const body of bodies) {
      if(body.swellUntil && now > body.swellUntil) {
        body.swellTarget = 1;
        body.swellUntil = 0;
      }
      body.swell += (body.swellTarget - body.swell) * Math.min(1, dt * 2.2);
      const r = body.r * body.swell;

      // * a slow wander, kept to about the same speed
      body.vx += (Math.random() - .5) * 18 * dt;
      body.vy += (Math.random() - .5) * 18 * dt;
      const speed = Math.hypot(body.vx, body.vy) || 1;
      const wanted = body.swell > 1.2 ? SPEED * .6 : SPEED;
      body.vx += (body.vx / speed * wanted - body.vx) * dt;
      body.vy += (body.vy / speed * wanted - body.vy) * dt;

      body.x += body.vx * dt;
      body.y += body.vy * dt;

      // * the header's edges
      if(body.x < r * .6) { body.x = r * .6; body.vx = Math.abs(body.vx); }
      if(body.x > width - r * .6) { body.x = width - r * .6; body.vx = -Math.abs(body.vx); }
      if(body.y < r * .6) { body.y = r * .6; body.vy = Math.abs(body.vy); }
      // * the bottom edge takes the whole bubble: it must never lie over the buttons below
      if(body.y > height - r) { body.y = height - r; body.vy = -Math.abs(body.vy); }

      // * the avatar pushes small bubbles away; a swollen one floats over it
      if(body.swell < 1.2) {
        const dx = body.x - avatar.x;
        const dy = body.y - avatar.y;
        const distance = Math.hypot(dx, dy) || 1;
        const min = avatar.r + r * .85;
        if(distance < min) {
          const push = (min - distance) / distance;
          body.x += dx * push;
          body.y += dy * push;
          const dot = (body.vx * dx + body.vy * dy) / distance;
          if(dot < 0) {
            body.vx -= 2 * dot * dx / distance;
            body.vy -= 2 * dot * dy / distance;
          }
        }
      }
    }

    // * bubbles bump into each other softly
    for(let i = 0; i < bodies.length; ++i) {
      for(let j = i + 1; j < bodies.length; ++j) {
        const a = bodies[i];
        const b = bodies[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy) || 1;
        const min = (a.r * a.swell + b.r * b.swell) * .9;
        if(distance < min) {
          const overlap = (min - distance) / 2 / distance;
          a.x -= dx * overlap; a.y -= dy * overlap;
          b.x += dx * overlap; b.y += dy * overlap;
          const nx = dx / distance;
          const ny = dy / distance;
          const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if(relative < 0) {
            a.vx += relative * nx; a.vy += relative * ny;
            b.vx -= relative * nx; b.vy -= relative * ny;
          }
        }
      }
    }

    // * the wobble of a soap film: one axis stretches as the other gives
    for(const body of bodies) {
      const t = now / 1000 + body.phase;
      const wobble = .045 * Math.sin(t * 2.3);
      place(body, body.swell, 1 + wobble, 1 - wobble * .8 + .02 * Math.sin(t * 3.7));
    }
  };

  const stepOrbit = (now: number) => {
    const t = now / 1000;
    const rx = Math.min(width / 2 - BASE_RADIUS * .8, avatar.r * 2.4);
    const ry = Math.min(avatar.r * 1.05, height / 2);
    bodies.forEach((body, i) => {
      const angle = t * .45 + (i / bodies.length) * Math.PI * 2;
      body.x = avatar.x + Math.cos(angle) * rx;
      body.y = avatar.y + Math.sin(angle) * ry;
      // * the far side of the orbit goes behind the avatar, smaller
      const depth = (Math.sin(angle) + 1) / 2;
      body.swell = .75 + depth * .35;
      place(body, body.swell);
      body.el.style.zIndex = depth > .5 ? '3' : '0';
      body.el.style.opacity = String(.55 + depth * .45);
    });
  };

  const loop = (now: number) => {
    frame = 0;
    const collapsed = isCollapsed(props.container);
    layer.classList.toggle('is-hidden', !collapsed);
    if(!visible || !collapsed || document.hidden) {
      last = 0;
      frame = requestAnimationFrame(loop);
      return;
    }

    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    if(now - avatarReadAt > 400) {
      avatarReadAt = now;
      measure();
    }

    if(!still()) {
      if(props.effect === 'orbit') stepOrbit(now);
      else stepBubbles(dt, now);
    }
    frame = requestAnimationFrame(loop);
  };

  onMount(() => {
    measure();
    bodies = [...layer.querySelectorAll<HTMLElement>('.tgmod-bubble')].map((el, i) => ({
      el,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      r: BASE_RADIUS - (i % 3) * 3,
      phase: Math.random() * 10,
      swell: 1,
      swellTarget: 1,
      swellUntil: 0
    }));
    bodies.forEach((body) => {
      body.el.style.width = body.el.style.height = body.r * 2 + 'px';
      body.el.addEventListener('click', (e) => {
        e.stopPropagation();
        if(props.effect === 'bubbles') swell(body, performance.now());
      });
    });
    scatter();
    nextSwellAt = performance.now() + 3000;

    const resize = new ResizeObserver(() => {
      const wasEmpty = !width;
      measure();
      if(wasEmpty) scatter();
    });
    resize.observe(props.container);
    const intersection = new IntersectionObserver(([entry]) => visible = entry.isIntersecting);
    intersection.observe(layer);
    frame = requestAnimationFrame(loop);

    onCleanup(() => {
      resize.disconnect();
      intersection.disconnect();
      cancelAnimationFrame(frame);
    });
  });

  createEffect(() => layer.classList.toggle('is-orbit', props.effect === 'orbit'));

  return (
    <div ref={layer} class="tgmod-bubbles" aria-hidden="true">
      <For each={props.items}>{(item) => (
        <div class="tgmod-bubble">
          <div class="tgmod-bubble-content" classList={{'is-gift': !!item.gift}}>
            {item.gift ? <TgModGiftView gift={item.gift} size={48} /> : <TgModMediaView media={item.media} size={44} />}
          </div>
        </div>
      )}</For>
    </div>
  );
};
