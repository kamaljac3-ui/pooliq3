import * as THREE from 'three';

// Ashima/Stefan Gustavson 3D simplex noise
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

// the flight: where the camera travels, and what it looks at along the way
const CAM_PATH = [
  [0, 0.4, 9.5], [1.6, 0.8, 6.2], [0.2, 1.6, 3.6], [-2.8, 0.6, 2.8], [-3.6, -0.6, -0.6],
  [-1.4, -1.4, -4.4], [2.4, -0.4, -7.4], [5.4, 1.3, -10.4], [6.4, 1.8, -13.6], [3.8, 1.4, -18], [2, 1, -22],
].map((p) => new THREE.Vector3(...p));
const LOOK_PATH = [
  [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0.2, -0.4], [0.2, 0, -1.5],
  [1.5, 0, -6], [3.5, 0.8, -11], [4, 1, -14], [4, 1, -14.5], [2.5, 1, -20], [2, 1, -27],
].map((p) => new THREE.Vector3(...p));

const TINTS = [
  [0.0, new THREE.Color(1.0, 1.0, 1.0)],
  [0.35, new THREE.Color(0.72, 0.86, 1.0)],
  [0.65, new THREE.Color(1.0, 0.82, 0.68)],
  [1.0, new THREE.Color(1.0, 1.0, 1.0)],
];

export function createWorld(renderer) {
  const dpr = renderer.getPixelRatio();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 120);
  const camCurve = new THREE.CatmullRomCurve3(CAM_PATH, false, 'centripetal');
  const lookCurve = new THREE.CatmullRomCurve3(LOOK_PATH, false, 'centripetal');

  const shared = {
    uTime: { value: 0 },
    uReveal: { value: 0 },
    uTint: { value: new THREE.Color(1, 1, 1) },
  };

  // ---- faceted, noise-displaced surfaces ----
  function surfaceMaterial(amp, freq) {
    return new THREE.ShaderMaterial({
      uniforms: { ...shared, uAmp: { value: amp }, uFreq: { value: freq } },
      vertexShader: /* glsl */ `
        ${NOISE}
        uniform float uTime, uAmp, uFreq;
        varying vec3 vWorld;
        void main(){
          vec3 p = position;
          float n = snoise(p * uFreq + vec3(0.0, uTime * 0.18, 0.0));
          float n2 = snoise(p * uFreq * 2.7 - uTime * 0.25) * 0.25;
          p += normal * (n + n2) * uAmp;
          vec4 wp = modelMatrix * vec4(p, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint;
        uniform float uTime, uReveal;
        varying vec3 vWorld;
        void main(){
          vec3 n = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
          vec3 v = normalize(cameraPosition - vWorld);
          float fres = pow(1.0 - abs(dot(n, v)), 2.4);
          float bands = 0.5 + 0.5 * sin(vWorld.y * 16.0 + vWorld.x * 4.0 + uTime * 0.5);
          float facet = 0.5 + 0.5 * dot(n, normalize(vec3(0.4, 0.8, 0.5)));
          vec3 col = uTint * (0.025 + 0.10 * facet + 0.55 * fres + 0.08 * bands * (0.3 + fres));
          gl_FragColor = vec4(col * uReveal, 1.0);
        }
      `,
    });
  }

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 5), surfaceMaterial(0.5, 1.1));
  scene.add(core);

  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(2.2, 0.46, 320, 32, 2, 3), surfaceMaterial(0.06, 0.9));
  knot.position.set(4, 1, -14);
  knot.rotation.set(0.6, 0.3, 0.2);
  scene.add(knot);

  // portal ring at the end of the flight (bright, so bloom picks it up)
  const ringMat = new THREE.ShaderMaterial({
    uniforms: { ...shared },
    vertexShader: `void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uReveal; uniform vec3 uTint; void main(){ gl_FragColor = vec4(uTint * 2.6 * uReveal, 1.0); }`,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.05, 16, 220), ringMat);
  ring.position.set(2, 1, -24.5);
  scene.add(ring);

  // ---- dust: a volume cloud, a halo around the core, and a trail along the flight path ----
  const cloud = 38000, halo = 16000, trail = 46000;
  const total = cloud + halo + trail;
  const pos = new Float32Array(total * 3);
  const rnd = new Float32Array(total * 4);
  const r = Math.random;
  let k = 0;
  for (let i = 0; i < cloud; i++, k++) {
    pos.set([(r() - 0.5) * 46, (r() - 0.5) * 26, 14 - r() * 48], k * 3);
  }
  for (let i = 0; i < halo; i++, k++) {
    const u = r() * 2 - 1, a = r() * Math.PI * 2, rad = 2.3 + r() * 1.3, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * rad, u * rad, Math.sin(a) * s * rad], k * 3);
  }
  for (let i = 0; i < trail; i++, k++) {
    const p = camCurve.getPoint(r());
    const rad = 1.4 + 3.4 * Math.pow(r(), 0.7), u = r() * 2 - 1, a = r() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    pos.set([p.x + Math.cos(a) * s * rad, p.y + u * rad, p.z + Math.sin(a) * s * rad], k * 3);
  }
  for (let i = 0; i < total * 4; i++) rnd[i] = r();

  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  dustGeo.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4));
  const dustMat = new THREE.ShaderMaterial({
    uniforms: { ...shared, uPx: { value: dpr } },
    vertexShader: /* glsl */ `
      ${NOISE}
      attribute vec4 aRand;
      uniform float uTime, uPx, uReveal;
      varying float vA;
      void main(){
        vec3 p = position;
        float t = uTime * 0.05;
        p += vec3(
          snoise(p * 0.15 + vec3(t, 0.0, aRand.x * 10.0)),
          snoise(p * 0.15 + vec3(5.2, t, aRand.y * 10.0)),
          snoise(p * 0.15 + vec3(1.7, 9.2, t))
        ) * 0.8;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float depth = -mv.z;
        gl_PointSize = clamp(uPx * (0.7 + aRand.w * 1.3) * (7.0 / max(depth, 1.0)), 1.0, 4.5 * uPx);
        vA = (0.03 + 0.17 * aRand.z) * smoothstep(0.8, 3.5, depth) * (1.0 - smoothstep(24.0, 44.0, depth)) * uReveal;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint;
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        if (a < 0.01) discard;
        gl_FragColor = vec4(uTint, a);
      }
    `,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  // ---- per-frame ----
  const look = new THREE.Vector3();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  function tintAt(p) {
    for (let i = 1; i < TINTS.length; i++) {
      if (p <= TINTS[i][0]) {
        const [p0, c0] = TINTS[i - 1], [p1, c1] = TINTS[i];
        return shared.uTint.value.copy(c0).lerp(c1, (p - p0) / (p1 - p0));
      }
    }
    return shared.uTint.value;
  }

  function update(dt, progress) {
    shared.uTime.value += dt;
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    tintAt(p);

    mouse.sx += (mouse.x - mouse.sx) * (1 - Math.exp(-dt * 3));
    mouse.sy += (mouse.y - mouse.sy) * (1 - Math.exp(-dt * 3));

    camCurve.getPoint(p, camera.position);
    lookCurve.getPoint(p, look);
    camera.position.x += mouse.sx * 0.35;
    camera.position.y -= mouse.sy * 0.25;
    camera.lookAt(look);

    core.rotation.y += dt * 0.05;
    knot.rotation.y += dt * 0.06;
    knot.rotation.x += dt * 0.02;
    ring.rotation.z += dt * 0.08;
  }

  function setReveal(v) { shared.uReveal.value = v; }
  function resize(aspect) { camera.aspect = aspect; camera.updateProjectionMatrix(); }

  return { scene, camera, update, setReveal, resize, getReveal: () => shared.uReveal.value };
}
