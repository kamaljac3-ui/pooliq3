import * as THREE from 'three';

// ---- small value-noise helpers (JS side, used to shape the ground) ----
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  return hash2(xi, yi) * (1 - u) * (1 - v) + hash2(xi + 1, yi) * u * (1 - v) + hash2(xi, yi + 1) * (1 - u) * v + hash2(xi + 1, yi + 1) * u * v;
}
function fbm(x, y) { return vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3) * 0.15; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function groundHeight(x, z) {
  const corridor = smooth(5, 20, Math.abs(x));
  return (fbm(x * 0.035, z * 0.035) * 5.5 + fbm(x * 0.14, z * 0.14) * 0.5) * corridor;
}

export const COLORS = {
  horizon: new THREE.Color('#ffb48a'),
  mid: new THREE.Color('#e98aa0'),
  top: new THREE.Color('#5b4590'),
};

export function createWorld(scene, renderer) {
  scene.fog = new THREE.FogExp2(COLORS.horizon, 0.0046);

  // ---- dream sky with a low, huge sun ----
  const sunDir = new THREE.Vector3(-0.32, 0.17, -1).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSun: { value: sunDir }, uH: { value: COLORS.horizon }, uM: { value: COLORS.mid }, uT: { value: COLORS.top } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        varying vec3 vD; uniform vec3 uSun, uH, uM, uT;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec3 d = normalize(vD);
          float y = clamp(d.y, -0.2, 1.0);
          vec3 col = mix(uH, uM, smoothstep(0.0, 0.22, y));
          col = mix(col, uT, smoothstep(0.18, 0.75, y));
          float s = max(dot(d, uSun), 0.0);
          col += vec3(1.0, 0.72, 0.45) * pow(s, 10.0) * 0.38;
          col += vec3(1.0, 0.9, 0.7) * pow(s, 1400.0) * 3.2;
          vec2 g = floor(d.xz / (0.012 + 0.0) * 1.0 + d.y * 0.0);
          float star = step(0.9965, h(floor(vec2(atan(d.z, d.x) * 90.0, d.y * 160.0)))) * smoothstep(0.35, 0.8, y);
          col += star * 0.7;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  scene.add(sky);

  // ---- ground: faceted dunes with a flat walking corridor ----
  const gw = 300, gl = 640, seg = [150, 320];
  const geo = new THREE.PlaneGeometry(gw, gl, seg[0], seg[1]);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const sandA = new THREE.Color('#e3b373'), sandB = new THREE.Color('#c98d52'), sandC = new THREE.Color('#f0c48a');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i) - 200;
    const h = groundHeight(x, z);
    pos.setXYZ(i, x, h, z + 200);
    const n = fbm(x * 0.09, z * 0.09);
    tmp.copy(sandB).lerp(sandA, n).lerp(sandC, Math.min(1, h / 6));
    tmp.lerp(new THREE.Color(0.8, 0.74, 0.66), 0.55);   // photo texture carries most of the colour; this is only large-scale variation
    // faint darker ribbon where the path runs
    const path = 1 - smooth(0.8, 3.2, Math.abs(x));
    tmp.multiplyScalar(1 - 0.12 * path);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.position.z = -200;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- mesas on the horizon ----
  const mesaMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  for (let i = 0; i < 0; i++) {   // mesas retired: the HDRI supplies a real horizon now
    const side = i % 2 ? 1 : -1;
    const w = 14 + Math.random() * 30, h = 14 + Math.random() * 26;
    const g = new THREE.CylinderGeometry(w * 0.7, w, h, 7, 4);
    const p = g.attributes.position, cs = new Float32Array(p.count * 3);
    const bands = [new THREE.Color('#b5603a'), new THREE.Color('#d98a54'), new THREE.Color('#8f4a35'), new THREE.Color('#e0a06a')];
    for (let k = 0; k < p.count; k++) {
      const hh = (p.getY(k) + h / 2) / h;
      const c = bands[(((Math.floor(hh * 4 + Math.sin(hh * 22 + i) * 0.5)) % 4) + 4) % 4];
      cs.set([c.r, c.g, c.b], k * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
    const m = new THREE.Mesh(g, mesaMat);
    m.position.set(side * (95 + Math.random() * 110), h / 2 - 2, -Math.random() * 520 + 40);
    m.rotation.y = Math.random() * 6;
    scene.add(m);
  }

  // ---- scattered rocks off the path ----
  const rockGeo = new THREE.IcosahedronGeometry(1, 3);
  {
    const rp = rockGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < rp.count; i++) {
      v.fromBufferAttribute(rp, i);
      const n = 0.82 + 0.38 * vnoise(v.x * 1.6 + 7.3, v.y * 1.6 + v.z * 1.3) + 0.12 * vnoise(v.x * 5 + v.z * 3, v.y * 5);
      rp.setXYZ(i, v.x * n, v.y * n * 0.8, v.z * n);
    }
    rockGeo.computeVertexNormals();
  }
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: '#b08760', roughness: 1 }), 260);
  const d = new THREE.Object3D();
  for (let i = 0; i < rocks.count; i++) {
    const x = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 46);
    const z = 30 - Math.random() * 300;
    const s = 0.2 + Math.random() * Math.random() * 1.6;
    d.position.set(x, groundHeight(x, z) - s * 0.12, z);   // sunk into the dune so none can hover
    d.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    d.scale.set(s * (0.8 + Math.random() * 0.8), s * 0.6, s);
    d.updateMatrix();
    rocks.setMatrixAt(i, d.matrix);
  }
  rocks.castShadow = false; rocks.receiveShadow = true;   // rock shadows popped in as huge dark wedges while walking
  scene.add(rocks);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xffe0c4, 0xa06a48, 0.55));
  const key = new THREE.DirectionalLight(0xffc48c, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const sc = key.shadow.camera; sc.left = -18; sc.right = 18; sc.top = 18; sc.bottom = -18; sc.near = 1; sc.far = 90;
  key.shadow.bias = -0.0006; key.shadow.normalBias = 0.04;
  scene.add(key, key.target);
  // soft warm fill from behind the camera so the hiker's back never goes fully dark against the sun
  const fill = new THREE.DirectionalLight(0xffd2b0, 0.9);
  fill.position.set(-10, 14, 30);
  scene.add(fill, fill.target);
  const sun = { dir: sunDir.clone() };

  // ---- drifting dust motes ----
  const mc = 2600;
  const mp = new Float32Array(mc * 3), mr = new Float32Array(mc * 2);
  for (let i = 0; i < mc; i++) { mp.set([(Math.random() - 0.5) * 50, Math.random() * 16, (Math.random() - 0.5) * 50], i * 3); mr.set([Math.random(), Math.random()], i * 2); }
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  mg.setAttribute('aR', new THREE.BufferAttribute(mr, 2));
  const motes = new THREE.Points(mg, new THREE.ShaderMaterial({
    uniforms: { uCam: { value: new THREE.Vector3() }, uTime: { value: 0 }, uPx: { value: renderer.getPixelRatio() } },
    vertexShader: `
      attribute vec2 aR; uniform vec3 uCam; uniform float uTime, uPx; varying float vA;
      void main(){
        vec3 box = vec3(50.0, 16.0, 50.0);
        vec3 p = position + vec3(uTime * (0.25 + aR.x * 0.4), uTime * (0.05 + aR.y * 0.1), uTime * 0.12) + vec3(sin(uTime * 0.3 + aR.x * 20.0), 0.0, cos(uTime * 0.3 + aR.y * 20.0)) * 0.6;
        p = mod(p - uCam + box * 0.5, box) - box * 0.5 + uCam;
        p.y = mod(p.y, 16.0);
        vec4 mv = viewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (1.2 + aR.x * 2.4) * (8.0 / max(-mv.z, 1.0));
        vA = 0.5 * (0.4 + 0.6 * aR.y) * smoothstep(0.5, 4.0, -mv.z) * (1.0 - smoothstep(26.0, 42.0, -mv.z));
      }`,
    fragmentShader: `varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.1, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(1.0, 0.82, 0.62, a); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  motes.frustumCulled = false;
  scene.add(motes);

  return {
    key, motes, sky, ground, sun, rocks,
    setSun(dir) { sun.dir.copy(dir); },
    update(time, focus, camPos) {
      key.target.position.copy(focus);
      key.position.copy(focus).addScaledVector(sun.dir, 45);
      fill.target.position.copy(focus);
      fill.position.set(focus.x - 10, focus.y + 14, focus.z + 30);
      motes.material.uniforms.uTime.value = time;
      motes.material.uniforms.uCam.value.copy(camPos);
    },
  };
}
