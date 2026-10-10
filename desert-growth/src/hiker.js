import * as THREE from 'three';
import { gltfLoader, BASE } from './assets.js';

export async function loadHiker() {
  const gltf = await gltfLoader.loadAsync(`${BASE}models/draco/hiker.glb`);
  const root = gltf.scene;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: false, roughness: 0.82 });
  const parts = {};
  root.traverse((o) => {
    if (o.isMesh) { o.material = mat; o.castShadow = true; o.receiveShadow = true; }
    if (o.name) parts[o.name] = o;
  });
  const holder = new THREE.Group();
  holder.add(root);

  // Blender's hiker faces +Y which glTF turns into -Z: he walks away from a camera behind him.
  const state = { phase: 0 };

  function update({ dist, speed, reach, time }) {
    // walk cycle driven by distance travelled, so scrubbing scroll back and forth feels right
    const walk = THREE.MathUtils.clamp(speed / 3.2, 0, 1);
    state.phase = dist * 2.1;
    const swing = Math.sin(state.phase) * 0.7 * walk;
    parts.Leg_L.rotation.x = swing;
    parts.Leg_R.rotation.x = -swing;
    parts.Arm_L.rotation.x = -swing * 0.8;
    const idle = Math.sin(time * 1.4) * 0.03;
    parts.Arm_R.rotation.x = THREE.MathUtils.lerp(swing * 0.8 + idle, 1.45, reach);
    parts.Arm_R.rotation.z = THREE.MathUtils.lerp(0, -0.12, reach);
    root.position.y = Math.abs(Math.sin(state.phase)) * 0.07 * walk;
    parts.Torso.rotation.y = Math.sin(state.phase) * 0.05 * walk;
    parts.Head.rotation.x = THREE.MathUtils.lerp(0.0, -0.18, reach) + Math.sin(time * 0.9) * 0.015;
    parts.Head.rotation.y = Math.sin(time * 0.5) * 0.06 * (1 - walk);
  }

  return { holder, root, parts, update };
}
