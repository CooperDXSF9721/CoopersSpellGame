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
            { id: 'thunderbolt', name: 'Thunderbolt', icon: '⚡' },
            { id: 'beam', name: 'Beam', icon: '〰️' },
            { id: 'fire-spark', name: 'Fire Spark', icon: '✨' }
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
    triggers: {
        name: 'Triggers',
        color: 'bg-green-500',
        borderColor: 'border-green-500',
        type: 'trigger',
        tiles: [
            { id: 'cast-on-hit', name: 'Cast On Hit', icon: '→' },
            { id: 'cast-on-pierce', name: 'Cast On Pierce', icon: '⇉' },
            { id: 'cast-after-delay', name: 'Cast After Delay', icon: '⏱️' },
            { id: 'twin-cast', name: 'Twin Cast', icon: '👯' }
        ]
    },
    status: {
        name: 'Effects',
        color: 'bg-blue-600',
        borderColor: 'border-blue-600',
        type: 'status',
        tiles: [
            { id: 'burning', name: 'Burning', icon: '🔥' },
            { id: 'frozen', name: 'Frozen', icon: '❄️' },
            { id: 'floating', name: 'Floating', icon: '🎈' },
            { id: 'shock', name: 'Shock', icon: '⚡' },
            { id: 'slow', name: 'Slow', icon: '🐌' }
        ]
    },
    castTypes: {
        name: 'Cast Modifiers',
        color: 'bg-yellow-500',
        borderColor: 'border-yellow-500',
        type: 'castType',
        tiles: [
            { id: 'duplicate', name: 'Duplicate', icon: '×2' },
            { id: 'triplicate', name: 'Triplicate', icon: '×3' },
            { id: 'quintuplicate', name: 'Quintuplicate', icon: '×5' },
            { id: 'decuplicate', name: 'Decuplicate', icon: '×10' }
        ]
    },
    spellTypes: {
        name: 'Spell Types',
        color: 'bg-red-600',
        borderColor: 'border-red-600',
        type: 'spellType',
        tiles: [
            { id: 'throw', name: 'Spell Type: Throw', icon: '🤾' },
            { id: 'cast', name: 'Spell Type: Cast', icon: '🪄' },
            { id: 'imbue-hit', name: 'Spell Type: Imbue Hit', icon: '⚔️' }
        ]
    }
};

function init() {
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
    
    // Add click handlers
    document.querySelectorAll('.tile-slot').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('clear-tile-btn')) return;
            selectedCell = {
                type: el.dataset.type,
                index: parseInt(el.dataset.index || -1)
            };
            openModal();
        });
    });
    
    renderConnections();
}

function createTileHTML(tile, gridIdx, execOrder, type, small = false) {
    const incomplete = gridIdx >= 0 && isIncomplete(gridIdx);
    
    if (!tile) {
        return `
            <div class="relative mb-8" data-type="${type}" data-index="${gridIdx}">
                ${execOrder !== null ? `<div class="absolute -top-2 -left-2 w-5 h-5 bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-300 z-10">${execOrder + 1}</div>` : ''}
                <button class="${small ? 'w-12 h-12' : 'w-16 h-16'} border-2 border-dashed border-gray-600 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 hover:border-gray-500 transition-all flex items-center justify-center text-gray-600">
                    +
                </button>
            </div>
        `;
    }
    
    return `
        <div class="relative mb-8 group" data-type="${type}" data-index="${gridIdx}">
            ${execOrder !== null ? `<div class="absolute -top-2 -left-2 w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white z-10">${execOrder + 1}</div>` : ''}
            <button class="${small ? 'w-12 h-12' : 'w-16 h-16'} ${tile.category.color} border-2 ${incomplete ? 'border-red-500 animate-pulse-border' : tile.category.borderColor} rounded-lg flex items-center justify-center text-2xl hover:scale-105 transition-all shadow-lg">
                ${tile.icon}
            </button>
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
    
    if (fromType === 'spellType' && (fromTile.id === 'imbue-hit' || fromTile.id === 'imbue-use') && toType === 'spell') return true;
    if (fromType === 'modifier' && toType === 'spell') return true;
    if (fromType === 'spell' && toType === 'trigger') return true;
    if (fromType === 'trigger' && toType === 'spell') return true;
    if (fromType === 'trigger' && toType === 'modifier') return true;
    if (fromType === 'status' && toType === 'spell') return true;
    if (fromType === 'spell' && toType === 'castType') return true;
    if (fromType === 'castType' && toType === 'spell') return true;
    if (fromType === 'modifier' && toType === 'modifier') return true;
    
    return false;
}

function isIncomplete(gridIdx) {
    const spell = spells[selectedSlot];
    const tile = spell.palette[gridIdx];
    if (!tile) return false;
    
    const tileType = tile.category.type;
    
    if (tileType === 'spellType' && (tile.id === 'imbue-hit' || tile.id === 'imbue-use')) {
        const currentExecPos = executionOrder.indexOf(gridIdx);
        if (currentExecPos === -1 || currentExecPos === 7) return true;
        
        const nextGridIdx = executionOrder[currentExecPos + 1];
        const nextTile = spell.palette[nextGridIdx];
        
        return !nextTile || nextTile.category.type !== 'spell';
    }
    
    if (tileType !== 'modifier' && tileType !== 'trigger' && tileType !== 'castType') return false;
    
    const currentExecPos = executionOrder.indexOf(gridIdx);
    if (currentExecPos === -1) return false;
    
    for (let nextExecPos = currentExecPos + 1; nextExecPos < 8; nextExecPos++) {
        const nextGridIdx = executionOrder[nextExecPos];
        const nextTile = spell.palette[nextGridIdx];
        
        if (!nextTile) continue;
        
        const nextType = nextTile.category.type;
        
        if (nextType === 'spell') return false;
        if (nextType === 'modifier' || nextType === 'trigger' || nextType === 'castType') continue;
        
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
