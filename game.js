// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Load spells from URL parameter
let customSpells = [];
try {
    const urlParams = new URLSearchParams(window.location.search);
    const spellsParam = urlParams.get('spells');
    if (spellsParam) {
        customSpells = JSON.parse(decodeURIComponent(spellsParam));
    }
} catch (e) {
    console.error('Failed to load custom spells:', e);
}

// Game state
const game = {
    player: {
        x: canvas.width / 2,
        y: canvas.height / 2,
        radius: 20,
        health: 100,
        maxHealth: 100,
        speed: 5,
        weapon: 'sword',
        currentSpell: 0,
        imbuedWeapon: null
    },
    enemies: [],
    projectiles: [],
    particles: [],
    keys: {},
    mouse: { x: 0, y: 0 },
    score: 0,
    lastEnemySpawn: 0,
    lastAttack: 0,
    attackCooldown: 500
};

// Input handling
window.addEventListener('keydown', (e) => {
    game.keys[e.key.toLowerCase()] = true;
    
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

window.addEventListener('keyup', (e) => {
    game.keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener('mousemove', (e) => {
    game.mouse.x = e.clientX;
    game.mouse.y = e.clientY;
});

canvas.addEventListener('click', () => {
    attack();
});

// Weapon switching UI
document.querySelectorAll('.weapon-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        switchWeapon(slot.dataset.weapon);
    });
});

document.querySelectorAll('.spell-slot').forEach(slot => {
    slot.addEventListener('click', () => {
        game.player.currentSpell = parseInt(slot.dataset.spell);
        updateSpellUI();
    });
});

function switchWeapon(weapon) {
    game.player.weapon = weapon;
    document.querySelectorAll('.weapon-slot').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-weapon="${weapon}"]`).classList.add('active');
}

function updateSpellUI() {
    document.querySelectorAll('.spell-slot').forEach((s, i) => {
        s.classList.toggle('active', i === game.player.currentSpell);
    });
}

function imbueWeapon() {
    const currentSpell = customSpells[game.player.currentSpell];
    if (!currentSpell || !currentSpell.palette.some(t => t)) return;
    
    // Check if spell has imbue spell type
    const hasImbue = currentSpell.palette.some(tile => 
        tile && tile.category.type === 'spellType' && 
        (tile.id === 'imbue-hit' || tile.id === 'imbue-use')
    );
    
    if (hasImbue) {
        game.player.imbuedWeapon = game.player.currentSpell;
        createParticles(game.player.x, game.player.y, '#f59e0b', 20);
    }
}

// Attack function
function attack() {
    const now = Date.now();
    if (now - game.lastAttack < game.attackCooldown) return;
    game.lastAttack = now;
    
    const angle = Math.atan2(game.mouse.y - game.player.y, game.mouse.x - game.player.x);
    
    switch (game.player.weapon) {
        case 'fists':
            meleeAttack(angle, 50, 20);
            break;
        case 'sword':
            meleeAttack(angle, 80, 35);
            break;
        case 'bow':
            shootArrow(angle);
            break;
        case 'spell':
            castSpell(angle);
            break;
    }
}

function meleeAttack(angle, range, damage) {
    const hitX = game.player.x + Math.cos(angle) * range;
    const hitY = game.player.y + Math.sin(angle) * range;
    
    // Visual effect
    createParticles(hitX, hitY, '#d97706', 5);
    
    // Check hits
    game.enemies.forEach((enemy, index) => {
        const dist = Math.hypot(enemy.x - hitX, enemy.y - hitY);
        if (dist < enemy.radius + 20) {
            enemy.health -= damage;
            
            // Trigger imbue effect
            if (game.player.imbuedWeapon !== null) {
                triggerSpellEffect(enemy.x, enemy.y, game.player.imbuedWeapon, enemy);
            }
            
            if (enemy.health <= 0) {
                game.enemies.splice(index, 1);
                game.score++;
                updateUI();
                createParticles(enemy.x, enemy.y, '#ef4444', 15);
            }
        }
    });
}

function shootArrow(angle) {
    game.projectiles.push({
        x: game.player.x,
        y: game.player.y,
        vx: Math.cos(angle) * 12,
        vy: Math.sin(angle) * 12,
        radius: 5,
        color: '#92400e',
        damage: 40,
        type: 'arrow',
        isImbued: game.player.imbuedWeapon !== null,
        imbuedSpell: game.player.imbuedWeapon
    });
}

function castSpell(angle) {
    const spellData = customSpells[game.player.currentSpell];
    if (!spellData || !spellData.palette.some(t => t)) return;
    
    triggerSpellEffect(game.player.x, game.player.y, game.player.currentSpell, null, angle);
}

function triggerSpellEffect(x, y, spellIndex, target, angle = 0) {
    const spellData = customSpells[spellIndex];
    if (!spellData) return;
    
    // Find first spell base in the palette
    const executionOrder = [0, 1, 2, 3, 7, 6, 5, 4];
    let foundSpell = null;
    
    for (let execIdx of executionOrder) {
        const tile = spellData.palette[execIdx];
        if (tile && tile.category.type === 'spell') {
            foundSpell = tile;
            break;
        }
    }
    
    if (!foundSpell) return;
    
    // Cast based on spell type
    switch (foundSpell.id) {
        case 'fireball':
            createProjectile(x, y, angle, '#f97316', 50, 8);
            break;
        case 'explosion':
            createExplosion(x, y, 80, 60);
            break;
        case 'meteor':
            createProjectile(x, y, angle, '#dc2626', 70, 6);
            break;
        case 'thunderbolt':
            createProjectile(x, y, angle, '#fbbf24', 80, 15);
            break;
        case 'beam':
            createBeam(x, y, angle);
            break;
    }
}

function createProjectile(x, y, angle, color, damage, speed) {
    game.projectiles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 8,
        color: color,
        damage: damage,
        type: 'spell'
    });
}

function createExplosion(x, y, radius, damage) {
    createParticles(x, y, '#f97316', 30);
    
    game.enemies.forEach((enemy, index) => {
        const dist = Math.hypot(enemy.x - x, enemy.y - y);
        if (dist < radius + enemy.radius) {
            enemy.health -= damage;
            if (enemy.health <= 0) {
                game.enemies.splice(index, 1);
                game.score++;
                updateUI();
            }
        }
    });
}

function createBeam(x, y, angle) {
    const beamLength = 500;
    const endX = x + Math.cos(angle) * beamLength;
    const endY = y + Math.sin(angle) * beamLength;
    
    // Draw beam
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Check beam hits
    game.enemies.forEach((enemy, index) => {
        const dist = distanceToLine(enemy.x, enemy.y, x, y, endX, endY);
        if (dist < enemy.radius + 10) {
            enemy.health -= 100;
            if (enemy.health <= 0) {
                game.enemies.splice(index, 1);
                game.score++;
                updateUI();
            }
        }
    });
}

function distanceToLine(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function createParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        game.particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: Math.random() * 3 + 1,
            color: color,
            life: 30
        });
    }
}

// Enemy spawning
function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    
    switch (side) {
        case 0: x = Math.random() * canvas.width; y = -30; break;
        case 1: x = canvas.width + 30; y = Math.random() * canvas.height; break;
        case 2: x = Math.random() * canvas.width; y = canvas.height + 30; break;
        case 3: x = -30; y = Math.random() * canvas.height; break;
    }
    
    game.enemies.push({
        x: x,
        y: y,
        radius: 15,
        health: 50,
        maxHealth: 50,
        speed: 2,
        color: '#7c2d12'
    });
}

// Update game
function update() {
    // Player movement
    if (game.keys['w']) game.player.y -= game.player.speed;
    if (game.keys['s']) game.player.y += game.player.speed;
    if (game.keys['a']) game.player.x -= game.player.speed;
    if (game.keys['d']) game.player.x += game.player.speed;
    
    // Keep player in bounds
    game.player.x = Math.max(game.player.radius, Math.min(canvas.width - game.player.radius, game.player.x));
    game.player.y = Math.max(game.player.radius, Math.min(canvas.height - game.player.radius, game.player.y));
    
    // Update enemies
    game.enemies.forEach(enemy => {
        const angle = Math.atan2(game.player.y - enemy.y, game.player.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
        
        // Check collision with player
        const dist = Math.hypot(enemy.x - game.player.x, enemy.y - game.player.y);
        if (dist < enemy.radius + game.player.radius) {
            game.player.health -= 0.5;
            updateUI();
            if (game.player.health <= 0) {
                alert(`Game Over! Score: ${game.score}`);
                window.location.reload();
            }
        }
    });
    
    // Update projectiles
    game.projectiles.forEach((proj, index) => {
        proj.x += proj.vx;
        proj.y += proj.vy;
        
        // Remove if out of bounds
        if (proj.x < -50 || proj.x > canvas.width + 50 || proj.y < -50 || proj.y > canvas.height + 50) {
            game.projectiles.splice(index, 1);
            return;
        }
        
        // Check collision with enemies
        game.enemies.forEach((enemy, enemyIndex) => {
            const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
            if (dist < enemy.radius + proj.radius) {
                enemy.health -= proj.damage;
                
                // Trigger imbued effect on arrows
                if (proj.type === 'arrow' && proj.isImbued) {
                    triggerSpellEffect(enemy.x, enemy.y, proj.imbuedSpell, enemy);
                }
                
                if (enemy.health <= 0) {
                    game.enemies.splice(enemyIndex, 1);
                    game.score++;
                    updateUI();
                    createParticles(enemy.x, enemy.y, '#ef4444', 15);
                }
                
                game.projectiles.splice(index, 1);
                createParticles(proj.x, proj.y, proj.color, 5);
            }
        });
    });
    
    // Update particles
    game.particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life--;
        if (particle.life <= 0) {
            game.particles.splice(index, 1);
        }
    });
    
    // Spawn enemies
    const now = Date.now();
    if (now - game.lastEnemySpawn > 2000) {
        spawnEnemy();
        game.lastEnemySpawn = now;
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.fillStyle = '#1a1510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw arena circle
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) / 2 - 50, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw particles
    game.particles.forEach(particle => {
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.life / 30;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    });
    
    // Draw projectiles
    game.projectiles.forEach(proj => {
        ctx.fillStyle = proj.color;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw enemies
    game.enemies.forEach(enemy => {
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Health bar
        ctx.fillStyle = '#000';
        ctx.fillRect(enemy.x - 20, enemy.y - 25, 40, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(enemy.x - 20, enemy.y - 25, 40 * (enemy.health / enemy.maxHealth), 4);
    });
    
    // Draw player
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.arc(game.player.x, game.player.y, game.player.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw weapon indicator
    const angle = Math.atan2(game.mouse.y - game.player.y, game.mouse.x - game.player.x);
    const weaponX = game.player.x + Math.cos(angle) * 30;
    const weaponY = game.player.y + Math.sin(angle) * 30;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(weaponX, weaponY, 5, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw imbue effect
    if (game.player.imbuedWeapon !== null) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(game.player.x, game.player.y, game.player.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
    }
}

function updateUI() {
    document.getElementById('health').textContent = Math.max(0, Math.floor(game.player.health));
    document.getElementById('score').textContent = game.score;
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();
