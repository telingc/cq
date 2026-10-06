import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createSoundscape } from './soundscape.js';
import './style.css';

createSoundscape();
const container = document.querySelector('#scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09141d);
scene.fog = new THREE.FogExp2(0x0a1b25, 0.021);

const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 150);
camera.position.set(...(window.innerWidth < 700 ? [16, 9.6, 18] : [15, 8.9, 17.1]));
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.64;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0.3, 2.2, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.065;
controls.minDistance = 10;
controls.maxDistance = 52;
controls.maxPolarAngle = Math.PI / 2.12;
controls.minPolarAngle = 0.22;
controls.minAzimuthAngle = -0.95;
controls.maxAzimuthAngle = 1.05;
controls.enablePan = false;

const mat = (color, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const dark = mat(0x142832);
const trim = mat(0x273b49, 0.48, 0.4);
const cyan = new THREE.MeshStandardMaterial({ color: 0x91e8e9, emissive: 0x3e9fa9, emissiveIntensity: 1.5 });
const warm = new THREE.MeshStandardMaterial({ color: 0xffd496, emissive: 0xdd9653, emissiveIntensity: 1.3 });
const add = (geometry, material, x = 0, y = 0, z = 0, parent = scene) => {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (w, h, d, material, x, y, z, parent = scene) =>
  add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
const line = (a, b, material, radius = 0.018, parent = scene) => {
  const p = new THREE.Vector3(...a);
  const q = new THREE.Vector3(...b);
  const mesh = add(new THREE.CylinderGeometry(radius, radius, p.distanceTo(q), 6), material, 0, 0, 0, parent);
  mesh.position.copy(p).add(q).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
  return mesh;
};
const light = (color, intensity, distance, x, y, z) => {
  const lamp = new THREE.PointLight(color, intensity, distance, 2);
  lamp.position.set(x, y, z);
  scene.add(lamp);
  return lamp;
};

scene.add(new THREE.HemisphereLight(0x82b6cb, 0x12202a, 2.4));
const moon = new THREE.DirectionalLight(0x9bbfd7, 2.2);
moon.position.set(-9, 20, 12);
moon.castShadow = true;
moon.shadow.mapSize.set(2048, 2048);
moon.shadow.camera.left = -25;
moon.shadow.camera.right = 25;
moon.shadow.camera.top = 25;
moon.shadow.camera.bottom = -25;
moon.shadow.normalBias = 0.035;
scene.add(moon);
light(0x6ceaf2, 19, 12, 4.7, 3.4, 4.5);
light(0xffb674, 17, 12, -1.5, 2.7, 4.5);
light(0xffcb86, 12, 7, 2.55, 2, 1.1);
light(0xffce8f, 5, 5, -2, 2.1, 1.2);
light(0x528ca8, 8, 19, -9, 9, -8);

// The same five-point footprint is used for the cut corner, upper floors, and pavement.
const footprint = [[-4.6, -3.2], [4.6, -3.2], [4.6, 0.15], [1.55, 3.2], [-4.6, 3.2]];
function polygon(points, material, height, y = 0) {
  const shape = new THREE.Shape();
  points.forEach(([x, z], i) => i ? shape.lineTo(x, -z) : shape.moveTo(x, -z));
  shape.closePath();
  const mesh = add(new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }), material, 0, y, 0);
  mesh.rotation.x = -Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function asphaltTexture(repeatX, repeatY) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const image = context.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = 145 + Math.floor(Math.random() * 55);
    image.data[i] = shade;
    image.data[i + 1] = shade;
    image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function plasterTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const image = context.createImageData(256, 256);
  const stains = Array.from({ length: 9 }, () => ({
    x: Math.random() * 256, y: Math.random() * 256,
    width: 8 + Math.random() * 17, length: 24 + Math.random() * 55
  }));
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const offset = (y * 256 + x) * 4;
    let shade = 211 + (Math.random() - .5) * 25;
    for (const stain of stains) {
      const dx = Math.abs(x - stain.x);
      const dy = y - stain.y;
      if (dx < stain.width && dy > 0 && dy < stain.length) {
        shade -= (1 - dx / stain.width) * (1 - dy / stain.length) * 19;
      }
    }
    image.data[offset] = shade;
    image.data[offset + 1] = shade;
    image.data[offset + 2] = shade - 3;
    image.data[offset + 3] = 255;
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.7, 1.7);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const plaster = plasterTexture();
const upperWall = new THREE.MeshStandardMaterial({
  color: 0x929794, map: plaster, bumpMap: plaster, bumpScale: .035,
  roughness: .93
});
const block = { left: -10.15, right: 11.62, back: -8.95, front: 10.35 };
box(block.right - block.left, .25, block.front - block.back, mat(0x17242d),
  (block.left + block.right) / 2, -.285, (block.back + block.front) / 2).receiveShadow = true;
const asphalt = map => new THREE.MeshPhysicalMaterial({
  color: 0x384f56, map, metalness: .32, roughness: .27,
  clearcoat: .8, clearcoatRoughness: .19
});
const incline = Math.atan2(.9, 5.2);
const roadHeight = x => x <= -9.8 ? .765 : x >= -4.6 ? -.135 : -.135 + (-4.6 - x) * .9 / 5.2;
const frontCurb = 5.15, rightCurb = 6.42, laneWidth = 5.2;
const frontLaneCenter = frontCurb + laneWidth / 2;
const rightLaneCenter = rightCurb + laneWidth / 2;
const turnRun = rightCurb - 2.1, turnRise = frontCurb - .47;
const roadSurfaceY = (x, z) => z >= frontCurb ? roadHeight(x) : -.135;
box(.4, .805, laneWidth, mat(0x3b494c), -9.95, .2425, frontLaneCenter);
const rampFill = new THREE.Shape();
rampFill.moveTo(-9.8, -.16);
rampFill.lineTo(-9.8, .645);
rampFill.lineTo(-5.2, -.16);
rampFill.closePath();
add(new THREE.ExtrudeGeometry(rampFill, { depth: laneWidth, bevelEnabled: false }),
  new THREE.MeshStandardMaterial({ color: 0x3b494c, roughness: .9, side: THREE.DoubleSide }),
  0, 0, frontCurb);
box(.4, .12, laneWidth, asphalt(asphaltTexture(.12, .8)), -9.95, .705, frontLaneCenter).receiveShadow = true;
const slopeRoad = box(5.28, .12, laneWidth, asphalt(asphaltTexture(.8, .8)), -7.2, .255, frontLaneCenter);
slopeRoad.rotation.z = -incline;
slopeRoad.receiveShadow = true;
box(16.22, .12, laneWidth, asphalt(asphaltTexture(2.4, .8)), 3.51, -.195, frontLaneCenter).receiveShadow = true;
box(laneWidth, .12, frontCurb - block.back, asphalt(asphaltTexture(.8, 2.1)),
  rightLaneCenter, -.195, (block.back + frontCurb) / 2).receiveShadow = true;
polygon([[2.1, frontCurb], [rightCurb, .47], [rightCurb, frontCurb]],
  asphalt(asphaltTexture(.15, .15)), .12, -.255).receiveShadow = true;
const isRoad = (x, z) =>
  (x >= block.left && x <= block.right && z >= frontCurb && z <= block.front) ||
  (x >= rightCurb && x <= block.right && z >= block.back && z <= frontCurb) ||
  (x >= 2.1 && x <= rightCurb && z >= frontCurb - (x - 2.1) * turnRise / turnRun &&
    z <= frontCurb);
const pavement = [[-10.15, -8.95], [rightCurb, -8.95], [rightCurb, .47],
  [2.1, frontCurb], [-10.15, frontCurb]];
polygon(pavement, mat(0x59676a, 0.8), 0.22, -0.025);
const pedestrianIncline = Math.atan2(.945, 5.2);
const pedestrianHeight = x => x <= -9.8 ? 1.14 :
  x >= -4.6 ? .195 : .195 + (-4.6 - x) * .945 / 5.2;
const walkwayFill = new THREE.Shape();
walkwayFill.moveTo(-9.8, .195);
walkwayFill.lineTo(-9.8, .95);
walkwayFill.lineTo(-5.2, .195);
walkwayFill.closePath();
add(new THREE.ExtrudeGeometry(walkwayFill, { depth: frontCurb - 3.16, bevelEnabled: false }),
  new THREE.MeshStandardMaterial({ color: 0x596560, roughness: .9, side: THREE.DoubleSide }),
  0, 0, 3.16);
const pedestrianRamp = box(5.29, .19, frontCurb - 3.16, mat(0x838b84, .68),
  -7.2, (1.14 + .195) / 2 - .095, (frontCurb + 3.16) / 2);
pedestrianRamp.rotation.z = -pedestrianIncline;
pedestrianRamp.receiveShadow = true;
polygon(footprint, mat(0x313e44), 0.06, 0.19);
const treeSites = [
  { x: -4.4, z: 4.88, wellX: -4.4, wellZ: 4.61, width: 1.25, depth: 1.08,
    size: 2.25, lean: 1.35, along: [1, 0], out: [0, 1], spread: 1.6 },
  { x: 6.14, z: -3.2, wellX: 6, wellZ: -3.2, width: .82, depth: 1.4,
    size: 2.18, lean: 1.35, along: [0, 1], out: [1, 0], spread: 1.6 }
];
function treeDetour(position, center) {
  const distance = Math.abs(position - center);
  const t = THREE.MathUtils.clamp((2.35 - distance) / 1.5, 0, 1);
  return t * t * (3 - 2 * t);
}
const frontTactileZ = x => 4.5 - .85 * treeDetour(x, treeSites[0].x);
const rightTactileX = z => 5.76 - .7 * treeDetour(z, treeSites[1].z);
// Projecting upper floors keep the shopfront paving dry; rain stops on their roofs.
function shelterTop(x, z) {
  if (x >= -4.6 && x <= 5.45 && z >= -3.2 && z <= 4.05 && x + z <= 5.6) return 7.07;
  if (x >= -9.93 && x < -4.6 && z >= -3.2 && z <= 4.1) return 7.17;
  if (x >= -4.6 && x <= 5.72 && z >= -8.95 && z < -3.2) return 8.31;
  return null;
}
const inTreeWell = (x, z, margin = 0) => treeSites.some(site =>
  Math.abs(site.wellX - x) < site.width / 2 + margin &&
  Math.abs(site.wellZ - z) < site.depth / 2 + margin);
function pavingTexture(pattern) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = ['#a99f8c', '#a59b89', '#9b9e91', '#b3a492', '#9c9485'][pattern];
  c.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 110; i++) {
    const px = (i * 47 + pattern * 13) % 128, py = (i * 71 + pattern * 29) % 128;
    c.fillStyle = i % 3 ? '#ffffff13' : '#30434c16';
    c.fillRect(px, py, 2 + i % 3, 2);
  }
  c.lineWidth = 4;
  c.strokeStyle = '#5c727175';
  c.strokeRect(9, 9, 110, 110);
  c.strokeStyle = pattern % 2 ? '#a5775d8c' : '#607d7c91';
  c.lineWidth = 5;
  c.beginPath();
  if (pattern === 0 || pattern === 4) {
    c.moveTo(64, 19); c.lineTo(109, 64); c.lineTo(64, 109);
    c.lineTo(19, 64); c.closePath();
    c.moveTo(64, 38); c.lineTo(90, 64); c.lineTo(64, 90);
    c.lineTo(38, 64); c.closePath();
  } else if (pattern === 1) {
    for (const [x, y, start] of [[0, 0, 0], [128, 0, .5], [0, 128, -.5], [128, 128, 1]]) {
      c.moveTo(x + Math.cos(start * Math.PI) * 47, y + Math.sin(start * Math.PI) * 47);
      c.arc(x, y, 47, start * Math.PI, (start + .5) * Math.PI);
    }
  } else if (pattern === 2) {
    for (const offset of [25, 43]) {
      c.moveTo(offset, 62); c.lineTo(offset, offset); c.lineTo(64, offset);
      c.moveTo(128 - offset, 66); c.lineTo(128 - offset, 128 - offset);
      c.lineTo(64, 128 - offset);
    }
  } else {
    c.moveTo(18, 42); c.lineTo(42, 18); c.lineTo(110, 86);
    c.moveTo(18, 86); c.lineTo(86, 18); c.lineTo(110, 42);
  }
  c.stroke();
  if (pattern === 4) {
    c.fillStyle = '#4a5050';
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(33, 0); c.lineTo(22, 17);
    c.lineTo(7, 31); c.lineTo(0, 25); c.closePath(); c.fill();
    c.strokeStyle = '#3c4340';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(22, 17); c.lineTo(45, 40); c.lineTo(67, 36);
    c.lineTo(78, 64); c.lineTo(104, 81); c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
const pavingMaps = Array.from({ length: 5 }, (_, i) => pavingTexture(i));
const paving = Array.from({ length: 10 }, (_, i) => i < 5 ?
  new THREE.MeshPhysicalMaterial({
    map: pavingMaps[i], color: 0xa9b3b3, roughness: .32, metalness: .04,
    clearcoat: .78, clearcoatRoughness: .1
  }) :
  new THREE.MeshStandardMaterial({ map: pavingMaps[i - 5], roughness: .86, metalness: .02 }));
const pavingTiles = Array.from({ length: 10 }, () => []);
const pavingGaps = [];
function pave(x, z, col, row) {
  if (inTreeWell(x, z, .19)) return;
  const broken = (col * 17 + row * 31 + 211) % 47 === 0;
  const rootCracked = inTreeWell(x, z, .75) && (col * 5 + row * 3) % 4 !== 0;
  const covered = shelterTop(x, z) !== null;
  const slope = x < -4.6 && z > 3.2 ? -pedestrianIncline : 0;
  if (broken && row % 3 === 0) {
    if (!covered) pavingGaps.push([x, pedestrianHeight(x) + .021, z, slope]);
    return;
  }
  pavingTiles[(broken || rootCracked ? 4 : (col + row * 2) % 4) + (covered ? 5 : 0)]
    .push([x, pedestrianHeight(x) + .026, z, slope]);
}
for (let col = 0, x = -9.55; x < 2; col++, x += .42) {
  for (let row = 0, z = 3.46; z < frontCurb - .18; row++, z += .42) {
    pave(x, z, col, row);
  }
}
for (let col = 0, x = 4.85; x < rightCurb - .18; col++, x += .42) {
  for (let row = 0, z = -8.68; z < .1; row++, z += .42) {
    pave(x, z, col + 35, row + 29);
  }
}
for (let col = 0, x = 2.35; x < rightCurb - .18; col++, x += .42) {
  for (let row = 0, z = .34; z < frontCurb - .18; row++, z += .42) {
    const inner = x < 4.6 ? 4.75 - x : .15;
    const outer = frontCurb - (x - 2.1) * turnRise / turnRun;
    if (z > inner + .3 && z < outer - .3) pave(x, z, col + 65, row + 59);
  }
}
const pavingGeometry = new THREE.BoxGeometry(.39, .018, .39);
const pavingMatrix = new THREE.Object3D();
function placeTiles(geometry, material, tiles) {
  const mesh = new THREE.InstancedMesh(geometry, material, tiles.length);
  mesh.receiveShadow = true;
  tiles.forEach(([x, y, z, slope], index) => {
    pavingMatrix.position.set(x, y, z);
    pavingMatrix.rotation.set(0, 0, slope);
    pavingMatrix.updateMatrix();
    mesh.setMatrixAt(index, pavingMatrix.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}
pavingTiles.forEach((tiles, i) => placeTiles(pavingGeometry, paving[i], tiles));

// Wet road: shallow translucent patches and broken, elongated reflected light.
const puddleMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x3d565b, metalness: 0.5, roughness: 0.075, clearcoat: 1,
  clearcoatRoughness: 0.05, transparent: true, opacity: 0.42, depthWrite: false
});
placeTiles(new THREE.BoxGeometry(.37, .005, .37), puddleMaterial, pavingGaps);
const puddles = [[-3, 5.3, 2.7, .57], [3.7, 6.4, 3.9, .72], [7.1, 2.3, .85, 2.7],
  [6.8, -4.4, .85, 2.6], [0.3, 8.6, 3, .5]];
for (const [x, z, sx, sz] of puddles) {
  const outline = new THREE.Shape();
  for (let i = 0; i <= 32; i++) {
    const angle = i * Math.PI / 16;
    const radius = 1 + Math.sin(angle * 3 + x) * .09 + Math.sin(angle * 5 + z) * .055;
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius;
    if (i === 0) outline.moveTo(px, py); else outline.lineTo(px, py);
  }
  const puddle = add(new THREE.ShapeGeometry(outline), puddleMaterial, x, -0.122, z);
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.set(sx, sz, 1);
}
// Runoff follows the downhill curb into the drain at the foot of the slope.
function runoffTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 32;
  const c = canvas.getContext('2d');
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * 256, y = Math.random() * 30;
    const length = 16 + Math.random() * 64, alpha = .2 + Math.random() * .5;
    for (const offset of [0, -256]) {
      const gradient = c.createLinearGradient(x + offset, 0, x + offset + length, 0);
      gradient.addColorStop(0, 'rgba(215,238,246,0)');
      gradient.addColorStop(.55, `rgba(215,238,246,${alpha})`);
      gradient.addColorStop(1, 'rgba(215,238,246,0)');
      c.fillStyle = gradient;
      c.fillRect(x + offset, y, length, 1 + Math.random() * 1.5);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  return texture;
}
const runoffMap = runoffTexture();
function gutterStrip(material, inner, outer, lift) {
  const vertices = [], uvs = [], indices = [];
  const samples = 34;
  for (let i = 0; i <= samples; i++) {
    const x = -10.1 + 5.35 * i / samples;
    const y = roadHeight(x) + lift;
    vertices.push(x, y, frontCurb + inner, x, y, frontCurb + outer);
    uvs.push((x + 10.1) / 1.25, 0, (x + 10.1) / 1.25, 1);
    if (i < samples) indices.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return add(geometry, material);
}
gutterStrip(puddleMaterial, .02, .42, .007);
gutterStrip(new THREE.MeshBasicMaterial({
  map: runoffMap, color: 0xb8dfe8, transparent: true, opacity: .9,
  depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
}), .05, .3, .012);
function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(64, 64, 3, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255,255,255,.63)');
  gradient.addColorStop(.28, 'rgba(255,255,255,.26)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}
const glow = glowTexture();
for (const [x, z, sx, sz, color, opacity] of [
  [-1.7, 5.7, 3.8, 1.5, 0xffc083, .38],
  [2.7, 5.7, 3.3, 1.6, 0x6fd8ee, .31],
  [6.1, 1.5, 1.6, 3.4, 0x7bc8eb, .3],
  [-7, 5.2, 1.6, 2.5, 0xffc991, .25],
  [7.5, -5.4, 2, 2.1, 0xffba76, .22]
]) {
  const mesh = add(new THREE.PlaneGeometry(sx * 2, sz * 2),
    new THREE.MeshBasicMaterial({ map: glow, color, transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    x, roadSurfaceY(x, z) + .021, z);
  mesh.rotation.x = -Math.PI / 2;
}
const reflectionColors = [0x66c2d2, 0xe9a971, 0xb8d7da];
for (let i = 0; i < 105; i++) {
  const x = block.left + Math.random() * (block.right - block.left);
  const z = block.back + Math.random() * (block.front - block.back);
  if (!isRoad(x, z)) continue;
  const strip = box(.035 + Math.random() * .23, .003, .12 + Math.random() * 1.05,
    new THREE.MeshBasicMaterial({ color: reflectionColors[i % 3], transparent: true, opacity: .08 + Math.random() * .2 }),
    x, roadSurfaceY(x, z) + .016, z);
  strip.rotation.y = (Math.random() - .5) * .4;
}

// The long bars run parallel to the adjoining sidewalk, across the full lane.
const paint = new THREE.MeshBasicMaterial({ color: 0x87999b, transparent: true, opacity: .32 });
for (let i = 0; i < 7; i++) {
  const across = .44 + i * (laneWidth - .88) / 6;
  box(3.1, .005, .42, paint, -2.05, -.12, frontCurb + across);
  box(.42, .005, 3.1, paint, rightCurb + across, -.12, -3.1);
}
const dividerConcrete = mat(0x768382, .88);
const dividerSteel = mat(0x56696c, .4, .5);
function laneDivider(start, end, acrossFront) {
  const center = acrossFront ? frontLaneCenter : rightLaneCenter;
  const samples = Math.ceil((end - start) / .4);
  const vertices = [], indices = [];
  const surface = distance => acrossFront ? roadHeight(distance) : -.135;
  for (let i = 0; i <= samples; i++) {
    const distance = start + (end - start) * i / samples;
    const y = surface(distance) - .015;
    const taper = Math.min(1, .34 + Math.min(distance - start, end - distance) / .45);
    for (const [offset, rise] of [
      [-.25 * taper, 0], [.25 * taper, 0],
      [.15 * taper, .48], [-.15 * taper, .48]
    ]) {
      vertices.push(...(acrossFront ? [distance, y + rise, center + offset] :
        [center + offset, y + rise, distance]));
    }
    if (i === samples) continue;
    for (let side = 0; side < 4; side++) {
      const a = i * 4 + side, b = i * 4 + (side + 1) % 4;
      indices.push(a, b, b + 4, a, b + 4, a + 4);
    }
  }
  indices.push(0, 1, 2, 0, 2, 3);
  const last = samples * 4;
  indices.push(last, last + 2, last + 1, last, last + 3, last + 2);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const island = add(geometry, new THREE.MeshStandardMaterial({
    color: 0x768382, roughness: .88, side: THREE.DoubleSide
  }));
  island.receiveShadow = true;
  island.castShadow = true;
  const posts = [];
  for (let distance = start + .36; distance <= end - .36; distance += .95) {
    posts.push(acrossFront ? [distance, surface(distance) + .465, center] :
      [center, surface(distance) + .465, distance]);
  }
  for (const [x, y, z] of posts) {
    line([x, y, z], [x, y + .67, z], dividerSteel, .032);
    add(new THREE.SphereGeometry(.043, 8, 6), dividerConcrete, x, y + .69, z);
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const [x1, y1, z1] = posts[i], [x2, y2, z2] = posts[i + 1];
    line([x1, y1 + .63, z1], [x2, y2 + .63, z2], dividerSteel, .027);
  }
}
laneDivider(-9.8, -4.25, true);
laneDivider(-8.65, -5.2, false);
add(new THREE.CylinderGeometry(.51, .51, .016, 40), mat(0x354951, .62, .33),
  -5.3, roadHeight(-5.3) + .02, 6.02);
const manholeRim = add(new THREE.TorusGeometry(.46, .028, 8, 40),
  mat(0x738588, .47, .45), -5.3, roadHeight(-5.3) + .036, 6.02);
manholeRim.rotation.x = -Math.PI / 2;
for (let i = -2; i <= 2; i++) {
  box(.66, .006, .018, mat(0x6c7d80), -5.3, roadHeight(-5.3) + .036, 6.02 + i * .11);
}
const curbColors = [mat(0xd0c9b4), mat(0xa46354)];
for (let i = 0; i < 14; i++) {
  const t = (i + .5) / 14;
  const curb = box(.38, .16, .12, curbColors[i % 2],
    2.1 + turnRun * t + .08, .12, frontCurb - turnRise * t + .08);
  curb.rotation.y = Math.atan2(turnRise, turnRun);
}
for (let i = 0; i < 12; i++) {
  const t = (i + .5) / 12;
  const x = 2.1 + turnRun * t - .16;
  const z = frontCurb - turnRise * t - .16;
  box(.28, .014, .28, mat(0x9e997c), x, .248, z);
  for (const offset of [-.075, 0, .075]) {
    add(new THREE.SphereGeometry(.018, 6, 4), mat(0xc5bca0),
      x + offset, .272, z);
  }
}
const tactile = mat(0xa99f7f);
const tactileBump = new THREE.SphereGeometry(.014, 6, 4);
for (let x = -9.63; x < 1.85; x += .33) {
  const y = pedestrianHeight(x);
  const z = frontTactileZ(x);
  const deltaZ = frontTactileZ(x + .12) - frontTactileZ(x - .12);
  const length = Math.hypot(.24, deltaZ), alongX = .24 / length, alongZ = deltaZ / length;
  const tile = box(.46, .012, .3, tactile, x, y + .052, z);
  tile.rotation.set(0, -Math.atan2(deltaZ, .24), x < -4.6 ? -pedestrianIncline : 0);
  for (const along of [-.11, .11]) for (const across of [-.09, 0, .09]) {
    const px = x + along * alongX - across * alongZ;
    const pz = z + along * alongZ + across * alongX;
    add(tactileBump, tactile, px, pedestrianHeight(px) + .068, pz);
  }
}
for (let z = -.1; z > -8.5; z -= .33) {
  const x = rightTactileX(z);
  const deltaX = rightTactileX(z - .12) - rightTactileX(z + .12);
  const length = Math.hypot(deltaX, .24), alongX = deltaX / length, alongZ = -.24 / length;
  const tile = box(.3, .012, .46, tactile, x, .247, z);
  tile.rotation.y = Math.atan2(deltaX, -.24);
  for (const along of [-.11, .11]) for (const across of [-.09, 0, .09]) {
    add(tactileBump, tactile, x + along * alongX - across * alongZ,
      .263, z + along * alongZ + across * alongX);
  }
}
const guardRail = mat(0x657679, .38, .58);
function railing(points) {
  for (const [x, y, z] of points) {
    line([x, y + .05, z], [x, y + .88, z], guardRail, .029);
    add(new THREE.SphereGeometry(.039, 8, 6), guardRail, x, y + .89, z);
  }
  for (let i = 0; i < points.length - 1; i++) {
    const [x1, y1, z1] = points[i];
    const [x2, y2, z2] = points[i + 1];
    for (const height of [.38, .82]) {
      line([x1, y1 + height, z1], [x2, y2 + height, z2], guardRail, .025);
    }
  }
}
for (const [start, end] of [[-9.6, -5.15], [.3, 1.45]]) {
  const frontPosts = [];
  for (let x = start; x < end; x += 1.02) {
    frontPosts.push([x, pedestrianHeight(x), frontCurb - .14]);
  }
  frontPosts.push([end, pedestrianHeight(end), frontCurb - .14]);
  railing(frontPosts);
}
railing([-8.35, -7.25, -6.15, -5.05].map(z => [rightCurb - .14, .195, z]));
railing([-.95, .15].map(z => [rightCurb - .14, .195, z]));

// Ground-floor facades are assembled in local coordinates: X along the wall, Z toward the street.
function facade(a, b, options = {}) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const group = new THREE.Group();
  group.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
  group.rotation.y = -Math.atan2(dz, dx);
  scene.add(group);
  box(length, .28, .96, dark, 0, 2.75, -.4, group);
  box(length, .34, .9, dark, 0, .39, -.4, group);
  for (let n = 0; n < Math.ceil(length / 1.2); n++) {
    const x = -length / 2 + (n + .5) * length / Math.ceil(length / 1.2);
    box(.56, .065, .28, warm, x, 2.48, -.37, group);
  }
  const panelCount = options.door ? 3 : Math.max(2, Math.round(length / 1.8));
  const inner = length - .28, step = inner / panelCount;
  for (let i = 0; i < panelCount; i++) {
    const px = -inner / 2 + step * (i + .5);
    const door = options.door && i === 1;
    const glass = new THREE.MeshPhysicalMaterial({
      color: door ? 0xb5c9c7 : 0x91b7bb, metalness: .08, roughness: .08,
      transparent: true, opacity: .21, clearcoat: 1, side: THREE.DoubleSide
    });
    box(step - .065, 1.83, .027, glass, px, 1.33, .12, group);
    box(step - .065, .08, .07, trim, px, 2.29, .15, group);
    box(.05, 1.96, .09, trim, px - step / 2, 1.35, .16, group);
    box(step - .065, .06, .07, trim, px, .37, .16, group);
    if (door) {
      box(.035, .42, .09, mat(0xe3d9b2, .25, .8), px + .28, 1.35, .19, group);
      box(step - .2, .028, .12, warm, px, 2.07, .2, group);
      box(step - .18, .13, .7, mat(0x71736a, .35), px, .29, -.23, group);
    } else if (i === 0 || (options.door && i === panelCount - 1)) {
      for (let j = 0; j < 3; j++) {
        box(step - .28, .04, .21, mat(0x6f7e82, .4), px, .78 + j * .42, -.12, group);
        for (let k = 0; k < 3; k++) {
          const colors = [0xdca87a, 0x9dbeb6, 0xc76660, 0xe4d4a0];
          box(.12 + Math.random() * .07, .18 + Math.random() * .09, .12,
            mat(colors[(i + j + k) % 4]), px + (k - 1) * Math.min(.33, step / 4), .91 + j * .42, -.05, group);
        }
        box(step - .3, .025, .015, warm, px, .77 + j * .42, .015, group);
      }
    }
  }
  box(.055, 2.1, .17, trim, inner / 2, 1.38, .15, group);
  if (options.sign) {
    const signMaterial = new THREE.MeshBasicMaterial({
      map: makeSign(options.sign), transparent: true, side: THREE.DoubleSide
    });
    const sign = add(new THREE.PlaneGeometry(length - .24, .59),
      signMaterial, 0, 3.07, .255, group);
    sign.renderOrder = 2;
  }
  for (let i = 0; i < Math.floor(length / 1.2); i++) {
    const x = -length / 2 + .65 + i * 1.2;
    line([x, 3.48, .36], [x, 3.26 - Math.random() * .12, .36], mat(0x759099, .25, .6), .009, group);
  }
  return group;
}

function makeSign(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 150;
  const c = canvas.getContext('2d');
  c.fillStyle = '#134b9c'; c.fillRect(0, 0, 1024, 150);
  c.fillStyle = 'rgba(255,255,255,.12)'; c.fillRect(0, 0, 1024, 4);
  if (kind === 'main') {
    c.fillStyle = '#fff';
    c.font = 'bold 88px Arial, sans-serif';
    c.textAlign = 'center';
    c.fillText('LAWSON', 512, 100);
    c.fillRect(72, 45, 80, 57); c.fillStyle = '#134b9c';
    c.fillRect(80, 53, 64, 9); c.fillRect(80, 73, 64, 9); c.fillRect(80, 93, 64, 9);
  } else {
    c.fillStyle = '#fff'; c.textAlign = 'center';
    c.font = 'bold 72px "Microsoft YaHei", sans-serif';
    c.fillText('罗 森 便 利 店', 512, 101);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function serviceWall(a, b, shutter = false) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const group = new THREE.Group();
  group.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
  group.rotation.y = -Math.atan2(dz, dx);
  scene.add(group);
  box(length, 3.28, .16, mat(0x697571), 0, 1.86, 0, group);
  box(length + .1, .12, .32, mat(0x384a50), 0, 3.48, .09, group);
  box(length, .2, .21, mat(0x495356), 0, .32, .08, group);
  if (shutter) {
    box(2.9, 2.69, .055, mat(0x485c62, .6, .2), -.85, 1.68, .115, group);
    for (let y = .47; y < 2.98; y += .16) {
      box(2.85, .012, .016, mat(0x899898, .47, .25), -.85, y, .151, group);
    }
    box(.84, 2.12, .055, mat(0x364951, .58), length / 2 - 1, 1.39, .125, group);
    box(.045, .24, .09, mat(0xadb8b0, .25, .65), length / 2 - 1.32, 1.37, .18, group);
  } else {
    box(.96, 2.24, .055, mat(0x3f545a, .6), -.8, 1.45, .12, group);
    box(.04, .21, .08, mat(0x9faaa1, .28, .5), -.43, 1.4, .18, group);
    box(1.15, .85, .07, mat(0x485b60), 1.17, 2.05, .12, group);
    for (let i = 0; i < 7; i++) {
      box(.99, .025, .08, mat(0x718381), 1.17, 1.73 + i * .1, .175, group);
    }
  }
  for (const x of [-length / 2 + .18, length / 2 - .18]) {
    line([x, 3.52, .12], [x, .3, .12], mat(0x455a60, .42, .45), .028, group);
  }
}

facade([-4.6, 3.2], [1.55, 3.2], { sign: 'side' });
facade([1.55, 3.2], [4.6, .15], { door: true, sign: 'main' });
facade([4.6, .15], [4.6, -3.2], { sign: 'side' });
const signCorner = 4.75 + .245 * Math.SQRT2;
const bandEdge = [[-4.6, 3.445], [signCorner - 3.445, 3.445],
  [4.845, signCorner - 4.845], [4.845, -3.2]];
const bandVertices = [], bandIndices = [];
for (const [x, z] of bandEdge) bandVertices.push(x, 2.7, z, x, 3.42, z);
for (let i = 0; i < bandEdge.length - 1; i++) {
  const n = i * 2;
  bandIndices.push(n, n + 2, n + 3, n, n + 3, n + 1);
}
const bandGeometry = new THREE.BufferGeometry();
bandGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bandVertices, 3));
bandGeometry.setIndex(bandIndices);
bandGeometry.computeVertexNormals();
const signBand = add(bandGeometry, new THREE.MeshStandardMaterial({
  color: 0x103c81, roughness: .34, side: THREE.DoubleSide
}));
signBand.castShadow = true;
for (let i = 0; i < bandEdge.length - 1; i++) {
  const [x1, z1] = bandEdge[i], [x2, z2] = bandEdge[i + 1];
  for (const y of [2.67, 3.45]) {
    line([x1, y, z1], [x2, y, z2], cyan, y === 2.67 ? .045 : .032);
  }
}
for (const [x, z] of [[1.55, 3.2], [4.6, .15]]) {
  box(.09, 2.03, .09, trim, x, 1.38, z);
}
serviceWall([4.6, -3.2], [-4.6, -3.2], true);
serviceWall([-4.6, -3.2], [-4.6, 3.2]);
const entrance = new THREE.Group();
entrance.position.set(3.075, 0, 1.675);
entrance.rotation.y = Math.PI / 4;
scene.add(entrance);
box(1.04, .025, .48, mat(0x233945, .7), 0, .25, .44, entrance);
for (let i = -3; i <= 3; i++) {
  box(.035, .005, .38, mat(0x799899), i * .12, .267, .44, entrance);
}
// Rainy-night doorstep: a stand of clear umbrellas for sale and a folding wet-floor sign.
const doorstep = .232;
add(new THREE.CylinderGeometry(.13, .11, .4, 16), mat(0x9aa5a3, .3, .75), -.82, doorstep + .2, .36, entrance);
add(new THREE.TorusGeometry(.13, .012, 6, 20), mat(0xc4cdca, .25, .8), -.82, doorstep + .4, .36, entrance)
  .rotation.x = Math.PI / 2;
const umbrellaCanopies = [
  new THREE.MeshPhysicalMaterial({ color: 0xe8f2f2, roughness: .12, transparent: true, opacity: .42 }),
  new THREE.MeshPhysicalMaterial({ color: 0xe8f2f2, roughness: .12, transparent: true, opacity: .42 }),
  mat(0x1d2f4a, .45)
];
[[-.045, .035, .13, .1], [.05, -.02, -.1, .15], [0, .055, .05, -.13]].forEach(([dx, dz, tiltX, tiltZ], i) => {
  const umbrella = new THREE.Group();
  umbrella.position.set(-.82 + dx, doorstep + .12, .36 + dz);
  umbrella.rotation.set(tiltX, i * .9, tiltZ);
  entrance.add(umbrella);
  add(new THREE.CylinderGeometry(.026, .05, .62, 8), umbrellaCanopies[i], 0, .52, 0, umbrella);
  line([0, 0, 0], [0, .98, 0], mat(0x3a3f40, .4, .6), .008, umbrella);
  add(new THREE.TorusGeometry(.04, .011, 6, 12, Math.PI), mat(i === 2 ? 0x5b3b2a : 0xe9eeee, .5),
    .04, .98, 0, umbrella);
  line([.08, .98, 0], [.08, .94, 0], mat(i === 2 ? 0x5b3b2a : 0xe9eeee, .5), .011, umbrella);
});
add(new THREE.CircleGeometry(.24, 20), puddleMaterial, -.82, doorstep + .004, .36, entrance).rotation.x = -Math.PI / 2;
const cautionCanvas = document.createElement('canvas');
cautionCanvas.width = 160; cautionCanvas.height = 320;
const cautionInk = cautionCanvas.getContext('2d');
cautionInk.fillStyle = '#f2c230'; cautionInk.fillRect(0, 0, 160, 320);
cautionInk.strokeStyle = cautionInk.fillStyle = '#1f1f1f';
cautionInk.lineWidth = 8; cautionInk.lineJoin = cautionInk.lineCap = 'round';
cautionInk.beginPath();
cautionInk.moveTo(80, 26); cautionInk.lineTo(142, 134); cautionInk.lineTo(18, 134); cautionInk.closePath();
cautionInk.stroke();
cautionInk.beginPath(); cautionInk.arc(92, 70, 9, 0, Math.PI * 2); cautionInk.fill();
cautionInk.lineWidth = 7;
cautionInk.beginPath();
cautionInk.moveTo(86, 80); cautionInk.lineTo(73, 104); cautionInk.lineTo(100, 112);
cautionInk.moveTo(73, 104); cautionInk.lineTo(58, 121);
cautionInk.moveTo(82, 88); cautionInk.lineTo(104, 84);
cautionInk.moveTo(80, 90); cautionInk.lineTo(62, 82);
cautionInk.stroke();
cautionInk.textAlign = 'center';
cautionInk.font = 'bold 36px "Microsoft YaHei", sans-serif';
cautionInk.fillText('小心', 80, 192); cautionInk.fillText('地滑', 80, 236);
cautionInk.font = 'bold 16px Arial, sans-serif';
cautionInk.fillText('CAUTION', 80, 272); cautionInk.fillText('WET FLOOR', 80, 294);
const cautionTexture = new THREE.CanvasTexture(cautionCanvas);
cautionTexture.colorSpace = THREE.SRGBColorSpace;
const caution = new THREE.Group();
caution.position.set(.86, doorstep, .42);
caution.rotation.y = -.25;
entrance.add(caution);
for (const side of [1, -1]) {
  const leaf = new THREE.Group();
  leaf.position.y = .6;
  leaf.rotation.x = -side * .2;
  caution.add(leaf);
  box(.3, .6, .014, mat(0xe6b52a, .5), 0, -.3, 0, leaf);
  add(new THREE.PlaneGeometry(.28, .56), new THREE.MeshStandardMaterial({ map: cautionTexture, roughness: .5 }),
    0, -.3, side * .0085, leaf).rotation.y = side > 0 ? 0 : Math.PI;
}

// Miaomiao, the ginger cat the street looks after, shelters under the eave beside her box and bowl.
function tabbyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const c = canvas.getContext('2d');
  c.fillStyle = '#d0894a'; c.fillRect(0, 0, 128, 64);
  c.strokeStyle = '#9c5a2c'; c.lineWidth = 4;
  for (let i = 0; i < 9; i++) {
    const x = 6 + i * 14;
    c.beginPath(); c.moveTo(x, 3); c.quadraticCurveTo(x + 5, 21, x - 2, 38); c.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const fur = new THREE.MeshStandardMaterial({ map: tabbyTexture(), roughness: .9 });
const ginger = mat(0xc98446, .9), cream = mat(0xeddcc0, .9);
const cat = new THREE.Group();
cat.position.set(-.65, doorstep, 3.64);
cat.rotation.y = .35;
scene.add(cat);
add(new THREE.SphereGeometry(.1, 14, 10), fur, 0, .13, -.01, cat).scale.set(1, 1.25, 1.15);
add(new THREE.SphereGeometry(.072, 12, 8), cream, 0, .17, .065, cat);
for (const side of [-1, 1]) {
  add(new THREE.SphereGeometry(.068, 10, 8), fur, side * .068, .068, -.035, cat).scale.set(.9, .85, 1.25);
  add(new THREE.SphereGeometry(.026, 8, 6), cream, side * .038, .018, .115, cat).scale.set(1, .7, 1.5);
  line([side * .038, .04, .1], [side * .038, .2, .068], ginger, .02, cat);
}
const catHead = new THREE.Group();
catHead.position.set(0, .3, .07);
cat.add(catHead);
add(new THREE.SphereGeometry(.068, 14, 10), ginger, 0, 0, 0, catHead).scale.set(1.08, .92, .95);
add(new THREE.SphereGeometry(.034, 10, 8), cream, 0, -.022, .052, catHead).scale.set(1.25, .8, .9);
add(new THREE.SphereGeometry(.008, 6, 4), mat(0xc77c7c, .6), 0, -.008, .086, catHead);
const catEyes = [];
for (const side of [-1, 1]) {
  const ear = add(new THREE.ConeGeometry(.028, .062, 4), ginger, side * .04, .062, -.005, catHead);
  ear.rotation.set(-.1, side * .785, -side * .32);
  catEyes.push(add(new THREE.SphereGeometry(.011, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xd9e36a }), side * .026, .012, .058, catHead));
}
// Miaomiao wears a pink collar with a small bell and a little national-flag sticker on her head.
const collarPath = new THREE.CatmullRomCurve3(Array.from({ length: 16 }, (_, i) => {
  const angle = i / 16 * Math.PI * 2, along = Math.sin(angle);
  return new THREE.Vector3(Math.cos(angle) * .043, .246 - along * .018, .03 + along * .07);
}), true);
add(new THREE.TubeGeometry(collarPath, 48, .0125, 8, true), mat(0xf08bb4, .5), 0, 0, 0, cat);
add(new THREE.SphereGeometry(.014, 10, 8), mat(0xe2b54a, .28, .85), 0, .214, .118, cat);
const flagCanvas = document.createElement('canvas');
flagCanvas.width = 330; flagCanvas.height = 230;
const flagInk = flagCanvas.getContext('2d');
flagInk.fillStyle = '#f7f4ee';
flagInk.beginPath(); flagInk.roundRect(0, 0, 330, 230, 26); flagInk.fill();
flagInk.fillStyle = '#de2910'; flagInk.fillRect(15, 15, 300, 200);
// Standard layout on a 30 x 20 grid: each small star points at the large star's centre.
function flagStar(cx, cy, radius, angle) {
  flagInk.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? radius * .382 : radius, a = angle + i * Math.PI / 5;
    flagInk.lineTo(15 + cx + Math.cos(a) * r, 15 + cy + Math.sin(a) * r);
  }
  flagInk.closePath(); flagInk.fill();
}
flagInk.fillStyle = '#ffde00';
flagStar(50, 50, 30, -Math.PI / 2);
for (const [x, y] of [[100, 20], [120, 40], [120, 70], [100, 90]]) {
  flagStar(x, y, 10, Math.atan2(50 - y, 50 - x));
}
const flagTexture = new THREE.CanvasTexture(flagCanvas);
flagTexture.colorSpace = THREE.SRGBColorSpace;
flagTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
// The sticker is bent over the head's ellipsoid, slightly askew as if pressed on by hand.
const sticker = new THREE.PlaneGeometry(.046, .032, 8, 6);
const stickerPoints = sticker.attributes.position, stickerTilt = .2;
for (let i = 0; i < stickerPoints.count; i++) {
  const u = stickerPoints.getX(i), v = stickerPoints.getY(i);
  const x = u * Math.cos(stickerTilt) + v * Math.sin(stickerTilt);
  const z = .016 + u * Math.sin(stickerTilt) - v * Math.cos(stickerTilt);
  const y = .0626 * Math.sqrt(Math.max(0, 1 - (x / .0734) ** 2 - (z / .0646) ** 2)) + .0012;
  stickerPoints.setXYZ(i, x, y, z);
}
sticker.computeVertexNormals();
add(sticker, new THREE.MeshStandardMaterial({
  map: flagTexture, alphaTest: .5, roughness: .38, side: THREE.DoubleSide
}), 0, 0, 0, catHead);
const tube = (points, radius) => new THREE.TubeGeometry(
  new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 20, radius, 7);
const catTail = new THREE.Group();
cat.add(catTail);
add(tube([[-.02, .04, -.12], [.08, .022, -.13], [.135, .022, -.02], [.11, .026, .09]], .019), fur, 0, 0, 0, catTail);
const catTailTip = new THREE.Group();
catTailTip.position.set(.11, .026, .09);
catTail.add(catTailTip);
add(tube([[0, 0, 0], [-.03, .02, .04], [-.065, .05, .05]], .017), fur, 0, 0, 0, catTailTip);
const strayBox = new THREE.Group();
strayBox.position.set(-1.22, doorstep, 3.61);
strayBox.rotation.y = -.12;
scene.add(strayBox);
const cardboard = mat(0x9b774e, .95);
box(.42, .012, .3, cardboard, 0, .006, 0, strayBox);
for (const side of [-1, 1]) {
  box(.42, .2, .012, cardboard, 0, .1, side * .144, strayBox);
  box(.012, .2, .3, cardboard, side * .204, .1, 0, strayBox);
}
const backFlap = new THREE.Group();
backFlap.position.set(0, .2, -.15);
backFlap.rotation.x = -.65;
strayBox.add(backFlap);
box(.42, .01, .14, cardboard, 0, 0, -.07, backFlap);
box(.38, .07, .26, mat(0x8fb0c4, 1), 0, .045, 0, strayBox);
const noteCanvas = document.createElement('canvas');
noteCanvas.width = 256; noteCanvas.height = 96;
const noteInk = noteCanvas.getContext('2d');
noteInk.fillStyle = '#9b774e'; noteInk.fillRect(0, 0, 256, 96);
noteInk.fillStyle = '#2b2a2a'; noteInk.textAlign = 'center';
noteInk.font = 'bold 46px KaiTi, STKaiti, "Microsoft YaHei", serif';
noteInk.fillText('喵喵的窝', 128, 64);
const noteTexture = new THREE.CanvasTexture(noteCanvas);
noteTexture.colorSpace = THREE.SRGBColorSpace;
add(new THREE.PlaneGeometry(.3, .11), new THREE.MeshStandardMaterial({ map: noteTexture, roughness: .95 }),
  0, .09, .151, strayBox);
add(new THREE.CylinderGeometry(.07, .05, .035, 16), mat(0xb9c2c2, .3, .7), -.28, doorstep + .018, 3.74);
for (let i = 0; i < 7; i++) {
  add(new THREE.SphereGeometry(.012, 5, 4), mat(0x8a5a32, .8),
    -.28 + Math.cos(i * 2.4) * .03, doorstep + .036, 3.74 + Math.sin(i * 2.4) * .03);
}
const upperProjection = .85;
const upperFootprint = [[-4.6, -3.2], [4.6 + upperProjection, -3.2],
  [4.6 + upperProjection, .15], [1.55, 3.2 + upperProjection],
  [-4.6, 3.2 + upperProjection]];
polygon(upperFootprint, upperWall, 3.07, 3.65);
polygon(upperFootprint, mat(0x40535a, .65), .18, 3.47);
polygon(upperFootprint.map(([x, z]) => [x * 1.025, z * 1.025]), mat(0x243741, .6), .22, 6.72);
polygon(upperFootprint.map(([x, z]) => [x * .99, z * .99]), mat(0x192832), .12, 6.95);
const beam = mat(0x657371, .53, .3);
for (const x of [-3.7, -2.3, -.9, .5]) {
  box(.085, .14, .85, beam, x, 3.48, 3.62);
}
for (const z of [-2.5, -1.25, -.15]) {
  box(.85, .14, .085, beam, 5.02, 3.48, z);
}
const cornerBeams = new THREE.Group();
cornerBeams.position.set(3.075, 0, 1.675);
cornerBeams.rotation.y = Math.PI / 4;
scene.add(cornerBeams);
for (const x of [-1.38, 0, 1.38]) {
  box(.085, .14, .6, beam, x, 3.48, .3, cornerBeams);
}

function tileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  context.fillStyle = '#747b75';
  context.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 4; col++) {
    const shade = 185 + ((row * 3 + col * 7) % 4) * 5;
    context.fillStyle = `rgb(${shade},${shade + 2},${shade - 3})`;
    context.fillRect(col * 64 + 2, row * 64 + 2, 60, 60);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(.5, .5);
  return texture;
}
polygon(footprint, new THREE.MeshStandardMaterial({
  map: tileTexture(), roughness: .54, metalness: .06, side: THREE.DoubleSide
}), .025, .243);
polygon(footprint, mat(0xd5caba, .75), .065, 3.07);
box(8.9, 2.55, .035, mat(0x9c9483), 0, 1.55, -3.045);
box(.035, 2.5, 5.95, mat(0x9c9483), -4.46, 1.55, -.02);

function artworkTexture(kind, width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const c = canvas.getContext('2d');
  const themes = [
    { bg: '#c27e53', accent: '#f6dfb3', title: '热 咖 啡', sub: 'FRESHLY BREWED', price: '¥ 12' },
    { bg: '#496f76', accent: '#f0d7a3', title: '关 东 煮', sub: 'WARM UP YOUR NIGHT', price: '¥ 16' },
    { bg: '#80916e', accent: '#f5e9ca', title: '新 鲜 每 日', sub: 'A LITTLE SOMETHING', price: '24H' }
  ];
  const theme = themes[kind % themes.length];
  const gradient = c.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, theme.bg);
  gradient.addColorStop(1, '#253a41');
  c.fillStyle = gradient; c.fillRect(0, 0, width, height);
  c.strokeStyle = '#ffffff45'; c.lineWidth = 3; c.strokeRect(22, 22, width - 44, height - 44);
  c.fillStyle = theme.accent;
  c.beginPath(); c.arc(width / 2, height * .39, width * .23, 0, Math.PI * 2); c.fill();
  c.fillStyle = theme.bg;
  if (kind % 3 === 0) {
    c.fillRect(width * .41, height * .29, width * .18, height * .21);
    c.fillRect(width * .38, height * .27, width * .24, height * .035);
    c.fillRect(width * .44, height * .23, width * .12, height * .025);
  } else {
    c.beginPath(); c.ellipse(width / 2, height * .39, width * .16, height * .075, 0, 0, Math.PI * 2); c.fill();
    c.fillRect(width * .42, height * .39, width * .16, height * .08);
  }
  c.fillStyle = '#fff7df'; c.textAlign = 'center';
  c.font = `bold ${width * .089}px "Microsoft YaHei", sans-serif`;
  c.fillText(theme.title, width / 2, height * .72);
  c.font = `bold ${width * .033}px Arial, sans-serif`;
  c.fillText(theme.sub, width / 2, height * .79);
  c.font = `bold ${width * .085}px Arial, sans-serif`;
  c.fillText(theme.price, width / 2, height * .92);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function poster(kind, x, y, z, width = .88, height = 1.33, rotation = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotation;
  scene.add(group);
  box(width + .07, height + .07, .045, mat(0x3a4645), 0, 0, -.025, group);
  add(new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: artworkTexture(kind), side: THREE.DoubleSide }),
    0, 0, .008, group);
}
poster(0, -3.22, 1.75, -3.01);
poster(1, -1.93, 1.75, -3.01);
poster(2, -.6, 1.75, -3.01);
poster(0, -2.1, 1.6, 2.65, .58, .88);
poster(1, -.95, 1.6, 2.65, .58, .88);
poster(2, 4.02, 1.65, -1.62, .58, .88, Math.PI / 2);

const packPalette = [
  ['#d39675', '茶'], ['#8ebbb9', '水'], ['#eee0b8', '乳'],
  ['#c76f60', '果'], ['#8d9e74', '食'], ['#776f9d', '糖']
];
const packages = packPalette.map(([color, label]) => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const c = canvas.getContext('2d');
  c.fillStyle = color; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#f6eddb'; c.fillRect(9, 12, 110, 23);
  c.fillStyle = '#253847'; c.font = 'bold 42px "Microsoft YaHei", sans-serif';
  c.textAlign = 'center'; c.fillText(label, 64, 91);
  c.fillStyle = '#ffffff9c'; c.fillRect(15, 104, 98, 5);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return [
    mat(new THREE.Color(color)), mat(new THREE.Color(color)),
    mat(new THREE.Color(color)), mat(new THREE.Color(color)),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .48 }),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .48 })
  ];
});
function shelf(x, z, width, depth, seed) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const steel = mat(0x687777, .42, .65);
  for (const sx of [-width / 2, width / 2]) for (const sz of [-depth / 2, depth / 2]) {
    box(.045, 1.86, .045, steel, sx, 1.25, sz, group);
  }
  for (let row = 0; row < 4; row++) {
    const y = .54 + row * .39;
    box(width + .08, .045, depth + .04, steel, 0, y, 0, group);
    for (let i = 0; i < Math.floor(width / .23); i++) for (const side of [-1, 1]) {
      const type = (seed + i * 3 + row * 2 + (side + 1) / 2) % packages.length;
      const height = .2 + (type % 3) * .045;
      const product = box(.17, height, .17, packages[type],
        -width / 2 + .16 + i * .23, y + height / 2 + .024, side * depth * .25, group);
      product.rotation.y = side < 0 ? Math.PI : 0;
    }
    for (const side of [-1, 1]) {
      box(width, .045, .015, mat(0xe3d9bd), 0, y - .012, side * (depth / 2 + .035), group);
    }
  }
  box(width + .08, .19, depth + .06, mat(0x124c89), 0, 2.12, 0, group);
  box(width + .08, .03, depth + .06, warm, 0, 2.23, 0, group);
}
shelf(-1.75, -.5, 2.05, .7, 0);
shelf(1.06, -1.05, 1.86, .72, 2);
shelf(-1.05, -1.72, 1.12, .51, 4);
shelf(2.33, .16, .82, .47, 1);

// The back wall carries lit refrigerated cases instead of an empty void.
const fridge = new THREE.Group();
fridge.position.set(2.54, 0, -2.64);
scene.add(fridge);
box(2.55, 2.32, .71, mat(0x3b5057, .43), 0, 1.43, 0, fridge);
box(2.41, 2.07, .055, new THREE.MeshBasicMaterial({ color: 0x9eb7b1 }), 0, 1.42, .3, fridge);
for (let col = 0; col < 3; col++) {
  const cx = (col - 1) * .8;
  for (let row = 0; row < 4; row++) {
    const y = .63 + row * .42;
    box(.71, .035, .39, mat(0xc5d2d0, .42), cx, y, .39, fridge);
    for (let k = 0; k < 4; k++) {
      const color = [0x76a6a0, 0xc58e6a, 0xa9b6a2, 0xb7a5a9][(col + row + k) % 4];
      add(new THREE.CylinderGeometry(.065, .065, .21, 8), mat(color, .42),
        cx - .25 + k * .16, y + .13, .49, fridge);
    }
  }
  box(.77, 2.05, .025, new THREE.MeshPhysicalMaterial({
    color: 0xa6c4c3, metalness: .1, roughness: .09,
    transparent: true, opacity: .13, side: THREE.DoubleSide
  }), cx, 1.42, .7, fridge);
  box(.025, 2.18, .065, trim, cx - .39, 1.42, .74, fridge);
  box(.03, .31, .09, mat(0xdce6dd, .23, .6), cx + .28, 1.35, .76, fridge);
}
box(2.45, .055, .24, cyan, 0, 2.57, .4, fridge);

// Checkout faces the connected corner entrance; details remain visible through the glass.
const counter = new THREE.Group();
counter.position.set(-.28, 0, 1.22);
scene.add(counter);
box(1.86, .81, .72, mat(0x315879, .42), 0, .7, 0, counter);
box(1.92, .1, .81, mat(0xc8c5ae, .31, .1), 0, 1.15, 0, counter);
box(1.69, .11, .025, warm, 0, .85, .378, counter);
for (let i = -2; i <= 2; i++) {
  box(.012, .54, .018, mat(0x8ba4a1), i * .32, .56, .37, counter);
}
box(.4, .09, .3, mat(0x2d3e44), .43, 1.27, -.16, counter);
box(.3, .29, .07, mat(0x34474e), .43, 1.48, -.19, counter);
box(.25, .2, .01, new THREE.MeshBasicMaterial({ color: 0x8bd7d7 }), .43, 1.48, -.143, counter);
for (let i = 0; i < 4; i++) {
  box(.037, .008, .04, mat(0xaab9b1), .31 + i * .076, 1.32, .02, counter);
}
box(.31, .16, .27, mat(0x3c4b4d), -.42, 1.28, -.11, counter);
box(.21, .12, .24, mat(0x8c9e9a), -.42, 1.38, -.11, counter);
for (let i = 0; i < 3; i++) {
  add(new THREE.CylinderGeometry(.055, .045, .2, 9), mat(0xe5dbbd),
    -.74 + i * .13, 1.31, .17, counter);
}
box(.43, .31, .31, mat(0x677575, .3, .45), -.57, 1.35, -.26, counter);
box(.39, .26, .015, new THREE.MeshPhysicalMaterial({
  color: 0xbacbcc, metalness: .05, roughness: .07,
  transparent: true, opacity: .26, side: THREE.DoubleSide
}), -.57, 1.37, -.092, counter);
for (let i = 0; i < 3; i++) {
  add(new THREE.SphereGeometry(.067, 9, 7), mat(0xe9d09c),
    -.7 + i * .13, 1.34, -.09, counter);
}
const stool = new THREE.Group();
stool.position.set(-.65, 0, .17);
scene.add(stool);
add(new THREE.CylinderGeometry(.23, .23, .07, 16), mat(0x48535a), 0, .76, 0, stool);
line([0, .3, 0], [0, .73, 0], mat(0x7d8b8a, .34, .5), .035, stool);

// Coffee machine and chest freezer fill the remaining side of the shop.
box(1.18, .73, .53, mat(0x586c6a), -3.64, .68, .42);
box(.65, .85, .43, mat(0x26353a, .3), -3.72, 1.47, .4);
box(.55, .12, .045, new THREE.MeshBasicMaterial({ color: 0xe0b17c }), -3.72, 1.66, .64);
for (const x of [-3.92, -3.7, -3.48]) {
  add(new THREE.CylinderGeometry(.066, .09, .17, 10), mat(0xe9dabe), x, 1.13, .83);
}
const bakery = new THREE.Group();
bakery.position.set(-3.42, 0, 1.66);
scene.add(bakery);
box(1.28, .69, .65, mat(0x516369, .45), 0, .62, 0, bakery);
box(1.29, .07, .68, mat(0xa6a99c, .28, .18), 0, 1.01, 0, bakery);
box(1.2, .44, .55, new THREE.MeshPhysicalMaterial({
  color: 0xadc8c9, metalness: .06, roughness: .09,
  transparent: true, opacity: .25, side: THREE.DoubleSide
}), 0, 1.27, 0, bakery);
for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
  const roll = add(new THREE.SphereGeometry(.095, 10, 8), mat(0xd7a067, .55),
    -.44 + col * .22, 1.16, -.13 + row * .25, bakery);
  roll.scale.set(1.06, .52, .85);
}
box(1.15, .03, .04, warm, 0, 1.47, .29, bakery);
box(.73, .14, .035, mat(0x124c89), 0, .6, .338, bakery);
box(.81, .09, .32, mat(0x4a5f61), -2.2, .32, 1.59);
for (let i = 0; i < 3; i++) {
  box(.13, .17, .17, packages[i + 2], -2.42 + i * .23, .45, 1.59);
}
box(.78, .65, .58, mat(0x6a7976), 1.35, .6, 1.49);
box(.85, .055, .64, mat(0xe0cdb1), 1.35, .96, 1.49);
for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
  box(.15, .23, .15, packages[(row + col * 2) % packages.length],
    1.12 + col * .22, 1.1, 1.32 + row * .25);
}
box(.76, .12, .04, warm, 1.35, .72, 1.82);
box(1.48, .81, .84, mat(0x748f91, .43), -3.24, .67, -1.67);
box(1.4, .055, .76, new THREE.MeshPhysicalMaterial({
  color: 0xa9cbd0, metalness: .12, roughness: .1,
  transparent: true, opacity: .44, side: THREE.DoubleSide
}), -3.24, 1.11, -1.67);
box(.035, .035, .78, mat(0xdbe4e0, .31, .5), -3.24, 1.15, -1.67);

for (const x of [-2.65, -.25, 2.05]) {
  box(1.58, .075, .28, new THREE.MeshStandardMaterial({
    color: 0xffefc8, emissive: 0xffca79, emissiveIntensity: 1.2
  }), x, 2.94, -.1);
}
light(0xffd6a0, 9, 6, -1.3, 2.75, -.65);
light(0xb1eef0, 2.5, 4, 2.54, 2.2, -2.1);

function upperWindows(a, b, count, projection = 0) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  const group = new THREE.Group();
  group.position.set((a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2);
  group.rotation.y = -Math.atan2(dz, dx);
  group.translateZ(projection);
  scene.add(group);
  box(length + .08, .08, .2, mat(0x293943), 0, 3.7, .11, group);
  box(length + .08, .1, .25, mat(0x465358), 0, 6.48, .14, group);
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * (length / count);
    const lit = (i + count) % 3 !== 1;
    box(Math.min(.86, length / count - .25), 1.22, .1, mat(0x26323a), x, 5.05, .08, group);
    box(Math.min(.77, length / count - .34), 1.12, .01,
      new THREE.MeshBasicMaterial({ color: lit ? 0xd9ac75 : 0x263f4c }), x, 5.05, .14, group);
    box(.045, 1.12, .08, mat(0x394a50), x, 5.05, .17, group);
    if (lit) box(Math.min(.73, length / count - .38), .83, .018,
      new THREE.MeshBasicMaterial({ color: 0x62766e, transparent: true, opacity: .5 }), x, 4.90, .16, group);
    box(Math.min(1.06, length / count - .12), .09, .28, mat(0x343f43), x, 4.38, .23, group);
    box(Math.min(1.04, length / count - .14), .08, .31, mat(0x899497), x, 5.76, .21, group);
  }
}
upperWindows([-4.6, 3.2], [1.55, 3.2], 4, upperProjection);
upperWindows([1.55, 3.2], [4.6, .15], 2, upperProjection / Math.SQRT2);
upperWindows([4.6, .15], [4.6, -3.2], 2, upperProjection);
upperWindows([4.6, -3.2], [-4.6, -3.2], 5);
upperWindows([-4.6, -3.2], [-4.6, 3.2], 3);

// Exposed pipes, air-conditioning units and runoff break up the upper walls.
const pipe = mat(0x52646a, .47, .4);
for (const x of [-4.15, .95]) {
  line([x, 6.43, 4.21], [x, 3.76, 4.21], pipe, .038);
  line([x, 3.76, 4.21], [x, 3.76, 4.4], pipe, .038);
}
for (const x of [-2.95, -.04]) {
  box(.82, .43, .31, mat(0x89918c, .67), x, 4.01, 4.21);
  box(.63, .27, .018, mat(0x36464c), x, 4.01, 4.38);
  for (let i = 0; i < 5; i++) {
    box(.54, .015, .02, mat(0x7b8988), x, 3.91 + i * .053, 4.4);
  }
  line([x + .4, 3.94, 4.27], [x + .55, 3.75, 4.27], pipe, .022);
}
for (let i = 0; i < 11; i++) {
  const x = -4.1 + i * .52;
  box(.018, .24 + Math.random() * .44, .009,
    new THREE.MeshBasicMaterial({ color: 0x263e40, transparent: true, opacity: .11 }),
    x, 6.36 - Math.random() * .22, 4.057);
}

// Roof clutter and a small lit corner blade sign.
for (let i = 0; i < 3; i++) {
  box(.9, .62 + .2 * i, .78, mat(0x34454b), -2.7 + i * 1.45, 7.32 + .1 * i, -1.1);
  box(.94, .08, .82, mat(0x657274), -2.7 + i * 1.45, 7.66 + .2 * i, -1.1);
}
for (const x of [-3.5, 2.9]) {
  box(.12, .16, .15, mat(0x707c7a), x, 7.13, 2.58);
  line([x, 7.2, 2.58], [x, 8.18, 2.58], pipe, .026);
}
line([-3.5, 8.18, 2.58], [2.9, 8.18, 2.58], pipe, .024);

function brickTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const c = canvas.getContext('2d');
  c.fillStyle = '#3d4745'; c.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 12; row++) {
    for (let col = -1; col < 7; col++) {
      const x = col * 46 + (row % 2) * 23;
      const shade = 84 + ((row * 13 + col * 7) % 5) * 6;
      c.fillStyle = `rgb(${shade + 10},${shade + 3},${shade - 3})`;
      c.fillRect(x + 2, row * 22 + 2, 42, 18);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.2, 1.2);
  return texture;
}
const brick = brickTexture();
const masonry = new THREE.MeshStandardMaterial({
  color: 0xb6aca0, map: brick, bumpMap: brick, bumpScale: .025, roughness: .96
});
const timber = mat(0x594436, .8);
const oldRoof = mat(0x354444, .95);
function neighborSign(title, english, background, ink) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 180;
  const c = canvas.getContext('2d');
  c.fillStyle = background; c.fillRect(0, 0, 1024, 180);
  c.strokeStyle = '#ffffff48'; c.lineWidth = 5; c.strokeRect(15, 14, 994, 152);
  c.fillStyle = ink; c.textAlign = 'center';
  c.font = 'bold 97px "Microsoft YaHei", sans-serif'; c.fillText(title, 512, 112);
  c.font = '26px Arial, sans-serif'; c.fillText(english, 512, 154);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// The noodle shop continues the main street directly from Lawson's left party wall.
const leftShop = new THREE.Group();
leftShop.position.y = .9;
scene.add(leftShop);
const leftBox = (w, h, d, material, x, y, z) => box(w, h, d, material, x, y, z, leftShop);
const leftAdd = (geometry, material, x, y, z) => add(geometry, material, x, y, z, leftShop);
const leftLine = (a, b, material, radius) => line(a, b, material, radius, leftShop);
leftBox(5.2, .9, 6.4, mat(0x5b625e), -7.2, -.25, 0);
leftBox(5.2, 2.75, 7.12, masonry, -7.2, 4.65, .36).castShadow = true;
leftBox(5.2, 2.88, .15, mat(0x756b5d), -7.2, 1.64, -3.12);
leftBox(.15, 2.88, 6.4, masonry, -9.73, 1.64, 0);
leftBox(5.05, .05, 6.15, mat(0x9b907a, .72), -7.2, .24, 0);
leftBox(5.5, .19, 7.3, oldRoof, -7.2, 6.17, .36);
for (let z = -3.05; z < 4; z += .35) {
  leftBox(5.47, .022, .055, mat(0x63716c), -7.2, 6.285, z);
}
leftBox(5.45, .2, 1.02, timber, -7.2, 3.52, 3.59);
for (const x of [-9.38, -8.28, -7.18, -6.08, -4.98]) {
  leftBox(.075, .12, .94, mat(0x907860), x, 3.38, 3.6);
  leftLine([x, 3.38, 3.17], [x, 2.98, 2.95], timber, .033);
}
leftBox(5.14, .51, .17, timber, -7.2, 3.16, 3.27);
leftAdd(new THREE.PlaneGeometry(4.82, .41), new THREE.MeshBasicMaterial({
  map: neighborSign('山城小面', 'NOODLES · HOT SOUP', '#704332', '#ffe0af')
}), -7.2, 3.18, 3.37);
for (const x of [-9.61, -8.28, -6.95, -5.62, -4.78]) {
  leftBox(.11, 2.5, .18, timber, x, 1.54, 3.2);
}
const noodleGlass = new THREE.MeshPhysicalMaterial({
  color: 0xe2c7a6, metalness: .04, roughness: .12,
  transparent: true, opacity: .23, side: THREE.DoubleSide
});
for (const x of [-8.94, -7.61, -6.28, -5.2]) {
  if (x !== -5.2) leftBox(1.14, 2.05, .025, noodleGlass, x, 1.52, 3.23);
  leftBox(1.13, .055, .11, timber, x, .55, 3.29);
  leftBox(1.13, .055, .11, timber, x, 2.52, 3.29);
}
// The doorway stays open behind a plastic strip curtain so the stockpot can steam outside.
const stripCurtain = new THREE.MeshPhysicalMaterial({
  color: 0xc9e0d6, roughness: .2, transparent: true, opacity: .2,
  side: THREE.DoubleSide, depthWrite: false
});
for (let i = 0; i < 5; i++) {
  const strip = leftBox(.2, 1.86, .006, stripCurtain, -5.63 + i * .215, 1.55, 3.25);
  strip.rotation.y = [.05, -.04, .32, -.06, .04][i];
}
leftAdd(new THREE.CylinderGeometry(.32, .3, .5, 18), mat(0x2f3534, .5, .45), -5.28, .515, 2.62);
leftAdd(new THREE.TorusGeometry(.29, .022, 6, 24), new THREE.MeshBasicMaterial({ color: 0xff8a3d }),
  -5.28, .775, 2.62).rotation.x = Math.PI / 2;
leftAdd(new THREE.CylinderGeometry(.31, .27, .36, 20), mat(0xa9aea9, .34, .72), -5.28, .95, 2.62);
leftAdd(new THREE.CylinderGeometry(.285, .285, .012, 20), mat(0xd9d1bd, .25), -5.28, 1.12, 2.62);
leftLine([-5.21, 1.08, 2.58], [-4.98, 1.48, 2.36], timber, .016);
leftBox(.5, .04, .46, mat(0x9a8a70), -5.02, .84, 1.86);
leftBox(.46, .55, .42, timber, -5.02, .54, 1.86);
for (let i = 0; i < 4; i++) {
  leftAdd(new THREE.CylinderGeometry(.11, .085, .055, 14), mat(0xe9e1cf, .4), -5.13, .89 + i * .045, 1.8);
}
for (const [dx, color] of [[0, 0xa6342a], [.11, 0x5a7a3a], [.22, 0x8a6a3c]]) {
  leftAdd(new THREE.CylinderGeometry(.045, .045, .08, 10), mat(color, .5), -4.97 + dx * .4, .9, 1.98 - dx);
}
const stoveGlow = new THREE.PointLight(0xffa860, 3.5, 4, 2);
stoveGlow.position.set(-5.2, 1.6, 2.95);
leftShop.add(stoveGlow);
const menuCanvas = document.createElement('canvas');
menuCanvas.width = 256; menuCanvas.height = 420;
const menuInk = menuCanvas.getContext('2d');
menuInk.fillStyle = '#26332d'; menuInk.fillRect(0, 0, 256, 420);
menuInk.strokeStyle = '#8a6b4c'; menuInk.lineWidth = 10; menuInk.strokeRect(5, 5, 246, 410);
menuInk.fillStyle = '#efe6cf'; menuInk.textAlign = 'center';
menuInk.font = 'bold 42px KaiTi, STKaiti, "Microsoft YaHei", serif';
menuInk.fillText('今日', 128, 62);
menuInk.textAlign = 'left';
menuInk.font = '30px KaiTi, STKaiti, "Microsoft YaHei", serif';
[['小面', '8'], ['豌杂面', '12'], ['牛肉面', '16'], ['红油抄手', '12'], ['稀饭', '2']]
  .forEach(([dish, price], i) => {
    menuInk.fillStyle = i === 3 ? '#f2b49b' : '#efe6cf';
    menuInk.fillText(dish, 26, 128 + i * 60);
    menuInk.textAlign = 'right'; menuInk.fillText(price, 230, 128 + i * 60);
    menuInk.textAlign = 'left';
  });
const menuTexture = new THREE.CanvasTexture(menuCanvas);
menuTexture.colorSpace = THREE.SRGBColorSpace;
leftBox(.46, .74, .03, timber, -6.95, 1.72, 3.32);
leftAdd(new THREE.PlaneGeometry(.42, .69), new THREE.MeshStandardMaterial({ map: menuTexture, roughness: .85 }),
  -6.95, 1.72, 3.337);
for (const x of [-8.62, -7.2, -5.78]) {
  leftBox(.97, 1.15, .08, timber, x, 4.94, 3.94);
  leftBox(.83, 1.01, .025, new THREE.MeshBasicMaterial({ color: 0xb29470 }), x, 4.94, 4);
  for (let i = -1; i <= 1; i++) leftBox(.025, .98, .04, timber, x + i * .25, 4.94, 4.03);
  leftBox(.92, .042, .06, timber, x, 4.94, 4.06);
}
for (const x of [-8.45, -5.95]) {
  leftLine([x, 3.47, 3.53], [x, 2.84, 3.53], timber, .012);
  leftAdd(new THREE.CylinderGeometry(.2, .2, .39, 12), new THREE.MeshStandardMaterial({
    color: 0xca7055, emissive: 0xa94e31, emissiveIntensity: 1.2
  }), x, 2.68, 3.53);
  const lantern = new THREE.PointLight(0xffad70, 2.6, 4.5, 2);
  lantern.position.set(x, 2.65, 3.85);
  leftShop.add(lantern);
}
leftBox(1.45, .77, .75, timber, -6.47, .7, 2.09);
leftBox(1.51, .08, .81, mat(0x9a8a70), -6.47, 1.13, 2.09);
for (const x of [-6.8, -6.35, -5.9]) {
  leftAdd(new THREE.CylinderGeometry(.16, .14, .09, 16), mat(0xe6ddc5), x, 1.21, 2.14);
  leftAdd(new THREE.SphereGeometry(.075, 10, 8), mat(0xc47a4b), x, 1.28, 2.14);
}
leftBox(.8, 1.24, .42, mat(0x3c4140), -8.7, 1.22, 1.9);
leftBox(.66, .51, .035, new THREE.MeshBasicMaterial({ color: 0xb19578 }), -8.7, 1.49, 2.14);
for (const x of [-8.35, -7.76]) {
  leftAdd(new THREE.CylinderGeometry(.26, .23, .1, 12), timber, x, .68, 1.15);
  leftLine([x, .3, 1.15], [x, .65, 1.15], timber, .045);
}
const noodleLight = new THREE.PointLight(0xffb97a, 12, 8, 2);
noodleLight.position.set(-7.22, 2.28, 2.15);
leftShop.add(noodleLight);

// The tea house joins the rear party wall and faces the narrower right-hand lane.
box(10, 4.82, 5.4, masonry, .4, 5.69, -5.9).castShadow = true;
box(9.2, 2.9, .16, masonry, 0, 1.66, -8.53);
box(.16, 2.9, 5.4, masonry, -4.52, 1.66, -5.9);
box(.16, 2.9, 5.4, mat(0x80715e), 3.59, 1.66, -5.9);
box(9.05, .05, 5.2, mat(0x888270), 0, .24, -5.9);
box(10.32, .22, 5.7, oldRoof, .4, 8.2, -5.9);
for (let z = -8.55; z < -3.16; z += .38) {
  box(10.28, .022, .055, mat(0x63716c), .4, 8.33, z);
}
const teaFace = new THREE.Group();
teaFace.position.set(4.63, 0, -5.9);
teaFace.rotation.y = Math.PI / 2;
scene.add(teaFace);
box(5.55, .21, 1.14, timber, 0, 3.55, .52, teaFace);
for (const x of [-2.32, -1.16, 0, 1.16, 2.32]) {
  box(.075, .1, 1.05, mat(0x87735c), x, 3.4, .52, teaFace);
  line([x, 3.37, .05], [x, 3.03, -.22], timber, .03, teaFace);
}
box(5.32, .54, .16, mat(0x34514c), 0, 3.14, .11, teaFace);
add(new THREE.PlaneGeometry(5.02, .43), new THREE.MeshBasicMaterial({
  map: neighborSign('老街茶铺', 'TEA & A QUIET MOMENT', '#304e48', '#e6d9b2')
}), 0, 3.16, .205, teaFace);
for (const x of [-2.62, -1.54, -.47, .61, 1.68, 2.61]) {
  box(.1, 2.5, .17, timber, x, 1.57, .12, teaFace);
}
for (const x of [-2.07, -1, .07, 1.14, 2.13]) {
  box(.95, 1.99, .025, noodleGlass, x, 1.57, .17, teaFace);
  box(.95, .045, .1, timber, x, .59, .23, teaFace);
  box(.95, .045, .1, timber, x, 2.56, .23, teaFace);
}
for (const x of [-1.85, -.14, 1.57]) {
  box(1.08, 1.23, .09, timber, x, 5.65, .77, teaFace);
  box(.94, 1.08, .025, new THREE.MeshBasicMaterial({ color: 0xb0a486 }), x, 5.65, .83, teaFace);
  box(.036, 1.12, .04, timber, x, 5.65, .86, teaFace);
  for (const offset of [-.3, .3]) box(.026, 1.09, .04, timber, x + offset, 5.65, .86, teaFace);
  box(1.13, .08, .27, timber, x, 4.93, .9, teaFace);
}
for (const x of [-1.3, 1.25]) {
  box(.58, .67, .53, timber, x, .64, -.53, teaFace);
  box(.64, .06, .59, mat(0x9a8a70), x, 1.01, -.53, teaFace);
  add(new THREE.CylinderGeometry(.12, .14, .19, 10), mat(0x7b987c), x, 1.14, -.53, teaFace);
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(.16, .15, .07, 12), timber,
      x + side * .57, .48, -.49, teaFace);
  }
}
light(0xf2c48c, 10, 7, 4.4, 2.42, -5.9);

// Street furniture references the narrow, layered hillside streets of Huangjueya.
function streetLamp(x, z, height = 6.7, direction = 1, base = .22) {
  const pole = mat(0x43545a, .45, .6);
  line([x, base, z], [x, height, z], pole, .07);
  line([x, height, z], [x + direction * 1.3, height + .18, z], pole, .053);
  box(.78, .1, .4, mat(0x303e42), x + direction * 1.38, height + .11, z);
  const bulb = warm.clone();
  box(.71, .025, .33, bulb, x + direction * 1.38, height + .045, z);
  return { bulb, lamp: light(0xffbe81, 8, 10, x + direction * 1.38, height - .2, z) };
}
streetLamp(-5.9, 4.88, 7.3, -1, pedestrianHeight(-5.9));
const tiredLamp = streetLamp(6.12, -5.8, 7, 1, .195);
function lightHalo(x, y, z, color, size, opacity) {
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  halo.position.set(x, y, z);
  halo.scale.set(size, size, 1);
  scene.add(halo);
  return halo;
}
lightHalo(3.5, 3.22, 3.15, 0x7bdcf5, 5.2, .4);
lightHalo(-1.7, 2.65, 3.5, 0xffc48a, 3.8, .26);
lightHalo(-7.28, 7.4, 4.88, 0xffbd7e, 4.3, .36);
tiredLamp.halo = lightHalo(7.5, 7.1, -5.8, 0xffbd7e, 4, .32);

const roadSigns = new THREE.Group();
roadSigns.position.set(4.95, 0, 1.45);
roadSigns.rotation.y = Math.PI / 4;
scene.add(roadSigns);
line([0, .12, 0], [0, 4.65, 0], mat(0x7a8885, .38, .56), .047, roadSigns);
for (const y of [.43, .74, 1.05]) {
  box(.14, .09, .14, mat(0xc7cdc0), 0, y, 0, roadSigns);
}
const warningShape = new THREE.Shape();
warningShape.moveTo(0, .6);
warningShape.lineTo(-.62, -.43);
warningShape.lineTo(.62, -.43);
warningShape.closePath();
add(new THREE.ShapeGeometry(warningShape),
  new THREE.MeshBasicMaterial({ color: 0xb14738, side: THREE.DoubleSide }),
  0, 3.81, .13, roadSigns);
const warningInset = add(new THREE.ShapeGeometry(warningShape),
  new THREE.MeshBasicMaterial({ color: 0xf1d39a, side: THREE.DoubleSide }),
  0, 3.82, .144, roadSigns);
warningInset.scale.set(.76, .76, 1);
const warningInk = mat(0x36413f);
line([-.18, 3.58, .166], [.16, 3.82, .166], warningInk, .032, roadSigns);
line([.16, 3.82, .166], [-.04, 3.96, .166], warningInk, .032, roadSigns);
line([.16, 3.82, .166], [.29, 3.69, .166], warningInk, .032, roadSigns);
const directionCanvas = document.createElement('canvas');
directionCanvas.width = 512; directionCanvas.height = 160;
const directionInk = directionCanvas.getContext('2d');
directionInk.fillStyle = '#28556e'; directionInk.fillRect(0, 0, 512, 160);
directionInk.fillStyle = '#f3eee0';
directionInk.font = 'bold 98px "Microsoft YaHei", sans-serif';
directionInk.textAlign = 'center';
directionInk.fillText('↶  急弯', 256, 116);
const directionTexture = new THREE.CanvasTexture(directionCanvas);
directionTexture.colorSpace = THREE.SRGBColorSpace;
box(1.24, .51, .075, mat(0x2c444c), 0, 2.78, .1, roadSigns);
add(new THREE.PlaneGeometry(1.19, .43),
  new THREE.MeshBasicMaterial({ map: directionTexture, side: THREE.DoubleSide }),
  0, 2.78, .147, roadSigns);

function bollard(x, z) {
  box(.17, .62, .17, mat(0x4d5b5b, .5, .4), x, .53, z);
  box(.2, .045, .2, cyan, x, .85, z);
}
for (const x of [-4.8, .55]) bollard(x, 4.18);

// Huangjueya is named after the huangjue tree (Ficus virens): pale buttress roots
// grip the pit and crack nearby tiles, and aerial roots hang under a broad wet crown.
function huangjueTree(site) {
  const { x, z, wellX, wellZ, width, depth, size, lean, spread } = site;
  const [ax, az] = site.along, [ox, oz] = site.out;
  const ground = pedestrianHeight(x);
  box(width, .036, depth, mat(0x80877c), wellX, ground + .031, wellZ);
  box(width - .13, .009, depth - .13, mat(0x3d3b32), wellX, ground + .056, wellZ);
  const gravel = [mat(0x797c70), mat(0x665e53)];
  for (let i = 0; i < 24; i++) {
    const gx = wellX + (((i * 17) % 23) / 23 - .5) * (width - .21);
    const gz = wellZ + (((i * 13) % 19) / 19 - .5) * (depth - .21);
    if (Math.hypot(gx - x, gz - z) < .3) continue;
    add(new THREE.IcosahedronGeometry(.016 + (i % 3) * .007, 0),
      gravel[i % 2], gx, ground + .067, gz);
  }
  const bark = mat(0x837a6c, .93);
  const trunk = [
    [x, ground + .06, z],
    [x - .04 * size * ax, ground + .72 * size, z - .04 * size * az],
    [x + ox * lean * .18, ground + 1.42 * size, z + oz * lean * .18],
    [x + ox * lean * .46, ground + 2.12 * size, z + oz * lean * .46]
  ];
  const trunkRadius = [.125, .094, .066];
  for (let i = 0; i < trunk.length - 1; i++) {
    line(trunk[i], trunk[i + 1], bark, trunkRadius[i] * size);
    if (i) add(new THREE.SphereGeometry(trunkRadius[i - 1] * size * .92, 8, 6), bark, ...trunk[i]);
  }
  // Buttress roots stay inside the pit on the kerb side and spill onto the paving elsewhere.
  for (const [turn, reach] of [[0, .1], [.55, .5], [.8, .42], [1, .36], [1.2, .42], [1.45, .5]]) {
    const angle = Math.atan2(oz, ox) + turn * Math.PI;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const knee = [x + dx * reach * .5 * size, ground + .085, z + dz * reach * .5 * size];
    line([x + dx * .05 * size, ground + .36 * size, z + dz * .05 * size], knee, bark, .046 * size);
    add(new THREE.SphereGeometry(.04 * size, 7, 5), bark, ...knee);
    line(knee, [x + dx * reach * size, ground + .045, z + dz * reach * size], bark, .022 * size);
  }
  const leaves = [0x3a5642, 0x46664a, 0x58774f, 0x76894f].map(color =>
    new THREE.MeshStandardMaterial({ color, roughness: .52, metalness: .04 }));
  const hangingRoot = mat(0x887a69, .9);
  // Crown clusters are listed as [along the street, height, out over the road, radius].
  const clusters = [
    [0, 2.85, 0, .48], [-.29, 2.68, .06, .34], [.28, 2.76, -.04, .35],
    [0, 3.24, -.14, .39], [-.11, 3.04, .26, .36], [.16, 3.05, .23, .3],
    [-.43, 2.95, -.05, .3], [.4, 3.15, .02, .31],
    [-.24, 3.44, .1, .3], [.2, 3.43, -.12, .29],
    [-.62, 2.95, .09, .27], [.6, 2.9, -.04, .28], [-.05, 3.57, -.12, .28],
    [-.86, 2.68, .16, .3], [.84, 2.64, .12, .31], [.02, 2.7, .42, .32]
  ];
  const crownX = x + ox * lean, crownZ = z + oz * lean;
  const place = ([a, , o]) => [
    crownX + (ax * a * spread + ox * o) * size,
    crownZ + (az * a * spread + oz * o) * size
  ];
  for (const [i, cluster] of clusters.entries()) {
    const [, up, , radius] = cluster;
    const [cx, cz] = place(cluster);
    const base = trunk[i % 3 === 0 ? 2 : 3];
    const middle = [
      (base[0] + cx) / 2 + (i % 2 ? .045 : -.045) * size * ax,
      base[1] + (ground + up * size - base[1]) * .58,
      (base[2] + cz) / 2 + (i % 2 ? .045 : -.045) * size * az
    ];
    line(base, middle, bark, .029 * size);
    line(middle, [cx, ground + up * size, cz], bark, .015 * size);
    for (let strand = 0; strand < (i % 2 ? 1 : 2); strand++) {
      const t = .35 + strand * .3;
      const sx = middle[0] + (cx - middle[0]) * t, sz = middle[2] + (cz - middle[2]) * t;
      const sy = middle[1] + (ground + up * size - middle[1]) * t - .1;
      const length = (.24 + ((i * 7 + strand * 3) % 5) * .08) * size;
      const sway = ((i + strand) % 3 - 1) * .035;
      const kink = [sx + sway, sy - length * .55, sz - sway];
      line([sx, sy, sz], kink, hangingRoot, .0065 * size);
      line(kink, [sx + sway * .4, sy - length, sz - sway * 1.6], hangingRoot, .0045 * size);
    }
    const foliage = add(new THREE.IcosahedronGeometry(radius * size, 1),
      leaves[(i * 3 + Math.round(up * 10)) % (i % 5 ? 3 : 4)], cx, ground + up * size, cz);
    foliage.scale.set(ax ? 1.16 : 1, .8, az ? 1.16 : 1);
    foliage.castShadow = true;
  }
  const tufts = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(.105 * size, 0), leaves[1], 64);
  const tuft = new THREE.Object3D();
  for (let i = 0; i < 64; i++) {
    const cluster = clusters[(i * 7) % clusters.length];
    const [cx, cz] = place(cluster);
    const angle = i * 2.39996, radius = cluster[3] * size;
    tuft.position.set(
      cx + Math.cos(angle) * radius * .87,
      ground + cluster[1] * size + Math.sin(angle * 1.7) * radius * .6,
      cz + Math.sin(angle) * radius * .87);
    const scale = .7 + (i % 5) * .12;
    tuft.scale.set(scale, scale * .7, scale);
    tuft.rotation.set(i * .29, i * .41, 0);
    tuft.updateMatrix();
    tufts.setMatrixAt(i, tuft.matrix);
  }
  tufts.instanceMatrix.needsUpdate = true;
  scene.add(tufts);
}
treeSites.forEach(huangjueTree);
const seam = new THREE.MeshBasicMaterial({ color: 0x34454a, transparent: true, opacity: .38 });
for (let x = -5; x < 1; x += .72) {
  box(.016, .004, .74, seam, x, .199, 3.6);
}
for (let z = -3.7; z < .15; z += .73) {
  box(.72, .004, .016, seam, 5, .199, z);
}
for (const [x, z, turn] of [[-4.65, frontCurb + .2, 0],
  [1.4, frontCurb + .2, 0], [rightCurb + .2, -6.1, Math.PI / 2]]) {
  const group = new THREE.Group();
  group.position.set(x, -.12, z);
  group.rotation.y = turn;
  scene.add(group);
  box(.95, .013, .35, mat(0x101e27, .35), 0, 0, 0, group);
  for (let i = -3; i <= 3; i++) {
    box(.025, .017, .28, mat(0x597079, .35, .45), i * .12, .01, 0, group);
  }
}

// Uneven poles, porcelain insulators and sagging cables cross the old street.
function utilityPole(x, z, base, height) {
  const steel = mat(0x526061, .5, .45);
  line([x, base, z], [x, height, z], steel, .085);
  for (const y of [height - .72, height - 1.12]) {
    line([x - .72, y, z], [x + .72, y, z], steel, .038);
    for (const offset of [-.55, -.22, .22, .55]) {
      add(new THREE.CylinderGeometry(.067, .08, .13, 8), mat(0x9caca8, .35),
        x + offset, y + .11, z);
    }
  }
  box(.44, .61, .27, mat(0x475757), x, height - 2.8, z + .17);
}
utilityPole(-8.4, 4.8, pedestrianHeight(-8.4), 7.5);
utilityPole(-.1, 4.8, .195, 6.9);
utilityPole(6.1, -.15, .195, 6.9);
utilityPole(6.1, -8.35, .195, 7.4);
function hangingWire(start, end, sag, opacity = .8) {
  const points = [];
  for (let i = 0; i <= 40; i++) {
    const t = i / 40;
    points.push(new THREE.Vector3(
      THREE.MathUtils.lerp(start[0], end[0], t),
      THREE.MathUtils.lerp(start[1], end[1], t) - 4 * sag * t * (1 - t),
      THREE.MathUtils.lerp(start[2], end[2], t)
    ));
  }
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x344148, transparent: true, opacity })
  ));
}
for (const [left, right, sag] of [
  [7.08, 6.4, 1.08], [6.75, 6.11, 1.28], [6.44, 5.84, 1.44],
  [6.93, 6.26, 1.62], [6.58, 5.97, 1.78]
]) {
  hangingWire([-8.4, left, 4.8], [-.1, right, 4.8], sag);
}
for (const [front, back, sag] of [
  [6.85, 6.96, 1.05], [6.54, 6.65, 1.28],
  [6.22, 6.34, 1.48], [6.71, 6.48, 1.7]
]) {
  hangingWire([6.1, front, -.15], [6.1, back, -8.35], sag);
}
const cableBracket = mat(0x526061, .48, .4);
for (let i = 0; i < 3; i++) {
  const y = 6.05 - i * .27;
  line([1.48, y, 4.07], [1.8, y, 4.4], cableBracket, .022);
  hangingWire([-.1, 6.4 - i * .28, 4.8], [1.8, y, 4.4], .37 + i * .09);
  hangingWire([1.8, y, 4.4], [6.1, 6.44 - i * .28, -.15], .85 + i * .16);
}
for (let i = 0; i < 4; i++) {
  hangingWire([-8.9, 4.88 - i * .13, 4.25],
    [-.1, 4.52 - i * .11, 4.8], .36 + i * .045, .55);
  hangingWire([5.78, 4.64 - i * .12, -8.1],
    [6.1, 4.46 - i * .1, -.15], .34 + i * .045, .55);
}

// A tiny red vending machine provides another warm point of color on the sidewalk.
box(.88, 2.05, .74, mat(0xa64241, .35), -9.15, 2.03, 3.52);
box(.7, 1.25, .025, new THREE.MeshBasicMaterial({ color: 0xf3ddb0 }), -9.15, 2.21, 3.91);
for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
  box(.11, .26, .07, mat([0x80bdb7, 0xc89c6f, 0xa77469][i]),
    -9.4 + j * .16, 2.61 - i * .36, 3.97);
}
box(.4, .08, .08, mat(0x4a3337), -9.15, 1.42, 3.99);
light(0xe9716c, 3, 5, -9.15, 2.78, 4.1);

// Rain and ground impacts are batched so the weather remains fluid while orbiting.
const rainCount = 1600;
const rainPositions = new Float32Array(rainCount * 6);
const rainSpeed = new Float32Array(rainCount);
const rainFloor = new Float32Array(rainCount);
for (let i = 0; i < rainCount; i++) {
  const o = i * 6;
  rainPositions[o] = block.left + Math.random() * (block.right - block.left);
  rainPositions[o + 2] = block.back + Math.random() * (block.front - block.back);
  rainFloor[i] = shelterTop(rainPositions[o], rainPositions[o + 2]) ?? -.1;
  rainPositions[o + 1] = rainFloor[i] + Math.random() * (19 - rainFloor[i]);
  rainPositions[o + 3] = rainPositions[o] - .09;
  rainPositions[o + 4] = rainPositions[o + 1] - .3 - Math.random() * .35;
  rainPositions[o + 5] = rainPositions[o + 2];
  rainSpeed[i] = 9 + Math.random() * 8;
}
const rainGeometry = new THREE.BufferGeometry();
rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3).setUsage(THREE.DynamicDrawUsage));
const rainMaterial = new THREE.LineBasicMaterial({ color: 0xb1d7df, transparent: true, opacity: .34, depthWrite: false });
const rain = new THREE.LineSegments(rainGeometry, rainMaterial);
rain.frustumCulled = false;
scene.add(rain);

const isOpenPavement = (x, z) => x > -9.7 && x < rightCurb - .08 &&
  z > block.back + .05 && z < frontCurb - .08 && !(x < -4.6 && z < 3.2) &&
  !(x > 2.1 && z > frontCurb - (x - 2.1) * turnRise / turnRun - .08) &&
  shelterTop(x, z) === null && !inTreeWell(x, z, .05);
const rippleCount = 150;
const ripple = new THREE.InstancedMesh(
  new THREE.RingGeometry(.8, 1, 24),
  new THREE.MeshBasicMaterial({
    color: 0xa5d4dd, transparent: true, opacity: .19, side: THREE.DoubleSide,
    depthWrite: false
  }),
  rippleCount
);
ripple.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
ripple.frustumCulled = false;
scene.add(ripple);
const rippleLocations = [];
while (rippleLocations.length < rippleCount) {
  const x = block.left + Math.random() * (block.right - block.left);
  const z = block.back + Math.random() * (block.front - block.back);
  const onPavement = rippleLocations.length >= 105;
  if (onPavement ? !isOpenPavement(x, z) : !isRoad(x, z)) continue;
  rippleLocations.push({
    x, z, y: onPavement ? pedestrianHeight(x) + (x < -4.6 ? .07 : .045) : roadSurfaceY(x, z) + .027,
    phase: Math.random(), speed: .5 + Math.random() * .65
  });
}
const rippleMatrix = new THREE.Matrix4();
const rippleRotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
const rippleScale = new THREE.Vector3();
const ripplePosition = new THREE.Vector3();

// Water gathers along each projecting upper floor and falls in a broken curtain;
// the two downpipes spill steadier streams onto the pavement.
function dripFloor(x, z) {
  const ground = pedestrianHeight(x);
  if (inTreeWell(x, z)) return ground + .066;
  const tactilePath = (x < 1.85 && z > 3 && Math.abs(z - frontTactileZ(x)) < .2) ||
    (z < -.1 && z > -8.5 && Math.abs(x - rightTactileX(z)) < .2);
  return ground + (tactilePath ? (x < -4.6 ? .1 : .085) : (x < -4.6 ? .055 : .04));
}
const drips = [];
for (const [[x1, z1], [x2, z2], top] of [
  [[-9.75, 4.14], [-4.62, 4.14], 4.3],
  [[-4.55, 4.09], [1.57, 4.09], 3.45],
  [[1.6, 4.06], [5.47, .19], 3.45],
  [[5.49, .12], [5.49, -3.15], 3.45],
  [[5.76, -3.3], [5.76, -8.55], 3.42]
]) {
  const count = Math.round(Math.hypot(x2 - x1, z2 - z1) / .18);
  for (let i = 0; i < count; i++) {
    const t = (i + .5 + (Math.random() - .5) * .6) / count;
    const x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    if (Math.abs(x - .55) < .16 && Math.abs(z - 4.18) < .16) continue;
    drips.push({ x, z, top, floor: dripFloor(x, z), vz: 0, wait: .25 + Math.random() * 1.6, length: .07 });
  }
}
for (const x of [-4.15, .95]) {
  for (let i = 0; i < 18; i++) {
    drips.push({ x, z: 4.42, top: 3.74, floor: dripFloor(x, 4.91), vz: .58, wait: .02, length: .052, index: i });
  }
}
let beadCount = 0;
for (const drip of drips) {
  drip.fall = Math.sqrt(2 * (drip.top - drip.floor) / 9.8);
  drip.period = drip.fall + drip.wait;
  drip.phase = drip.index === undefined ? Math.random() * drip.period :
    drip.index * drip.period / 18;
  if (drip.index === undefined) drip.bead = beadCount++;
}
const dripPositions = new Float32Array(drips.length * 6);
const dripGeometry = new THREE.BufferGeometry();
dripGeometry.setAttribute('position',
  new THREE.BufferAttribute(dripPositions, 3).setUsage(THREE.DynamicDrawUsage));
const dripLines = new THREE.LineSegments(dripGeometry, new THREE.LineBasicMaterial({
  color: 0xe4f6fa, transparent: true, opacity: .8, depthWrite: false
}));
dripLines.frustumCulled = false;
scene.add(dripLines);
const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.017, 6, 4),
  new THREE.MeshBasicMaterial({ color: 0xd9f0f5, transparent: true, opacity: .85 }), beadCount);
beads.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
beads.frustumCulled = false;
scene.add(beads);
const noRotation = new THREE.Quaternion();
const beadScale = new THREE.Vector3();
const splashes = new THREE.InstancedMesh(
  new THREE.RingGeometry(.72, 1, 18),
  new THREE.MeshBasicMaterial({
    color: 0xc4e3ea, transparent: true, opacity: .5, side: THREE.DoubleSide, depthWrite: false
  }),
  drips.length
);
splashes.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
splashes.frustumCulled = false;
scene.add(splashes);
// Steam from the noodle stockpot slips through the strip curtain and curls under the eave.
const steam = Array.from({ length: 18 }, (_, i) => {
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: 0xeadccb, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(sprite);
  return { sprite, phase: i / 18, offset: Math.random() * Math.PI * 2 };
});

function resize() {
  const w = container.clientWidth, h = container.clientHeight;
  camera.aspect = w / h;
  camera.fov = w < 700 ? 59 : 39;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}
window.addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), .05);
  controls.update();
  for (let i = 0; i < rainCount; i++) {
    const o = i * 6;
    rainPositions[o + 1] -= rainSpeed[i] * dt;
    if (rainPositions[o + 1] < rainFloor[i]) rainPositions[o + 1] += 19 - rainFloor[i];
    rainPositions[o + 4] = rainPositions[o + 1] - .35;
  }
  rainGeometry.attributes.position.needsUpdate = true;
  for (let i = 0; i < rippleCount; i++) {
    const drop = rippleLocations[i];
    drop.phase = (drop.phase + dt * drop.speed) % 1;
    const size = Math.max(.001, drop.phase * .25);
    ripplePosition.set(drop.x, drop.y, drop.z);
    rippleScale.set(size, size, size);
    rippleMatrix.compose(ripplePosition, rippleRotation, rippleScale);
    ripple.setMatrixAt(i, rippleMatrix);
  }
  ripple.instanceMatrix.needsUpdate = true;
  for (let i = 0; i < drips.length; i++) {
    const drip = drips[i], o = i * 6;
    drip.phase = (drip.phase + dt) % drip.period;
    const t = drip.phase;
    if (t < drip.fall) {
      const y = drip.top - 4.9 * t * t, z = drip.z + drip.vz * t;
      const fallSpeed = 9.8 * t, speed = Math.max(.001, Math.hypot(fallSpeed, drip.vz));
      const tail = Math.min(drip.top - y, .03 + fallSpeed * drip.length, .42);
      dripPositions[o] = dripPositions[o + 3] = drip.x;
      dripPositions[o + 1] = y + tail * fallSpeed / speed;
      dripPositions[o + 2] = z - tail * drip.vz / speed;
      dripPositions[o + 4] = y;
      dripPositions[o + 5] = z;
      rippleScale.setScalar(.0001);
    } else {
      dripPositions.fill(-20, o, o + 6);
      const age = t - drip.fall;
      rippleScale.setScalar(age < .34 ? .03 + age * .5 : .0001);
    }
    if (drip.bead !== undefined) {
      ripplePosition.set(drip.x, drip.top - .015, drip.z);
      const swell = t < drip.fall ? .3 : .3 + .75 * (t - drip.fall) / drip.wait;
      rippleMatrix.compose(ripplePosition, noRotation, beadScale.setScalar(swell));
      beads.setMatrixAt(drip.bead, rippleMatrix);
    }
    ripplePosition.set(drip.x, drip.floor + .004, drip.z + drip.vz * drip.fall);
    rippleMatrix.compose(ripplePosition, rippleRotation, rippleScale);
    splashes.setMatrixAt(i, rippleMatrix);
  }
  dripGeometry.attributes.position.needsUpdate = true;
  beads.instanceMatrix.needsUpdate = true;
  splashes.instanceMatrix.needsUpdate = true;
  runoffMap.offset.x -= dt * .65;
  const elapsed = clock.elapsedTime, stutter = elapsed % 11.3;
  const lampLevel = (stutter > 10.55 && Math.sin(stutter * 71) > -.15 ? .28 : 1) *
    (.95 + Math.sin(elapsed * 6.1) * .03 + Math.sin(elapsed * 23.7) * .02);
  tiredLamp.lamp.intensity = 8 * lampLevel;
  tiredLamp.bulb.emissiveIntensity = 1.3 * lampLevel;
  tiredLamp.halo.material.opacity = .32 * lampLevel;
  catHead.rotation.y = Math.sin(elapsed * .21) * .45 + Math.sin(elapsed * .53) * .12;
  catHead.rotation.x = Math.sin(elapsed * .17) * .06;
  for (const eye of catEyes) eye.scale.y = elapsed % 5.3 < .14 ? .15 : 1;
  catTail.rotation.y = Math.sin(elapsed * .8) * .06;
  catTailTip.rotation.y = Math.sin(elapsed * 1.7) * .35 + Math.sin(elapsed * 4.3) * .08;
  for (const wisp of steam) {
    wisp.phase = (wisp.phase + dt * .2) % 1;
    const phase = wisp.phase;
    wisp.sprite.position.set(
      -5.28 + Math.sin(phase * 5 + wisp.offset) * .12,
      2.04 + phase * 1.75,
      2.62 + phase * 1.15 + Math.cos(phase * 4 + wisp.offset) * .07
    );
    wisp.sprite.scale.set(.3 + phase * .95, .26 + phase * .8, 1);
    wisp.sprite.material.opacity = .11 * Math.sin(phase * Math.PI);
  }
  renderer.render(scene, camera);
}
animate();
