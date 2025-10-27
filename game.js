import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- Setup basic scene ---
const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1510);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 15);

const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = true;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 10);
scene.add(directionalLight);

// --- Ground ---
const groundGeo = new THREE.PlaneGeometry(50, 50);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a2b1a });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// --- Player ---
const playerGeo = new THREE.BoxGeometry(1, 2, 1);
const playerMat = new THREE.MeshStandardMaterial({ color: 0xffaa00 });
const player = new THREE.Mesh(playerGeo, playerMat);
player.position.y = 1;
scene.add(player);

// --- Player movement ---
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function movePlayer(delta) {
    const speed = 5;
    let moveX = 0;
    let moveZ = 0;
    if (keys['w']) moveZ -= speed * delta;
    if (keys['s']) moveZ += speed * delta;
    if (keys['a']) moveX -= speed * delta;
    if (keys['d']) moveX += speed * delta;

    player.position.x += moveX;
    player.position.z += moveZ;

    // Simple camera follow
    camera.position.x = player.position.x + 10;
    camera.position.z = player.position.z + 10;
    camera.lookAt(player.position);
}

// --- Load spells from localStorage ---
let spells = [];
const spellData = localStorage.getItem('spells');
if (spellData) {
    try {
        spells = JSON.parse(spellData);
        console.log('Loaded spells:', spells);
    } catch (e) {
        console.warn('Failed to parse spells from localStorage.');
    }
}

// --- Weapon & Spell UI ---
const weaponSlots = document.querySelectorAll('.weapon-slot');
let activeWeapon = 'sword';
weaponSlots.forEach(slot => {
    slot.addEventListener('click', () => {
        weaponSlots.forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        activeWeapon = slot.dataset.weapon;
        console.log('Selected weapon:', activeWeapon);
    });
});

const spellSlots = document.querySelectorAll('.spell-slot');
let activeSpell = 0;
spellSlots.forEach(slot => {
    slot.addEventListener('click', () => {
        spellSlots.forEach(s => s.classList.remove('active'));
        slot.classList.add('active');
        activeSpell = parseInt(slot.dataset.spell);
        console.log('Selected spell slot:', activeSpell);
    });
});

// --- Animation loop ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    movePlayer(delta);

    renderer.render(scene, camera);
}

animate();

// --- Handle window resize ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
