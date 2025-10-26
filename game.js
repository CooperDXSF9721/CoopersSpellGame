// game.js
// Mini Royale prototype — basic units, towers, hand, elixir, and an AI opponent.
// Drop this next to index.html and open in a browser / GitHub Pages.

(() => {
  /* -------------------------
     Config / Utilities
     ------------------------- */
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  let W = canvas.width;
  let H = canvas.height;

  function resizeCanvasToDisplaySize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    const cw = Math.round(rect.width * ratio);
    const ch = Math.round(rect.height * ratio);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      W = cw; H = ch;
    }
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);

  /* -------------------------
     Game state
     ------------------------- */
  const state = {
    running: false,
    time: 0,
    lastTime: 0,
    player: {
      elixir: 5,
      maxElixir: 10,
      hand: [],
      deck: [],
      towerLeft: null,
      towerRight: null,
      kingTower: null,
      side: 'bottom',
    },
    ai: {
      elixir: 5,
      maxElixir: 10,
      hand: [],
      deck: [],
      difficulty: 'normal',
      side: 'top',
      lastPlayTime: 0
    },
    entities: [],
    particles: [],
    arena: {
      midY: 0,
      lanes: []
    },
    roundLength: 90, // seconds
  };

  /* -------------------------
     Unit & Card Definitions
     Keep them small and tweakable
     ------------------------- */
  const cardTemplates = [
    {
      id: 'knight', cost: 3, hp: 600, dmg: 80, range: 20, speed: 60,
      radius: 12, target: 'ground', description: 'Reliable melee unit'
    },
    {
      id: 'archer', cost: 3, hp: 240, dmg: 70, range: 140, speed: 80,
      radius: 8, target: 'air+ground', description: 'Ranged attacker'
    },
    {
      id: 'giant', cost: 5, hp: 1600, dmg: 150, range: 28, speed: 40,
      radius: 18, target: 'building', description: 'Heavy tank — targets towers'
    },
    {
      id: 'baby', cost: 4, hp: 420, dmg: 115, range: 24, speed: 95,
      radius: 10, target: 'air+ground', description: 'Fast flyer (simulated)'
    },
    {
      id: 'wizard', cost: 5, hp: 500, dmg: 60, range: 120, speed: 55,
      radius: 12, target: 'air+ground', splash: true, description: 'AOE caster'
    },
    {
      id: 'spear', cost: 2, hp: 180, dmg: 60, range: 100, speed: 95,
      radius: 8, target: 'air+ground', description: 'Cheap ranged'
    }
  ];

  // Utility to clone templates to entities/cards
  function makeCard(templateId) {
    const t = cardTemplates.find(c => c.id === templateId);
    if (!t) return null;
    return JSON.parse(JSON.stringify(t));
  }

  /* -------------------------
     Setup initial arena & towers
     ------------------------- */
  function resetGame(difficulty = 'normal') {
    state.entities = [];
    state.particles = [];
    state.time = 0;
    state.player.elixir = 5;
    state.ai.elixir = 5;
    state.player.maxElixir = 10;
    state.ai.maxElixir = 10;
    state.ai.difficulty = difficulty;
    state.player.deck = generateDeck();
    state.ai.deck = generateDeck();
    state.player.hand = drawInitialHand(state.player.deck);
    state.ai.hand = drawInitialHand(state.ai.deck);
    setupTowers();
  }

  function generateDeck() {
    // For a simple prototype: produce a deck of 12 cards randomly chosen
    const deck = [];
    for (let i = 0; i < 12; i++) {
      deck.push(cardTemplates[Math.floor(Math.random() * cardTemplates.length)].id);
    }
    return deck;
  }

  function drawInitialHand(deck) {
    const hand = [];
    for (let i = 0; i < 4; i++) {
      hand.push(deck.shift());
    }
    return hand;
  }

  function refillHand(player) {
    while (player.hand.length < 4 && player.deck.length > 0) {
      player.hand.push(player.deck.shift());
    }
  }

  function setupTowers() {
    const laneXOffset = Math.max(60, Math.floor(W * 0.08));
    const towerYgap = Math.max(80, Math.floor(H * 0.12));
    const centerX = W / 2;

    // Towers: left, king, right for both sides. Use simpler coords based on canvas size
    state.player.towerLeft = createTower(centerX - (W * 0.28), H - 90, 'player', 'left');
    state.player.towerRight = createTower(centerX + (W * 0.28), H - 90, 'player', 'right');
    state.player.kingTower = createTower(centerX, H - 140, 'player', 'king');

    state.ai.towerLeft = createTower(centerX - (W * 0.28), 90, 'ai', 'left');
    state.ai.towerRight = createTower(centerX + (W * 0.28), 90, 'ai', 'right');
    state.ai.kingTower = createTower(centerX, 140, 'ai', 'king');
  }

  function createTower(x, y, owner, name) {
    return {
      id: `${owner}_tower_${name}`,
      type: 'tower',
      owner,
      name,
      x, y,
      hp: name === 'king' ? 3000 : 1600,
      maxHp: name === 'king' ? 3000 : 1600,
      dmg: 120,
      range: 200,
      radius: 24,
      target: 'ground+building',
      width: 34,
      height: 34,
    };
  }

  /* -------------------------
     Entity creation: unit spawn
     ------------------------- */
  function spawnUnit(templateId, x, y, owner) {
    const t = makeCard(templateId);
    if (!t) return;

    const faction = owner === 'player' ? 'player' : 'ai';
    const dir = faction === 'player' ? -1 : 1; // ai moves down (+1), player moves up (-1)
    const speed = t.speed; // px/sec
    const ent = {
      id: `${faction}_${templateId}_${Math.round(Math.random()*1e6)}`,
      type: 'unit',
      cardId: templateId,
      x, y,
      owner: faction,
      hp: t.hp,
      maxHp: t.hp,
      dmg: t.dmg,
      range: t.range,
      radius: t.radius,
      speed,
      targetType: t.target,
      splash: t.splash || false,
      lastAttack: 0,
      attackSpeed: 0.9, // seconds between attacks (generic)
      destination: { x: t.target === 'building' ? (faction === 'player' ? W/2 : W/2) : (faction === 'player' ? x : x) },
      direction: dir,
    };
    state.entities.push(ent);
    return ent;
  }

  /* -------------------------
     Game loop
     ------------------------- */
  function startGame(difficulty) {
    resetGame(difficulty);
    document.getElementById('home').style.display = 'none';
    state.running = true;
    state.lastTime = performance.now();
    loop();
  }

  function loop(now) {
    if (!state.running) return;
    resizeCanvasToDisplaySize();
    const t = performance.now();
    const dt = Math.min((t - state.lastTime) / 1000, 0.06);
    state.lastTime = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  /* -------------------------
     Update: movement, combat, elixir regen
     ------------------------- */
  function update(dt) {
    state.time += dt;

    // elixir regen (both)
    const regenRate = 1 / 1.2; // 1 elixir every 1.2s ~0.833/s
    state.player.elixir = clamp(state.player.elixir + regenRate * dt, 0, state.player.maxElixir);
    state.ai.elixir = clamp(state.ai.elixir + regenRate * dt, 0, state.ai.maxElixir);

    // refill hands if needed
    refillHand(state.player);
    refillHand(state.ai);

    // Entities AI movement & targeting
    for (let ent of state.entities) {
      if (ent.type === 'unit') {
        // find target
        const target = findTargetFor(ent);
        if (target) {
          const dx = target.x - ent.x;
          const dy = target.y - ent.y;
          const dist = Math.hypot(dx, dy);
          // attack if in range
          if (dist <= ent.range + (target.radius || 8)) {
            ent.lastAttack += dt;
            if (ent.lastAttack >= ent.attackSpeed) {
              // deal damage
              ent.lastAttack = 0;
              attackEntity(ent, target);
            }
            // small slow retreat/backoff when attacking? keep still
          } else {
            // move toward target
            const vx = (dx / dist) * ent.speed * dt;
            const vy = (dy / dist) * ent.speed * dt;
            ent.x += vx;
            ent.y += vy;
          }
        } else {
          // no target -> move generally toward enemy side towers
          ent.y += (ent.direction * ent.speed * dt) * -1; // direction set earlier; tweak so player goes up
        }
      }
    }

    // simple cleanup
    state.entities = state.entities.filter(e => e.type !== 'unit' || e.hp > 0);
    // towers hp check (game end)
    checkGameEnd();

    // AI decision
    aiThink(dt);
  }

  function findTargetFor(ent) {
    // prioritize closest enemy entity or tower in range
    const enemies = [];
    // combine entities + towers
    const towers = [
      state.player.towerLeft, state.player.towerRight, state.player.kingTower,
      state.ai.towerLeft, state.ai.towerRight, state.ai.kingTower
    ].filter(Boolean);

    for (let t of state.entities.concat(towers)) {
      if (t.owner && t.owner === ent.owner) continue;
      // check target type compatibility
      if (t.type === 'tower') {
        enemies.push(t);
      } else if (t.type === 'unit') {
        // check if unit is eligible based on ent.targetType
        if (ent.targetType.includes('air') || ent.targetType.includes('ground')) {
          enemies.push(t);
        }
      }
    }
    if (enemies.length === 0) return null;
    enemies.sort((a, b) => {
      const da = Math.hypot(a.x - ent.x, a.y - ent.y);
      const db = Math.hypot(b.x - ent.x, b.y - ent.y);
      return da - db;
    });
    return enemies[0];
  }

  function attackEntity(attacker, target) {
    // direct damage
    // small randomness
    const damage = attacker.dmg * (0.9 + Math.random() * 0.2);
    applyDamage(target, damage, attacker.splash ? 18 : 0);
  }

  function applyDamage(target, dmg, splashRadius = 0) {
    if (target.type === 'tower') {
      target.hp -= dmg;
      // store particle
      state.particles.push({ x: target.x, y: target.y, life: 0.5 });
    } else if (target.type === 'unit') {
      target.hp -= dmg;
      state.particles.push({ x: target.x, y: target.y, life: 0.4 });
    }
    if (splashRadius > 0) {
      // damage nearby units (simple)
      for (let other of state.entities) {
        if (other.type === 'unit' && other !== target && other.owner !== target.owner) {
          const d = Math.hypot(other.x - target.x, other.y - target.y);
          if (d <= splashRadius) {
            other.hp -= dmg * 0.6;
          }
        }
      }
    }
  }

  function checkGameEnd() {
    // if king tower down for either side -> end
    if (state.ai.kingTower.hp <= 0) {
      endGame('player');
    } else if (state.player.kingTower.hp <= 0) {
      endGame('ai');
    }
  }

  function endGame(winner) {
    state.running = false;
    // reveal overlay with result & allow restart
    const home = document.getElementById('home');
    const msg = home.querySelector('h1');
    msg.textContent = winner === 'player' ? 'You Win!' : 'You Lose';
    home.style.display = 'flex';
    // reset text after short time for next match
    setTimeout(() => { home.querySelector('h1').textContent = 'Mini Royale'; }, 1500);
  }

  /* -------------------------
     AI logic - heuristic based choices
     - Evaluates hand, scoring plays against predicted player board
     - Moderately "sophisticated" for a prototype
     ------------------------- */
  function aiThink(dt) {
    // throttle decisions slightly based on difficulty
    const now = state.time;
    const diff = state.ai.difficulty;
    const thinkInterval = diff === 'easy' ? 2.0 : diff === 'normal' ? 1.2 : 0.8;
    if (now - state.ai.lastPlayTime < thinkInterval) return;

    // consider plays
    const playable = [];
    for (let cardId of state.ai.hand) {
      const template = makeCard(cardId);
      if (!template) continue;
      const cost = template.cost;
      if (state.ai.elixir >= cost) {
        playable.push({ cardId, cost, template });
      }
    }

    if (playable.length === 0) return;

    // Score each playable card by simulated utility
    let best = null;
    for (let p of playable) {
      const score = evaluatePlayForAI(p.cardId, p.template);
      if (!best || score > best.score) best = { ...p, score };
    }

    if (best && best.score > 0.2) {
      // choose a spawn position biased to lane where player is weaker
      const laneX = chooseAILane();
      const spawnY = 140 + 40 * (Math.random() - 0.5);
      // spawn a little jitter to left/right of lane
      if (state.ai.elixir >= best.cost) {
        state.ai.elixir -= best.cost;
        spawnUnit(best.cardId, laneX + rand(-20,20), spawnY, 'ai');
        // consume card from hand and draw next
        const idx = state.ai.hand.indexOf(best.cardId);
        if (idx >= 0) state.ai.hand.splice(idx, 1);
        refillHand(state.ai);
        state.ai.lastPlayTime = now;
      }
    }
  }

  function evaluatePlayForAI(cardId, template) {
    // heuristic scoring:
    // - If card counters a prominent player unit -> high score
    // - If card is giant (building-target) and player has few building-targets -> high score
    // - Factor: cost vs remaining ai elixir
    // - Add randomness and difficulty multiplier to avoid perfect plays
    const difficultyMultiplier = state.ai.difficulty === 'hard' ? 1.2 : state.ai.difficulty === 'easy' ? 0.75 : 1.0;

    // scan player's recent entities and hand
    const playerUnits = state.entities.filter(e => e.owner === 'player' && e.type === 'unit');
    let score = 0.0;

    // simple counters map: if player has many melee, prefer splash/wizard
    const counts = { melee:0, ranged:0, tank:0, air:0 };
    for (let u of playerUnits) {
      if (u.cardId === 'giant') counts.tank++;
      else if (u.range > 60) counts.ranged++;
      else counts.melee++;
      // treat baby as "air" (fast flyer)
      if (u.cardId === 'baby') counts.air++;
    }

    // template influences
    if (template.id === 'wizard') {
      // wizard is AOE -> good vs groups of ranged/melee
      score += (counts.melee + counts.ranged) * 0.9;
      score += counts.tank * 0.2;
    } else if (template.id === 'giant') {
      // good if player's towers low or anti-building threats low
      const playerHasManyCounters = playerU
