import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { createWorld, groundHeight } from './world.js';
import { loadPlant } from './plants.js';
import { loadHiker } from './hiker.js';
import { createLogoGrains } from './logoGrains.js';
import { BASE } from './assets.js';

// phones and weaker machines get a lighter version: no painterly filter, fewer grains, lower resolution
const qs = new URLSearchParams(location.search);
const LOW = qs.get('hq') === '1' ? false : (qs.get('low') === '1' || matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 620);

gsap.registerPlugin(ScrollTrigger);

// ---- the six plants, in the order he meets them ----------------------------
const SPACING = 36;
const PLANTS = [
  { file: 'saguaro', h: 9.0, stand: 10.5, lookH: 4.4, camBack: 6.0, camH: 1.7, name: 'Saguaro', latin: 'Carnegiea gigantea',
    fact: 'A saguaro can take 50 to 75 years just to grow its first arm, and may live past 150.' },
  { file: 'prickly_pear', h: 2.3, stand: 5.2, lookH: 1.1, camBack: 4.4, camH: 1.5, name: 'Prickly pear', latin: 'Opuntia',
    fact: 'The flat pads are eaten as nopales, and the red fruit, called tunas, are edible too.' },
  { file: 'barrel', h: 1.25, stand: 4.4, lookH: 0.6, camBack: 4.0, camH: 1.3, name: 'Fishhook barrel cactus', latin: 'Ferocactus wislizeni',
    fact: 'Older barrels often lean toward the south-southwest, which earned them the nickname compass cactus.' },
  { file: 'cholla', h: 1.9, stand: 4.8, lookH: 0.9, camBack: 4.2, camH: 1.4, name: 'Teddy bear cholla', latin: 'Cylindropuntia bigelovii',
    fact: 'It looks fuzzy and soft, but that is a dense coat of spines. Segments break off and hitch a ride.' },
  { file: 'ocotillo', h: 5.6, stand: 7.6, lookH: 2.8, camBack: 5.4, camH: 1.7, name: 'Ocotillo', latin: 'Fouquieria splendens',
    fact: 'Not a true cactus. It stays bare most of the year and leafs out within days of rain.' },
  { file: 'organ_pipe', h: 5.0, stand: 7.6, lookH: 2.4, camBack: 5.4, camH: 1.7, name: 'Organ pipe cactus', latin: 'Stenocereus thurberi',
    fact: 'In the U.S. it grows almost only in southern Arizona, and its flowers open at night.' },
];
const N = PLANTS.length;
const plantZ = (i) => -10 - i * SPACING;
const standZ = (i) => plantZ(i) + (i < N ? PLANTS[i].stand : 20);
const touchZ = (i) => plantZ(i) + 1.5;

const canvas = document.getElementById('gl');
const hint = document.getElementById('hint');
const card = document.getElementById('card');
const cardName = document.getElementById('cardName');
const cardLatin = document.getElementById('cardLatin');
const cardFact = document.getElementById('cardFact');
const cardNum = document.getElementById('cardNum');
const wake = document.getElementById('wake');
const loading = document.getElementById('loading');
const statLabel = document.getElementById('statLabel');
if (!qs.get('debug')) statLabel.style.display = 'none';
const enter = document.getElementById('enter');
const meterFill = document.getElementById('meterFill');

// ---- renderer + post --------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
const dpr = Math.min(window.devicePixelRatio || 1, LOW ? 1 : 1.5);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.autoClear = false;   // the finale's sand logo is drawn on top of the composed scene

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.3, 900);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
const world = createWorld(scene, renderer);

// ---- the realistic look: HDRI sky + lighting (Poly Haven, CC0) and photo ground textures ----
async function loadLook() {
  const hdr = await new RGBELoader().loadAsync(`${BASE}assets/hdri/rogland_sunset_2k.hdr`);
  hdr.mapping = THREE.EquirectangularReflectionMapping;
  // the brightest pixel is the sun; line it up with where we want it in the world, ahead and a little left
  const { data, width, height } = hdr.image;
  let best = -1, bi = 0;
  for (let i = 0; i < width * height; i++) {
    const l = THREE.DataUtils.fromHalfFloat(data[i * 4]) * 0.2126 + THREE.DataUtils.fromHalfFloat(data[i * 4 + 1]) * 0.7152 + THREE.DataUtils.fromHalfFloat(data[i * 4 + 2]) * 0.0722;
    if (l > best) { best = l; bi = i; }
  }
  const col = bi % width, row = Math.floor(bi / width);
  const phiT = ((col + 0.5) / width - 0.5) * Math.PI * 2;
  const thetaT = (1 - (row + 0.5) / height - 0.5) * Math.PI;
  const phiWant = Math.atan2(-1, -0.4);
  const a = phiWant - phiT;
  // the HDRI now only lights the scene (soft ambient + reflections); the visible sky stays our own dream gradient
  scene.environment = hdr;
  scene.environmentRotation.set(0, a, 0);
  scene.environmentIntensity = 0.6;
  scene.fog.color.set('#eba58c');
  scene.fog.density = 0.0040;

  const tl = new THREE.TextureLoader();
  const tex = (p, srgb) => { const t = tl.load(p); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 128); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  world.ground.material = new THREE.MeshStandardMaterial({
    map: tex(`${BASE}assets/tex/sandy_gravel_02_diff_1k.jpg`, true),
    normalMap: tex(`${BASE}assets/tex/sandy_gravel_02_nor_gl_1k.jpg`),
    roughnessMap: tex(`${BASE}assets/tex/sandy_gravel_02_rough_1k.jpg`),
    normalScale: new THREE.Vector2(1.3, 1.3),
    vertexColors: true,
  });
  // rocks wear the cracked-earth texture (dry_ground_01), tiled once over each stone
  const rt = (p, srgb) => { const t = tl.load(p); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 1.5); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  Object.assign(world.rocks.material, {
    color: new THREE.Color('#a88a70'),
    map: rt(`${BASE}assets/tex/dry_ground_01_diff_1k.jpg`, true),
    normalMap: rt(`${BASE}assets/tex/dry_ground_01_nor_gl_1k.jpg`),
    roughnessMap: rt(`${BASE}assets/tex/dry_ground_01_rough_1k.jpg`),
  });
  world.rocks.material.needsUpdate = true;
}

// (kept from before) whole device pixels (a fractional size breaks the depth texture the outline pass reads)
const px = (v) => Math.max(1, Math.floor(v * dpr));
const composer = new EffectComposer(renderer);
composer.setPixelRatio(1);
composer.setSize(px(window.innerWidth), px(window.innerHeight));
composer.addPass(new RenderPass(scene, camera));

// soft outlines: edges are found in the picture itself (a plant against the dunes, the hiker against the sky) and darkened
// into a thin, feathered line. Colour-based, so it needs no depth buffer and follows the sand dissolve for free.
const outline = new ShaderPass({
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(px(window.innerWidth), px(window.innerHeight)) },
    uThick: { value: 1.25 }, uStrength: { value: 0.7 },
    uColor: { value: new THREE.Vector3(0.22, 0.11, 0.15) },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uThick, uStrength; uniform vec3 uColor; varying vec2 vUv;
    vec3 tap(vec2 o){ return min(texture2D(tDiffuse, vUv + o / uRes).rgb, vec3(2.5)); }
    void main(){
      vec3 c = min(texture2D(tDiffuse, vUv).rgb, vec3(2.5));
      float t = uThick;
      vec3 l = tap(vec2(-t, 0.0)), r = tap(vec2(t, 0.0)), u = tap(vec2(0.0, t)), d = tap(vec2(0.0, -t));
      vec3 ul = tap(vec2(-t, t) * 0.7), ur = tap(vec2(t, t) * 0.7), dl = tap(vec2(-t, -t) * 0.7), dr = tap(vec2(t, -t) * 0.7);
      vec3 gx = (r - l) * 2.0 + (ur + dr) - (ul + dl);
      vec3 gy = (u - d) * 2.0 + (ul + ur) - (dl + dr);
      float lum = dot(c, vec3(0.2126, 0.7152, 0.0722));
      float g = length(gx) + length(gy);
      float e = smoothstep(0.55, 1.5, g / (0.35 + lum));      // contrast relative to brightness, so shadows do not light up
      float bright = max(lum, dot((l + r + u + d) * 0.25, vec3(0.3333)));
      e *= 1.0 - smoothstep(0.85, 1.4, bright);                // no dark ring around the sun glare
      vec3 col = mix(texture2D(tDiffuse, vUv).rgb, c * uColor * 1.5, e * uStrength);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
const OUTLINES = qs.get('lines') !== '0';
outline.enabled = OUTLINES;
composer.addPass(outline);
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.22, 0.7, 0.95));

// painterly pass: a Kuwahara filter flattens every surface (photo ground, simple shapes, sky) into the same brushed look
const PAINT = qs.get('paint') ? qs.get('paint') === '1' : !LOW;
const paint = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2(window.innerWidth * dpr, window.innerHeight * dpr) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    #define R 3
    uniform sampler2D tDiffuse; uniform vec2 uRes; varying vec2 vUv;
    void main(){
      vec2 px = 1.0 / uRes;
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      float best = 1e9;
      for (int q = 0; q < 4; q++) {
        float ox = (q == 0 || q == 2) ? -float(R) : 0.0;
        float oy = (q == 0 || q == 1) ? -float(R) : 0.0;
        vec3 s = vec3(0.0), s2 = vec3(0.0);
        for (int j = 0; j <= R; j++) {
          for (int i = 0; i <= R; i++) {
            vec3 c = texture2D(tDiffuse, vUv + vec2(ox + float(i), oy + float(j)) * px).rgb;
            c = min(c, vec3(6.0));
            s += c; s2 += c * c;
          }
        }
        float n = float((R + 1) * (R + 1));
        vec3 m = s / n;
        vec3 v = abs(s2 / n - m * m);
        float vv = v.r + v.g + v.b;
        if (vv < best) { best = vv; col = m; }
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
});
paint.enabled = PAINT;
composer.addPass(paint);
const dream = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uGrain: { value: 0.035 }, uFade: { value: 0 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uGrain, uFade; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec2 c = vUv - 0.5;
      // a touch of soft chromatic drift toward the edges, like a memory
      float ab = dot(c, c) * 0.006;
      vec3 col = vec3(texture2D(tDiffuse, vUv + c * ab).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - c * ab).b);
      float v = 1.0 - dot(c, c) * 1.05;
      col *= v;
      // one shared grade for the whole frame: muted, violet shadows, warm highlights
      float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(lum), col, 0.86);
      col += vec3(0.05, 0.02, 0.08) * pow(1.0 - clamp(lum * 1.6, 0.0, 1.0), 2.0);
      col *= mix(vec3(1.0), vec3(1.08, 0.98, 0.88), smoothstep(0.25, 0.9, lum));
      col = mix(col, vec3(0.012, 0.011, 0.01), uFade);     // the dream drains to black before the logo
      col += (h(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5) * uGrain * (1.0 - uFade * 0.6);
      gl_FragColor = vec4(col, 1.0);
    }`,
});
composer.addPass(dream);
composer.addPass(new OutputPass());

// ---- scroll ------------------------------------------------------------------
const lenis = new Lenis({ lerp: 0.075, smoothWheel: true });
lenis.stop();
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.lagSmoothing(0);
let scrollP = 0, override = null;
ScrollTrigger.create({ trigger: '#track', start: 'top top', end: 'bottom bottom', onUpdate: (s) => { scrollP = s.progress; } });

// ---- helpers -----------------------------------------------------------------
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const lerp = THREE.MathUtils.lerp;

// where is the hiker, and what is everything doing, at overall progress P?
const FIN0 = 0.86;
function timeline(P) {
  const F = Math.min(1, Math.max(0, (P - FIN0) / (1 - FIN0)));
  const x = Math.min(0.99999, Math.max(0, P / FIN0)) * N;
  const i = Math.floor(x), u = x - i;
  const p = PLANTS[i];
  let z;
  if (u < 0.42) z = standZ(i);
  else if (u < 0.56) z = lerp(standZ(i), touchZ(i), sstep(0.42, 0.56, u));
  else if (u < 0.76) z = touchZ(i);
  else z = lerp(touchZ(i), i + 1 < N ? standZ(i + 1) : touchZ(i) - 24, sstep(0.76, 1.0, u));
  z -= F * 22;   // he keeps walking into the dream while it fades
  const reach = sstep(0.5, 0.58, u) * (1 - sstep(0.74, 0.82, u));
  const growth = sstep(0.02, 0.4, u);
  const dissolve = sstep(0.58, 0.8, u);
  return { i, u, p, z, reach, growth, dissolve, F };
}

// ---- build ---------------------------------------------------------------------
let plants = [], hiker = null, logo = null;
Promise.all([loadHiker(), loadLook(), createLogoGrains(renderer, { size: LOW ? 256 : 420 }), ...PLANTS.map((d) => loadPlant(d, { grainCount: LOW ? 9000 : 30000 }))]).then(([h, , lg, ...ps]) => {
  hiker = h; logo = lg; plants = ps;
  scene.add(hiker.holder);
  ps.forEach((pl, i) => {
    pl.holder.position.set(0, groundHeight(0, plantZ(i)), plantZ(i));
    pl.holder.rotation.y = i * 0.9;
    pl.uni.uTouch.value.set(0, 1.1, touchZ(i) - 0.5 + 0.6);
    pl.grainMat.uniforms.uPx.value = dpr * 1.7;
    scene.add(pl.holder);
  });
  loading.style.opacity = 0;
  setTimeout(() => (loading.style.display = 'none'), 900);
  lenis.start();
  gsap.to(hint, { opacity: 1, duration: 1.4, delay: 1.2 });
  start();
});

// ---- frame ---------------------------------------------------------------------
const camPos = new THREE.Vector3(0, 2, 8), camLook = new THREE.Vector3(0, 2, 0);
const want = new THREE.Vector3(), wantLook = new THREE.Vector3();
let smoothP = 0, lastZ = null, travelled = 0, speed = 0, time = 0, frames = 0, fpsAcc = 0, cardKey = -1;

function frame(dt) {
  time += dt;
  const target = override != null ? override : scrollP;
  smoothP += (target - smoothP) * (1 - Math.exp(-dt * 6));
  const T = timeline(smoothP);
  const { i, u, p } = T;

  // plants: everything before the current one is sand, everything after is a seed in waiting
  plants.forEach((pl, k) => {
    if (k < i) { pl.setGrowth(1); pl.setDissolve(1, time); }
    else if (k > i) { pl.setGrowth(0); pl.setDissolve(0, time); }
    else { pl.setGrowth(T.growth); pl.setDissolve(T.dissolve, time); }
  });

  // hiker
  const hy = groundHeight(0, T.z);
  hiker.holder.position.set(0, hy, T.z);
  if (lastZ !== null) {
    const dz = Math.abs(T.z - lastZ);
    travelled += dz;
    speed += ((dz / Math.max(dt, 1e-3)) - speed) * Math.min(1, dt * 8);
  }
  lastZ = T.z;
  hiker.update({ dist: travelled, speed, reach: T.reach, time });

  // camera: low behind his shoulder, easing back and up as the plant grows
  const g = T.growth * (1 - T.dissolve * 0.5);
  const back = p.camBack * (1 + (p.h < 3 ? 0.04 : 0.55) * g) * (p.h < 3 ? 0.8 : 1) + (u > 0.76 ? 1.5 : 0);
  const height = p.camH + p.h * 0.16 * g;
  // short plants would hide behind him from straight behind, so the camera shifts to his side for those
  const sideX = p.h < 3 ? 2.3 : 1.6 - 0.9 * g;
  want.set(sideX, hy + height, T.z + back);
  const plantTop = plantZ(i);
  const walkingOn = sstep(0.76, 0.92, u);
  const lookTarget = new THREE.Vector3(0, hy + lerp(0.5, p.lookH, T.growth) * (1 - walkingOn) + 1.3 * walkingOn, lerp(plantTop, T.z - 14, walkingOn));
  wantLook.copy(lookTarget);
  camPos.lerp(want, 1 - Math.exp(-dt * 3.2));
  camLook.lerp(wantLook, 1 - Math.exp(-dt * 3.6));
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  world.update(time, hiker.holder.position, camPos);
  dream.uniforms.uTime.value = time;
  const F = T.F;
  dream.uniforms.uFade.value = sstep(0.0, 0.42, F);
  composer.render(dt);
  if (logo) { logo.update(dt, sstep(0.5, 0.9, F), sstep(0.88, 1.0, F)); logo.render(); }

  // ui
  const showCard = u > 0.1 && u < 0.78 && F === 0;
  if (showCard && cardKey !== i) {
    cardNum.textContent = `0${i + 1} / 0${N}`; cardName.textContent = p.name; cardLatin.textContent = p.latin; cardFact.textContent = p.fact;
    cardKey = i;
  }
  card.style.opacity = showCard ? Math.min(sstep(0.1, 0.2, u), 1 - sstep(0.7, 0.78, u)) : 0;
  hint.style.opacity = smoothP < 0.01 ? 1 : Math.max(0, 1 - smoothP * 40);
  const enterOn = sstep(0.93, 1.0, F);
  enter.style.opacity = enterOn;
  enter.style.pointerEvents = enterOn > 0.5 ? 'auto' : 'none';
  wake.style.opacity = sstep(0.1, 0.28, F) * (1 - sstep(0.46, 0.6, F));   // "Wake up." surfaces as the world drains away, then gives way to the logo
  meterFill.style.transform = `scaleY(${smoothP.toFixed(4)})`;
  frames++; fpsAcc += dt;
  if (fpsAcc > 0.5) { statLabel.textContent = `${Math.round(frames / fpsAcc)} fps`; frames = 0; fpsAcc = 0; }
}

function start() {
  gsap.ticker.add((t, deltaMs) => {
    lenis.raf(t * 1000);
    frame(Math.min(deltaMs / 1000, 1 / 20));
  });
}

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false); composer.setSize(px(w), px(h));
  paint.uniforms.uRes.value.set(px(w), px(h));
  outline.uniforms.uRes.value.set(px(w), px(h));
  if (logo) logo.setAspect(w / h);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  ScrollTrigger.refresh();
});

// test hooks: the preview tab reports itself hidden, which pauses animation frames
window.__d = {
  world, scene, THREE, outline,
  ready: () => !!hiker,
  setP: (p) => { override = p; smoothP = p; },
  step: (dt, n = 1) => { for (let k = 0; k < n; k++) frame(dt); },
  snap: (p, settle = 90) => { override = p; smoothP = p; for (let k = 0; k < settle; k++) frame(1 / 30); frame(0.0001); return canvas.toDataURL('image/jpeg', 0.85); },
};
