import * as THREE from 'three';
import { gltfLoader, BASE } from './assets.js';

// ---- shared GLSL: the order grains let go of the plant, radiating out from the touch point ----
const DISSOLVE_GLSL = /* glsl */ `
  float hash31(vec3 p){ p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float dissolveDelay(vec3 wp, vec3 touch, float scale){
    float d = clamp(distance(wp, touch) / scale, 0.0, 1.0);
    return d * 0.55 + hash31(floor(wp * 9.0)) * 0.12;
  }
`;

function patchForDissolve(mat, uni, isDepth = false) {
  mat.customProgramCacheKey = () => (isDepth ? 'dissolve-depth' : 'dissolve-mesh');
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uD = uni.uD;
    sh.uniforms.uTouch = uni.uTouch;
    sh.uniforms.uScale = uni.uScale;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vWP;\nuniform float uD;\nuniform vec3 uTouch;\nuniform float uScale;\n${DISSOLVE_GLSL}`)
      .replace('void main() {', 'void main() {\n  if (uD > dissolveDelay(vWP, uTouch, uScale) + 0.001) discard;');
  };
}

const ease = (t) => t * t * (3 - 2 * t);

export function setGrowth(root, g) {
  root.traverse((n) => {
    const s = n.userData && n.userData.grow_start;
    if (s === undefined) return;
    const d = n.userData.grow_dur || 0.3;
    const t = Math.min(1, Math.max(0, (g - s) / d));
    const e = ease(t);
    if (s === 0) {                         // the first part is always there as a tiny seedling
      n.visible = true;
      n.scale.setScalar(THREE.MathUtils.lerp(0.07, 1, e));
    } else {
      n.visible = t > 0.001;
      n.scale.setScalar(Math.max(0.001, e));
    }
  });
}

// sample coloured points over a plant's surface (area-weighted) so it can crumble into grains
function sampleSurface(root, count) {
  root.updateMatrixWorld(true);
  const tris = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  root.traverse((m) => {
    if (!m.isMesh) return;
    const g = m.geometry, pos = g.attributes.position, col = g.attributes.color, idx = g.index;
    const n = idx ? idx.count / 3 : pos.count / 3;
    for (let i = 0; i < n; i++) {
      const i0 = idx ? idx.getX(i * 3) : i * 3, i1 = idx ? idx.getX(i * 3 + 1) : i * 3 + 1, i2 = idx ? idx.getX(i * 3 + 2) : i * 3 + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(m.matrixWorld);
      b.fromBufferAttribute(pos, i1).applyMatrix4(m.matrixWorld);
      c.fromBufferAttribute(pos, i2).applyMatrix4(m.matrixWorld);
      const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() * 0.5;
      if (area < 1e-7) continue;
      tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), area, col, i0, i1, i2 });
      total += area;
    }
  });
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const rands = new Float32Array(count * 4);
  const cdf = new Float32Array(tris.length);
  let acc = 0;
  tris.forEach((t, i) => { acc += t.area / total; cdf[i] = acc; });
  const p = new THREE.Vector3();
  for (let k = 0; k < count; k++) {
    const r = Math.random();
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (cdf[mid] < r) lo = mid + 1; else hi = mid; }
    const t = tris[lo];
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const w = 1 - u - v;
    p.set(0, 0, 0).addScaledVector(t.a, w).addScaledVector(t.b, u).addScaledVector(t.c, v);
    positions.set([p.x, p.y, p.z], k * 3);
    const cc = t.col;
    const cr = cc ? w * cc.getX(t.i0) + u * cc.getX(t.i1) + v * cc.getX(t.i2) : 0.4;
    const cg = cc ? w * cc.getY(t.i0) + u * cc.getY(t.i1) + v * cc.getY(t.i2) : 0.5;
    const cb = cc ? w * cc.getZ(t.i0) + u * cc.getZ(t.i1) + v * cc.getZ(t.i2) : 0.3;
    colors.set([cr, cg, cb], k * 3);
    rands.set([Math.random(), Math.random(), Math.random(), Math.random()], k * 4);
  }
  return { positions, colors, rands, area: total };
}


export async function loadPlant(def, { grainCount = 30000 } = {}) {
  const gltf = await gltfLoader.loadAsync(`${BASE}models/draco/${def.file}.glb`);
  const root = gltf.scene;
  const uni = {
    uD: { value: 0 },
    uTouch: { value: new THREE.Vector3() },
    uScale: { value: def.h * 0.9 + 1.5 },
  };

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  patchForDissolve(mat, uni);
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  patchForDissolve(depthMat, uni, true);
  root.traverse((o) => {
    if (o.isMesh) { o.material = mat; o.customDepthMaterial = depthMat; o.castShadow = true; o.receiveShadow = true; }
  });

  // build the grain cloud while the plant is at full size and untransformed
  setGrowth(root, 1);
  const holder = new THREE.Group();
  holder.add(root);
  holder.updateMatrixWorld(true);
  const count = grainCount;
  const s = sampleSurface(root, count);

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(s.positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(s.colors, 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(s.rands, 4));
  const grainMat = new THREE.ShaderMaterial({
    uniforms: { ...uni, uPx: { value: 1 }, uWind: { value: new THREE.Vector3(1, 0.32, 0.25) }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      ${DISSOLVE_GLSL}
      attribute vec3 color; attribute vec4 aRand;
      uniform float uD, uScale, uPx, uTime; uniform vec3 uTouch, uWind;
      varying vec3 vCol; varying float vA;
      void main(){
        vec3 wp = (modelMatrix * vec4(position, 1.0)).xyz;
        float delay = dissolveDelay(wp, uTouch, uScale);
        float t = clamp((uD - delay) / 0.42, 0.0, 1.0);
        float released = step(delay, uD);
        vec3 w = normalize(uWind);
        vec3 p = wp;
        p += w * (t * t * 9.0) * (0.55 + aRand.y);
        p += vec3(0.0, 1.0, 0.0) * (t * (1.2 + 3.0 * aRand.z));
        p += vec3(sin(aRand.x * 40.0 + t * 7.0 + uTime), cos(aRand.w * 40.0 + t * 6.0), sin(aRand.z * 30.0 + t * 5.0)) * t * 0.9;
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (0.9 + aRand.w * 1.2) * (10.0 / max(-mv.z, 1.0)) * (1.0 - 0.6 * t);
        vCol = color * 1.15;
        vA = released * (1.0 - smoothstep(0.55, 1.0, t));
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vCol; varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.15, d) * vA;
        if (a < 0.02) discard;
        gl_FragColor = vec4(vCol, a);
      }
    `,
    transparent: true, depthWrite: false,
  });
  const grains = new THREE.Points(geo, grainMat);
  grains.frustumCulled = false;
  holder.add(grains);

  setGrowth(root, 0);
  return {
    def, holder, root, grains, grainMat, uni,
    setGrowth: (g) => setGrowth(root, g),
    setDissolve: (d, time) => {
      uni.uD.value = d;
      grainMat.uniforms.uTime.value = time;
      const gone = d >= 1;
      root.visible = !gone;
      grains.visible = d > 0 && !gone;
    },
  };
}
