// Load spells from localStorage
let customSpells = [];
try {
    const spellsData = localStorage.getItem('customSpells');
    if (spellsData) {
        customSpells = JSON.parse(spellsData);
    }
} catch (e) {
    console.error('Failed to load custom spells:', e);
}

const executionOrder = [0, 1, 2, 3, 7, 6, 5, 4];

// Three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1510);
scene.fog = new THREE.Fog(0x1a1510, 50, 200);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('gameCanvas').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Arena floor
const floorGeometry = new THREE.CircleGeometry(50, 32);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3d2817,
    roughness: 0.8,
    metalness: 0.2
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Arena walls (invisible collision)
const wallHeight = 10;
const wallGeometry = new THREE.CylinderGeometry(50, 50, wallHeight, 32, 1, true);
const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x78350f,
    transparent: true,
    opacity: 0.3,
    side: THREE.DoubleSide
});
const walls = new THREE.Mesh(wallGeometry, wallMaterial);
walls.position.y = wallHeight / 2;
scene.add(walls);

// Player
const playerGeometry = new THREE.CapsuleGeometry(0.5, 1.5, 4, 8);
const playerMaterial = new THREE.MeshStandardMaterial({ color: 0xd97706 });
const player = new THREE.Mesh(playerGeometry, playerMaterial);
player.position.set(0, 1.5, 0);
player.castShadow = true;
scene.add(player);

// Camera setup (first person)
camera.position.set(0, 3, 0);
camera.rotation.order = 'YXZ';

// Game state
const game = {
    player: {
        position: new THREE.Vector3(0, 1.5, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: { yaw: 0, pitch: 0 },
        onGround: true,
        speed: 10,
        jumpForce: 8,
        weapon: 'sword',
        currentSpell: 0,
        imbuedWeapon: null
    },
    projectiles: [],
    particles: [],
    keys: {},
    mouse: { x: 0, y: 0, locked: false },
    score: 0,
    lastAttack: 0,
    attackCooldown: 500
};

// Input handling
const keys = game.keys;

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Weapon switching
    if (e.key === '1') switchWeapon('fists');
    if (e.key === '2') switchWeapon('sword');
    if (e.key === '3') switchWeapon('bow');
    if (e.key === '4') switchWeapon('spell');
    
    // Spell switching
    if (e.key === 'q') {
        game.player.currentSpell = (game.player.currentSpell - 1 + 4) % 4;
        updateSpellUI();
    }
    if (e.key === 'e') {
        game.player.currentSpell = (game.player.currentSpell + 1) % 4;
        updateSpellUI();
    }
    
    // Imbue weapon
    if (e.key === 'r') {
        imbueWeapon();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Mouse controls
let mouseMovementX = 0;
let mouseMovementY = 0;

document.addEventListener('mousemove', (e) => {
    if (game.mouse.locked) {
        mouseMovementX += e.movementX || 0;
        mouseMovementY += e.movementY || 0;
    }
});

document.addEventListener('click', () => {
    if (!game.mouse.locked) {
        renderer.domElement.requestPointerLock();
    } else {
        attack();
    }
});

document.addEventListener('pointerlockchange', () => {
    game.mouse.locked = document.pointerLockElement === renderer.domElement;
});

// UI event handlers
document.querySelectorAll('.weapon-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
        e.stopPropagation();
        switchWeapon(slot.dataset.weapon);
    });
});

document.querySelectorAll('.spell-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
        e.stopPropagation();
        game.player.currentSpell = parseInt(slot.dataset.spell);
        updateSpellUI();
    });
});

function switchWeapon(weapon) {
    game.player.weapon = weapon;
    document.querySelectorAll('.weapon-slot').forEach(s => s.classList.remove('active'));
    const slot = document.querySelector(`[data-weapon="${weapon}"]`);
    if (slot) slot.classList.add('active');
}

function updateSpellUI() {
    document.querySelectorAll('.spell-slot').forEach((s, i) => {
        s.classList.toggle('active', i === game.player.currentSpell);
    });
}

function imbueWeapon() {
    const currentSpell = customSpells[game.player.currentSpell];
    if (!currentSpell || !currentSpell.palette.some(t => t)) return;
    
    const hasImbue = currentSpell.palette.some(tile => 
        tile && tile.category && tile.category.type === 'spellType' && 
        (tile.id === 'imbue-hit' || tile.id === 'imbue-use')
    );
    
    if (hasImbue) {
        game.player.imbuedWeapon = game.player.currentSpell;
        createParticles(game.player.position.clone(), 0xf59e0b, 20);
    }
}

function attack() {
    const now = Date.now();
    if (now - game.lastAttack < game.attackCooldown) return;
    game.lastAttack = now;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    switch (game.player.weapon) {
        case 'fists':
        case 'sword':
            meleeAttack(direction);
            break;
        case 'bow':
            shootArrow(direction);
            break;
        case 'spell':
            castSpell(direction);
            break;
    }
}

function meleeAttack(direction) {
    const range = game.player.weapon === 'sword' ? 3 : 2;
    const hitPosition = game.player.position.clone().add(direction.multiplyScalar(range));
    
    createParticles(hitPosition, 0xd97706, 5);
}

function shootArrow(direction) {
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.5, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0x92400e });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    
    arrow.position.copy(game.player.position);
    arrow.position.y += 0.5;
    arrow.castShadow = true;
    scene.add(arrow);
    
    game.projectiles.push({
        mesh: arrow,
        velocity: direction.clone().multiplyScalar(30),
        type: 'arrow',
        damage: 40,
        lifetime: 5000,
        createdAt: Date.now()
    });
}

function castSpell(direction) {
    const spellData = customSpells[game.player.currentSpell];
    if (!spellData || !spellData.palette.some(t => t)) return;
    
    triggerSpellEffect(game.player.position.clone(), direction, game.player.currentSpell);
}

function triggerSpellEffect(position, direction, spellIndex) {
    const spellData = customSpells[spellIndex];
    if (!spellData) return;
    
    // Find first spell base
    let foundSpell = null;
    let modifiers = [];
    
    for (let execIdx of executionOrder) {
        const tile = spellData.palette[execIdx];
        if (!tile) continue;
        
        if (tile.category && tile.category.type === 'spell') {
            foundSpell = tile;
            break;
        } else if (tile.category && tile.category.type === 'modifier') {
            modifiers.push(tile);
        }
    }
    
    if (!foundSpell) return;
    
    // Check for cast modifiers
    let castMultiplier = 1;
    for (let execIdx of executionOrder) {
        const tile = spellData.palette[execIdx];
        if (tile && tile.category && tile.category.type === 'castType') {
            if (tile.id === 'duplicate') castMultiplier = 2;
            else if (tile.id === 'triplicate') castMultiplier = 3;
            else if (tile.id === 'quintuplicate') castMultiplier = 5;
            else if (tile.id === 'decuplicate') castMultiplier = 10;
        }
    }
    
    // Cast spell multiple times
    for (let i = 0; i < castMultiplier; i++) {
        const spreadAngle = (i - (castMultiplier - 1) / 2) * 0.3;
        const spreadDirection = direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spreadAngle);
        castSingleSpell(position.clone(), spreadDirection, foundSpell, modifiers);
    }
}

function castSingleSpell(position, direction, spell, modifiers) {
    const hasHoming = modifiers.some(m => m.id === 'homing');
    
    let color, speed, size;
    
    switch (spell.id) {
        case 'fireball':
            color = 0xf97316;
            speed = 20;
            size = 0.5;
            break;
        case 'explosion':
            createExplosion(position);
            return;
        case 'meteor':
            color = 0xdc2626;
            speed = 15;
            size = 0.8;
            break;
        case 'thunderbolt':
            color = 0xfbbf24;
            speed = 40;
            size = 0.3;
            break;
        case 'beam':
            createBeam(position, direction);
            return;
        case 'fire-spark':
            color = 0xfb923c;
            speed = 25;
            size = 0.3;
            break;
        default:
            return;
    }
    
    createProjectile(position, direction, color, speed, size, hasHoming);
}

function createProjectile(position, direction, color, speed, size, homing = false) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.5
    });
    const projectile = new THREE.Mesh(geometry, material);
    
    position.y += 0.5;
    projectile.position.copy(position);
    projectile.castShadow = true;
    scene.add(projectile);
    
    // Add point light to projectile
    const light = new THREE.PointLight(color, 2, 10);
    projectile.add(light);
    
    game.projectiles.push({
        mesh: projectile,
        velocity: direction.clone().multiplyScalar(speed),
        type: 'spell',
        damage: 50,
        homing: homing,
        lifetime: 10000,
        createdAt: Date.now()
    });
}

function createExplosion(position) {
    createParticles(position, 0xf97316, 50);
    
    // Create explosion visual
    const geometry = new THREE.SphereGeometry(3, 16, 16);
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xf97316,
        transparent: true,
        opacity: 0.7
    });
    const explosion = new THREE.Mesh(geometry, material);
    explosion.position.copy(position);
    scene.add(explosion);
    
    setTimeout(() => scene.remove(explosion), 200);
}

function createBeam(position, direction) {
    const beamLength = 50;
    const endPosition = position.clone().add(direction.clone().multiplyScalar(beamLength));
    
    const beamGeometry = new THREE.CylinderGeometry(0.2, 0.2, beamLength, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xf97316,
        transparent: true,
        opacity: 0.8
    });
    const beam = new THREE.Mesh(beamGeometry, beamMaterial);
    
    beam.position.copy(position).lerp(endPosition, 0.5);
    beam.lookAt(endPosition);
    beam.rotateX(Math.PI / 2);
    
    scene.add(beam);
    createParticles(endPosition, 0xf97316, 30);
    
    setTimeout(() => scene.remove(beam), 100);
}

function createParticles(position, color, count) {
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.SphereGeometry(0.1, 8, 8);
        const material = new THREE.MeshBasicMaterial({ color: color });
        const particle = new THREE.Mesh(geometry, material);
        
        particle.position.copy(position);
        scene.add(particle);
        
        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 5
        );
        
        game.particles.push({
            mesh: particle,
            velocity: velocity,
            lifetime: 1000,
            createdAt: Date.now()
        });
    }
}

// Update loop
const clock = new THREE.Clock();

function update() {
    const delta = clock.getDelta();
    
    // Update camera rotation
    if (game.mouse.locked) {
        const sensitivity = 0.002;
        game.player.rotation.yaw -= mouseMovementX * sensitivity;
        game.player.rotation.pitch -= mouseMovementY * sensitivity;
        game.player.rotation.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, game.player.rotation.pitch));
        
        mouseMovementX = 0;
        mouseMovementY = 0;
        
        camera.rotation.y = game.player.rotation.yaw;
        camera.rotation.x = game.player.rotation.pitch;
    }
    
    // Player movement
    const moveSpeed = game.player.speed * delta;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();
    
    if (keys['w']) game.player.position.add(forward.clone().multiplyScalar(moveSpeed));
    if (keys['s']) game.player.position.add(forward.clone().multiplyScalar(-moveSpeed));
    if (keys['a']) game.player.position.add(right.clone().multiplyScalar(-moveSpeed));
    if (keys['d']) game.player.position.add(right.clone().multiplyScalar(moveSpeed));
    
    // Jump
    if (keys[' '] && game.player.onGround) {
        game.player.velocity.y = game.player.jumpForce;
        game.player.onGround = false;
    }
    
    // Gravity
    game.player.velocity.y -= 20 * delta;
    game.player.position.y += game.player.velocity.y * delta;
    
    // Ground collision
    if (game.player.position.y <= 1.5) {
        game.player.position.y = 1.5;
        game.player.velocity.y = 0;
        game.player.onGround = true;
    }
    
    // Keep player in arena
    const distFromCenter = Math.sqrt(
        game.player.position.x ** 2 + game.player.position.z ** 2
    );
    if (distFromCenter > 48) {
        const angle = Math.atan2(game.player.position.z, game.player.position.x);
        game.player.position.x = Math.cos(angle) * 48;
        game.player.position.z = Math.sin(angle) * 48;
    }
    
    // Update camera position
    camera.position.copy(game.player.position);
    camera.position.y += 1.5;
    
    // Update projectiles
    game.projectiles.forEach((proj, index) => {
        proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));
        
        // Remove if lifetime exceeded
        if (Date.now() - proj.createdAt > proj.lifetime) {
            scene.remove(proj.mesh);
            game.projectiles.splice(index, 1);
            return;
        }
        
        // Remove if out of bounds
        const dist = proj.mesh.position.length();
        if (dist > 100) {
            scene.remove(proj.mesh);
            game.projectiles.splice(index, 1);
        }
    });
    
    // Update particles
    game.particles.forEach((particle, index) => {
        particle.mesh.position.add(particle.velocity.clone().multiplyScalar(delta));
        particle.velocity.y -= 10 * delta;
        
        if (Date.now() - particle.createdAt > particle.lifetime) {
            scene.remove(particle.mesh);
            game.particles.splice(index, 1);
        }
    });
    
    // Update player mesh position
    player.position.copy(game.player.position);
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start game
animate();
