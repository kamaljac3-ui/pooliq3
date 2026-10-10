import * as THREE from 'three';
import { AZ_D } from './logoData.js';

// The 48th State Studios mark + wordmark, built from sand. Grains drift as loose dust until `assemble`
// rises, then gather onto the logo's real geometry. Reversible: scrolling back lets the dust go again.
const RED = '#c8402f', SUN = '#ff5a3c', CREAM = '#f5f2ee';

function srgbToLinear(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

function drawLogo(W, H) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.lineJoin = 'round';

  // --- size the whole lockup (mark + wordmark) to fit the screen, whatever its shape
  g.font = '400 100px Anton, "Arial Narrow", sans-serif';
  if ('letterSpacing' in g) g.letterSpacing = '8px';
  const a = '48TH', b = ' STATE STUDIOS';
  const wm100 = g.measureText(a).width + g.measureText(b).width;            // wordmark width at 100px
  const fs = Math.max(16, Math.min(H * 0.085, (W * 0.88 / wm100) * 100));   // wordmark never wider than 88% of the screen
  const sMark = Math.min((H * 0.5) / 560, (W * 0.8) / 500);                  // mark fits both height and width
  const markH = 560 * sMark, gap = Math.max(fs * 0.9, H * 0.04);
  const top = H / 2 - (markH + gap + fs) / 2;

  // --- the mark (viewBox 260 100 500 560 from the portfolio's intro SVG)
  g.save();
  g.translate(W / 2 - 510 * sMark, top + markH / 2 - 380 * sMark);
  g.scale(sMark, sMark);
  g.save();
  g.translate(255.8, 140); g.scale(0.6103, 0.6103);
  g.strokeStyle = RED; g.lineWidth = 9 / 0.6103;
  g.stroke(new Path2D(AZ_D));
  g.restore();
  g.strokeStyle = CREAM; g.lineWidth = 6;
  g.beginPath(); g.moveTo(390, 480); g.lineTo(690, 480); g.stroke();
  g.strokeStyle = SUN; g.lineWidth = 8;
  g.beginPath(); g.arc(630, 200, 34, 0, Math.PI * 2); g.stroke();
  g.save();
  g.translate(450, 280); g.scale(1.3, 1.3);
  g.fillStyle = CREAM;
  [[46, 150, 46, 24, 12], [46, 90, 24, 84, 12], [108, 110, 46, 24, 12], [130, 50, 24, 88, 12], [86, 60, 28, 185, 14]].forEach(([x, y, w, h, r]) => {
    g.beginPath(); g.roundRect(x, y, w, h, r); g.fill();
  });
  g.restore();
  g.restore();

  // --- wordmark: red "48TH", cream "STATE STUDIOS"
  g.font = `400 ${fs}px Anton, "Arial Narrow", sans-serif`;
  g.textBaseline = 'middle';
  if ('letterSpacing' in g) g.letterSpacing = `${Math.round(fs * 0.08)}px`;
  const wa = g.measureText(a).width, wb = g.measureText(b).width;
  const x0 = W / 2 - (wa + wb) / 2, y = top + markH + gap + fs / 2;
  g.fillStyle = RED; g.fillText(a, x0, y);
  g.fillStyle = CREAM; g.fillText(b, x0 + wa, y);
  return c;
}

export async function createLogoGrains(renderer, { size = 420 } = {}) {
  try { await document.fonts.load('64px Anton'); } catch (e) { /* falls back to Arial Narrow */ }
  const COUNT = size * size;
  const dpr = renderer.getPixelRatio();
  const hasFloat = renderer.extensions.has('EXT_color_buffer_float');
  const STATE_TYPE = hasFloat ? THREE.FloatType : THREE.HalfFloatType;
  let aspect = window.innerWidth / window.innerHeight;

  const makeTarget = () => new THREE.WebGLRenderTarget(size, size, {
    type: STATE_TYPE, format: THREE.RGBAFormat, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: false, stencilBuffer: false,
  });
  let readRT = makeTarget(), writeRT = makeTarget();
  let homeTex = null, colTex = null, needReset = true;

  function build() {
    const W = 1600, H = Math.round(W / aspect);
    const img = drawLogo(W, H).getContext('2d').getImageData(0, 0, W, H).data;
    const px = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img[(y * W + x) * 4 + 3] > 110) px.push(x, y);
    const n = px.length / 2;
    const home = new Float32Array(COUNT * 4), col = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      const k = n ? ((Math.random() * n) | 0) * 2 : 0;
      const x = px[k], y = px[k + 1], o = (y * W + x) * 4;
      home[i * 4] = ((x + Math.random()) / W * 2 - 1) * aspect;
      home[i * 4 + 1] = -(((y + Math.random()) / H) * 2 - 1);
      home[i * 4 + 2] = Math.random();
      home[i * 4 + 3] = Math.random();
      col[i * 4] = srgbToLinear(img[o] / 255);
      col[i * 4 + 1] = srgbToLinear(img[o + 1] / 255);
      col[i * 4 + 2] = srgbToLinear(img[o + 2] / 255);
      col[i * 4 + 3] = 1;
    }
    [homeTex, colTex].forEach((t) => t && t.dispose());
    homeTex = new THREE.DataTexture(home, size, size, THREE.RGBAFormat, THREE.FloatType);
    colTex = new THREE.DataTexture(col, size, size, THREE.RGBAFormat, THREE.FloatType);
    [homeTex, colTex].forEach((t) => { t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; });
    needReset = true;
  }
  build();

  const simMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null }, uHome: { value: null }, uDt: { value: 0.016 }, uTime: { value: 0 }, uAspect: { value: 1 },
      uAssemble: { value: 0 }, uSolid: { value: 0 }, uReset: { value: 1 },
      uPointer: { value: new THREE.Vector2(9, 9) }, uPointerVel: { value: new THREE.Vector2() }, uPointerActive: { value: 0 },
    },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uState, uHome;
      uniform float uDt, uTime, uAspect, uAssemble, uSolid, uReset, uPointerActive;
      uniform vec2 uPointer, uPointerVel;
      varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 flow(vec2 p, float t){
        return vec2(sin(p.y * 3.1 + t * 0.7) + 0.5 * sin(p.y * 7.3 - t * 1.3), cos(p.x * 2.7 - t * 0.6) + 0.5 * cos(p.x * 6.1 + t * 1.1));
      }
      void main(){
        vec4 s = texture2D(uState, vUv);
        vec4 h = texture2D(uHome, vUv);
        vec2 scatter = (vec2(hash(vUv + 1.3), hash(vUv + 4.7)) * 2.0 - 1.0) * vec2(uAspect * 1.25, 1.25);
        if (uReset > 0.5) { gl_FragColor = vec4(scatter, 0.0, 0.0); return; }
        vec2 pos = s.xy, vel = s.zw;
        // grains arrive in waves: each one has its own moment to commit to the logo
        float a = smoothstep(h.w * 0.55, h.w * 0.55 + 0.45, uAssemble);
        vec2 drift = scatter + flow(scatter * 0.6 + h.zw * 8.0, uTime * 0.35) * 0.22;
        vec2 target = mix(drift, h.xy, a);
        float k = mix(0.7, mix(7.0, 15.0, h.z), a) * mix(1.0, 1.8, uSolid);
        vec2 acc = (target - pos) * k - vel * mix(1.0, mix(2.8, 5.0, h.w), a);
        acc += flow(pos * 1.6 + h.zw * 10.0, uTime) * 0.1 * a * (1.0 - uSolid * 0.85);
        vec2 d = pos - uPointer;
        float r2 = dot(d, d);
        float f = exp(-r2 / 0.04) * uPointerActive * a;       // you can still push the logo around like sand
        vec2 dir = d / (sqrt(r2) + 1e-3);
        acc += dir * f * 24.0 + vec2(-dir.y, dir.x) * f * 9.0 + uPointerVel * f * 4.5;
        vel += acc * uDt;
        pos += vel * uDt;
        gl_FragColor = vec4(pos, vel);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const simScene = new THREE.Scene();
  const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat));

  const refs = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) { refs[i * 2] = ((i % size) + 0.5) / size; refs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size; }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));
  const pointsMat = new THREE.ShaderMaterial({
    uniforms: { uState: { value: null }, uHome: { value: null }, uCol: { value: null }, uAspect: { value: 1 }, uAssemble: { value: 0 }, uSolid: { value: 0 }, uPx: { value: 1.25 * dpr } },
    vertexShader: /* glsl */ `
      attribute vec2 ref;
      uniform sampler2D uState, uHome, uCol; uniform float uAspect, uAssemble, uSolid, uPx;
      varying vec3 vC; varying float vA;
      void main(){
        vec4 s = texture2D(uState, ref); vec4 h = texture2D(uHome, ref);
        gl_Position = vec4(s.x / uAspect, s.y, 0.0, 1.0);
        gl_PointSize = uPx * (0.8 + h.z * 0.9) * mix(1.0, 1.45, uSolid);
        vC = texture2D(uCol, ref).rgb;
        float a = smoothstep(h.w * 0.55, h.w * 0.55 + 0.45, uAssemble);
        vA = (0.07 + 0.13 * h.w) * mix(0.25 * smoothstep(0.0, 0.2, uAssemble), 1.0, a) * mix(1.0, 2.6, uSolid) + min(length(s.zw) * 0.025, 0.08);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vC; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vC * 1.2, a);
      }
    `,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, pointsMat);
  points.frustumCulled = false;
  const scene = new THREE.Scene(); scene.add(points);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Interaction is locked until the logo is fully solid. After that, a mouse pushes grains while hovering and a
  // touch pushes them only while a finger is actually down. Lifting or cancelling a touch clears the mark at once.
  const pointer = { x: 9, y: 9, active: 0, vx: 0, vy: 0, px: 9, py: 9, down: false };
  const place = (e) => {
    pointer.x = ((e.clientX / window.innerWidth) * 2 - 1) * aspect;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { pointer.down = true; place(e); pointer.px = pointer.x; pointer.py = pointer.y; pointer.vx = pointer.vy = 0; pointer.active = 1; } });
  window.addEventListener('pointermove', (e) => {
    place(e);
    pointer.active = e.pointerType === 'mouse' ? 1 : (pointer.down ? 1 : 0);
  });
  const release = () => { pointer.down = false; pointer.active = 0; };
  window.addEventListener('pointerup', release);
  window.addEventListener('pointercancel', release);
  window.addEventListener('pointerleave', release);

  let time = 0, assemble = 0, solid = 0, settle = 0;
  return {
    get visible() { return assemble > 0.002; },
    update(dt, a, sol = 0) {
      assemble = a; solid = sol; time += dt;
      settle = sol > 0.98 ? Math.min(1, settle + dt / 0.6) : 0;   // short grace period before touch is allowed
      if (a <= 0.002 && !needReset) return;
      const pvx = (pointer.x - pointer.px) / Math.max(dt, 1e-3), pvy = (pointer.y - pointer.py) / Math.max(dt, 1e-3);
      pointer.vx += (pvx - pointer.vx) * 0.3; pointer.vy += (pvy - pointer.vy) * 0.3;
      pointer.px = pointer.x; pointer.py = pointer.y;
      const u = simMat.uniforms;
      u.uState.value = readRT.texture; u.uHome.value = homeTex; u.uDt.value = dt; u.uTime.value = time; u.uAspect.value = aspect;
      u.uAssemble.value = a; u.uSolid.value = sol; u.uReset.value = needReset ? 1 : 0;
      u.uPointer.value.set(pointer.x, pointer.y);
      u.uPointerVel.value.set(THREE.MathUtils.clamp(pointer.vx, -8, 8), THREE.MathUtils.clamp(pointer.vy, -8, 8));
      u.uPointerActive.value = settle >= 1 ? pointer.active : 0;
      needReset = false;
      renderer.setRenderTarget(writeRT); renderer.render(simScene, simCam); renderer.setRenderTarget(null);
      [readRT, writeRT] = [writeRT, readRT];
    },
    render() {
      if (assemble <= 0.002) return;
      const p = pointsMat.uniforms;
      p.uState.value = readRT.texture; p.uHome.value = homeTex; p.uCol.value = colTex; p.uAspect.value = aspect; p.uAssemble.value = assemble; p.uSolid.value = solid;
      renderer.render(scene, camera);
    },
    setAspect(a) { aspect = a; build(); },
    count: COUNT,
  };
}
