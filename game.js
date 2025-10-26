window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ Game loaded!");

  const homeScreen = document.getElementById("home-screen");
  const playBtn = document.getElementById("play-btn");
  const arena = document.getElementById("arena");
  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let gameRunning = false;
  let gameOver = false;
  let troops = [];
  let enemyTroops = [];

  // 🎴 Elixir system
  let playerElixir = 5;
  let enemyElixir = 5;
  const maxElixir = 10;

  // UI: main elixir bar
  const elixirBar = document.createElement("div");
  elixirBar.style.position = "absolute";
  elixirBar.style.bottom = "130px";
  elixirBar.style.left = "50%";
  elixirBar.style.transform = "translateX(-50%)";
  elixirBar.style.width = "300px";
  elixirBar.style.height = "20px";
  elixirBar.style.background = "rgba(0,0,0,0.3)";
  elixirBar.style.border = "2px solid white";
  elixirBar.style.borderRadius = "10px";
  elixirBar.style.overflow = "hidden";
  const elixirFill = document.createElement("div");
  elixirFill.style.height = "100%";
  elixirFill.style.width = "50%";
  elixirFill.style.background = "purple";
  elixirBar.appendChild(elixirFill);
  arena.appendChild(elixirBar);

  const towers = {
    player: [
      { x: canvas.width / 2 - 200, y: canvas.height - 150, hp: 1000, w: 40, h: 80 },
      { x: canvas.width / 2 + 200, y: canvas.height - 150, hp: 1000, w: 40, h: 80 },
      { x: canvas.width / 2, y: canvas.height - 250, hp: 2000, w: 80, h: 100 }
    ],
    enemy: [
      { x: canvas.width / 2 - 200, y: 100, hp: 1000, w: 40, h: 80 },
      { x: canvas.width / 2 + 200, y: 100, hp: 1000, w: 40, h: 80 },
      { x: canvas.width / 2, y: 200, hp: 2000, w: 80, h: 100 }
    ]
  };

  playBtn.addEventListener("click", () => {
    homeScreen.style.display = "none";
    arena.style.display = "block";
    startGame();
  });

  const troopTypes = {
    barbarians: { count: 5, hp: 150, dmg: 30, speed: 1.2, range: 20, target: "both", color: "orange", cost: 5 },
    archer: { count: 2, hp: 100, dmg: 25, speed: 1.1, range: 120, target: "both", color: "pink", cost: 3 },
    giant: { count: 1, hp: 800, dmg: 75, speed: 0.8, range: 20, target: "towers", color: "brown", cost: 5 },
    "mini-pekka": { count: 1, hp: 600, dmg: 150, speed: 1.5, range: 20, target: "both", color: "blue", cost: 4 }
  };

  const cards = Array.from(document.querySelectorAll(".card"));

  // 🎴 Card click events
  cards.forEach(card => {
    card.addEventListener("click", () => {
      const type = card.dataset.type;
      deployTroop(type, "player");
    });
  });

  function deployTroop(type, owner) {
    const troopData = troopTypes[type];
    if (!troopData) return;

    // Check elixir
    if (owner === "player" && playerElixir < troopData.cost) return;
    if (owner === "enemy" && enemyElixir < troopData.cost) return;

    if (owner === "player") playerElixir -= troopData.cost;
    else enemyElixir -= troopData.cost;

    const spawnY = owner === "player" ? canvas.height - 150 : 150;
    const spawnX = canvas.width / 2 + (Math.random() * 200 - 100);

    for (let i = 0; i < troopData.count; i++) {
      const troop = {
        owner,
        type,
        x: spawnX + Math.random() * 30 - 15,
        y: spawnY + Math.random() * 30 - 15,
        hp: troopData.hp,
        dmg: troopData.dmg,
        speed: troopData.speed,
        range: troopData.range,
        target: troopData.target,
        color: troopData.color
      };
      (owner === "player" ? troops : enemyTroops).push(troop);
    }
  }

  // 🧠 AI Logic
  function enemyAI() {
    if (enemyElixir < 3) return;
    if (Math.random() < 0.01) {
      const affordable = Object.keys(troopTypes).filter(t => troopTypes[t].cost <= enemyElixir);
      if (affordable.length > 0) {
        const choice = affordable[Math.floor(Math.random() * affordable.length)];
        deployTroop(choice, "enemy");
      }
    }
  }

  // 💜 Elixir Regeneration
  function updateElixir() {
    if (playerElixir < maxElixir) playerElixir += 0.02;
    if (enemyElixir < maxElixir) enemyElixir += 0.02;
    elixirFill.style.width = `${(playerElixir / maxElixir) * 100}%`;
    updateCardBars();
  }

  // Update each card's mini progress bar
  function updateCardBars() {
    cards.forEach(card => {
      const type = card.dataset.type;
      const troop = troopTypes[type];
      const bar = card.querySelector(".elixir-bar-under");
      const percent = Math.min((playerElixir / troop.cost) * 100, 100);
      bar.style.width = `${percent}%`;
      bar.style.background = percent >= 100 ? "purple" : "rgba(128,0,128,0.6)";
    });
  }

  function startGame() {
    gameRunning = true;
    gameOver = false;
    playerElixir = 5;
    enemyElixir = 5;
    loop();
  }

  function loop() {
    if (!gameRunning) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawTowers();
    updateTroops(troops, enemyTroops);
    updateTroops(enemyTroops, troops);
    drawTroops(troops);
    drawTroops(enemyTroops);
    updateElixir();
    enemyAI();
    checkWinCondition();

    if (!gameOver) requestAnimationFrame(loop);
  }

  function drawTowers() {
    for (const t of towers.player.concat(towers.enemy)) {
      ctx.fillStyle = t.hp > 0 ? "#555" : "gray";
      ctx.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
    }
  }

  function drawTroops(list) {
    for (const troop of list) {
      ctx.beginPath();
      ctx.arc(troop.x, troop.y, 10, 0, Math.PI * 2);
      ctx.fillStyle = troop.color;
      ctx.fill();
    }
  }

  function updateTroops(myTroops, enemyTroops) {
    for (const troop of myTroops) {
      let target = findNearestTarget(troop, enemyTroops);
      if (target) {
        const dx = target.x - troop.x;
        const dy = target.y - troop.y;
        const dist = Math.hypot(dx, dy);
        if (dist > troop.range) {
          troop.x += (dx / dist) * troop.speed;
          troop.y += (dy / dist) * troop.speed;
        } else {
          target.hp -= troop.dmg * 0.02;
        }
      }
    }
    for (let i = myTroops.length - 1; i >= 0; i--) {
      if (myTroops[i].hp <= 0) myTroops.splice(i, 1);
    }
  }

  function findNearestTarget(troop, enemies) {
    let nearest = null;
    let minDist = Infinity;
    const allTargets = enemies.concat(
      troop.target !== "troops" ? (troop.owner === "player" ? towers.enemy : towers.player) : []
    );

    for (const e of allTargets) {
      if (e.hp <= 0) continue;
      const dx = e.x - troop.x;
      const dy = e.y - troop.y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = e;
      }
    }
    return nearest;
  }

  function checkWinCondition() {
    const playerAlive = towers.player.some(t => t.hp > 0);
    const enemyAlive = towers.enemy.some(t => t.hp > 0);

    if (!enemyAlive) {
      endGame("🎉 You Win!");
    } else if (!playerAlive) {
      endGame("💀 You Lose!");
    }
  }

  function endGame(message) {
    gameOver = true;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "60px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
  }
});
