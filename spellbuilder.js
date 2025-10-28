// Game state
let selectedSlot = 0;
let spells = [
    { name: 'Spell 1', palette: Array(8).fill(null), aura1: null, aura2: null },
    { name: 'Spell 2', palette: Array(8).fill(null), aura1: null, aura2: null },
    { name: 'Spell 3', palette: Array(8).fill(null), aura1: null, aura2: null },
    { name: 'Spell 4', palette: Array(8).fill(null), aura1: null, aura2: null }
];
let selectedCell = null;

const executionOrder = [0, 1, 2, 3, 7, 6, 5, 4];

const tileCategories = {
    spells: {
        name: 'Spell Bases',
        color: 'bg-orange-500',
        borderColor: 'border-orange-500',
        type: 'spell',
        tiles: [
            { id: 'fireball', name: 'Fireball', icon: '🔥' },
            { id: 'explosion', name: 'Explosion', icon: '💥' },
            { id: 'meteor', name: 'Meteor', icon: '☄️' },
            { id: 'thunderbolt', name: 'Thunderbolt', icon: '⚡' }
        ]
    },
    modifiers: {
        name: 'Modifiers',
        color: 'bg-cyan-500',
        borderColor: 'border-cyan-500',
        type: 'modifier',
        tiles: [
            { id: 'guided', name: 'Guided', icon: '🎯' },
            { id: 'homing', name: 'Homing', icon: '🔍' },
            { id: 'weightless', name: 'Weightless', icon: '🪶' },
            { id: 'arc-trail', name: 'Arc Trail', icon: '⚡' },
            { id: 'molten-trail', name: 'Molten Trail', icon: '🌋' }
        ]
    },
    numericalMods: {
        name: 'Numerical Modifiers',
        color: 'bg-purple-500',
        borderColor: 'border-purple-500',
        type: 'numericalMod',
        tiles: [
            { id: 'multi-shot-1', name: 'Multi-Shot x1', icon: '1×', value: 1 },
            { id: 'multi-shot-2', name: 'Multi-Shot x2', icon: '2×', value: 2 },
            { id: 'multi-shot-3', name: 'Multi-Shot x3', icon: '3×', value: 3 },
            { id: 'multi-shot-5', name: 'Multi-Shot x5', icon: '5×', value: 5 },
            { id: 'multi-shot-10', name: 'Multi-Shot x10', icon: '10×', value: 10 },
            { id: 'sequence-shot-2', name: 'Double Shot', icon: '2→', value: 2 },
            { id: 'sequence-shot-3', name: 'Triple Shot', icon: '3→', value: 3 },
            { id: 'sequence-shot-5', name: 'Quintuple Shot', icon: '5→', value: 5 },
            { id: 'sequence-shot-10', name: 'Decuple Shot', icon: '10→', value: 10 }
        ]
    },
    triggers: {
        name: 'Triggers',
        color: 'bg-green-500',
        borderColor: 'border-green-500',
        type: 'trigger',
        tiles: [
            { id: 'cast-on-hit', name: 'Cast On Hit', icon: '→' },
            { id: 'cast-after-delay-0.5', name: 'Delay 0.5s', icon: '⏱️.5', delay: 0.5 },
            { id: 'cast-after-delay-1', name: 'Delay 1s', icon: '⏱️1', delay: 1 },
            { id: 'cast-after-delay-2', name: 'Delay 2s', icon: '⏱️2', delay: 2 },
            { id: 'cast-after-delay-5', name: 'Delay 5s', icon: '⏱️5', delay: 5 },
            { id: 'cast-after-delay-10', name: 'Delay 10s', icon: '⏱️10', delay: 10 },
            { id: 'twin-cast', name: 'Twin Cast', icon: '👯' }
        ]
    },
    effects: {
        name: 'Effects',
        color: 'bg-blue-600',
        borderColor: 'border-blue-600',
        type: 'effect',
        tiles: [
            { id: 'burning', name: 'Burning Circle', icon: '🔥' },
            { id: 'frozen', name: 'Frozen Circle', icon: '❄️' },
            { id: 'antigravity', name: 'Antigravity Circle', icon: '🎈' },
            { id: 'shock', name: 'Shock Circle', icon: '⚡' },
            { id: 'slow', name: 'Time Slow Circle', icon: '🐌' }
        ]
    },
    spellTypes: {
        name: 'Spell Types',
        color: 'bg-red-600',
        borderColor: 'border-red-600',
        type: 'spellType',
        tiles: [
            { id: 'throw', name: 'Throw', icon: '🤾' },
            { id: 'cast', name: 'Cast', icon: '🪄' }
        ]
    }
};

function init() {
    // Load spells from localStorage if they exist
    const savedSpells = localStorage.getItem('customSpells');
    if (savedSpells) {
        try {
            spells = JSON.parse(savedSpells);
        } catch (e) {
            console.error('Failed to load spells:', e);
        }
    }
    
    renderSpellSlots();
    renderLegend();
    renderPalette();
    
    document.getElementById('clearBtn').addEventListener('click', clearAll);
    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('enterArena').addEventListener('click', enterArena);
}

function renderSpellSlots() {
    const container = document.getElementById('spellSlots');
    container.innerHTML = spells.map((spell, idx) => `
        <button 
            onclick="selectSpellSlot(${idx})" 
            class="p-4 rounded-xl border-2 transition-all ${
                selectedSlot === idx 
                    ? 'border-amber-600 bg-amber-900/50 shadow-lg shadow-amber-700/50 scale-105' 
                    : 'border-stone-700 bg-stone-800/50 hover:border-stone-600'
            }">
            <div class="font-bold text-lg">${spell.name}</div>
            <div class="text-sm text-amber-700 mt-1">${spell.palette.filter(t => t).length} tiles</div>
        </button>
    `).join('');
}

function renderLegend() {
    const container = document.getElementById('legend');
    container.innerHTML = Object.entries(tileCategories).map(([key, cat]) => `
        <div class="flex items-center gap-2 bg-stone-800/50 p-2 rounded-lg border border-stone-700 pointer-events-none">
            <div class="w-4 h-4 rounded ${cat.color}"></div>
            <span class="text-xs font-semibold">${cat.name}</span>
        </div>
    `).join('');
}

function renderPalette() {
    const spell = spells[selectedSlot];
    document.getElementById('paletteTitle').textContent = `${spell.name} Palette`;
    
    // Render main grid
    const grid = document.getElementById('mainGrid');
    grid.innerHTML = spell.palette.map((tile, idx) => {
        const execOrder = executionOrder.indexOf(idx);
        return createTileHTML(tile, idx, execOrder, 'palette');
    }).join('');
    
    // Render aura slots
    document.getElementById('aura1').innerHTML = createTileHTML(spell.aura1, -1, null, 'aura1', true);
    document.getElementById('aura2').innerHTML = createTileHTML(spell.aura2, -1, null, 'aura2', true);
    
    // Add click handlers to main grid tiles
    grid.querySelectorAll('.tile-cell').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-tile-btn')) return;
            selectedCell = {
                type: 'palette',
                index: parseInt(el.dataset.index)
            };
            openModal();
        });
    });
    
    // Add click handlers to aura slots
    document.getElementById('aura1').addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-tile-btn')) return;
        selectedCell = { type: 'aura1', index: -1 };
        openModal();
    });
    
    document.getElementById('aura2').addEventListener('click', (e) => {
        if (e.target.classList.contains('clear-tile-btn')) return;
        selectedCell = { type: 'aura2', index: -1 };
        openModal();
    });
    
    renderConnections();
}

function createTileHTML(tile, gridIdx, execOrder, type, small = false) {
    const incomplete = gridIdx >= 0 && isIncomplete(gridIdx);
    
    if (!tile) {
        return `
            <div class="tile-cell relative mb-8 cursor-pointer" data-type="${type}" data-index="${gridIdx}">
                ${execOrder !== null ? `<div class="absolute -top-2 -left-2 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 z-10">${execOrder + 1}</div>` : ''}
                <div class="${small ? 'w-12 h-12' : 'w-16 h-16'} border-2 border-dashed border-gray-600 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 hover:border-gray-500 transition-all flex items-center justify-center text-gray-600">
                    +
                </div>
            </div>
        `;
    }
    
    return `
        <div class="tile-cell relative mb-8 group cursor-pointer" data-type="${type}" data-index="${gridIdx}">
            ${execOrder !== null ? `<div class="absolute -top-2 -left-2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">${execOrder + 1}</div>` : ''}
            <div class="${small ? 'w-12 h-12' : 'w-16 h-16'} ${tile.category.color} border-2 ${incomplete ? 'border-red-500 animate-pulse-border' : tile.category.borderColor} rounded-lg flex items-center justify-center text-2xl hover:scale-105 transition-all shadow-lg">
                ${tile.icon}
            </div>
            ${incomplete ? '<div class="absolute top-full mt-1 left-1/2 -translate-x-1/2 text-xs font-bold text-red-400 whitespace-nowrap pointer-events-none">Incomplete</div>' : ''}
            <button onclick="clearTile('${type}', ${gridIdx}); event.stopPropagation();" class="clear-tile-btn absolute -top-2 -right-2 w-5 h-5 bg-red-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10 text-xs">✕</button>
            <div class="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">${tile.name}</div>
        </div>
    `;
}

function renderConnections() {
    const svg = document.getElementById('connectionLines');
    svg.innerHTML = '';
    
    const spell = spells[selectedSlot];
    const tileSize = 64;
    const gap = 16;
    const cellWidth = tileSize + gap;
    const cellHeight = tileSize + gap + 32;
    const auraOffset = 40;
    
    const lines = getConnectionLines();
    
    lines.forEach((line) => {
        if (line.type === 'aura') {
            const toRow = Math.floor(line.to / 4);
            const toCol = line.to % 4;
            const toX = toCol * cellWidth + tileSize / 2 + auraOffset;
            const toY = toRow * cellHeight + tileSize / 2;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            
            if (line.from === 'aura1') {
                path.setAttribute('d', `M 0 ${cellHeight} C -20 ${cellHeight}, ${toX - 30} ${toY}, ${toX} ${toY}`);
            } else {
                const fromX = cellWidth * 4 + auraOffset * 2;
                path.setAttribute('d', `M ${fromX} ${cellHeight} C ${fromX + 20} ${cellHeight}, ${toX + 30} ${toY}, ${toX} ${toY}`);
            }
            
            path.setAttribute('stroke', '#a78bfa');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('opacity', '0.6');
            svg.appendChild(path);
            
        } else if (line.type === 'special') {
            const fromRow = Math.floor(line.from / 4);
            const fromCol = line.from % 4;
            const toRow = Math.floor(line.to / 4);
            const toCol = line.to % 4;
            
            const fromX = fromCol * cellWidth + tileSize / 2 + auraOffset;
            const fromY = fromRow * cellHeight + tileSize / 2;
            const toX = toCol * cellWidth + tileSize / 2 + auraOffset;
            const toY = toRow * cellHeight + tileSize / 2;
            
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const midX = (fromX + toX) / 2;
            const midY = (fromY + toY) / 2 - 30;
            path.setAttribute('d', `M ${fromX} ${fromY} Q ${midX} ${midY}, ${toX} ${toY}`);
            path.setAttribute('stroke', '#a78bfa');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-dasharray', '5,5');
            path.setAttribute('opacity', '0.5');
            svg.appendChild(path);
            
        } else {
            const fromRow = Math.floor(line.from / 4);
            const fromCol = line.from % 4;
            const toRow = Math.floor(line.to / 4);
            const toCol = line.to % 4;
            
            const lineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            
            if (line.type === 'horizontal-right') {
                const y = fromRow * cellHeight + tileSize / 2;
                lineSvg.setAttribute('x1', fromCol * cellWidth + tileSize + auraOffset);
                lineSvg.setAttribute('y1', y);
                lineSvg.setAttribute('x2', toCol * cellWidth + auraOffset);
                lineSvg.setAttribute('y2', y);
            } else if (line.type === 'horizontal-left') {
                const y = fromRow * cellHeight + tileSize / 2;
                lineSvg.setAttribute('x1', fromCol * cellWidth + auraOffset);
                lineSvg.setAttribute('y1', y);
                lineSvg.setAttribute('x2', toCol * cellWidth + tileSize + auraOffset);
                lineSvg.setAttribute('y2', y);
            } else if (line.type === 'vertical') {
                const x = fromCol * cellWidth + tileSize / 2 + auraOffset;
                lineSvg.setAttribute('x1', x);
                lineSvg.setAttribute('y1', fromRow * cellHeight + tileSize);
                lineSvg.setAttribute('x2', x);
                lineSvg.setAttribute('y2', toRow * cellHeight);
            }
            
            lineSvg.setAttribute('stroke', line.valid ? '#a78bfa' : '#ef4444');
            lineSvg.setAttribute('stroke-width', '3');
            lineSvg.setAttribute('stroke-dasharray', line.valid ? '0' : '5,5');
            svg.appendChild(lineSvg);
        }
    });
}

function getConnectionLines() {
    const lines = [];
    const spell = spells[selectedSlot];
    
    // Aura connections
    if (spell.aura1) {
        spell.palette.forEach((tile, idx) => {
            if (tile && tile.category.type === 'spell') {
                lines.push({ from: 'aura1', to: idx, type: 'aura', valid: true });
            }
        });
    }
    
    if (spell.aura2) {
        spell.palette.forEach((tile, idx) => {
            if (tile && tile.category.type === 'spell') {
                lines.push({ from: 'aura2', to: idx, type: 'aura', valid: true });
            }
        });
    }
    
    // Sequential connections
    for (let execIdx = 0; execIdx < 7; execIdx++) {
        const currentGridIdx = executionOrder[execIdx];
        const nextGridIdx = executionOrder[execIdx + 1];
        const currentTile = spell.palette[currentGridIdx];
        const nextTile = spell.palette[nextGridIdx];
        
        if (currentTile && nextTile) {
            const currentRow = Math.floor(currentGridIdx / 4);
            const currentCol = currentGridIdx % 4;
            const nextRow = Math.floor(nextGridIdx / 4);
            const nextCol = nextGridIdx % 4;
            
            let connectionType;
            if (currentRow === nextRow) {
                connectionType = currentCol < nextCol ? 'horizontal-right' : 'horizontal-left';
            } else {
                connectionType = 'vertical';
            }
            
            lines.push({
                from: currentGridIdx,
                to: nextGridIdx,
                type: connectionType,
                valid: isValidConnection(currentTile, nextTile)
            });
        }
    }
    
    // Special connections for triggers/modifiers to spell bases
    for (let execIdx = 0; execIdx < 8; execIdx++) {
        const currentGridIdx = executionOrder[execIdx];
        const currentTile = spell.palette[currentGridIdx];
        
        if (!currentTile) continue;
        
        const currentType = currentTile.category.type;
        
        if (currentType === 'trigger' || currentType === 'modifier' || currentType === 'castType') {
            for (let nextExecPos = execIdx + 1; nextExecPos < 8; nextExecPos++) {
                const targetGridIdx = executionOrder[nextExecPos];
                const targetTile = spell.palette[targetGridIdx];
                
                if (!targetTile) continue;
                
                if (targetTile.category.type === 'spell') {
                    if (nextExecPos !== execIdx + 1) {
                        lines.push({
                            from: currentGridIdx,
                            to: targetGridIdx,
                            type: 'special',
                            valid: true
                        });
                    }
                    break;
                }
            }
        }
    }
    
    return lines;
}

function isValidConnection(fromTile, toTile) {
    if (!fromTile || !toTile) return false;
    
    const fromType = fromTile.category.type;
    const toType = toTile.category.type;
    
    // Modifier -> Spell
    if (fromType === 'modifier' && toType === 'spell') return true;
    
    // Numerical Mod -> Spell
    if (fromType === 'numericalMod' && toType === 'spell') return true;
    
    // Spell -> Trigger
    if (fromType === 'spell' && toType === 'trigger') return true;
    
    // Trigger -> Spell
    if (fromType === 'trigger' && toType === 'spell') return true;
    
    // Trigger -> Modifier
    if (fromType === 'trigger' && toType === 'modifier') return true;
    
    // Trigger -> Effect
    if (fromType === 'trigger' && toType === 'effect') return true;
    
    // Effect -> anything (effects are terminal mostly but can chain)
    if (fromType === 'effect' && toType === 'spell') return true;
    
    // Spell Type -> Spell
    if (fromType === 'spellType' && toType === 'spell') return true;
    
    // Modifier -> Modifier (chain modifiers)
    if (fromType === 'modifier' && toType === 'modifier') return true;
    
    // Numerical Mod -> Modifier
    if (fromType === 'numericalMod' && toType === 'modifier') return true;
    
    return false;
}

function isIncomplete(gridIdx) {
    const spell = spells[selectedSlot];
    const tile = spell.palette[gridIdx];
    if (!tile) return false;
    
    const tileType = tile.category.type;
    
    // Spell types need a spell after them
    if (tileType === 'spellType') {
        const currentExecPos = executionOrder.indexOf(gridIdx);
        if (currentExecPos === -1 || currentExecPos === 7) return true;
        
        const nextGridIdx = executionOrder[currentExecPos + 1];
        const nextTile = spell.palette[nextGridIdx];
        
        return !nextTile || nextTile.category.type !== 'spell';
    }
    
    // Modifiers and numerical mods need a spell
    if (tileType !== 'modifier' && tileType !== 'trigger' && tileType !== 'numericalMod') return false;
    
    const currentExecPos = executionOrder.indexOf(gridIdx);
    if (currentExecPos === -1) return false;
    
    for (let nextExecPos = currentExecPos + 1; nextExecPos < 8; nextExecPos++) {
        const nextGridIdx = executionOrder[nextExecPos];
        const nextTile = spell.palette[nextGridIdx];
        
        if (!nextTile) continue;
        
        const nextType = nextTile.category.type;
        
        if (nextType === 'spell') return false;
        if (nextType === 'modifier' || nextType === 'trigger' || nextType === 'numericalMod') continue;
        
        return true;
    }
    
    return true;
}

function selectSpellSlot(idx) {
    selectedSlot = idx;
    renderSpellSlots();
    renderPalette();
}

function openModal() {
    document.getElementById('tileModal').classList.remove('hidden');
    renderTileCategories();
}

function closeModal() {
    document.getElementById('tileModal').classList.add('hidden');
}

function renderTileCategories() {
    const container = document.getElementById('tileCategories');
    container.innerHTML = Object.entries(tileCategories).map(([key, category]) => `
        <div>
            <h4 class="text-xl font-bold mb-3 flex items-center gap-2">
                <div class="w-4 h-4 rounded ${category.color}"></div>
                ${category.name}
            </h4>
            <div class="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                ${category.tiles.map(tile => `
                    <button 
                        onclick="placeTile('${key}', '${tile.id}')"
                        class="p-4 ${category.color} border-2 ${category.borderColor} rounded-lg hover:scale-105 transition-all shadow-lg flex flex-col items-center gap-2">
                        <div class="text-3xl">${tile.icon}</div>
                        <div class="text-xs text-center font-semibold leading-tight">${tile.name}</div>
                    </button>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function placeTile(categoryKey, tileId) {
    const category = tileCategories[categoryKey];
    const tile = category.tiles.find(t => t.id === tileId);
    const tileWithCategory = { ...tile, category };
    
    if (selectedCell.type === 'palette') {
        spells[selectedSlot].palette[selectedCell.index] = tileWithCategory;
    } else if (selectedCell.type === 'aura1') {
        spells[selectedSlot].aura1 = tileWithCategory;
    } else if (selectedCell.type === 'aura2') {
        spells[selectedSlot].aura2 = tileWithCategory;
    }
    
    closeModal();
    renderPalette();
}

function clearTile(type, index) {
    if (type === 'palette') {
        spells[selectedSlot].palette[index] = null;
    } else if (type === 'aura1') {
        spells[selectedSlot].aura1 = null;
    } else if (type === 'aura2') {
        spells[selectedSlot].aura2 = null;
    }
    renderPalette();
}

function clearAll() {
    spells[selectedSlot] = {
        name: `Spell ${selectedSlot + 1}`,
        palette: Array(8).fill(null),
        aura1: null,
        aura2: null
    };
    renderPalette();
    renderSpellSlots();
}

function enterArena() {
    localStorage.setItem('customSpells', JSON.stringify(spells));
    window.location.href = 'game.html';
}

init();
