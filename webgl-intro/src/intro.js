import * as THREE from 'three';

// GPU particle text intro: grains assemble onto a word, hold, then a wind sweeps them away.
// Positions/velocities live in a float texture that a shader updates each frame (GPGPU).
export function createIntro(renderer, { size = 512, word = 'DISSOLVE', onPhase = () => {} } = {}) {
  const COUNT = size * size;
  const HOLD_AT = 3.4;       // seconds before the wind arrives
  const DISPERSE_LEN = 5.0;  // seconds the wind simulation runs before 'done'
  const dpr = renderer.getPixelRatio();

  const hasFloat = renderer.extensions.has('EXT_color_buffer_float');
  const STATE_TYPE = hasFloat ? THREE.FloatType : THREE.HalfFloatType;

  let aspect = window.innerWidth / window.innerHeight;
  let currentWord = word;

  const makeTarget = () => new THREE.WebGLRenderTarget(size, size, {
    type: STATE_TYPE, format: THREE.RGBAFormat,
    minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
    depthBuffer: false, stencilBuffer: false,
  });
  let readRT = makeTarget();
  let writeRT = makeTarget();

  // home texture: xy = target position on the glyphs, zw = per-grain randoms
  let homeTex = null;
  function buildHomeTexture() {
    const W = 1600;
    const H = Math.round(W / aspect);
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let fs = Math.min(W * 0.2, H * 0.4);
    c.font = `800 ${fs}px Arial, sans-serif`;
    while (c.measureText(currentWord).width > W * 0.8 && fs > 12) {
      fs -= 4;
      c.font = `800 ${fs}px Arial, sans-serif`;
    }
    c.fillText(currentWord, W / 2, H / 2);
    const img = c.getImageData(0, 0, W, H).data;
    const px = [];
    for (let y = 0; y < H; y += 2) {
      for (let x = 0; x < W; x += 2) {
        if (img[(y * W + x) * 4 + 3] > 128) px.push(x, y);
      }
    }
    const n = px.length / 2;
    const data = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      const k = n ? ((Math.random() * n) | 0) * 2 : 0;
      data[i * 4] = ((px[k] + (Math.random() - 0.5) * 2) / W * 2 - 1) * aspect;
      data[i * 4 + 1] = -(((px[k + 1] + (Math.random() - 0.5) * 2) / H) * 2 - 1);
      data[i * 4 + 2] = Math.random();
      data[i * 4 + 3] = Math.random();
    }
    if (homeTex) homeTex.dispose();
    homeTex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    homeTex.minFilter = THREE.NearestFilter;
    homeTex.magFilter = THREE.NearestFilter;
    homeTex.needsUpdate = true;
  }

  // ---- simulation pass ----
  const simMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null }, uHome: { value: null },
      uDt: { value: 0.016 }, uTime: { value: 0 }, uAspect: { value: 1 },
      uMode: { value: 0 }, uDisperse: { value: 0 }, uReset: { value: 1 },
      uPointer: { value: new THREE.Vector2(9, 9) },
      uPointerVel: { value: new THREE.Vector2() },
      uPointerActive: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform sampler2D uState, uHome;
      uniform float uDt, uTime, uAspect, uMode, uDisperse, uReset, uPointerActive;
      uniform vec2 uPointer, uPointerVel;
      varying vec2 vUv;

      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      vec2 flow(vec2 p, float t){
        return vec2(
          sin(p.y * 3.1 + t * 0.7) + 0.5 * sin(p.y * 7.3 - t * 1.3),
          cos(p.x * 2.7 - t * 0.6) + 0.5 * cos(p.x * 6.1 + t * 1.1)
        );
      }

      void main(){
        vec4 s = texture2D(uState, vUv);
        vec4 h = texture2D(uHome, vUv);
        vec2 pos = s.xy;
        vec2 vel = s.zw;

        if (uReset > 0.5) {
          vec2 r = vec2(hash(vUv), hash(vUv + 7.3));
          pos = (r * 2.0 - 1.0) * vec2(uAspect * 1.4, 1.4);
          vel = vec2(0.0);
        } else {
          // the wind sweeps left -> right across the word, grain by grain
          float delay = (h.x / uAspect * 0.5 + 0.5) * 1.1 + h.w * 0.4;
          bool blown = uMode > 0.5 && uDisperse > delay;

          vec2 acc;
          if (!blown) {
            float k = mix(8.0, 16.0, h.z);
            acc = (h.xy - pos) * k - vel * mix(2.6, 4.6, h.w);
            acc += flow(pos * 1.5 + h.zw * 10.0, uTime) * 0.28;       // idle shimmer

            // finger in the sand: wide falloff, strong push, a swirl, and it drags with your motion
            vec2 d = pos - uPointer;
            float r2 = dot(d, d);
            float f = exp(-r2 / 0.045) * uPointerActive;
            vec2 dir = d / (sqrt(r2) + 1e-3);
            acc += dir * f * 26.0;
            acc += vec2(-dir.y, dir.x) * f * 10.0;
            acc += uPointerVel * f * 5.0;
          } else {
            vec2 wind = vec2(1.0, 0.3) * mix(0.7, 1.7, h.z);
            acc = wind * 2.0 + flow(pos * 1.2 + h.zw * 5.0, uTime) * 2.4 - vel * 0.55;
          }
          vel += acc * uDt;
          pos += vel * uDt;
        }
        gl_FragColor = vec4(pos, vel);
      }
    `,
    depthTest: false, depthWrite: false,
  });
  const simScene = new THREE.Scene();
  const simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  simScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), simMat));

  // ---- particle render pass ----
  const refs = new Float32Array(COUNT * 2);
  for (let i = 0; i < COUNT; i++) {
    refs[i * 2] = ((i % size) + 0.5) / size;
    refs[i * 2 + 1] = (Math.floor(i / size) + 0.5) / size;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('ref', new THREE.BufferAttribute(refs, 2));

  const pointsMat = new THREE.ShaderMaterial({
    uniforms: {
      uState: { value: null }, uHome: { value: null },
      uAspect: { value: 1 }, uMode: { value: 0 }, uDisperse: { value: 0 },
      uPx: { value: 1.6 * dpr },
    },
    vertexShader: /* glsl */ `
      attribute vec2 ref;
      uniform sampler2D uState, uHome;
      uniform float uAspect, uMode, uDisperse, uPx;
      varying float vA;
      void main(){
        vec4 s = texture2D(uState, ref);
        vec4 h = texture2D(uHome, ref);
        gl_Position = vec4(s.x / uAspect, s.y, 0.0, 1.0);
        gl_PointSize = uPx * (0.6 + h.z * 0.9);
        float delay = (h.x / uAspect * 0.5 + 0.5) * 1.1 + h.w * 0.4;
        float fade = uMode > 0.5 ? 1.0 - smoothstep(0.6, 3.0, uDisperse - delay) : 1.0;
        float speed = length(s.zw);
        vA = (0.07 + 0.16 * h.w + min(speed * 0.05, 0.3)) * fade;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(vec3(1.0), a);
      }
    `,
    transparent: true, depthTest: false, depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, pointsMat);
  points.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(points);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // ---- pointer ----
  const pointer = { x: 9, y: 9, active: 0, vx: 0, vy: 0, px: 9, py: 9 };
  window.addEventListener('pointermove', (e) => {
    pointer.x = ((e.clientX / window.innerWidth) * 2 - 1) * aspect;
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    pointer.active = 1;
  });
  window.addEventListener('pointerleave', () => { pointer.active = 0; });
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') pointer.active = 0; });

  // ---- timeline ----
  let t = 0, disperseT = 0, phase = 'assemble', needReset = true;
  function setPhase(p) { phase = p; onPhase(p); }

  function restart(newWord) {
    if (newWord) currentWord = newWord;
    buildHomeTexture();
    t = 0; disperseT = 0; needReset = true;
    setPhase('assemble');
  }

  function update(dt) {
    t += dt;
    if (phase === 'assemble' && t > 1.8) setPhase('hold');
    if ((phase === 'hold' || phase === 'assemble') && t >= HOLD_AT) setPhase('disperse');
    if (phase === 'disperse') {
      disperseT += dt;
      if (disperseT > DISPERSE_LEN) setPhase('done');
    }
    if (phase === 'done') return;

    const pvx = (pointer.x - pointer.px) / Math.max(dt, 1e-3);
    const pvy = (pointer.y - pointer.py) / Math.max(dt, 1e-3);
    pointer.vx += (pvx - pointer.vx) * 0.3;
    pointer.vy += (pvy - pointer.vy) * 0.3;
    pointer.px = pointer.x; pointer.py = pointer.y;

    const u = simMat.uniforms;
    u.uState.value = readRT.texture;
    u.uHome.value = homeTex;
    u.uDt.value = dt;
    u.uTime.value = t;
    u.uAspect.value = aspect;
    u.uMode.value = phase === 'disperse' ? 1 : 0;
    u.uDisperse.value = disperseT;
    u.uReset.value = needReset ? 1 : 0;
    u.uPointer.value.set(pointer.x, pointer.y);
    u.uPointerVel.value.set(THREE.MathUtils.clamp(pointer.vx, -8, 8), THREE.MathUtils.clamp(pointer.vy, -8, 8));
    u.uPointerActive.value = pointer.active;
    needReset = false;

    renderer.setRenderTarget(writeRT);
    renderer.render(simScene, simCam);
    renderer.setRenderTarget(null);
    [readRT, writeRT] = [writeRT, readRT];
  }

  function render() {
    if (phase === 'done') return;
    const p = pointsMat.uniforms;
    p.uState.value = readRT.texture;
    p.uHome.value = homeTex;
    p.uAspect.value = aspect;
    p.uMode.value = phase === 'disperse' ? 1 : 0;
    p.uDisperse.value = disperseT;
    renderer.render(scene, camera);
  }

  function setAspect(a) { aspect = a; }

  return {
    update, render, restart, setAspect,
    get phase() { return phase; },
    info: { count: COUNT, float: hasFloat },
  };
}
