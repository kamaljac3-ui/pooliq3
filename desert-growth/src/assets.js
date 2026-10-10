import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

// BASE is '/' in dev and '/dream/' in the build that lives inside the 48th State Studios site
export const BASE = import.meta.env.BASE_URL;

const draco = new DRACOLoader();
draco.setDecoderPath(`${BASE}draco/`);
export const gltfLoader = new GLTFLoader().setDRACOLoader(draco);
