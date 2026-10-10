import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { createIntro } from './intro.js';
import { createWorld } from './world.js';

gsap.registerPlugin(ScrollTrigger);

const params = new URLSearchParams(location.search);
const SIZE = parseInt(params.get('size') || '512', 10);
const WORD = (params.get('word') || 'DISSOLVE').toUpperCase();

const canvas = document.getElementById('gl');
const statLabel = document.getElementById('statLabel');
const hint = document.getElementById('hint');
const meter = document.getElementById('meterFill');
const replayBtn = document.getElementById('replayBtn');

// ---- renderer + post ------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
renderer.setClearColor(0x050505, 1);
renderer.autoClear = false; // the intro layer draws on top of the composed 3D scene
const dpr = Math.min(window.devicePixelRatio || 1, 2);
renderer.setPixelRatio(dpr);
renderer.setSize(window.innerWidth, window.innerHeight, false);

const world = createWorld(renderer);

const composer = new EffectComposer(renderer);
composer.setPixelRatio(dpr);
composer.setSize(window.innerWidth, window.innerHeight);
composer.addPass(new RenderPass(world.scene, world.camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.4, 0.6, 0.55);
composer.addPass(bloom);
const grain = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAmount: { value: 0.045 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAmount; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float g = h(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 100.0) - 0.5;
      vec2 d = vUv - 0.5;
      c.rgb = c.rgb * (1.0 - dot(d, d) * 0.85) + g * uAmount;
      gl_FragColor = c;
    }`,
});
composer.addPass(grain);
composer.addPass(new OutputPass());

// ---- intro layer -----------------------------------------------------------
let lenis;
const intro = createIntro(renderer, {
  size: SIZE,
  word: WORD,
  onPhase: (p) => {
    if (p === 'disperse') {
      lenis && lenis.start();
      gsap.to({ v: world.getReveal() }, { v: 1, duration: 3.2, ease: 'power2.inOut', onUpdate() { world.setReveal(this.targets()[0].v); } });
      gsap.to(hint, { opacity: 1, duration: 1.2, delay: 1.5 });
    }
  },
});

// ---- smooth scroll + scroll-driven progress -------------------------------
lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
lenis.stop(); // locked until the sand starts to clear
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.lagSmoothing(0);

let scrollProgress = 0;
let override = null; // test hook: lets automation drive the camera without real scrolling
ScrollTrigger.create({
  trigger: '#chapters', start: 'top top', end: 'bottom bottom',
  onUpdate: (self) => { scrollProgress = self.progress; },
});

// chapter text reveals (scrubbed to scroll, so they move with the same smooth scroll as the camera)
document.querySelectorAll('.chapter .inner').forEach((el) => {
  gsap.fromTo(el, { opacity: 0, y: 70 }, {
    opacity: 1, y: 0, ease: 'none',
    scrollTrigger: { trigger: el.parentElement, start: 'top 82%', end: 'top 38%', scrub: true },
  });
  gsap.to(el, {
    opacity: 0, y: -50, ease: 'none',
    scrollTrigger: { trigger: el.parentElement, start: 'bottom 62%', end: 'bottom 22%', scrub: true },
  });
});

// ---- frame -----------------------------------------------------------------
let smoothP = 0;
let frames = 0, fpsAcc = 0;

function frame(dt) {
  const target = override != null ? override : scrollProgress;
  smoothP += (target - smoothP) * (1 - Math.exp(-dt * 5));

  intro.update(dt);
  world.update(dt, smoothP);
  grain.uniforms.uTime.value += dt;

  composer.render(dt);
  intro.render();

  meter.style.transform = `scaleY(${smoothP.toFixed(4)})`;
  frames++; fpsAcc += dt;
  if (fpsAcc > 0.5) {
    statLabel.textContent = `${intro.info.count.toLocaleString()} grains · ${Math.round(frames / fpsAcc)} fps`;
    frames = 0; fpsAcc = 0;
  }
}

gsap.ticker.add((time, deltaMs) => {
  lenis.raf(time * 1000);
  frame(Math.min(deltaMs / 1000, 1 / 20));
});

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  world.resize(w / h);
  intro.setAspect(w / h);
  if (intro.phase !== 'done') intro.restart();
  ScrollTrigger.refresh();
}
window.addEventListener('resize', onResize);

replayBtn.addEventListener('click', () => {
  lenis.scrollTo(0, { immediate: true });
  lenis.stop();
  world.setReveal(0);
  gsap.set(hint, { opacity: 0 });
  smoothP = 0;
  intro.restart();
});

intro.restart();

// test hooks (the preview tab reports itself hidden, which pauses animation frames)
window.__stage = {
  intro, world,
  setProgress: (p) => { override = p; smoothP = p; },
  reveal: (v) => world.setReveal(v),
  step: (dt, n = 1) => { for (let i = 0; i < n; i++) frame(dt); },
  snapshot: () => { frame(0.0001); return canvas.toDataURL('image/jpeg', 0.88); },
};
