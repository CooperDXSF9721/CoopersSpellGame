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
scene.background = new THREE.Color(0x2d2520);
scene.fog = new THREE.Fog(0x2d2520, 20, 60);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('gameCanvas').appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
mainLight.position.set(10, 20, 10);
mainLight.castShadow = true;
mainLight.shadow.mapSize.width = 2048;
mainLight.shadow.mapSize.height = 2048;
mainLight.shadow.camera.near = 0.5;
mainLight.shadow.camera.far = 50;
mainLight.shadow.camera.left = -25;
mainLight.shadow.camera.right = 25;
mainLight.shadow.camera.top = 25;
mainLight.shadow.camera.bottom = -25;
scene.add(mainLight);

// Create a room
const roomSize = 30;
const wallHeight = 8;

// Floor
const floorGeometry = new THREE.PlaneGeometry(roomSize, roomSize);
const floorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4a3428,
    roughness: 0.9,
    metalness: 0.1
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

// Ceiling
const ceilingMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3a2820,
    roughness: 0.9,
    side: THREE.DoubleSide
});
const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
ceiling.rotation.x = -Math.PI / 2;
ceiling.position.y = wallHeight;
ceiling.receiveShadow = true;
scene.add(ceiling);

// Walls
const wallMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x5a4438,
    roughness: 0.8
});

// North wall
const wallGeometry = new THREE.PlaneGeometry(roomSize, wallHeight);
const northWall = new THREE.Mesh(wallGeometry, wallMaterial);
northWall.position.set(0, wallHeight/2, -roomSize/2);
northWall.receiveShadow = true;
northWall.castShadow = true;
scene.add(northWall);

// South wall
const southWall = new THREE.Mesh(wallGeometry, wallMaterial);
southWall.position.set(0, wallHeight/2, roomSize/2);
southWall.rotation.y = Math.PI;
southWall.receiveShadow = true;
southWall.castShadow = true;
scene.add(southWall);

// East wall
const eastWall = new THREE.Mesh(wallGeometry, wallMaterial);
eastWall.position.set(roomSize/2, wallHeight/2, 0);
eastWall.rotation.y = -Math.PI/2;
eastWall.receiveShadow = true;
eastWall.castShadow = true;
scene.add(eastWall);

// West wall
const westWall = new THREE.Mesh(wallGeometry, wallMaterial);
westWall.position.set(-roomSize/2, wallHeight/2, 0);
westWall.rotation.y = Math.PI/2;
westWall.receiveShadow = true;
westWall.castShadow = true;
scene.add(westWall);

// Add some torches on walls for atmosphere
function createTorch(x, y, z) {
    const torchLight = new THREE.PointLight(0xff6600, 1, 15);
    torchLight.position.set(x, y, z);
    torchLight.castShadow = true;
    scene.add(torchLight);
    
    const torchGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5, 8);
    const torchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const torch = new THREE.Mesh(torchGeometry, torchMaterial);
    torch.position.set(x, y, z);
    scene.add(torch);
}

createTorch(-12, 5, -12);
createTorch(12, 5, -12);
createTorch(-12, 5, 12);
createTorch(12, 5, 12);

// Player
camera.position.set(0, 2, 0);
camera.rotation.order = 'YXZ';

// Game state
const game = {
    player: {
        position: new THREE.Vector3(0, 2, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        rotation: { yaw: 0, pitch: 0 },
        onGround: true,
        speed: 8,
        jumpForce: 6,
        weapon: 'sword',
        currentSpell: 0,
        height: 2
    },
    projectiles: [],
    particles: [],
    keys: {},
    mouse: { locked: false },
    score: 0,
    lastAttack: 0,
    attackCooldown: 500,
    roomSize: 30
};

// Input handling
const keys = game.keys;

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    // Weapon switching
    if (e.key === '1') switchWeapon('fists');
    if (e.key === '2') switchWeapon('sword');
    if (e.key === '3') switchWeapon('bow');
    
    // Spell switching
    if (e.key.toLowerCase() === 'q') {
        game.player.currentSpell = (game.player.currentSpell - 1 + 4) % 4;
        updateSpellUI();
    }
    if (e.key.toLowerCase() === 'e') {
        game.player.currentSpell = (game.player.currentSpell + 1) % 4;
        updateSpellUI();
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

// Auto-lock pointer on page load
window.addEventListener('load', () => {
    setTimeout(() => {
        renderer.domElement.requestPointerLock();
    }, 100);
});

// Click to lock if not locked
renderer.domElement.addEventListener('click', () => {
    if (!game.mouse.locked) {
        renderer.domElement.requestPointerLock();
    }
});

// Left click - weapon attack
document.addEventListener('mousedown', (e) => {
    if (!game.mouse.locked) return;
    if (e.button === 0) { // Left click
        attack();
    } else if (e.button === 2) { // Right click
        castSpell();
    }
});

// Prevent right-click menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('pointerlockchange', () => {
    game.mouse.locked = document.pointerLockElement === renderer.domElement;
});

// UI event handlers
document.querySelectorAll('.weapon-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        switchWeapon(slot.dataset.weapon);
    });
});

document.querySelectorAll('.spell-slot').forEach(slot => {
    slot.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
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
    }
}

function castSpell() {
    const now = Date.now();
    if (now - game.lastAttack < game.attackCooldown) return;
    game.lastAttack = now;
    
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);
    
    const spellData = customSpells[game.player.currentSpell];
    if (!spellData || !spellData.palette.some(t => t)) return;
    
    triggerSpellEffect(game.player.position.clone(), direction, game.player.currentSpell);
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
    
    arrow.position.copy(camera.position);
    arrow.castShadow = true;
    
    // Orient arrow in direction of travel
    arrow.lookAt(camera.position.clone().add(direction));
    arrow.rotateX(Math.PI / 2);
    
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
    const hasGuided = modifiers.some(m => m.id === 'guided');
    const hasWeightless = modifiers.some(m => m.id === 'weightless');
    const hasArcTrail = modifiers.some(m => m.id === 'arc-trail');
    const hasMoltenTrail = modifiers.some(m => m.id === 'molten-trail');
    
    let color, speed, size, hasGravity;
    
    switch (spell.id) {
        case 'fireball':
            color = 0xff5722;
            speed = 20;
            size = 0.3;
            hasGravity = !hasWeightless;
            break;
        case 'explosion':
            createExplosion(position);
            return;
        case 'meteor':
            color = 0xb71c1c;
            speed = 15;
            size = 0.6;
            hasGravity = !hasWeightless;
            break;
        case 'thunderbolt':
            createLightning(position, direction);
            return;
        default:
            return;
    }
    
    createProjectile(position, direction, color, speed, size, hasHoming, hasGuided, hasGravity, hasArcTrail, hasMoltenTrail);
}

function castAtPosition(position, spell, modifiers) {
    // For CAST spell type - creates effect at position
    if (spell.id === 'explosion') {
        createExplosion(position);
    }
    // Effects are handled separately
}

function createProjectile(position, direction, color, speed, size, homing, guided, hasGravity, arcTrail, moltenTrail) {
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    const material = new THREE.MeshStandardMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.8
    });
    const projectile = new THREE.Mesh(geometry, material);
    
    projectile.position.copy(camera.position);
    projectile.castShadow = true;
    scene.add(projectile);
    
    // Add point light
    const light = new THREE.PointLight(color, 2, 10);
    projectile.add(light);
    
    game.projectiles.push({
        mesh: projectile,
        velocity: direction.clone().multiplyScalar(speed),
        type: 'spell',
        damage: 50,
        homing: homing,
        guided: guided,
        hasGravity: hasGravity,
        arcTrail: arcTrail,
        moltenTrail: moltenTrail,
        lastTrailTime: Date.now(),
        guidedDirection: direction.clone(),
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

function createFallingParticle(position, color) {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
        color: color,
        emissive: color,
        emissiveIntensity: 0.5
    });
    const particle = new THREE.Mesh(geometry, material);
    
    particle.position.copy(position);
    scene.add(particle);
    
    game.particles.push({
        mesh: particle,
        velocity: new THREE.Vector3(0, -2, 0),
        lifetime: 2000,
        createdAt: Date.now()
    });
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
    game.player.velocity.y -= 25 * delta;
    game.player.position.y += game.player.velocity.y * delta;
    
    // Ground collision
    if (game.player.position.y <= game.player.height) {
        game.player.position.y = game.player.height;
        game.player.velocity.y = 0;
        game.player.onGround = true;
    }
    
    // Keep player in room bounds
    const halfRoom = game.roomSize / 2 - 1;
    game.player.position.x = Math.max(-halfRoom, Math.min(halfRoom, game.player.position.x));
    game.player.position.z = Math.max(-halfRoom, Math.min(halfRoom, game.player.position.z));
    
    // Update camera position
    camera.position.copy(game.player.position);    
    // Update projectiles
    game.projectiles.forEach((proj, index) => {
        // Gravity
        if (proj.hasGravity) {
            proj.velocity.y -= 15 * delta;
        }
        
        // Guided modifier - follows crosshair
        if (proj.guided) {
            const cameraDir = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            proj.velocity.lerp(cameraDir.multiplyScalar(proj.velocity.length()), 0.1);
        }
        
        // Homing - needs enemies (not implemented yet, falls normally)
        
        // Arc trail
        if (proj.arcTrail && Date.now() - proj.lastTrailTime > 50) {
            createParticles(proj.mesh.position.clone(), 0xffff00, 2);
            proj.lastTrailTime = Date.now();
        }
        
        // Molten trail
        if (proj.moltenTrail && Date.now() - proj.lastTrailTime > 50) {
            const particle = createFallingParticle(proj.mesh.position.clone(), 0xff5722);
            proj.lastTrailTime = Date.now();
        }
        
        proj.mesh.position.add(proj.velocity.clone().multiplyScalar(delta));
        
        // Remove if lifetime exceeded
        if (Date.now() - proj.createdAt > proj.lifetime) {
            scene.remove(proj.mesh);
            game.projectiles.splice(index, 1);
            return;
        }
        
        // Hit ground
        if (proj.mesh.position.y < 0) {
            createParticles(proj.mesh.position.clone(), proj.mesh.material.color.getHex(), 10);
            scene.remove(proj.mesh);
            game.projectiles.splice(index, 1);
            return;
        }
        
        // Remove if hits walls
        const halfRoom = game.roomSize / 2;
        if (Math.abs(proj.mesh.position.x) > halfRoom || 
            Math.abs(proj.mesh.position.z) > halfRoom ||
            proj.mesh.position.y > 10) {
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
