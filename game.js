import React, { useState, useEffect, useRef } from 'react';
import { Wand2, Heart, Zap, Shield, Wind, Flame, Users, Sparkles, Edit, Save, X } from 'lucide-react';

const SpellTowerGame = () => {
  const canvasRef = useRef(null);
  const traceCanvasRef = useRef(null);
  const patternCanvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu'); // menu, deckBuilder, playing, gameOver
  const [playerHealth, setPlayerHealth] = useState(100);
  const [aiHealth, setAIHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(10);
  const [aiMana, setAIMana] = useState(10);
  const [playerDead, setPlayerDead] = useState(false);
  const [aiDead, setAIDead] = useState(false);
  const [playerRespawnTimer, setPlayerRespawnTimer] = useState(0);
  const [aiRespawnTimer, setAIRespawnTimer] = useState(0);
  const [hand, setHand] = useState([]);
  const [aiHand, setAIHand] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isTracing, setIsTracing] = useState(false);
  const [tracePoints, setTracePoints] = useState([]);
  const [entities, setEntities] = useState([]);
  const [towers, setTowers] = useState([]);
  const [winner, setWinner] = useState(null);
  const [lastPlayerAction, setLastPlayerAction] = useState(null);
  
  // Deck builder states
  const [editingSpell, setEditingSpell] = useState(null);
  const [isDrawingPattern, setIsDrawingPattern] = useState(false);
  const [patternPoints, setPatternPoints] = useState([]);
  const [customPatterns, setCustomPatterns] = useState({});

  const SPELLS = {
    knight: { name: 'Knight', cost: 3, type: 'troop', icon: '🗡️', hp: 100, damage: 15, color: '#8B4513' },
    archer: { name: 'Archer', cost: 3, type: 'troop', icon: '🏹', hp: 60, damage: 25, color: '#228B22' },
    giant: { name: 'Giant', cost: 5, type: 'troop', icon: '👹', hp: 200, damage: 30, color: '#8B008B' },
    wizard: { name: 'Wizard', cost: 4, type: 'troop', icon: '🧙', hp: 80, damage: 35, color: '#4169E1' },
    fireball: { name: 'Fireball', cost: 4, type: 'playerDamage', icon: '🔥', damage: 40, color: '#FF4500' },
    lightning: { name: 'Lightning', cost: 4, type: 'playerDamage', icon: '⚡', damage: 50, color: '#FFD700' },
    polymorph: { name: 'Sheep', cost: 3, type: 'cc', icon: '🐑', duration: 3, color: '#DDA0DD' },
    tornado: { name: 'Tornado', cost: 3, type: 'areaDamage', icon: '🌪️', damage: 10, color: '#87CEEB' },
    yingyang: { name: 'Yin-Yang', cost: 2, type: 'reflect', icon: '☯️', duration: 2, color: '#FFFFFF' }
  };

  const deck = ['knight', 'archer', 'giant', 'wizard', 'fireball', 'lightning', 'polymorph', 'tornado'];

  // Load custom patterns from storage on mount
  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const result = await window.storage.get('custom-spell-patterns');
        if (result && result.value) {
          setCustomPatterns(JSON.parse(result.value));
        }
      } catch (error) {
        console.log('No saved patterns found');
      }
    };
    loadPatterns();
  }, []);

  // Save patterns to storage whenever they change
  const savePatterns = async (patterns) => {
    try {
      await window.storage.set('custom-spell-patterns', JSON.stringify(patterns));
    } catch (error) {
      console.error('Failed to save patterns:', error);
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      initGame();
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = setInterval(() => {
      updateGame();
    }, 1000 / 60);

    return () => clearInterval(gameLoop);
  }, [gameState, entities, towers, playerDead, aiDead, playerRespawnTimer, aiRespawnTimer, selectedCard, isTracing]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const manaInterval = setInterval(() => {
      setPlayerMana(m => Math.min(m + 1, 10));
      setAIMana(m => Math.min(m + 1, 10));
    }, 2000);

    return () => clearInterval(manaInterval);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnInterval = setInterval(() => {
      spawnTowerTroops();
    }, 10000);

    return () => clearInterval(spawnInterval);
  }, [gameState, towers]);

  useEffect(() => {
    if (playerRespawnTimer > 0) {
      const timer = setTimeout(() => {
        setPlayerRespawnTimer(t => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (playerRespawnTimer === 0 && playerDead) {
      setPlayerDead(false);
    }
  }, [playerRespawnTimer, playerDead]);

  useEffect(() => {
    if (aiRespawnTimer > 0) {
      const timer = setTimeout(() => {
        setAIRespawnTimer(t => t - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (aiRespawnTimer === 0 && aiDead) {
      setAIDead(false);
    }
  }, [aiRespawnTimer, aiDead]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const handleKeyPress = (e) => {
      if (playerDead) return;
      const key = e.key;
      if (key === '1' && hand[0]) setSelectedCard(hand[0]);
      if (key === '2' && hand[1]) setSelectedCard(hand[1]);
      if (key === '3' && hand[2]) setSelectedCard(hand[2]);
      if (key === '4' && hand[3]) setSelectedCard(hand[3]);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, hand, playerDead]);

  const initGame = () => {
    const initialTowers = [
      { id: 't1', x: 100, y: 200, hp: 500, maxHp: 500, owner: 'player', type: 'side' },
      { id: 't2', x: 100, y: 400, hp: 500, maxHp: 500, owner: 'player', type: 'side' },
      { id: 't3', x: 50, y: 300, hp: 1000, maxHp: 1000, owner: 'player', type: 'main' },
      { id: 't4', x: 700, y: 200, hp: 500, maxHp: 500, owner: 'ai', type: 'side' },
      { id: 't5', x: 700, y: 400, hp: 500, maxHp: 500, owner: 'ai', type: 'side' },
      { id: 't6', x: 750, y: 300, hp: 1000, maxHp: 1000, owner: 'ai', type: 'main' }
    ];
    setTowers(initialTowers);
    setEntities([]);
    drawInitialCards();
    drawAICards();
    setPlayerHealth(100);
    setAIHealth(100);
    setPlayerMana(10);
    setAIMana(10);
    setPlayerDead(false);
    setAIDead(false);
    setWinner(null);
  };

  const drawInitialCards = () => {
    const drawn = [];
    const usedCards = new Set();
    while (drawn.length < 4) {
      const card = deck[Math.floor(Math.random() * deck.length)];
      if (!usedCards.has(card)) {
        drawn.push(card);
        usedCards.add(card);
      }
    }
    setHand(drawn);
  };

  const drawAICards = () => {
    const drawn = [];
    const usedCards = new Set();
    while (drawn.length < 4) {
      const card = deck[Math.floor(Math.random() * deck.length)];
      if (!usedCards.has(card)) {
        drawn.push(card);
        usedCards.add(card);
      }
    }
    setAIHand(drawn);
  };

  const drawCard = () => {
    setHand(h => {
      const availableCards = deck.filter(card => !h.includes(card));
      if (availableCards.length === 0) return h;
      const newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      return [...h, newCard];
    });
  };

  const drawAICard = () => {
    setAIHand(h => {
      const availableCards = deck.filter(card => !h.includes(card));
      if (availableCards.length === 0) return h;
      const newCard = availableCards[Math.floor(Math.random() * availableCards.length)];
      return [...h, newCard];
    });
  };

  const spawnTowerTroops = () => {
    setEntities(ents => {
      const newEnts = [...ents];
      towers.forEach(tower => {
        if (tower.hp > 0 && tower.type === 'side') {
          for (let i = 0; i < 8; i++) {
            newEnts.push({
              id: `tower-troop-${Date.now()}-${Math.random()}`,
              type: 'towerTroop',
              x: tower.x + (tower.owner === 'player' ? 30 : -30),
              y: tower.y + (Math.random() - 0.5) * 40,
              hp: 30,
              maxHp: 30,
              damage: 8,
              speed: 1,
              owner: tower.owner,
              target: null
            });
          }
        }
      });
      return newEnts;
    });
  };

  const calculateTraceAccuracy = (points, spellKey) => {
    if (points.length < 5) return 0.5;
    
    // If custom pattern exists, compare against it
    if (customPatterns[spellKey] && customPatterns[spellKey].length > 0) {
      const customPattern = customPatterns[spellKey];
      
      // Simple accuracy calculation based on pattern similarity
      const scaleFactor = Math.min(
        (points[points.length - 1].x - points[0].x) / (customPattern[customPattern.length - 1].x - customPattern[0].x),
        (points[points.length - 1].y - points[0].y) / (customPattern[customPattern.length - 1].y - customPattern[0].y)
      );
      
      let totalError = 0;
      const step = Math.floor(points.length / Math.min(points.length, customPattern.length));
      
      for (let i = 0; i < Math.min(points.length, customPattern.length); i += step) {
        const userPoint = points[i];
        const targetPoint = customPattern[Math.floor(i * customPattern.length / points.length)];
        const dx = userPoint.x - targetPoint.x;
        const dy = userPoint.y - targetPoint.y;
        totalError += Math.sqrt(dx * dx + dy * dy);
      }
      
      const avgError = totalError / (points.length / step);
      const accuracy = Math.max(0.5, Math.min(1.5, 1.5 - (avgError / 200)));
      return accuracy;
    }
    
    // Default accuracy calculation
    return 0.7 + Math.random() * 0.3;
  };

  const castSpell = (spellKey, accuracy, owner = 'player') => {
    const spell = SPELLS[spellKey];
    if (!spell) return;

    if (owner === 'player') {
      if (playerMana < spell.cost) return;
      setPlayerMana(m => m - spell.cost);
      setHand(h => {
        const idx = h.indexOf(spellKey);
        if (idx > -1) {
          const newHand = [...h];
          newHand.splice(idx, 1);
          return newHand;
        }
        return h;
      });
      setTimeout(() => drawCard(), 500);
      
      if (spell.type === 'playerDamage') {
        setLastPlayerAction({ type: 'playerDamage', time: Date.now() });
      }
    } else {
      if (aiMana < spell.cost) return;
      setAIMana(m => m - spell.cost);
      setAIHand(h => {
        const idx = h.indexOf(spellKey);
        if (idx > -1) {
          const newHand = [...h];
          newHand.splice(idx, 1);
          return newHand;
        }
        return h;
      });
      setTimeout(() => drawAICard(), 500);
    }

    if (spell.type === 'troop') {
      const baseX = owner === 'player' ? 250 : 550;
      const y = 300 + (Math.random() - 0.5) * 200;
      setEntities(ents => [...ents, {
        id: `troop-${Date.now()}-${Math.random()}`,
        type: 'troop',
        spell: spellKey,
        x: baseX,
        y: y,
        hp: spell.hp * accuracy,
        maxHp: spell.hp * accuracy,
        damage: spell.damage * accuracy,
        speed: 1.5,
        owner: owner,
        target: null,
        spawnTime: Date.now()
      }]);
    } else if (spell.type === 'playerDamage') {
      setEntities(ents => [...ents, {
        id: `spell-projectile-${Date.now()}`,
        type: 'projectile',
        spell: spellKey,
        x: owner === 'player' ? 200 : 600,
        y: 300,
        targetX: owner === 'player' ? 600 : 200,
        targetY: 300,
        damage: spell.damage * accuracy,
        owner: owner,
        speed: 8,
        createdAt: Date.now()
      }]);
    } else if (spell.type === 'cc') {
      const target = owner === 'player' ? 'ai' : 'player';
      if (target === 'player' && !playerDead) {
        setPlayerDead(true);
        setPlayerRespawnTimer(Math.floor(spell.duration * accuracy));
      } else if (target === 'ai' && !aiDead) {
        setAIDead(true);
        setAIRespawnTimer(Math.floor(spell.duration * accuracy));
      }
    } else if (spell.type === 'areaDamage') {
      setEntities(ents => ents.map(e => {
        if (e.owner !== owner && (e.type === 'troop' || e.type === 'towerTroop')) {
          return { ...e, hp: Math.max(0, e.hp - spell.damage * accuracy), vx: (owner === 'player' ? 15 : -15) };
        }
        return e;
      }));
      
      setTimeout(() => {
        setEntities(ents => [...ents.filter(e => e.type !== 'tornado'), {
          id: `tornado-${Date.now()}`,
          type: 'tornadoVFX',
          x: 400,
          y: 300,
          owner: owner,
          createdAt: Date.now(),
          duration: 1000
        }]);
      }, 100);
    } else if (spell.type === 'reflect') {
      setEntities(ents => [...ents, {
        id: `reflect-${Date.now()}`,
        type: 'reflect',
        owner: owner,
        duration: spell.duration * accuracy,
        createdAt: Date.now()
      }]);
    }
  };

  const aiDecision = () => {
    if (aiDead || aiMana < 2 || aiHand.length === 0) return;

    const playerTroops = entities.filter(e => e.owner === 'player' && e.type === 'troop' && e.hp > 0);
    
    if (lastPlayerAction?.type === 'playerDamage' && Date.now() - lastPlayerAction.time < 1500) {
      if (aiHand.includes('yingyang') && aiMana >= SPELLS.yingyang.cost) {
        castSpell('yingyang', 0.85, 'ai');
        setLastPlayerAction(null);
        return;
      }
    }

    if (playerTroops.length >= 3 && aiHand.includes('tornado') && aiMana >= SPELLS.tornado.cost) {
      castSpell('tornado', 0.8, 'ai');
      return;
    }

    if (!playerDead && aiHand.includes('polymorph') && aiMana >= SPELLS.polymorph.cost && Math.random() > 0.85) {
      castSpell('polymorph', 0.75, 'ai');
      return;
    }

    const hasReflect = entities.some(e => e.type === 'reflect' && e.owner === 'player');
    if (!hasReflect && !playerDead && aiMana >= 4) {
      const damageSpells = aiHand.filter(s => SPELLS[s].type === 'playerDamage');
      if (damageSpells.length > 0 && Math.random() > 0.8) {
        castSpell(damageSpells[0], 0.7 + Math.random() * 0.2, 'ai');
        return;
      }
    }

    const troopSpells = aiHand.filter(s => SPELLS[s].type === 'troop' && SPELLS[s].cost <= aiMana);
    if (troopSpells.length > 0 && aiMana >= 4 && Math.random() > 0.6) {
      const spell = troopSpells[Math.floor(Math.random() * troopSpells.length)];
      castSpell(spell, 0.65 + Math.random() * 0.25, 'ai');
      return;
    }
  };

  useEffect(() => {
    if (gameState !== 'playing') return;
    const aiInterval = setInterval(() => {
      aiDecision();
    }, 3000);
    return () => clearInterval(aiInterval);
  }, [gameState, aiMana, aiHand, entities, aiDead, lastPlayerAction]);

  const drawSpellPattern = (ctx, spellKey, centerX, centerY, size, color) => {
    if (customPatterns[spellKey] && customPatterns[spellKey].length > 0) {
      const points = customPatterns[spellKey];
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.setLineDash([5, 5]);
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  };

  const updateGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (selectedCard && !isTracing && customPatterns[selectedCard]) {
      const spell = SPELLS[selectedCard];
      drawSpellPattern(ctx, selectedCard, 400, 300, 80, spell.color);
      
      ctx.fillStyle = spell.color;
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Draw the ${spell.name} pattern!`, 400, 100);
    }

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();

    towers.forEach(tower => {
      if (tower.hp <= 0) return;
      
      const playerSideTowersDestroyed = towers.filter(t => t.owner === 'player' && t.type === 'side' && t.hp <= 0).length === 2;
      const aiSideTowersDestroyed = towers.filter(t => t.owner === 'ai' && t.type === 'side' && t.hp <= 0).length === 2;
      
      if (tower.type === 'main') {
        if (tower.owner === 'player' && !playerSideTowersDestroyed) {
          ctx.globalAlpha = 0.3;
        } else if (tower.owner === 'ai' && !aiSideTowersDestroyed) {
          ctx.globalAlpha = 0.3;
        }
      }

      ctx.fillStyle = tower.owner === 'player' ? '#4169E1' : '#DC143C';
      ctx.fillRect(tower.x - 15, tower.y - 20, 30, 40);
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#2F2F2F';
      ctx.fillRect(tower.x - 15, tower.y - 30, 30, 6);
      ctx.fillStyle = '#00FF00';
      ctx.fillRect(tower.x - 15, tower.y - 30, 30 * (tower.hp / tower.maxHp), 6);
    });

    setEntities(ents => {
      const updated = [];
      
      ents.forEach(e => {
        if (e.type === 'reflect') {
          const elapsed = (Date.now() - e.createdAt) / 1000;
          if (elapsed < e.duration) {
            updated.push(e);
            const shieldX = e.owner === 'player' ? 150 : 650;
            ctx.strokeStyle = e.owner === 'player' ? '#00FFFF' : '#FF00FF';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(shieldX, 300, 50, 0, Math.PI * 2);
            ctx.stroke();
          }
          return;
        }

        if (e.type === 'projectile') {
          const dx = e.targetX - e.x;
          const dy = e.targetY - e.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 10) {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;

            const spell = SPELLS[e.spell];
            ctx.fillStyle = spell.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
            ctx.fill();
            
            updated.push(e);
          } else {
            const target = e.owner === 'player' ? 'ai' : 'player';
            const hasReflect = updated.some(ent => ent.type === 'reflect' && ent.owner === target);
            
            if (hasReflect) {
              const finalTarget = e.owner;
              if (finalTarget === 'player') {
                setPlayerHealth(h => Math.max(0, h - e.damage));
              } else {
                setAIHealth(h => Math.max(0, h - e.damage));
              }
            } else {
              if (target === 'player') {
                setPlayerHealth(h => {
                  const newHealth = Math.max(0, h - e.damage);
                  if (newHealth === 0 && !playerDead) {
                    setPlayerDead(true);
                    setPlayerRespawnTimer(8);
                  }
                  return newHealth;
                });
              } else {
                setAIHealth(h => {
                  const newHealth = Math.max(0, h - e.damage);
                  if (newHealth === 0 && !aiDead) {
                    setAIDead(true);
                    setAIRespawnTimer(8);
                  }
                  return newHealth;
                });
              }
            }
          }
          return;
        }

        if (e.type === 'tornadoVFX') {
          const elapsed = Date.now() - e.createdAt;
          if (elapsed < e.duration) {
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 2;
            const angle = (elapsed / 100) % (Math.PI * 2);
            for (let i = 0; i < 5; i++) {
              ctx.beginPath();
              ctx.arc(e.x, e.y, 30 + i * 15, angle + i * 0.5, angle + i * 0.5 + Math.PI);
              ctx.stroke();
            }
            updated.push(e);
          }
          return;
        }

        if (e.hp <= 0) return;

        if (!e.target || (e.target.hp && e.target.hp <= 0)) {
          const enemyTowers = towers.filter(t => t.owner !== e.owner && t.hp > 0);
          const targetableTowers = e.owner === 'player' 
            ? enemyTowers.filter(t => t.type === 'side' || (t.type === 'main' && towers.filter(tt => tt.owner === 'ai' && tt.type === 'side' && tt.hp > 0).length === 0))
            : enemyTowers.filter(t => t.type === 'side' || (t.type === 'main' && towers.filter(tt => tt.owner === 'player' && tt.type === 'side' && tt.hp > 0).length === 0));
          
          const enemyTroops = updated.filter(en => en.owner !== e.owner && en.hp > 0 && (en.type === 'troop' || en.type === 'towerTroop'));
          const allTargets = [...targetableTowers, ...enemyTroops];
          
          if (allTargets.length > 0) {
            e.target = allTargets.reduce((closest, target) => {
              const dist = Math.hypot(target.x - e.x, target.y - e.y);
              const closestDist = Math.hypot(closest.x - e.x, closest.y - e.y);
              return dist < closestDist ? target : closest;
            });
          }
        }

        if (e.target) {
          const dx = e.target.x - e.x;
          const dy = e.target.y - e.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 20) {
            e.x += (dx / dist) * e.speed;
            e.y += (dy / dist) * e.speed;
          } else {
            e.target.hp -= e.damage / 60;
            if (e.target.hp <= 0) {
              if (e.owner === 'player') {
                setPlayerMana(m => Math.min(m + 0.5, 10));
              } else {
                setAIMana(m => Math.min(m + 0.5, 10));
              }
            }
          }
        }

        if (e.vx) {
          e.x += e.vx;
          e.vx *= 0.9;
        }

        const color = e.owner === 'player' ? '#4169E1' : '#DC143C';
        const size = e.type === 'towerTroop' ? 6 : 10;
        
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (e.spell && SPELLS[e.spell]) {
          ctx.font = `${size * 1.5}px Arial`;
          ctx.fillText(SPELLS[e.spell].icon, e.x - size, e.y + size / 2);
        }

        ctx.fillStyle = '#2F2F2F';
        ctx.fillRect(e.x - size, e.y - size - 8, size * 2, 3);
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(e.x - size, e.y - size - 8, size * 2 * (e.hp / e.maxHp), 3);

        updated.push(e);
      });

      return updated;
    });

    setTowers(tws => {
      const updated = tws.map(t => ({ ...t }));
      
      const playerMainTower = updated.find(t => t.owner === 'player' && t.type === 'main');
      const aiMainTower = updated.find(t => t.owner === 'ai' && t.type === 'main');
      
      if (playerMainTower && playerMainTower.hp <= 0 && !winner) {
        setWinner('ai');
        setGameState('gameOver');
      }
      if (aiMainTower && aiMainTower.hp <= 0 && !winner) {
        setWinner('player');
        setGameState('gameOver');
      }
      
      return updated;
    });
  };

  const handleTraceStart = (e) => {
    if (!selectedCard || playerDead) return;
    setIsTracing(true);
    setTracePoints([]);
    const canvas = traceCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setTracePoints([{ x, y }]);
  };
