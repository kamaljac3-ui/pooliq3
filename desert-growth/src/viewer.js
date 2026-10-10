import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const params = new URLSearchParams(location.search);
const DIR = params.get('dir') || '/models/raw/';
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.setClearColor(0xe9c79a, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xe9c79a, 30, 80);
const cam = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 200);
scene.add(new THREE.HemisphereLight(0xfff0d8, 0x8a6a48, 1.1));
const sun = new THREE.DirectionalLight(0xffe2b0, 2.4);
sun.position.set(-6, 10, 8);
scene.add(sun);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 40), new THREE.MeshStandardMaterial({ color: 0xc89a62, roughness: 1, flatShading: true }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const names = ['hiker', 'saguaro', 'prickly_pear', 'barrel', 'cholla', 'ocotillo', 'organ_pipe'];
const xs = [-13, -7, -2.2, 1.6, 5.2, 9.8, 15];
const loader = new GLTFLoader();
const roots = [];

const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });

const ease = (t) => t * t * (3 - 2 * t);
function applyGrowth(root, g) {
  root.traverse((n) => {
    const s = n.userData && n.userData.grow_start;
    if (s === undefined) return;
    const d = n.userData.grow_dur || 0.3;
    const t = Math.min(1, Math.max(0, (g - s) / d));
    const e = ease(t);
    n.visible = t > 0.001;
    const sc = Math.max(0.001, e);
    n.scale.setScalar(sc);
  });
}

Promise.all(names.map((nm) => loader.loadAsync(`${DIR}${nm}.glb`).then((gltf) => ({ nm, gltf })))).then((res) => {
  res.forEach(({ nm, gltf }, i) => {
    gltf.scene.traverse((o) => { if (o.isMesh) { o.material = mat; } });
    gltf.scene.position.x = xs[i];
    scene.add(gltf.scene);
    roots.push({ nm, root: gltf.scene });
  });
  const g = parseFloat(params.get('grow') || '1');
  setGrowth(g);
  window.__v = { ready: true, snap: (gv, camX = 1, camY = 5, camZ = 36, lookY = 3.5, lx = 1) => {
    setGrowth(gv); cam.position.set(camX, camY, camZ); cam.lookAt(lx, lookY, 0); renderer.render(scene, cam);
    return canvas.toDataURL('image/jpeg', 0.88);
  }, names, xs };
});

function setGrowth(g) {
  roots.forEach(({ nm, root }) => { if (nm !== 'hiker') applyGrowth(root, g); });
  document.getElementById('gv').textContent = g.toFixed(2);
  document.getElementById('g').value = g;
}
document.getElementById('g').addEventListener('input', (e) => setGrowth(parseFloat(e.target.value)));

cam.position.set(1, 5, 36);
cam.lookAt(1, 3.5, 0);
function loop() { renderer.render(scene, cam); requestAnimationFrame(loop); }
loop();
