/* WebChemDraw clone — optimized for performance and maintainability. */

// ==================== GLOBAL PROFILE FUNCTIONS ====================
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'flex';
        updateProfileDisplay();
        fetchUserProfile();
    }
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const dataUrl = e.target.result;
        
        // Update profile photo display
        const photoEl = document.getElementById('profilePhoto');
        if (photoEl) {
            photoEl.style.fontSize = '0';
            photoEl.style.backgroundImage = `url('${dataUrl}')`;
            photoEl.style.backgroundSize = 'cover';
            photoEl.style.backgroundPosition = 'center';
        }
        
        // Save to current user
        let currentUser = JSON.parse(localStorage.getItem('chemhelp_currentUser') || '{}');
        currentUser.photo = dataUrl;
        localStorage.setItem('chemhelp_currentUser', JSON.stringify(currentUser));
        
        // Update in users list
        const users = JSON.parse(localStorage.getItem('chemhelp_users') || '[]');
        const userIndex = users.findIndex(u => u.email === currentUser.email);
        if (userIndex >= 0) {
            users[userIndex].photo = dataUrl;
            localStorage.setItem('chemhelp_users', JSON.stringify(users));
        }
    };
    reader.readAsDataURL(file);
}

function doLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('chemhelp_currentUser');
        document.location.href = 'login.html';
    }
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.style.cssText = 'padding:16px 20px;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.2);font-weight:500;display:flex;align-items:center;gap:12px;animation:slideIn 0.3s ease-out;max-width:350px;backdrop-filter:blur(10px);';
    
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    notification.innerHTML = `<span>${icons[type] || icons.info}</span><span>${message}</span>`;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('removing');
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ==================== DARK MODE ====================
function initDarkMode() {
    const isDark = localStorage.getItem('chemhelp_darkMode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-mode');
        updateDarkModeButton();
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('chemhelp_darkMode', isDark);
    updateDarkModeButton();
    showNotification(isDark ? 'Dark mode enabled' : 'Dark mode disabled', 'info', 2000);
}

function updateDarkModeButton() {
    const btn = document.getElementById('darkModeToggle');
    if (btn) {
        const isDark = document.body.classList.contains('dark-mode');
        btn.textContent = isDark ? '☀️' : '🌓';
    }
}

const canvas = document.getElementById('drawingCanvas');
const area = document.getElementById('drawingArea');
const ctx = canvas.getContext('2d');

// --- Cache DOM elements used frequently ---
const nodeCountEl = document.getElementById('nodeCount');
const bondCountEl = document.getElementById('bondCount');
const aiNameBtnCanvas = document.getElementById('aiNameBtnCanvas');
const aiNameTab = document.getElementById('aiNameTab');
const aiReactionBtn = document.getElementById('aiReactionBtn');
const aiReactionTab = document.getElementById('aiReactionTab');
const namedReactionSelect = document.getElementById('namedReactionSelect');
const namedReactionInfo = document.getElementById('namedReactionInfo');
const fileInput = document.getElementById('fileInput');
const mobileToggle = document.getElementById('mobileToggle');
const sidebarEl = document.getElementById('sidebar');
let mobileBackdrop = document.getElementById('mobileBackdrop');
if(!mobileBackdrop){
    mobileBackdrop = document.createElement('div');
    mobileBackdrop.id = 'mobileBackdrop';
    mobileBackdrop.className = 'mobile-backdrop';
    mobileBackdrop.hidden = true;
    document.body.appendChild(mobileBackdrop);
}

let nodes = []; // {id,x,y,label,charge,color}
let bonds = []; // {aId,bId,order,type}
let nextId = 1;

let tool = 'select';
let tempBondStart = null;
let dragNode = null;
let dragOffset = {x:0,y:0};
let chainPrev = null;
let selectedNode = null;

// Canvas transformation (zoom & pan)
let canvasZoom = 1;
let canvasPanX = 0;
let canvasPanY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

let showGrid = true;
let showLabels = true;
let showImplicitH = true; // Toggle for implicit hydrogens
let autoAddH = false; // Auto-add hydrogens on bond creation

// Atomic masses for molecular weight calculation
const atomicMasses = {
    'H': 1.008, 'C': 12.01, 'N': 14.01, 'O': 16.00, 'P': 30.97, 'S': 32.07,
    'Cl': 35.45, 'Br': 79.90, 'I': 126.90, 'F': 19.00, 'Na': 22.99, 'K': 39.10,
    'Ca': 40.08, 'Mg': 24.31, 'Al': 26.98, 'Si': 28.09, 'B': 10.81
};

// Element colors (CPK coloring scheme)
const elementColors = {
    'H': '#FFFFFF', 'C': '#000000', 'N': '#3050F8', 'O': '#FF0000', 
    'F': '#31FE00', 'Cl': '#1FD01F', 'Br': '#A62929', 'I': '#940094',
    'P': '#FF8000', 'S': '#FFFF30', 'Na': '#AB5C00', 'K': '#AB5C00',
    'Ca': '#3DFF00', 'Mg': '#85C42E', 'Al': '#C8A2C8', 'Si': '#F0C8A0',
    'B': '#FFB5B5'
};

// --- Use a map for fast node lookup by id ---
function buildNodeMap() {
    const map = new Map();
    for (const n of nodes) map.set(n.id, n);
    return map;
}

/* history for undo/redo */
let history = [];
let historyIndex = -1;
function pushHistory() {
    // keep shallow copies of arrays (deep copy simple objects)
    const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        bonds: JSON.parse(JSON.stringify(bonds)),
        nextId
    };
    // truncate redo
    history = history.slice(0, historyIndex + 1);
    history.push(snapshot);
    historyIndex++;
}
function restoreSnapshot(snap) {
    nodes = JSON.parse(JSON.stringify(snap.nodes));
    bonds = JSON.parse(JSON.stringify(snap.bonds));
    nextId = snap.nextId;
    updateCounts();
    draw();
}
function undo() {
    if(historyIndex <= 0) { alert('Nothing to undo'); return; }
    historyIndex--;
    restoreSnapshot(history[historyIndex]);
}
function redo() {
    if(historyIndex >= history.length -1) { alert('Nothing to redo'); return; }
    historyIndex++;
    restoreSnapshot(history[historyIndex]);
}

/* resizing */
function resize() {
    canvas.width = area.clientWidth;
    canvas.height = area.clientHeight;
    draw();
}
window.addEventListener('resize', resize);
resize();

/* tool selection */
function setTool(t){
    tool = t;
    document.querySelectorAll('[data-tool]').forEach(b=>b.style.background='');
    const btn = document.querySelector('[data-tool="'+t+'"]');
    if(btn) btn.style.background='#f0f8ff';
    document.getElementById('activeMode').textContent = t.replace('bond-','').replace(/-/g,' ');
    tempBondStart = null;
    chainPrev = null;
}
document.querySelectorAll('[data-tool]').forEach(btn=>{
    btn.addEventListener('click', ()=> {
        setTool(btn.dataset.tool);
        if(window.innerWidth <= 900 && sidebarEl) closeSidebar();
    });
});
setTool('select');

/* Keyboard shortcuts for tools */
const keyboardShortcuts = {
    's': 'select',           // S for Select
    'a': 'atom',             // A for Atom
    '1': 'bond-single',      // 1 for Single Bond
    '2': 'bond-double',      // 2 for Double Bond
    '3': 'bond-triple',      // 3 for Triple Bond
    'w': 'bond-wedge',       // W for Wedge Bond
    'd': 'bond-dashed',      // D for Dashed Bond
    '5': 'ring-5',           // 5 for 5-membered ring
    '6': 'ring-6',           // 6 for 6-membered ring
    '7': 'ring-7',           // 7 for 7-membered ring
    'c': 'chain',            // C for Chain
    'e': 'erase',            // E for Erase
    'q': 'charge',           // Q for Charge
};

document.addEventListener('keydown', (e) => {
    // Don't activate shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    const key = e.key.toLowerCase();
    if (keyboardShortcuts[key]) {
        e.preventDefault();
        setTool(keyboardShortcuts[key]);
        showKeyboardShortcutFeedback(key);
    }
});

// Visual feedback for keyboard shortcuts
function showKeyboardShortcutFeedback(key) {
    const feedback = document.createElement('div');
    feedback.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: linear-gradient(90deg, #5b6ee1 60%, #ff1744 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.95rem;
        box-shadow: 0 4px 16px rgba(91,110,225,0.2);
        z-index: 5000;
        animation: slideIn 0.3s ease;
    `;
    feedback.textContent = `Key [${key.toUpperCase()}] pressed`;
    document.body.appendChild(feedback);
    setTimeout(() => feedback.remove(), 1500);
}

// Add CSS animation for feedback
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);

document.getElementById('downloadJSON').onclick = saveJSON;
document.getElementById('downloadPNG').onclick = exportPNG;
document.getElementById('clearBtn').onclick = ()=>{
    if(!confirm('Clear everything?')) return;
    nodes = []; bonds = []; nextId = 1; pushHistory(); updateCounts(); draw();
};

// Charge button
const atomChargeBtn = document.getElementById('atomChargeBtn');
if(atomChargeBtn){
    atomChargeBtn.addEventListener('click', ()=> setTool('charge'));
}

/* Mobile sidebar helpers */
function openSidebar(){ if(!sidebarEl) return; sidebarEl.classList.add('open'); mobileBackdrop.hidden = false; mobileBackdrop.classList.add('visible'); document.body.classList.add('no-scroll'); }
function closeSidebar(){ if(!sidebarEl) return; sidebarEl.classList.remove('open'); mobileBackdrop.hidden = true; mobileBackdrop.classList.remove('visible'); document.body.classList.remove('no-scroll'); }
if(mobileToggle){ mobileToggle.addEventListener('click', ()=>{ if(sidebarEl && sidebarEl.classList.contains('open')) closeSidebar(); else openSidebar(); }); }
mobileBackdrop.addEventListener('click', ()=> closeSidebar());
window.addEventListener('resize', ()=>{ if(window.innerWidth > 900) { closeSidebar(); mobileBackdrop.hidden = true; } });

/* Touch support: forward primary touch events to mouse handlers so canvas interaction works on touch devices */
function touchToMouse(ev, type){
    if(!ev.changedTouches || ev.changedTouches.length === 0) return;
    const t = ev.changedTouches[0];
    const simulated = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX: t.clientX,
        clientY: t.clientY,
        button: 0
    });
    ev.target.dispatchEvent(simulated);
}

canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); touchToMouse(e,'mousedown'); }, { passive: false });
canvas.addEventListener('touchmove', (e)=>{ e.preventDefault(); touchToMouse(e,'mousemove'); }, { passive: false });
canvas.addEventListener('touchend', (e)=>{ e.preventDefault(); touchToMouse(e,'mouseup'); touchToMouse(e,'click'); }, { passive: false });

/* Ensure resize also triggers when orientation changes on mobile */
window.addEventListener('orientationchange', ()=> setTimeout(resize, 120));

/* --- Simple naming heuristics (MVP) --- */
function getComponents(){
    const nodeMap = new Map(nodes.map(n=>[n.id,n]));
    const adj = new Map();
    for(const n of nodes) adj.set(n.id, []);
    for(const b of bonds){ if(adj.has(b.aId)) adj.get(b.aId).push({id:b.bId, order:b.order}); if(adj.has(b.bId)) adj.get(b.bId).push({id:b.aId, order:b.order}); }
    const visited = new Set();
    const comps = [];
    for(const n of nodes){ if(visited.has(n.id)) continue; const stack=[n.id]; visited.add(n.id); const compIds=[]; while(stack.length){ const id = stack.pop(); compIds.push(id); for(const nb of (adj.get(id)||[])){ if(!visited.has(nb.id)){ visited.add(nb.id); stack.push(nb.id); } } } const comp = compIds.map(id=>nodeMap.get(id)).filter(node => node); if(comp.length > 0) comps.push(comp); }
    return comps;
}

function formulaForComponent(comp){
    const counts = {};
    for(const n of comp){ counts[n.label] = (counts[n.label]||0) + 1; }
    
    // Special cases for common compounds (use standard order, not Hill order)
    if(counts['H']===2 && counts['O']===1 && !counts['C']) return 'H₂O'; // water
    if(counts['N']===1 && counts['H']===3 && !counts['C']) return 'NH₃'; // ammonia
    if(counts['C']===1 && counts['O']===2 && !counts['H']) return 'CO₂'; // carbon dioxide
    if(counts['H']===1 && counts['Cl']===1 && !counts['C'] && !counts['O']) return 'HCl'; // HCl
    if(counts['H']===1 && counts['Br']===1 && !counts['C'] && !counts['O']) return 'HBr'; // HBr
    if(counts['H']===1 && counts['I']===1 && !counts['C'] && !counts['O']) return 'HI'; // HI
    if(counts['H']===1 && counts['F']===1 && !counts['C'] && !counts['O']) return 'HF'; // HF
    if(counts['Na']===1 && counts['O']===1 && counts['H']===1) return 'NaOH'; // NaOH
    if(counts['K']===1 && counts['O']===1 && counts['H']===1) return 'KOH'; // KOH
    if(counts['O']===1 && counts['H']===1 && !counts['C']) return 'OH'; // hydroxide ion
    
    // Hill order for organic compounds: C, H, then alphabetical
    const parts = [];
    if(counts['C']) { parts.push('C' + (counts['C']>1?counts['C']:'')); delete counts['C']; }
    if(counts['H']) { parts.push('H' + (counts['H']>1?counts['H']:'')); delete counts['H']; }
    const keys = Object.keys(counts).sort();
    for(const k of keys) parts.push(k + (counts[k]>1?counts[k]:''));
    return parts.join('') || '—';
}

function detectFunctionalGroups(comp){
    const counts = {};
    comp.forEach(n=> counts[n.label] = (counts[n.label]||0)+1);
    const compIds = new Set(comp.map(n=>n.id));
    const localBonds = bonds.filter(b=> compIds.has(b.aId) && compIds.has(b.bId));
    
    const groups = [];
    const props = { polar: false, reactive: false, classification: 'Unknown', acidity: 'Neutral', pH: 7 };
    
    // Helper function to get node by id
    const getNode = (id) => nodes.find(n=>n.id===id);
    
    // Helper to check bond between atoms
    const hasBond = (label1, label2, order=null) => {
        return localBonds.some(b=> {
            const a = getNode(b.aId), c = getNode(b.bId);
            if(!a || !c) return false;
            const match = (a.label===label1 && c.label===label2) || (a.label===label2 && c.label===label1);
            return match && (order === null || b.order === order);
        });
    };
    
    // === INORGANIC COMPOUNDS ===
    // HCl, HBr, HI, HF - hydrogen halides (strong acids)
    if(counts['H'] && ['F','Cl','Br','I'].some(h=>counts[h])){
        const halogen = ['F','Cl','Br','I'].find(h=>counts[h]);
        if(hasBond('H', halogen)) {
            groups.push(`Hydrogen ${halogen} (Strong Acid)`);
            props.classification = `Hydrogen ${halogen} (HX)`;
            props.acidity = `Strongly Acidic`;
            props.polar = true;
            props.reactive = true;
            props.pH = 0;
            return { groups, props };
        }
    }
    
    // H2O - water (neutral)
    if(counts['H']===2 && counts['O']===1 && hasBond('H','O')){
        groups.push('Water');
        props.classification = 'Water (H₂O)';
        props.acidity = 'Neutral';
        props.polar = true;
        props.pH = 7;
        return { groups, props };
    }
    
    // NH3 - ammonia (weak base)
    if(counts['N']===1 && counts['H']===3 && hasBond('N','H')){
        groups.push('Ammonia');
        props.classification = 'Ammonia (NH₃)';
        props.acidity = 'Basic';
        props.polar = true;
        props.reactive = true;
        props.pH = 11;
        return { groups, props };
    }
    
    // CO2 - carbon dioxide (weakly acidic)
    if(counts['C']===1 && counts['O']===2 && hasBond('C','O',2)){
        groups.push('Carbon Dioxide');
        props.classification = 'Carbon Dioxide (CO₂)';
        props.acidity = 'Weakly Acidic';
        props.polar = false;
        props.pH = 5;
        return { groups, props };
    }
    
    // NaOH, KOH - strong base
    if((counts['Na'] || counts['K']) && counts['O'] && counts['H']){
        const metal = counts['Na'] ? 'Na' : 'K';
        groups.push(`Strong Base (${metal}OH)`);
        props.classification = `${metal === 'Na' ? 'Sodium' : 'Potassium'} Hydroxide`;
        props.acidity = 'Strongly Basic';
        props.polar = true;
        props.reactive = true;
        props.pH = 14;
        return { groups, props };
    }
    
    // Ca(OH)2, Mg(OH)2, Ba(OH)2 - alkaline earth hydroxides (strong bases)
    if((counts['Ca'] || counts['Mg'] || counts['Ba']) && counts['O'] && counts['H']){
        const metal = counts['Ca'] ? 'Ca' : (counts['Mg'] ? 'Mg' : 'Ba');
        const metalName = metal === 'Ca' ? 'Calcium' : (metal === 'Mg' ? 'Magnesium' : 'Barium');
        groups.push(`Strong Base (${metal}(OH)₂)`);
        props.classification = `${metalName} Hydroxide`;
        props.acidity = 'Strongly Basic';
        props.polar = true;
        props.reactive = true;
        props.pH = 12;
        return { groups, props };
    }
    
    // === ORGANIC COMPOUNDS ===
    
    // Carboxylic acid: C=O + C-O
    const hasCarboxyl = localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c) return false;
        if(b.order===2 && ((a.label==='C'&&c.label==='O') || (a.label==='O'&&c.label==='C'))){
            const carbonId = a.label==='C' ? a.id : c.id;
            return localBonds.some(b2=> b2.order===1 && ((b2.aId===carbonId && getNode(b2.bId).label==='O') || (b2.bId===carbonId && getNode(b2.aId).label==='O')));
        }
        return false;
    });
    if(hasCarboxyl) { groups.push('Carboxylic Acid (−COOH)'); props.polar=true; props.reactive=true; props.acidity='Acidic (−COOH)'; props.pH=3; props.classification='Carboxylic Acid'; }
    
    // Ester: C(=O)-O-C (carbonyl bonded to O which is bonded to another C)
    const hasEster = localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==2) return false;
        if((a.label==='C' && c.label==='O') || (a.label==='O' && c.label==='C')){
            const carbonId = a.label==='C' ? a.id : c.id;
            const oxygenId = a.label==='O' ? a.id : c.id;
            return localBonds.some(b2=> b2.order===1 && ((b2.aId===oxygenId && getNode(b2.bId).label==='C') || (b2.bId===oxygenId && getNode(b2.aId).label==='C')));
        }
        return false;
    });
    if(hasEster && !hasCarboxyl) { groups.push('Ester (−COO−)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Ester'; }
    
    // Aldehyde: C=O with H attached to carbonyl carbon
    const hasAldehyde = localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==2) return false;
        if((a.label==='C' && c.label==='O') || (a.label==='O' && c.label==='C')){
            const carbonId = a.label==='C' ? a.id : c.id;
            return localBonds.some(b2=> ((b2.aId===carbonId && getNode(b2.bId).label==='H') || (b2.bId===carbonId && getNode(b2.aId).label==='H')));
        }
        return false;
    });
    if(hasAldehyde && !hasCarboxyl && !hasEster) { groups.push('Aldehyde (−CHO)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Aldehyde'; }
    
    // Ketone: C=O with two C atoms bonded to carbonyl carbon (not aldehyde, not carboxylic)
    const hasKetone = localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==2) return false;
        if((a.label==='C' && c.label==='O') || (a.label==='O' && c.label==='C')){
            const carbonId = a.label==='C' ? a.id : c.id;
            const cCount = localBonds.filter(b2=> (b2.aId===carbonId || b2.bId===carbonId) && ((getNode(b2.aId).label==='C' && b2.aId!==carbonId) || (getNode(b2.bId).label==='C' && b2.bId!==carbonId))).length;
            return cCount >= 2;
        }
        return false;
    });
    if(hasKetone && !hasCarboxyl && !hasEster && !hasAldehyde) { groups.push('Ketone (C=O)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Ketone'; }
    
    // Alcohol/Hydroxyl: C-O single bond (and not carboxylic acid)
    const hasOH = !hasCarboxyl && hasBond('C','O',1);
    if(hasOH) { groups.push('Alcohol (−OH)'); props.polar=true; props.acidity='Weakly Acidic'; props.pH=6; if(!props.classification || props.classification==='Unknown') props.classification='Alcohol'; }
    
    // Phenol: Aromatic C-OH (hydroxyl attached to aromatic ring carbon)
    const hasPhenol = hasOH && localBonds.some(b=>{
        if(b.order!==2) return false;
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c) return false;
        if((a.label==='C' && c.label==='C')){
            const c1Bonds = localBonds.filter(b2=> (b2.aId===a.id || b2.bId===a.id)).length;
            const c2Bonds = localBonds.filter(b2=> (b2.aId===c.id || b2.bId===c.id)).length;
            return c1Bonds >= 3 && c2Bonds >= 3;
        }
        return false;
    });
    if(hasPhenol) { groups.push('Phenol (Ar−OH)'); props.polar=true; props.acidity='Weakly Acidic'; props.pH=5; if(!props.classification || props.classification==='Unknown') props.classification='Phenol'; }
    
    // Ether: C-O-C (oxygen bonded to two carbons)
    const hasEther = !hasEster && localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==1) return false;
        if((a.label==='O' && c.label==='C') || (a.label==='C' && c.label==='O')){
            const oxygenId = a.label==='O' ? a.id : c.id;
            const cCount = localBonds.filter(b2=> (b2.aId===oxygenId || b2.bId===oxygenId) && ((getNode(b2.aId).label==='C' && b2.aId!==oxygenId) || (getNode(b2.bId).label==='C' && b2.bId!==oxygenId))).length;
            return cCount >= 2;
        }
        return false;
    });
    if(hasEther && !hasOH) { groups.push('Ether (C−O−C)'); props.polar=true; if(!props.classification || props.classification==='Unknown') props.classification='Ether'; }
    
    // Amine: C-N
    const hasNitrogen = !!counts['N'];
    if(hasNitrogen && hasBond('C','N')) { groups.push('Amine (−NH₂)'); props.polar=true; props.reactive=true; props.acidity='Basic (−NH₂)'; props.pH=10; if(!props.classification || props.classification==='Unknown') props.classification='Amine'; }
    
    // Amide: C(=O)-N (carbonyl bonded to nitrogen)
    const hasAmide = localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==2) return false;
        if((a.label==='C' && c.label==='O') || (a.label==='O' && c.label==='C')){
            const carbonId = a.label==='C' ? a.id : c.id;
            return localBonds.some(b2=> (b2.aId===carbonId && getNode(b2.bId).label==='N') || (b2.bId===carbonId && getNode(b2.aId).label==='N'));
        }
        return false;
    });
    if(hasAmide) { groups.push('Amide (−CONH−)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Amide'; }
    
    // Nitrile: C≡N (triple bond)
    const hasNitrile = localBonds.some(b=> b.order===3 && ((getNode(b.aId).label==='C' && getNode(b.bId).label==='N') || (getNode(b.aId).label==='N' && getNode(b.bId).label==='C')));
    if(hasNitrile) { groups.push('Nitrile (−C≡N)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Nitrile'; }
    
    // Thiol: C-S-H or S-H
    const hasThiol = hasBond('C','S',1) || (counts['H'] && counts['S'] && hasBond('S','H'));
    if(hasThiol) { groups.push('Thiol (−SH)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Thiol'; }
    
    // Sulfide: C-S-C
    const hasSulfide = !hasThiol && localBonds.some(b=>{
        const a = getNode(b.aId), c = getNode(b.bId);
        if(!a || !c || b.order!==1) return false;
        if((a.label==='S' && c.label==='C') || (a.label==='C' && c.label==='S')){
            const sulfurId = a.label==='S' ? a.id : c.id;
            const cCount = localBonds.filter(b2=> (b2.aId===sulfurId || b2.bId===sulfurId) && ((getNode(b2.aId).label==='C' && b2.aId!==sulfurId) || (getNode(b2.bId).label==='C' && b2.bId!==sulfurId))).length;
            return cCount >= 2;
        }
        return false;
    });
    if(hasSulfide) { groups.push('Sulfide (C−S−C)'); props.polar=true; if(!props.classification || props.classification==='Unknown') props.classification='Sulfide'; }
    
    // Alkene: C=C (double bond between carbons)
    const hasAlkene = localBonds.some(b=> b.order===2 && getNode(b.aId).label==='C' && getNode(b.bId).label==='C');
    if(hasAlkene) { groups.push('Alkene (C=C)'); props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Alkene'; }
    
    // Alkyne: C≡C (triple bond between carbons)
    const hasAlkyne = localBonds.some(b=> b.order===3 && getNode(b.aId).label==='C' && getNode(b.bId).label==='C');
    if(hasAlkyne) { groups.push('Alkyne (C≡C)'); props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Alkyne'; }
    
    // Carbonyl: C=O (general, already covered by aldehyde/ketone/carboxylic/ester/amide)
    const hasC_EQ_O = !hasCarboxyl && !hasAldehyde && !hasKetone && !hasEster && !hasAmide && hasBond('C','O',2);
    if(hasC_EQ_O) { groups.push('Carbonyl (C=O)'); props.polar=true; props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Carbonyl Compound'; }
    
    // Halogen attached to carbon
    const hasHalogen = ['F','Cl','Br','I'].some(x=> hasBond('C', x, 1));
    if(hasHalogen) { groups.push('Halogenated (C-X)'); props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Halogenated Compound'; }
    
    // Aromatic (benzene-like rings or aromatic systems)
    const hasDoubleTripleBonds = localBonds.some(b=> b.order>1);
    const onlyCH = Object.keys(counts).every(k=>k==='C' || k==='H');
    if(hasDoubleTripleBonds && onlyCH && counts['C']>=6) { groups.push('Aromatic Ring'); props.classification='Aromatic Compound'; }
    
    // Peroxide: O-O bond
    const hasPeroxide = localBonds.some(b=> getNode(b.aId).label==='O' && getNode(b.bId).label==='O');
    if(hasPeroxide) { groups.push('Peroxide (−O−O−)'); props.reactive=true; if(!props.classification || props.classification==='Unknown') props.classification='Peroxide'; }
    
    // Classify if not already classified
    if(!props.classification || props.classification === 'Unknown'){
        const onlyCH = Object.keys(counts).every(k=>k==='C' || k==='H');
        if(onlyCH && counts['C']>0) props.classification = 'Hydrocarbon (Alkane)';
        else if(groups.length) props.classification = groups[0];
        else props.classification = 'Organic Compound';
    }
    
    // Only override acidity/pH if not already set to something specific from inorganics
    if(props.acidity === 'Neutral' && (hasCarboxyl || hasOH || (hasNitrogen && hasBond('C','N')) || hasHalogen)){
        const acidicGroups = groups.filter(g=>g.toLowerCase().includes('acid') || g.toLowerCase().includes('carboxylic')).length;
        const basicGroups = groups.filter(g=>(g.toLowerCase().includes('amine') || g.toLowerCase().includes('basic'))).length;
        if(acidicGroups > basicGroups) { props.acidity='Acidic'; props.pH = Math.max(1, 7 - (acidicGroups*2)); }
        else if(basicGroups > acidicGroups) { props.acidity='Basic'; props.pH = Math.min(14, 7 + (basicGroups*2)); }
        else if(acidicGroups > 0 && basicGroups > 0) { props.acidity='Amphoteric'; props.pH=7; }
    }
    
    return { groups, props };
}

function guessName(comp){
    const labels = comp.map(n=>n.label);
    const counts = {}; labels.forEach(l=>counts[l]=(counts[l]||0)+1);
    const cCount = counts['C']||0;
    
    // === INORGANIC COMPOUNDS ===
    
    // Hydrogen halides: HCl, HBr, HI, HF
    if(counts['H']===1 && counts['Cl']===1) return 'Hydrogen Chloride (HCl)';
    if(counts['H']===1 && counts['Br']===1) return 'Hydrogen Bromide (HBr)';
    if(counts['H']===1 && counts['I']===1) return 'Hydrogen Iodide (HI)';
    if(counts['H']===1 && counts['F']===1) return 'Hydrogen Fluoride (HF)';
    
    // Water
    if(counts['H']===2 && counts['O']===1) return 'Water (H₂O)';
    
    // Ammonia
    if(counts['N']===1 && counts['H']===3) return 'Ammonia (NH₃)';
    
    // Carbon dioxide
    if(counts['C']===1 && counts['O']===2) return 'Carbon Dioxide (CO₂)';
    
    // Sodium hydroxide
    if(counts['Na']===1 && counts['O']===1 && counts['H']===1) return 'Sodium Hydroxide (NaOH)';
    
    // Potassium hydroxide
    if(counts['K']===1 && counts['O']===1 && counts['H']===1) return 'Potassium Hydroxide (KOH)';
    
    // Calcium hydroxide
    if(counts['Ca']===1 && counts['O']===2 && counts['H']===2) return 'Calcium Hydroxide (Ca(OH)₂)';
    
    // Magnesium hydroxide
    if(counts['Mg']===1 && counts['O']===2 && counts['H']===2) return 'Magnesium Hydroxide (Mg(OH)₂)';
    
    // Barium hydroxide
    if(counts['Ba']===1 && counts['O']===2 && counts['H']===2) return 'Barium Hydroxide (Ba(OH)₂)';
    
    // === ORGANIC COMPOUNDS ===
    
    const compIds = new Set(comp.map(n=>n.id));
    const localBonds = bonds.filter(b=> compIds.has(b.aId) && compIds.has(b.bId));
    const onlyCH = Object.keys(counts).every(k=>k==='C' || k==='H');
    const allSingle = localBonds.every(b=>b.order === 1);
    
    // Alkanes: C/H only, single bonds
    if(onlyCH && cCount>0 && allSingle){
        const names = ['methane','ethane','propane','butane','pentane','hexane','heptane','octane','nonane','decane'];
        return (names[cCount-1] || (cCount+'-carbon alkane'));
    }

    // Carboxylic acids
    const hasO = !!counts['O'];
    const hasN = !!counts['N'];
    const hasDoubleCO = localBonds.some(b=>{
        const a = nodes.find(n=>n.id===b.aId), c = nodes.find(n=>n.id===b.bId);
        return b.order===2 && ((a.label==='C' && c.label==='O') || (a.label==='O' && c.label==='C'));
    });
    if(hasO && hasDoubleCO && cCount>0){
        const base = (['meth','eth','prop','but','pent','hex','hept','oct','non','dec'][cCount-1] || (cCount+'C'));
        return base + 'anoic acid';
    }
    
    // Alcohols
    if(hasO && !hasN && cCount>0 && !hasDoubleCO){
        const base = (['meth','eth','prop','but','pent','hex','hept','oct','non','dec'][cCount-1] || (cCount+'C'));
        return base + 'anol';
    }
    
    // Amines
    if(hasN && cCount>0){
        const base = (['meth','eth','prop','but','pent','hex','hept','oct','non','dec'][cCount-1] || (cCount+'C'));
        return base + 'ylamine';
    }

    // Fallback
    return formulaForComponent(comp);
}

function nameAll(){
    showAiNameTab();
}

// bind naming to AI name buttons
const aiNameBtnSidebar = document.getElementById('aiNameBtn');
if(aiNameBtnSidebar) aiNameBtnSidebar.addEventListener('click', nameAll);

// Fallback AI name generator
function aiGenerateName(nodes, bonds) {
    try {
        if (!nodes || nodes.length === 0) return 'No structure detected.';
        const comps = getComponents();
        if (!comps || comps.length === 0) return 'No molecules present.';
        if (comps.length === 1) {
            const comp = comps[0];
            if (!comp || comp.length === 0) return 'Invalid component.';
            const name = guessName(comp);
            const formula = formulaForComponent(comp);
            return `${name} (${formula})`;
        } else {
            return `${comps.length} molecules detected.`;
        }
    } catch (err) {
        console.error('Error in aiGenerateName:', err);
        return 'Error analyzing structure.';
    }
}

// Gemini badge for AI-generated names
function geminiBadge() {
    return ' <span style="font-size:0.9em;color:#5b6ee1;">(via Gemini AI)</span>';
}

/* menu button toggles */
function setupMenuToggle(idBtn, idDropdown) {
    const b = document.getElementById(idBtn);
    const d = document.getElementById(idDropdown);
    if (!b || !d) {
        console.warn(`Button or dropdown not found: ${idBtn}, ${idDropdown}`);
        return;
    }
    b.addEventListener('click', (e)=>{
        e.stopPropagation();
        e.preventDefault();
        const isVisible = d.classList.contains('show');
        document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('show'));
        document.querySelectorAll('.dropdown-backdrop').forEach(db => db.classList.remove('show'));
        if (!isVisible) {
            // Move dropdown to body for proper fixed positioning
            if (d.parentNode !== document.body) {
                document.body.appendChild(d);
            }
            d.classList.add('show');
            let backdrop = document.getElementById('dropdownBackdrop');
            if (!backdrop) {
                backdrop = document.createElement('div');
                backdrop.id = 'dropdownBackdrop';
                backdrop.className = 'dropdown-backdrop';
                document.body.appendChild(backdrop);
            }
            backdrop.classList.add('show');
            backdrop.addEventListener('click', closeAllDropdowns);
        }
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown').forEach(dd => dd.classList.remove('show'));
    const backdrop = document.getElementById('dropdownBackdrop');
    if (backdrop) backdrop.classList.remove('show');
}

document.addEventListener('click', (e)=> {
    if(e.target.closest('.menu-btn')) return;
    if(e.target.closest('.dropdown')) return;
    closeAllDropdowns();
});
setupMenuToggle('menuFileBtn','menuFile');
setupMenuToggle('menuEditBtn','menuEdit');
setupMenuToggle('menuViewBtn','menuView');
setupMenuToggle('menuObjectBtn','menuObject');

// Close all dropdowns when clicking anywhere else on the page
document.addEventListener('click', (e)=> {
    // Don't close if clicking on a menu button
    if(e.target.closest('.menu-btn')) return;
    document.querySelectorAll('.dropdown').forEach(dd=>dd.style.display='none');
});

/* File menu actions */
document.getElementById('mNew').addEventListener('click', ()=> menuNew());
document.getElementById('mOpen').addEventListener('click', ()=> document.getElementById('fileInput').click());
document.getElementById('mSave').addEventListener('click', ()=> {
    saveJSON();
    showNotification('Structure saved successfully!', 'success', 2000);
});
document.getElementById('mExport').addEventListener('click', ()=> exportPNG());

function menuNew(){
    if(!confirm('Clear the canvas?')) return;
    nodes = []; bonds = []; nextId = 1; tempBondStart=null; chainPrev=null;
    pushHistory();
    updateCounts(); draw();
}

/* Edit menu actions */
document.getElementById('mUndo').addEventListener('click', ()=> undo());
document.getElementById('mRedo').addEventListener('click', ()=> redo());
document.getElementById('mClear').addEventListener('click', ()=> {
    if(!confirm('Clear everything?')) return;
    nodes = []; bonds = []; nextId = 1; pushHistory(); updateCounts(); draw();
});

/* View menu actions */
document.getElementById('mToggleGrid').addEventListener('click', ()=>{
    showGrid = !showGrid; draw();
});
document.getElementById('mToggleLabels').addEventListener('click', ()=>{
    showLabels = !showLabels; draw();
});
document.getElementById('mCenter').addEventListener('click', ()=> { /* simple center: no-op placeholder */ alert('Centering view — canvas auto-fits.'); });

/* Object menu actions */
document.getElementById('mPeriodic').addEventListener('click', ()=> window.open('https://ptable.com/','_blank'));
document.getElementById('mInsertElement').addEventListener('click', ()=>{
    const sym = prompt('Enter element symbol (e.g., Fe, O, N):','C');
    if(!sym) return;
    const nx = canvas.width/2, ny = canvas.height/2;
    addNode(nx, ny, sym.toUpperCase());
    pushHistory();
});
document.getElementById('mInsertPTImage').addEventListener('click', ()=>{
    // insert a small periodic table image in bottom-right as an object (drawn as image)
    const imgURL = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Periodic_table_large.svg';
    insertImageObject(imgURL);
    pushHistory();
});

/* file open input */
document.getElementById('fileInput').addEventListener('change', handleOpenFile);

/* canvas helpers */
function getMousePos(evt){
    const rect = canvas.getBoundingClientRect();
    let x = evt.clientX - rect.left;
    let y = evt.clientY - rect.top;
    
    // Reverse canvas transformations (inverse of draw transformations)
    // draw does: translate(w/2, h/2), scale(z, z), translate(px, py), translate(-w/2, -h/2)
    x = (x - canvas.width/2) / canvasZoom - canvasPanX + canvas.width/2;
    y = (y - canvas.height/2) / canvasZoom - canvasPanY + canvas.height/2;
    
    return { x, y };
}
function findNodeAt(x,y){
    for(let i=nodes.length-1;i>=0;i--){
        const n = nodes[i];
        const d = Math.hypot(n.x-x,n.y-y);
        if(d <= 18) return n;
    }
    return null;
}
function updateCounts(){
    nodeCountEl.textContent = nodes.length;
    bondCountEl.textContent = bonds.length;
    updateMolecularProperties();
}

function updateMolecularProperties(){
    // Calculate formula and weight for all components
    const components = getComponents();
    if(components.length === 0){
        document.getElementById('molFormula').textContent = '—';
        document.getElementById('molWeight').textContent = '—';
        document.getElementById('molSmiles').textContent = '—';
        return;
    }
    
    // Use first component (main molecule)
    const comp = components[0];
    const formula = formulaForComponent(comp);
    const weight = calculateMolecularWeight(comp);
    const smiles = generateSMILES(comp);
    
    document.getElementById('molFormula').textContent = formula;
    document.getElementById('molWeight').textContent = weight.toFixed(2);
    document.getElementById('molSmiles').textContent = smiles || '—';
}

function calculateMolecularWeight(component){
    let weight = 0;
    for(const atom of component){
        const mass = atomicMasses[atom.label] || 12;
        weight += mass;
    }
    return weight;
}

function generateSMILES(component){
    // Simple SMILES generator - not comprehensive, just a basic implementation
    if(component.length === 0) return '';
    if(component.length === 1) return component[0].label;
    
    // For now, return a simple representation
    const counts = {};
    for(const n of component){
        counts[n.label] = (counts[n.label] || 0) + 1;
    }
    const parts = [];
    for(const [elem, count] of Object.entries(counts)){
        parts.push(elem + (count > 1 ? count : ''));
    }
    return parts.join('');
}

// --- Debounce draw on mousemove ---
let drawPending = false;
function requestDraw() {
    if (!drawPending) {
        drawPending = true;
        requestAnimationFrame(() => {
            drawPending = false;
            draw();
        });
    }
}

// --- Only redraw when state changes or on drag ---
let lastMouse = null;
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    
    // Apply canvas transformations (zoom & pan)
    // Canvas size STAYS THE SAME - only content is transformed
    ctx.save();
    ctx.translate(canvas.width/2, canvas.height/2);
    ctx.scale(canvasZoom, canvasZoom);
    ctx.translate(canvasPanX, canvasPanY);
    ctx.translate(-canvas.width/2, -canvas.height/2);
    
    if(showGrid) drawGrid();
    for(const b of bonds) drawBond(b);
    if(tempBondStart && lastMouse) {
        ctx.strokeStyle = '#ff1744'; ctx.lineWidth=2; ctx.setLineDash([6,6]);
        ctx.beginPath(); ctx.moveTo(tempBondStart.x,tempBondStart.y); ctx.lineTo(lastMouse.x,lastMouse.y); ctx.stroke();
        ctx.setLineDash([]);
    }
    for(const n of nodes) drawNode(n);
    
    ctx.restore();
}
function drawGrid(){
    const step = 30;
    ctx.save();
    ctx.globalAlpha = 0.06; ctx.strokeStyle = '#000';
    for(let x=0;x<canvas.width;x+=step){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
    for(let y=0;y<canvas.height;y+=step){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
    ctx.restore();
}
function drawNode(n){
    // Get element color (CPK coloring)
    const elemColor = elementColors[n.label] || '#FFFFFF';
    const strokeColor = (n.label === 'H') ? '#666666' : '#333333';
    
    ctx.fillStyle = elemColor; 
    ctx.strokeStyle = strokeColor; 
    ctx.lineWidth = 2;
    ctx.beginPath(); 
    ctx.arc(n.x,n.y,14,0,Math.PI*2); 
    ctx.fill(); 
    ctx.stroke();
    
    if(showLabels){
        // Use contrasting text color based on element color
        const textColor = (n.label === 'H' || n.label === 'F' || n.label === 'S') ? '#000000' : '#FFFFFF';
        ctx.fillStyle = textColor; 
        ctx.font = 'bold 11px Segoe UI, Arial'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        
        let displayLabel = n.label || 'C';
        
        // Show implicit hydrogens if enabled and not hydrogen atom
        if (showImplicitH && n.label !== 'H') {
            const implicitH = calculateImplicitH(n.id);
            if (implicitH > 0) {
                displayLabel += 'H';
                if (implicitH > 1) displayLabel += implicitH;
            }
        }
        
        ctx.fillText(displayLabel, n.x, n.y);
    }
    
    // Draw charge if present
    if(n.charge && n.charge !== 0){
        ctx.fillStyle = '#ff1744'; 
        ctx.font = 'bold 10px Arial'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        const chargeStr = (n.charge > 0 ? '+' : '') + n.charge;
        ctx.fillText(chargeStr, n.x + 10, n.y - 10);
    }
}
function drawBond(b){
    const a = nodes.find(x=>x.id===b.aId), c = nodes.find(x=>x.id===b.bId);
    if(!a || !c) return;
    const dx = c.x - a.x, dy = c.y - a.y; const len = Math.hypot(dx,dy); const ux = dx/len, uy = dy/len;
    const gap = 6; ctx.lineWidth = 2; ctx.strokeStyle = '#333';
    const type = b.type || 'single';
    
    if(type === 'wedge'){
        // Wedge bond (solid triangle out of page)
        const px = a.x + ux*16, py = a.y + uy*16;
        const ex = c.x - ux*16, ey = c.y - uy*16;
        const p1x = px - uy*8, p1y = py + ux*8;
        const p2x = px + uy*8, p2y = py - ux*8;
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.closePath();
        ctx.fill();
    } else if(type === 'dashed'){
        // Dashed bond (into the page)
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(a.x + ux*16, a.y + uy*16); ctx.lineTo(c.x - ux*16, c.y - uy*16); ctx.stroke();
        ctx.setLineDash([]);
    } else if(b.order === 1){
        ctx.beginPath(); ctx.moveTo(a.x + ux*16, a.y + uy*16); ctx.lineTo(c.x - ux*16, c.y - uy*16); ctx.stroke();
    } else if(b.order === 2){
        ctx.beginPath(); ctx.moveTo(a.x + ux*16 - uy*gap, a.y + uy*16 + ux*gap); ctx.lineTo(c.x - ux*16 - uy*gap, c.y - uy*16 + ux*gap); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x + ux*16 + uy*gap, a.y + uy*16 - ux*gap); ctx.lineTo(c.x - ux*16 + uy*gap, c.y - uy*16 - ux*gap); ctx.stroke();
    } else if(b.order === 3){
        ctx.beginPath(); ctx.moveTo(a.x + ux*16, a.y + uy*16); ctx.lineTo(c.x - ux*16, c.y - uy*16); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x + ux*16 - uy*(gap*1.6), a.y + uy*16 + ux*(gap*1.6)); ctx.lineTo(c.x - ux*16 - uy*(gap*1.6), c.y - uy*16 + ux*(gap*1.6)); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.x + ux*16 + uy*(gap*1.6), a.y + uy*16 - ux*(gap*1.6)); ctx.lineTo(c.x - ux*16 + uy*(gap*1.6), c.y - uy*16 - ux*(gap*1.6)); ctx.stroke();
    }
}

/* interactions */
canvas.addEventListener('mousemove', (e)=>{
    // Skip if currently panning
    if(isPanning) return;
    
    lastMouse = getMousePos(e);
    if(dragNode){
        dragNode.x = lastMouse.x - dragOffset.x; dragNode.y = lastMouse.y - dragOffset.y;
        requestDraw();
    } else {
        requestDraw();
    }
    
    // Check for atom hover tooltip
    let found = null;
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const d = Math.hypot(n.x - lastMouse.x, n.y - lastMouse.y);
        if (d <= 18) { found = n; break; }
    }
    if (found) {
        const rect = canvas.getBoundingClientRect();
        // Calculate screen position accounting for zoom/pan
        const screenX = rect.left + canvas.width/2 + (found.x - canvas.width/2 + canvasPanX) * canvasZoom;
        const screenY = rect.top + canvas.height/2 + (found.y - canvas.height/2 + canvasPanY) * canvasZoom;
        showAtomTooltip(found, screenX, screenY);
        canvas.style.cursor = 'pointer';
    } else {
        hideAtomTooltip();
        canvas.style.cursor = '';
    }
});

canvas.addEventListener('mousedown', (e)=>{
    const m = getMousePos(e);
    const node = findNodeAt(m.x,m.y);
    if(tool==='select'){
        if(node){ dragNode = node; dragOffset.x = m.x - node.x; dragOffset.y = m.y - node.y; }
    } else if(tool==='atom'){
        const label = prompt('Atom label (e.g., C, O, N) — leave empty for C','C');
        addNode(m.x,m.y,label || 'C'); pushHistory();
    } else if(tool.startsWith('bond')){
        let order = 1, bondType = 'single';
        if(tool === 'bond-double') { order = 2; bondType = 'double'; }
        else if(tool === 'bond-triple') { order = 3; bondType = 'triple'; }
        else if(tool === 'bond-wedge') bondType = 'wedge';
        else if(tool === 'bond-dashed') bondType = 'dashed';
        
        if(node){
            if(tempBondStart == null){ tempBondStart = node; }
            else if(tempBondStart.id === node.id){ tempBondStart = null; }
            else { addBond(tempBondStart.id, node.id, order, bondType); tempBondStart = null; pushHistory(); }
        } else {
            const label = prompt('Atom label for new node','C') || 'C';
            const newN = addNode(m.x,m.y,label); if(tempBondStart) { addBond(tempBondStart.id, newN.id, order, bondType); tempBondStart = null; pushHistory(); }
            else pushHistory();
        }
    } else if(tool==='chain'){
        if(node){
            if(chainPrev && chainPrev.id !== node.id){ addBond(chainPrev.id, node.id, 1); chainPrev = node; pushHistory(); }
            else chainPrev = node;
        } else {
            const label = prompt('Atom label (chain)', 'C') || 'C';
            const newN = addNode(m.x,m.y,label);
            if(chainPrev) { addBond(chainPrev.id, newN.id, 1); pushHistory(); }
            chainPrev = newN;
        }
    } else if(tool==='charge'){
        if(node){
            selectedNode = node;
            const charge = prompt('Add charge (+1, -1, +2, etc.):', '0');
            if(charge !== null) {
                node.charge = parseInt(charge) || 0;
                pushHistory();
            }
            selectedNode = null;
        }
    } else if(tool === 'ring-5'){
        drawRing(m.x, m.y, 5);
    } else if(tool === 'ring-6'){
        drawRing(m.x, m.y, 6);
    } else if(tool === 'ring-7'){
        drawRing(m.x, m.y, 7);
    } else if(tool==='erase'){
        if(node){ removeNode(node.id); pushHistory(); }
        else {
            const clickedBond = bonds.find(b=>{
                const a = nodes.find(n=>n.id===b.aId), c = nodes.find(n=>n.id===b.bId);
                if(!a||!c) return false;
                const d = distPointToSegment(m, {x:a.x,y:a.y}, {x:c.x,y:c.y});
                return d < 6;
            });
            if(clickedBond) { removeBond(clickedBond); pushHistory(); }
        }
    }
    updateCounts(); draw();
});

canvas.addEventListener('mouseup', ()=>{ dragNode = null; isPanning = false; });

// Zoom with scroll wheel - DISABLED
// canvas.addEventListener('wheel', (e)=>{
//     e.preventDefault();
//     const zoomFactor = 1.05;
//     const oldZoom = canvasZoom;
//     if(e.deltaY < 0) canvasZoom *= zoomFactor;
//     else canvasZoom /= zoomFactor;
//     canvasZoom = Math.max(0.1, Math.min(5, canvasZoom));
//     draw();
// }, { passive: false });

// Pan with middle mouse button or space+drag
canvas.addEventListener('mousedown', (e)=>{
    if(e.button === 2 || (e.button === 0 && e.shiftKey)){
        isPanning = true;
        panStartX = e.clientX;
        panStartY = e.clientY;
        e.preventDefault();
        return;
    }
});

canvas.addEventListener('mousemove', (e)=>{
    if(isPanning){
        const dx = e.clientX - panStartX;
        const dy = e.clientY - panStartY;
        canvasPanX += dx / canvasZoom;
        canvasPanY += dy / canvasZoom;
        panStartX = e.clientX;
        panStartY = e.clientY;
        draw();
        return;
    }
});
// Right-click context menu for pan
canvas.addEventListener('contextmenu', (e)=>{ e.preventDefault(); });

// Double-click to edit atom label
canvas.addEventListener('dblclick', (e)=>{
    const m = getMousePos(e);
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const d = Math.hypot(n.x - m.x, n.y - m.y);
        if (d <= 18) {
            const newLabel = prompt('Edit atom label:', n.label);
            if (newLabel) {
                n.label = newLabel;
                pushHistory();
                updateCounts();
                draw();
            }
            break;
        }
    }
});

window.addEventListener('keydown',(e)=>{
    if(e.key === 'Delete') {
        if(nodes.length) { removeNode(nodes[nodes.length-1].id); pushHistory(); updateCounts(); draw(); }
    }
});

/* data mutators */
function addNode(x,y,label){
    const n = { id: nextId++, x: Math.round(x), y: Math.round(y), label: label || 'C' };
    nodes.push(n);
    updateCounts(); requestDraw();
    return n;
}

// Draw ring (n-membered polygon)
function drawRing(centerX, centerY, numAtoms, radius = 40){
    const ringNodeIds = [];
    const angleStep = (Math.PI * 2) / numAtoms;
    
    // Create ring atoms
    for(let i = 0; i < numAtoms; i++){
        const angle = i * angleStep - Math.PI/2; // Start at top
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        const node = addNode(x, y, 'C');
        ringNodeIds.push(node.id);
    }
    
    // Connect atoms in ring
    for(let i = 0; i < numAtoms; i++){
        const nextIdx = (i + 1) % numAtoms;
        addBond(ringNodeIds[i], ringNodeIds[nextIdx], 1, 'single');
    }
    
    pushHistory();
    updateCounts();
    draw();
}

// --- Element properties and bonding rules ---
const ELEMENTS = {
    H:  { symbol: 'H',  name: 'Hydrogen',  atomicNumber: 1,  valency: 1,  group: 1, period: 1, type: 'nonmetal' },
    He: { symbol: 'He', name: 'Helium',    atomicNumber: 2,  valency: 0,  group: 18, period: 1, type: 'noble gas' },
    Li: { symbol: 'Li', name: 'Lithium',   atomicNumber: 3,  valency: 1,  group: 1, period: 2, type: 'alkali metal' },
    Be: { symbol: 'Be', name: 'Beryllium', atomicNumber: 4,  valency: 2,  group: 2, period: 2, type: 'alkaline earth' },
    B:  { symbol: 'B',  name: 'Boron',     atomicNumber: 5,  valency: 3,  group: 13, period: 2, type: 'metalloid' },
    C:  { symbol: 'C',  name: 'Carbon',    atomicNumber: 6,  valency: 4,  group: 14, period: 2, type: 'nonmetal' },
    N:  { symbol: 'N',  name: 'Nitrogen',  atomicNumber: 7,  valency: 3,  group: 15, period: 2, type: 'nonmetal' },
    O:  { symbol: 'O',  name: 'Oxygen',    atomicNumber: 8,  valency: 2,  group: 16, period: 2, type: 'nonmetal' },
    F:  { symbol: 'F',  name: 'Fluorine',  atomicNumber: 9,  valency: 1,  group: 17, period: 2, type: 'halogen' },
    Ne: { symbol: 'Ne', name: 'Neon',      atomicNumber: 10, valency: 0,  group: 18, period: 2, type: 'noble gas' },
    Na: { symbol: 'Na', name: 'Sodium',    atomicNumber: 11, valency: 1,  group: 1, period: 3, type: 'alkali metal' },
    Mg: { symbol: 'Mg', name: 'Magnesium', atomicNumber: 12, valency: 2,  group: 2, period: 3, type: 'alkaline earth' },
    Al: { symbol: 'Al', name: 'Aluminum',  atomicNumber: 13, valency: 3,  group: 13, period: 3, type: 'post-transition' },
    Si: { symbol: 'Si', name: 'Silicon',   atomicNumber: 14, valency: 4,  group: 14, period: 3, type: 'metalloid' },
    P:  { symbol: 'P',  name: 'Phosphorus',atomicNumber: 15, valency: 3,  group: 15, period: 3, type: 'nonmetal' },
    S:  { symbol: 'S',  name: 'Sulfur',    atomicNumber: 16, valency: 2,  group: 16, period: 3, type: 'nonmetal' },
    Cl: { symbol: 'Cl', name: 'Chlorine',  atomicNumber: 17, valency: 1,  group: 17, period: 3, type: 'halogen' },
    Ar: { symbol: 'Ar', name: 'Argon',     atomicNumber: 18, valency: 0,  group: 18, period: 3, type: 'noble gas' },
    K:  { symbol: 'K',  name: 'Potassium', atomicNumber: 19, valency: 1,  group: 1, period: 4, type: 'alkali metal' },
    Ca: { symbol: 'Ca', name: 'Calcium',   atomicNumber: 20, valency: 2,  group: 2, period: 4, type: 'alkaline earth' },
    Sc: { symbol: 'Sc', name: 'Scandium',  atomicNumber: 21, valency: 3,  group: 3, period: 4, type: 'transition metal' },
    Ti: { symbol: 'Ti', name: 'Titanium',  atomicNumber: 22, valency: 4,  group: 4, period: 4, type: 'transition metal' },
    V:  { symbol: 'V',  name: 'Vanadium',  atomicNumber: 23, valency: 3,  group: 5, period: 4, type: 'transition metal' },
    Cr: { symbol: 'Cr', name: 'Chromium',  atomicNumber: 24, valency: 2,  group: 6, period: 4, type: 'transition metal' },
    Mn: { symbol: 'Mn', name: 'Manganese', atomicNumber: 25, valency: 2,  group: 7, period: 4, type: 'transition metal' },
    Fe: { symbol: 'Fe', name: 'Iron',      atomicNumber: 26, valency: 2,  group: 8, period: 4, type: 'transition metal' },
    Co: { symbol: 'Co', name: 'Cobalt',    atomicNumber: 27, valency: 2,  group: 9, period: 4, type: 'transition metal' },
    Ni: { symbol: 'Ni', name: 'Nickel',    atomicNumber: 28, valency: 2,  group: 10, period: 4, type: 'transition metal' },
    Cu: { symbol: 'Cu', name: 'Copper',    atomicNumber: 29, valency: 1,  group: 11, period: 4, type: 'transition metal' },
    Zn: { symbol: 'Zn', name: 'Zinc',      atomicNumber: 30, valency: 2,  group: 12, period: 4, type: 'transition metal' },
    Ga: { symbol: 'Ga', name: 'Gallium',   atomicNumber: 31, valency: 3,  group: 13, period: 4, type: 'post-transition' },
    Ge: { symbol: 'Ge', name: 'Germanium', atomicNumber: 32, valency: 4,  group: 14, period: 4, type: 'metalloid' },
    As: { symbol: 'As', name: 'Arsenic',   atomicNumber: 33, valency: 3,  group: 15, period: 4, type: 'metalloid' },
    Se: { symbol: 'Se', name: 'Selenium',  atomicNumber: 34, valency: 2,  group: 16, period: 4, type: 'nonmetal' },
    Br: { symbol: 'Br', name: 'Bromine',   atomicNumber: 35, valency: 1,  group: 17, period: 4, type: 'halogen' },
    Kr: { symbol: 'Kr', name: 'Krypton',   atomicNumber: 36, valency: 0,  group: 18, period: 4, type: 'noble gas' },
    Rb: { symbol: 'Rb', name: 'Rubidium',  atomicNumber: 37, valency: 1,  group: 1, period: 5, type: 'alkali metal' },
    Sr: { symbol: 'Sr', name: 'Strontium', atomicNumber: 38, valency: 2,  group: 2, period: 5, type: 'alkaline earth' },
    Y:  { symbol: 'Y',  name: 'Yttrium',   atomicNumber: 39, valency: 3,  group: 3, period: 5, type: 'transition metal' },
    Zr: { symbol: 'Zr', name: 'Zirconium', atomicNumber: 40, valency: 4,  group: 4, period: 5, type: 'transition metal' },
    Nb: { symbol: 'Nb', name: 'Niobium',   atomicNumber: 41, valency: 5,  group: 5, period: 5, type: 'transition metal' },
    Mo: { symbol: 'Mo', name: 'Molybdenum',atomicNumber: 42, valency: 6,  group: 6, period: 5, type: 'transition metal' },
    Tc: { symbol: 'Tc', name: 'Technetium',atomicNumber: 43, valency: 4,  group: 7, period: 5, type: 'transition metal' },
    Ru: { symbol: 'Ru', name: 'Ruthenium',atomicNumber: 44, valency: 3,  group: 8, period: 5, type: 'transition metal' },
    Rh: { symbol: 'Rh', name: 'Rhodium',   atomicNumber: 45, valency: 3,  group: 9, period: 5, type: 'transition metal' },
    Pd: { symbol: 'Pd', name: 'Palladium', atomicNumber: 46, valency: 2,  group: 10, period: 5, type: 'transition metal' },
    Ag: { symbol: 'Ag', name: 'Silver',    atomicNumber: 47, valency: 1,  group: 11, period: 5, type: 'transition metal' },
    Cd: { symbol: 'Cd', name: 'Cadmium',   atomicNumber: 48, valency: 2,  group: 12, period: 5, type: 'transition metal' },
    In: { symbol: 'In', name: 'Indium',    atomicNumber: 49, valency: 3,  group: 13, period: 5, type: 'post-transition' },
    Sn: { symbol: 'Sn', name: 'Tin',       atomicNumber: 50, valency: 4,  group: 14, period: 5, type: 'post-transition' },
    Sb: { symbol: 'Sb', name: 'Antimony',  atomicNumber: 51, valency: 3,  group: 15, period: 5, type: 'metalloid' },
    Te: { symbol: 'Te', name: 'Tellurium', atomicNumber: 52, valency: 2,  group: 16, period: 5, type: 'metalloid' },
    I:  { symbol: 'I',  name: 'Iodine',    atomicNumber: 53, valency: 1,  group: 17, period: 5, type: 'halogen' },
    Xe: { symbol: 'Xe', name: 'Xenon',     atomicNumber: 54, valency: 0,  group: 18, period: 5, type: 'noble gas' },
    Cs: { symbol: 'Cs', name: 'Cesium',    atomicNumber: 55, valency: 1,  group: 1, period: 6, type: 'alkali metal' },
    Ba: { symbol: 'Ba', name: 'Barium',    atomicNumber: 56, valency: 2,  group: 2, period: 6, type: 'alkaline earth' },
    La: { symbol: 'La', name: 'Lanthanum', atomicNumber: 57, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Ce: { symbol: 'Ce', name: 'Cerium',    atomicNumber: 58, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Pr: { symbol: 'Pr', name: 'Praseodymium',atomicNumber: 59, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Nd: { symbol: 'Nd', name: 'Neodymium', atomicNumber: 60, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Pm: { symbol: 'Pm', name: 'Promethium',atomicNumber: 61, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Sm: { symbol: 'Sm', name: 'Samarium',  atomicNumber: 62, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Eu: { symbol: 'Eu', name: 'Europium',  atomicNumber: 63, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Gd: { symbol: 'Gd', name: 'Gadolinium',atomicNumber: 64, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Tb: { symbol: 'Tb', name: 'Terbium',   atomicNumber: 65, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Dy: { symbol: 'Dy', name: 'Dysprosium',atomicNumber: 66, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Ho: { symbol: 'Ho', name: 'Holmium',   atomicNumber: 67, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Er: { symbol: 'Er', name: 'Erbium',    atomicNumber: 68, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Tm: { symbol: 'Tm', name: 'Thulium',   atomicNumber: 69, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Yb: { symbol: 'Yb', name: 'Ytterbium', atomicNumber: 70, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Lu: { symbol: 'Lu', name: 'Lutetium',  atomicNumber: 71, valency: 3,  group: 3, period: 6, type: 'lanthanide' },
    Hf: { symbol: 'Hf', name: 'Hafnium',   atomicNumber: 72, valency: 4,  group: 4, period: 6, type: 'transition metal' },
    Ta: { symbol: 'Ta', name: 'Tantalum',  atomicNumber: 73, valency: 5,  group: 5, period: 6, type: 'transition metal' },
    W:  { symbol: 'W',  name: 'Tungsten',  atomicNumber: 74, valency: 6,  group: 6, period: 6, type: 'transition metal' },
    Re: { symbol: 'Re', name: 'Rhenium',   atomicNumber: 75, valency: 4,  group: 7, period: 6, type: 'transition metal' },
    Os: { symbol: 'Os', name: 'Osmium',    atomicNumber: 76, valency: 4,  group: 8, period: 6, type: 'transition metal' },
    Ir: { symbol: 'Ir', name: 'Iridium',   atomicNumber: 77, valency: 3,  group: 9, period: 6, type: 'transition metal' },
    Pt: { symbol: 'Pt', name: 'Platinum',  atomicNumber: 78, valency: 4,  group: 10, period: 6, type: 'transition metal' },
    Au: { symbol: 'Au', name: 'Gold',      atomicNumber: 79, valency: 3,  group: 11, period: 6, type: 'transition metal' },
    Hg: { symbol: 'Hg', name: 'Mercury',   atomicNumber: 80, valency: 2,  group: 12, period: 6, type: 'transition metal' },
    Tl: { symbol: 'Tl', name: 'Thallium',  atomicNumber: 81, valency: 1,  group: 13, period: 6, type: 'post-transition' },
    Pb: { symbol: 'Pb', name: 'Lead',      atomicNumber: 82, valency: 2,  group: 14, period: 6, type: 'post-transition' },
    Bi: { symbol: 'Bi', name: 'Bismuth',   atomicNumber: 83, valency: 3,  group: 15, period: 6, type: 'post-transition' },
    Po: { symbol: 'Po', name: 'Polonium',  atomicNumber: 84, valency: 2,  group: 16, period: 6, type: 'metalloid' },
    At: { symbol: 'At', name: 'Astatine',  atomicNumber: 85, valency: 1,  group: 17, period: 6, type: 'halogen' },
    Rn: { symbol: 'Rn', name: 'Radon',     atomicNumber: 86, valency: 0,  group: 18, period: 6, type: 'noble gas' },
    Fr: { symbol: 'Fr', name: 'Francium',  atomicNumber: 87, valency: 1,  group: 1, period: 7, type: 'alkali metal' },
    Ra: { symbol: 'Ra', name: 'Radium',    atomicNumber: 88, valency: 2,  group: 2, period: 7, type: 'alkaline earth' },
    Ac: { symbol: 'Ac', name: 'Actinium',  atomicNumber: 89, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Th: { symbol: 'Th', name: 'Thorium',   atomicNumber: 90, valency: 4,  group: 3, period: 7, type: 'actinide' },
    Pa: { symbol: 'Pa', name: 'Protactinium',atomicNumber: 91, valency: 5,  group: 3, period: 7, type: 'actinide' },
    U:  { symbol: 'U',  name: 'Uranium',   atomicNumber: 92, valency: 6,  group: 3, period: 7, type: 'actinide' },
    Np: { symbol: 'Np', name: 'Neptunium', atomicNumber: 93, valency: 5,  group: 3, period: 7, type: 'actinide' },
    Pu: { symbol: 'Pu', name: 'Plutonium', atomicNumber: 94, valency: 4,  group: 3, period: 7, type: 'actinide' },
    Am: { symbol: 'Am', name: 'Americium', atomicNumber: 95, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Cm: { symbol: 'Cm', name: 'Curium',    atomicNumber: 96, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Bk: { symbol: 'Bk', name: 'Berkelium', atomicNumber: 97, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Cf: { symbol: 'Cf', name: 'Californium',atomicNumber: 98, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Es: { symbol: 'Es', name: 'Einsteinium',atomicNumber: 99, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Fm: { symbol: 'Fm', name: 'Fermium',   atomicNumber: 100, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Md: { symbol: 'Md', name: 'Mendelevium',atomicNumber: 101, valency: 3,  group: 3, period: 7, type: 'actinide' },
    No: { symbol: 'No', name: 'Nobelium',  atomicNumber: 102, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Lr: { symbol: 'Lr', name: 'Lawrencium',atomicNumber: 103, valency: 3,  group: 3, period: 7, type: 'actinide' },
    Rf: { symbol: 'Rf', name: 'Rutherfordium',atomicNumber: 104, valency: 4,  group: 4, period: 7, type: 'transition metal' },
    Db: { symbol: 'Db', name: 'Dubnium',   atomicNumber: 105, valency: 5,  group: 5, period: 7, type: 'transition metal' },
    Sg: { symbol: 'Sg', name: 'Seaborgium',atomicNumber: 106, valency: 6,  group: 6, period: 7, type: 'transition metal' },
    Bh: { symbol: 'Bh', name: 'Bohrium',   atomicNumber: 107, valency: 7,  group: 7, period: 7, type: 'transition metal' },
    Hs: { symbol: 'Hs', name: 'Hassium',   atomicNumber: 108, valency: 8,  group: 8, period: 7, type: 'transition metal' },
    Mt: { symbol: 'Mt', name: 'Meitnerium',atomicNumber: 109, valency: 1,  group: 9, period: 7, type: 'transition metal' },
    Ds: { symbol: 'Ds', name: 'Darmstadtium',atomicNumber: 110, valency: 2,  group: 10, period: 7, type: 'transition metal' },
    Rg: { symbol: 'Rg', name: 'Roentgenium',atomicNumber: 111, valency: 1,  group: 11, period: 7, type: 'transition metal' },
    Cn: { symbol: 'Cn', name: 'Copernicium',atomicNumber: 112, valency: 2,  group: 12, period: 7, type: 'transition metal' },
    Nh: { symbol: 'Nh', name: 'Nihonium',  atomicNumber: 113, valency: 3,  group: 13, period: 7, type: 'post-transition' },
    Fl: { symbol: 'Fl', name: 'Flerovium', atomicNumber: 114, valency: 2,  group: 14, period: 7, type: 'post-transition' },
    Mc: { symbol: 'Mc', name: 'Moscovium', atomicNumber: 115, valency: 3,  group: 15, period: 7, type: 'post-transition' },
    Lv: { symbol: 'Lv', name: 'Livermorium',atomicNumber: 116, valency: 2,  group: 16, period: 7, type: 'post-transition' },
    Ts: { symbol: 'Ts', name: 'Tennessine',atomicNumber: 117, valency: 1,  group: 17, period: 7, type: 'halogen' },
    Og: { symbol: 'Og', name: 'Oganesson', atomicNumber: 118, valency: 0,  group: 18, period: 7, type: 'noble gas' }
};

function getAtomValency(label) {
    return (ELEMENTS[label] && ELEMENTS[label].valency != null) ? ELEMENTS[label].valency : 4;
}
function getAtomInfo(label) {
    return ELEMENTS[label] || { symbol: label, name: 'Unknown', atomicNumber: '?', valency: '?', group: '?', period: '?', type: '?' };
}

// Calculate implicit hydrogens for an atom
function calculateImplicitH(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.label === 'H') return 0;
    
    const valency = getAtomValency(node.label);
    const bondOrders = bonds.filter(b => b.aId === nodeId || b.bId === nodeId)
        .reduce((sum, b) => sum + (b.order || 1), 0);
    
    const implicitH = Math.max(0, valency - bondOrders);
    return implicitH;
}

// Get total bonds including implicit H
function getTotalBonds(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return 0;
    
    const explicitBonds = bonds.filter(b => b.aId === nodeId || b.bId === nodeId)
        .reduce((sum, b) => sum + (b.order || 1), 0);
    
    const implicitH = calculateImplicitH(nodeId);
    return explicitBonds + implicitH;
}

// Validate bond creation based on valency
function canAddBond(fromId, toId, bondOrder = 1) {
    const from = nodes.find(n => n.id === fromId);
    const to = nodes.find(n => n.id === toId);
    
    if (!from || !to) return false;
    if (fromId === toId) return false;
    
    const fromVal = getAtomValency(from.label);
    const toVal = getAtomValency(to.label);
    
    const fromExisting = bonds.filter(b => b.aId === fromId || b.bId === fromId)
        .reduce((sum, b) => sum + (b.order || 1), 0);
    const toExisting = bonds.filter(b => b.aId === toId || b.bId === toId)
        .reduce((sum, b) => sum + (b.order || 1), 0);
    
    return (fromExisting + bondOrder <= fromVal) && (toExisting + bondOrder <= toVal);
}

// --- Atom research/edit panel (future extensibility) ---
let researchPanel = null;
function showResearchPanel(atom) {
    if (!researchPanel) {
        researchPanel = document.createElement('div');
        researchPanel.style.position = 'fixed';
        researchPanel.style.right = '32px';
        researchPanel.style.top = '80px';
        researchPanel.style.width = '320px';
        researchPanel.style.background = 'rgba(255,255,255,0.99)';
        researchPanel.style.border = '2px solid #b9d7fb';
        researchPanel.style.borderRadius = '16px';
        researchPanel.style.boxShadow = '0 8px 32px rgba(91,110,225,0.13)';
        researchPanel.style.padding = '22px 24px 18px 24px';
        researchPanel.style.fontSize = '1.08rem';
        researchPanel.style.color = '#23243a';
        researchPanel.style.zIndex = 2000;
        researchPanel.style.maxHeight = '80vh';
        researchPanel.style.overflowY = 'auto';
        document.body.appendChild(researchPanel);
    }
    const props = getAtomInfo(atom.label);
    researchPanel.innerHTML = `<div style='font-size:1.3rem;font-weight:700;margin-bottom:8px;'>${props.symbol} — ${props.name}</div>
        <div><b>Atomic Number:</b> ${props.atomicNumber}</div>
        <div><b>Valency:</b> ${props.valency}</div>
        <div><b>Group:</b> ${props.group}</div>
        <div><b>Period:</b> ${props.period}</div>
        <div><b>Type:</b> ${props.type}</div>
        <div style='margin:12px 0 0 0;'><b>Edit Label:</b> <input id='editAtomLabel' value='${atom.label}' style='width:60px;font-size:1.1rem;padding:2px 6px;border-radius:6px;border:1px solid #b9d7fb;'></div>
        <button id='closeResearchPanel' style='margin-top:18px;padding:8px 18px;border-radius:8px;background:#ff1744;color:#fff;border:none;font-weight:700;cursor:pointer;'>Close</button>
        <div style='margin-top:10px;font-size:0.98rem;color:#7f8c8d;'>Research: All chemical rules and properties enforced. Edit label to change atom type.</div>`;
    document.getElementById('closeResearchPanel').onclick = ()=> researchPanel.style.display = 'none';
    document.getElementById('editAtomLabel').onchange = (e)=>{
        atom.label = e.target.value;
        updateCounts(); draw();
        showResearchPanel(atom);
    };
    researchPanel.style.display = 'block';
}

// Tooltip for atom properties
let tooltipDiv = null;
function showAtomTooltip(atom, x, y) {
    if (!tooltipDiv) {
        tooltipDiv = document.createElement('div');
        tooltipDiv.style.position = 'fixed';
        tooltipDiv.style.zIndex = 1000;
        tooltipDiv.style.background = 'rgba(255,255,255,0.98)';
        tooltipDiv.style.border = '1.5px solid #b9d7fb';
        tooltipDiv.style.borderRadius = '10px';
        tooltipDiv.style.boxShadow = '0 4px 16px rgba(91,110,225,0.13)';
        tooltipDiv.style.padding = '10px 16px';
        tooltipDiv.style.fontSize = '1rem';
        tooltipDiv.style.color = '#23243a';
        tooltipDiv.style.pointerEvents = 'none';
        document.body.appendChild(tooltipDiv);
    }
    const props = getAtomInfo(atom.label);
    tooltipDiv.innerHTML = `<b>${props.symbol}</b> — ${props.name}<br>Atomic #: ${props.atomicNumber}<br>Valency: ${props.valency}<br>Group: ${props.group}, Period: ${props.period}<br>Type: ${props.type}`;
    tooltipDiv.style.left = (x + 18) + 'px';
    tooltipDiv.style.top = (y + 18) + 'px';
    tooltipDiv.style.display = 'block';
}
function hideAtomTooltip() {
    if (tooltipDiv) tooltipDiv.style.display = 'none';
}
// Canvas atom click for research panel
canvas.addEventListener('click', (e)=>{
    const m = getMousePos(e);
    for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const d = Math.hypot(n.x - m.x, n.y - m.y);
        if (d <= 18) {
            showResearchPanel(n);
            break;
        }
    }
});

/* Bonding rules enforcement */
function addBond(aId, bId, order = 1, bondType = 'single') {
    if (aId === bId) return;

    // --- Use node map for fast lookup ---
    const nodeMap = buildNodeMap();
    const a = nodeMap.get(aId);
    const b = nodeMap.get(bId);
    if (!a || !b) return;

    // Check if bond already exists
    const exists = bonds.find(bond =>
        (bond.aId === aId && bond.bId === bId) ||
        (bond.aId === bId && bond.bId === aId)
    );

    // Calculate current explicit bond orders for each atom (excluding implicit H)
    const aBonds = bonds.filter(x => x.aId === aId || x.bId === aId).reduce((sum, x) => sum + (x.order || 1), 0);
    const bBonds = bonds.filter(x => x.aId === bId || x.bId === bId).reduce((sum, x) => sum + (x.order || 1), 0);

    // Get valency from ELEMENTS map
    const aVal = getAtomValency(a.label);
    const bVal = getAtomValency(b.label);

    if (exists) {
        // If bond exists, check if upgrading/downgrading is allowed
        const delta = order - exists.order;
        if ((aBonds + delta) > aVal) {
            alert(`❌ Valency Error!\n${a.label} has max valency of ${aVal}. Current: ${aBonds}, requested: ${aBonds + delta}`);
            return;
        }
        if ((bBonds + delta) > bVal) {
            alert(`❌ Valency Error!\n${b.label} has max valency of ${bVal}. Current: ${bBonds}, requested: ${bBonds + delta}`);
            return;
        }
        exists.order = order;
        exists.type = bondType;
        pushHistory();
        updateCounts();
        requestDraw();
        return exists;
    } else {
        // New bond - check valency constraints
        if ((aBonds + order) > aVal) {
            alert(`❌ Valency Error!\n${a.label} has max valency of ${aVal}. Current: ${aBonds}, requested: ${aBonds + order}`);
            return;
        }
        if ((bBonds + order) > bVal) {
            alert(`❌ Valency Error!\n${b.label} has max valency of ${bVal}. Current: ${bBonds}, requested: ${bBonds + order}`);
            return;
        }
        const bond = { aId, bId, order, type: bondType };
        bonds.push(bond);
        pushHistory();
        updateCounts();
        requestDraw();
        return bond;
    }
}
function removeNode(id){
    nodes = nodes.filter(n=>n.id!==id); bonds = bonds.filter(b=> b.aId!==id && b.bId!==id);
}
function removeBond(bObj){
    const i = bonds.indexOf(bObj); if(i>=0) bonds.splice(i,1);
}

/* util */
function distPointToSegment(p, v, w){
    const l2 = (v.x-w.x)*(v.x-w.x)+(v.y-w.y)*(v.y-w.y);
    if(l2===0) return Math.hypot(p.x-v.x,p.y-v.y);
    let t = ((p.x - v.x)*(w.x - v.x) + (p.y - v.y)*(w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: v.x + t*(w.x - v.x), y: v.y + t*(w.y - v.y)};
    return Math.hypot(p.x-proj.x,p.y-proj.y);
}

/* save/load/export */
function saveJSON(){
    const data = { nodes, bonds };
    // try saving to server first
    fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }).then(resp=>{
        if(resp.ok) { alert('Saved to server.'); }
        else { alert('Server save failed, downloading locally.'); downloadLocal(); }
    }).catch(err=>{ console.error(err); alert('Server save failed, downloading locally.'); downloadLocal(); });

    function downloadLocal(){
        const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'molecule.json'; a.click();
        URL.revokeObjectURL(url);
    }
}

function loadFromServer(){
    fetch('/api/load').then(r=>{
        if(!r.ok) throw new Error('Load failed');
        return r.text();
    }).then(text=>{
        try{
            const obj = JSON.parse(text);
            if(Array.isArray(obj.nodes) && Array.isArray(obj.bonds)){
                nodes = obj.nodes.map(n=>({...n})); bonds = obj.bonds.map(b=>({...b}));
                nextId = (nodes.reduce((m,n)=>Math.max(m,n.id),0) || 0)+1;
                pushHistory(); updateCounts(); draw();
                // don't alert on successful silent load
            }
        }catch(e){ console.warn('No saved data or invalid format'); }
    }).catch(err=>{ console.warn('No saved data on server or network error'); });
}
function handleOpenFile(evt){
    const f = evt.target.files[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload = e=>{
        try{
            const obj = JSON.parse(e.target.result);
            if(Array.isArray(obj.nodes) && Array.isArray(obj.bonds)){
                nodes = obj.nodes.map(n=>({...n})); bonds = obj.bonds.map(b=>({...b}));
                nextId = (nodes.reduce((m,n)=>Math.max(m,n.id),0) || 0)+1;
                pushHistory(); updateCounts(); draw(); alert('File loaded.');
            } else alert('Invalid file format.');
        }catch(err){ alert('Error reading file.'); }
    };
    reader.readAsText(f); evt.target.value = '';
}

function exportPNG(){
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = canvas.width; exportCanvas.height = canvas.height;
    const ectx = exportCanvas.getContext('2d');
    ectx.fillStyle = '#ffffff'; ectx.fillRect(0,0,exportCanvas.width,exportCanvas.height);
    for(const b of bonds){
        const a = nodes.find(n=>n.id===b.aId); const c = nodes.find(n=>n.id===b.bId); if(!a||!c) continue;
        ectx.strokeStyle = '#333'; ectx.lineWidth = 2;
        const dx = c.x-a.x, dy = c.y-a.y; const len = Math.hypot(dx,dy); const ux=dx/len, uy=dy/len;
        const gap=6;
        if(b.order===1){ ectx.beginPath(); ectx.moveTo(a.x+ux*16,a.y+uy*16); ectx.lineTo(c.x-ux*16,c.y-uy*16); ectx.stroke(); }
        else if(b.order===2){
            ectx.beginPath(); ectx.moveTo(a.x+ux*16-uy*gap,a.y+uy*16+ux*gap); ectx.lineTo(c.x-ux*16-uy*gap,c.y-uy*16+ux*gap); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(a.x+ux*16+uy*gap,a.y+uy*16-ux*gap); ectx.lineTo(c.x-ux*16+uy*gap,c.y-uy*16-ux*gap); ectx.stroke();
        } else {
            ectx.beginPath(); ectx.moveTo(a.x+ux*16,a.y+uy*16); ectx.lineTo(c.x-ux*16,c.y-uy*16); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(a.x+ux*16-uy*(gap*1.6),a.y+uy*16+ux*(gap*1.6)); ectx.lineTo(c.x-ux*16-uy*(gap*1.6),c.y-uy*16+ux*(gap*1.6)); ectx.stroke();
            ectx.beginPath(); ectx.moveTo(a.x+ux*16+uy*(gap*1.6),a.y+uy*16-ux*(gap*1.6)); ectx.lineTo(c.x-ux*16+uy*(gap*1.6),c.y-uy*16-ux*(gap*1.6)); ectx.stroke();
        }
    }
    for(const n of nodes){
        ectx.fillStyle = '#fff'; ectx.strokeStyle = '#2c3e50'; ectx.lineWidth=1.5;
        ectx.beginPath(); ectx.arc(n.x,n.y,14,0,Math.PI*2); ectx.fill(); ectx.stroke();
        if(showLabels){ ectx.fillStyle = '#2c3e50'; ectx.font='12px Segoe UI, Arial'; ectx.textAlign='center'; ectx.textBaseline='middle'; ectx.fillText(n.label||'C', n.x, n.y); }
    }
    const dataURL = exportCanvas.toDataURL('image/png');
    const a = document.createElement('a'); a.href=dataURL; a.download='molecule.png'; a.click();
}

/* templates */
function insertTemplate(name){
    const w = canvas.width, h = canvas.height; const cx = w/2, cy = h/2;
    if(name==='benzene'){
        const r=60; const ids=[];
        for(let i=0;i<6;i++){ const ang = Math.PI*2*i/6 - Math.PI/2; const n = addNode(cx + Math.cos(ang)*r, cy + Math.sin(ang)*r, 'C'); ids.push(n.id); }
        for(let i=0;i<6;i++){ addBond(ids[i], ids[(i+1)%6], (i%2===0)?2:1); }
    } else if(name==='cyclohexane'){
        const r=70; const ids=[];
        for(let i=0;i<6;i++){ const ang = Math.PI*2*i/6 - Math.PI/2; ids.push(addNode(cx + Math.cos(ang)*r, cy + Math.sin(ang)*r, 'C').id); }
        for(let i=0;i<6;i++) addBond(ids[i], ids[(i+1)%6],1);
    } else if(name==='cyclopentane'){
        const r=60; const ids=[];
        for(let i=0;i<5;i++){ const ang = Math.PI*2*i/5 - Math.PI/2; ids.push(addNode(cx + Math.cos(ang)*r, cy + Math.sin(ang)*r, 'C').id); }
        for(let i=0;i<5;i++) addBond(ids[i], ids[(i+1)%5],1);
    } else if(name==='ethanol'){
        const a = addNode(cx-30, cy, 'C').id; const b = addNode(cx+30, cy, 'C').id; addBond(a,b,1);
        const o = addNode(cx+70, cy-10, 'O').id; addBond(b,o,1);
    }
    pushHistory(); updateCounts(); draw();
}
document.querySelectorAll('[data-template]').forEach(b=> b.addEventListener('click', ()=> insertTemplate(b.dataset.template)));

/* helper: insert image object (drawn as node with imageUrl property) */
function insertImageObject(url){
    const n = addNode(canvas.width - 120, canvas.height - 80, '');
    n.imageUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = ()=> { drawImageOverNode(n, img); };
    img.src = url;
}
function drawImageOverNode(n, img){
    ctx.drawImage(img, n.x - 60, n.y - 40, 120, 80);
}

/* initialize history with empty state */
pushHistory();

/* initial draw */
draw();

// attempt to load saved data from server on startup
loadFromServer();

// --- AI Naming Feature ---
console.log('Initializing AI Name buttons...');
const aiNameBtnSidebarInit = document.getElementById('aiNameBtn');
if (aiNameBtnSidebarInit) {
    aiNameBtnSidebarInit.onclick = showAiNameTab;
    console.log('Sidebar AI Name button initialized');
}
if (aiNameBtnCanvas) {
    aiNameBtnCanvas.onclick = showAiNameTab;
    console.log('Canvas AI Name button initialized');
} else {
    console.warn('aiNameBtnCanvas not found at initialization');
}

// Reaction button
if (aiReactionBtn) aiReactionBtn.onclick = showAiReactionTab;

const aiPuns = [
    "Name it! 🧪", "Bond, James Bond! 🔗", "Let's get a reaction! ⚗️", "Chemis-try me! 😎", "Element of surprise! 🧬", "IUPAC it up! 📖", "💡 Name Drop!", "Periodic Fun! 🧫"
];

// --- GEMINI API Key (move here so handlers see it) ---
// Paste your Gemini API key between the quotes or set window.GEMINI_API_KEY before loading the script.
const GEMINI_API_KEY = (typeof window !== 'undefined' && window.GEMINI_API_KEY) ? window.GEMINI_API_KEY : "AIzaSyDY_v5kR6XoEMT0_ZnlJTl8aX7erDc7WMQ";

// Replace showAiNameTab with a simpler version with proper error handling
// Replace showAiNameTab with a simple, reliable version
async function showAiNameTab() {
    try {
        const tab = document.getElementById('aiNameTab');
        if (!tab) {
            alert('AI Name tab element not found in HTML');
            return;
        }
        
        const btn = document.getElementById('aiNameBtnCanvas');
        if (btn) {
            btn.style.transform = 'scale(1.13) rotate(-3deg)';
            setTimeout(() => { btn.style.transform = ''; }, 180);
        }
        
        tab.textContent = 'Analyzing molecule...';
        tab.style.display = 'block';
        
        if (!nodes || nodes.length === 0) {
            tab.textContent = 'No molecules drawn. Draw something first!';
            resize();
            return;
        }
        
        const comps = getComponents();
        if (!comps || comps.length === 0) {
            tab.textContent = 'No valid molecules detected.';
            resize();
            return;
        }
        
        let result = '';
        for (let i = 0; i < comps.length; i++) {
            const comp = comps[i];
            const name = guessName(comp);
            const formula = formulaForComponent(comp);
            const { groups, props } = detectFunctionalGroups(comp);
            
            // Build nature info
            let nature = `<span style='color:#3a3d5c; font-weight:500;'>${props.classification}</span>`;
            if(props.polar) nature += ` • <span style='color:#ff1744;'>Polar</span>`;
            if(props.reactive) nature += ` • <span style='color:#ff1744;'><b>Reactive</b></span>`;
            
            // Acidity color coding
            let acidityColor = '#7f8c8d';
            if(props.acidity.includes('Acidic')) acidityColor = '#d4534a';
            else if(props.acidity.includes('Basic')) acidityColor = '#4a8cd4';
            else if(props.acidity.includes('Amphoteric')) acidityColor = '#9d4ad4';
            
            const acidityDisplay = `<div style='margin-top:6px;font-size:0.96rem;'><b style='color:${acidityColor};'>${props.acidity}</b> — pH ≈ ${props.pH}</div>`;
            
            let functionalHTML = '';
            if(groups.length) functionalHTML = `<div style='font-size:0.95rem;color:#7f8c8d;margin-top:4px;'>Functional Groups: ${groups.join(', ')}</div>`;
            
            result += `<div style="margin-bottom:12px;padding:10px;background:#fff;border-radius:8px;border-left:4px solid #5b6ee1;"><b>${name}</b> — <span style='color:#7f8c8d;'>${formula}</span><br/>${nature}${acidityDisplay}${functionalHTML}</div>`;
        }
        
        if (comps.length > 1) {
            result += `<div style='margin-top:12px;padding:10px;background:#e8f0ff;border-radius:8px;color:#3a3d5c;font-weight:600;border-left:4px solid #ff1744;'>Possible reaction: ${comps.map((c,i)=>'<b>Fragment '+(i+1)+'</b>').join(' + ')}</div>`;
        }
        
        tab.innerHTML = result;
        // Recalculate canvas size after result is displayed
        setTimeout(() => resize(), 50);
        
    } catch (error) {
        console.error('Error in showAiNameTab:', error);
        const tab = document.getElementById('aiNameTab');
        if (tab) {
            tab.innerHTML = `<span style='color:red;'><b>Error:</b> ${error.message}</span>`;
            tab.style.display = 'block';
        }
        resize();
    }
}

// Replace showAiReactionTab with async/await and robust handling
async function showAiReactionTab() {
    const btn = document.getElementById('aiReactionBtn');
    btn.style.transform = 'scale(1.13) rotate(3deg)';
    setTimeout(()=>{ btn.style.transform = ''; }, 180);

    const spinner = btn.querySelector('.ai-btn-spinner');
    spinner.style.display = 'inline-block';

    const tab = document.getElementById('aiReactionTab');
    tab.innerHTML = "Predicting reaction...";
    tab.style.display = 'inline-block';

    if (!nodes || nodes.length === 0) {
        tab.textContent = "No reactant structure detected.";
        spinner.style.display = 'none';
        return;
    }

    if (GEMINI_API_KEY && String(GEMINI_API_KEY).trim().length > 10) {
        try {
            const result = await predictReactionWithGemini(nodes, bonds);
            if (result && result !== "AI could not predict a reaction.") {
                tab.innerHTML = result + geminiBadge();
            } else {
                tab.textContent = "No reaction predicted.";
            }
        } catch (err) {
            console.warn('Gemini reaction error:', err);
            tab.textContent = "No reaction predicted.";
        } finally {
            spinner.style.display = 'none';
        }
    } else {
        tab.textContent = "Enable Gemini API for AI-powered reaction prediction.";
        spinner.style.display = 'none';
    }
}

// Hardened Gemini name call with safe response parsing and early validation
async function geminiNameMolecule(nodesLocal, bondsLocal) {
    if (!Array.isArray(nodesLocal) || nodesLocal.length === 0) return "No structure detected.";

    const atoms = nodesLocal.map(n => `${n.label||'?' }@(${n.x||0},${n.y||0})`).join(', ');
    const bondStr = bondsLocal.map(b => {
        const a = nodesLocal.find(n=>n.id===b.aId), c = nodesLocal.find(n=>n.id===b.bId);
        return `${(a && a.label)||'?'}-${(c && c.label)||'?'}(${b.order||1})`;
    }).join(', ');
    const prompt = `Given the following molecule structure, provide the IUPAC or common name (if possible) or a best guess.
Atoms: ${atoms}
Bonds: ${bondStr}
Return only the name, nothing else.`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(GEMINI_API_KEY);
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(()=>null);
        throw new Error(`Gemini API error: ${resp.status} ${resp.statusText} ${txt||''}`);
    }
    const data = await resp.json().catch(()=>null);
    if (!data) throw new Error('Empty Gemini response');

    // Try a few common paths to extract text safely
    let name = null;
    try {
        // v1beta response shapes vary, search for first string in candidates/content/parts
        if (Array.isArray(data.candidates) && data.candidates.length) {
            for (const c of data.candidates) {
                const content = c.content || c.output || c;
                // content could be array or object
                const parts = Array.isArray(content) ? content.flatMap(x=>x.parts||[]) : (content.parts || []);
                if (Array.isArray(parts) && parts.length) {
                    for (const p of parts) {
                        if (p && typeof p.text === 'string' && p.text.trim()) {
                            name = p.text.trim();
                            break;
                        }
                    }
                }
                if (name) break;
            }
        }
        // fallback: some responses put text at data.output[0].content[0].text
        if (!name && data.output) {
            const out = Array.isArray(data.output) ? data.output : [data.output];
            for (const o of out) {
                const txt = o?.content?.[0]?.text || o?.content?.parts?.[0]?.text;
                if (txt) { name = String(txt).trim(); break; }
            }
        }
    } catch (err) {
        console.warn('Error parsing Gemini response', err);
    }

    if (!name) name = "AI could not determine a name.";
    return name;
}

// Hardened reaction prediction call analogous to the above
async function predictReactionWithGemini(nodesLocal, bondsLocal) {
    if (!Array.isArray(nodesLocal) || nodesLocal.length === 0) return "No reactant structure detected.";

    const atoms = nodesLocal.map(n => `${n.label||'?' }@(${n.x||0},${n.y||0})`).join(', ');
    const bondStr = bondsLocal.map(b => {
        const a = nodesLocal.find(n=>n.id===b.aId), c = nodesLocal.find(n=>n.id===b.bId);
        return `${(a && a.label)||'?'}-${(c && c.label)||'?'}(${b.order||1})`;
    }).join(', ');
    const prompt = `Given the following molecule structure, predict the most likely chemical reaction or main product if this molecule is used as a reactant. If no reaction is likely, say so.
Atoms: ${atoms}
Bonds: ${bondStr}
Return only the main reaction or product, nothing else.`;

    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + encodeURIComponent(GEMINI_API_KEY);
    const body = { contents: [{ parts: [{ text: prompt }] }] };

    const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(()=>null);
        throw new Error(`Gemini API error: ${resp.status} ${resp.statusText} ${txt||''}`);
    }
    const data = await resp.json().catch(()=>null);
    if (!data) throw new Error('Empty Gemini response');

    let result = null;
    try {
        if (Array.isArray(data.candidates) && data.candidates.length) {
            for (const c of data.candidates) {
                const content = c.content || c.output || c;
                const parts = Array.isArray(content) ? content.flatMap(x=>x.parts||[]) : (content.parts || []);
                if (Array.isArray(parts) && parts.length) {
                    for (const p of parts) {
                        if (p && typeof p.text === 'string' && p.text.trim()) {
                            result = p.text.trim();
                            break;
                        }
                    }
                }
                if (result) break;
            }
        }
        if (!result && data.output) {
            const out = Array.isArray(data.output) ? data.output : [data.output];
            for (const o of out) {
                const txt = o?.content?.[0]?.text || o?.content?.parts?.[0]?.text;
                if (txt) { result = String(txt).trim(); break; }
            }
        }
    } catch (err) {
        console.warn('Error parsing Gemini response', err);
    }

    if (!result) result = "AI could not predict a reaction.";
    return result;
}

// --- Named Reaction Insert Feature ---
const namedReactions = {
    /* ...existing namedReactions object copied from original ... */
    aldol: {
        name: "Aldol Condensation",
        info: "Joins two aldehydes/ketones to form a β-hydroxy carbonyl (aldol).",
        insert: function() {
            nodes.length = 0; bonds.length = 0;
            const a = addNode(120, 160, "C").id;
            const b = addNode(160, 160, "C").id;
            const o1 = addNode(200, 160, "O").id;
            addBond(a, b, 1); addBond(b, o1, 2);
            const a2 = addNode(120, 220, "C").id;
            const b2 = addNode(160, 220, "C").id;
            const o2 = addNode(200, 220, "O").id;
            addBond(a2, b2, 1); addBond(b2, o2, 2);
        }
    },
    /* ...rest of reactions (dielsalder, fischer, ...) copied as in original ... */
    dielsalder: {
        name: "Diels-Alder Reaction",
        info: "Cycloaddition of a diene and a dienophile to form a cyclohexene ring.",
        insert: function() {
            nodes.length = 0; bonds.length = 0;
            const c1 = addNode(120, 180, "C").id;
            const c2 = addNode(160, 180, "C").id;
            const c3 = addNode(200, 180, "C").id;
            const c4 = addNode(240, 180, "C").id;
            addBond(c1, c2, 2); addBond(c2, c3, 1); addBond(c3, c4, 2);
            const c5 = addNode(280, 180, "C").id;
            const c6 = addNode(320, 180, "C").id;
            addBond(c4, c5, 1); addBond(c5, c6, 2);
        }
    },
    fischer: { /* ... */ },
    grignard: { /* ... */ },
    wittig: { /* ... */ },
    friedelcrafts: { /* ... */ },
    cannizzaro: { /* ... */ },
    claisen: { /* ... */ },
    hellvolhard: { /* ... */ }
};

document.getElementById('namedReactionSelect').addEventListener('change', function() {
    const val = this.value;
    if (!val || !namedReactions[val]) {
        namedReactionInfo.style.display = 'none';
        return;
    }
    namedReactions[val].insert();
    pushHistory();
    updateCounts();
    requestDraw();
    namedReactionInfo.innerHTML = `<b>${namedReactions[val].name}</b><br>${namedReactions[val].info}`;
    namedReactionInfo.style.display = 'inline-block';
    setTimeout(() => { this.value = ""; }, 500);
});

// ==================== CHEMISTRY REACTIONS FEATURE ====================
let allReactions = [];
let selectedReaction = null;

// Load reactions from server
async function loadReactions() {
    try {
        const response = await fetch('/api/reactions');
        if (response.ok) {
            const data = await response.json();
            allReactions = data.reactions || [];
            console.log(`Loaded ${allReactions.length} reactions`);
        }
    } catch (err) {
        console.warn('Error loading reactions:', err);
    }
}

// Check which reactions are applicable to current structure
async function checkApplicableReactions() {
    if (nodes.length === 0) {
        document.getElementById('applicableReactionsList').innerHTML = 
            '<div style="padding:12px;color:#888;text-align:center;font-size:0.9rem;">Draw a molecule to see applicable reactions</div>';
        return;
    }

    try {
        const response = await fetch('/api/reactions/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nodes, bonds })
        });

        if (response.ok) {
            const data = await response.json();
            displayApplicableReactions(data.applicableReactions);
        }
    } catch (err) {
        console.warn('Error checking reactions:', err);
    }
}

// Display applicable reactions in sidebar
function displayApplicableReactions(reactions) {
    const container = document.getElementById('applicableReactionsList');
    
    if (reactions.length === 0) {
        container.innerHTML = '<div style="padding:12px;color:#888;text-align:center;font-size:0.9rem;">No reactions match this structure</div>';
        return;
    }

    let html = '';
    for (const reaction of reactions) {
        const diffColor = reaction.difficulty === 'Easy' ? '#4caf50' : 
                         reaction.difficulty === 'Medium' ? '#ff9800' : '#f44336';
        html += `
            <div style="padding:12px;border-bottom:1px solid #e0e7f1;cursor:pointer;transition:background 0.2s;" 
                 onmouseover="this.style.background='#f0f4ff'" 
                 onmouseout="this.style.background=''" 
                 onclick="selectAndShowReaction('${reaction.id}')">
                <div style="font-weight:600;color:#1a3a5c;font-size:0.95rem;">${reaction.name}</div>
                <div style="font-size:0.8rem;color:#888;margin-top:4px;">
                    <span style="display:inline-block;padding:2px 6px;background:${diffColor};color:#fff;border-radius:3px;font-size:0.75rem;">${reaction.difficulty}</span>
                    <span style="margin-left:8px;color:#666;">${reaction.category}</span>
                </div>
            </div>
        `;
    }
    container.innerHTML = html;
}

// Select reaction and show details modal
async function selectAndShowReaction(reactionId) {
    try {
        const response = await fetch(`/api/reactions/${reactionId}`);
        if (response.ok) {
            selectedReaction = await response.json();
            showReactionModal();
        }
    } catch (err) {
        console.error('Error fetching reaction details:', err);
    }
}

// Display reaction details in modal
function showReactionModal() {
    if (!selectedReaction) return;

    document.getElementById('reactionTitle').textContent = selectedReaction.name;
    document.getElementById('reactionDescription').textContent = selectedReaction.description;
    document.getElementById('reactionEquation').textContent = selectedReaction.equation;

    // Show conditions
    let conditionsHtml = '';
    const conditions = selectedReaction.conditions || {};
    for (const [key, value] of Object.entries(conditions)) {
        conditionsHtml += `<div style="margin:4px 0;"><strong>${key}:</strong> ${value}</div>`;
    }
    document.getElementById('reactionConditions').innerHTML = conditionsHtml || '<div>Standard conditions</div>';

    // Show mechanism steps
    let mechanismHtml = '';
    const mechanism = selectedReaction.mechanism || [];
    for (const step of mechanism) {
        mechanismHtml += `<div style="margin:8px 0;"><strong>Step ${step.step}:</strong> ${step.description}</div>`;
    }
    document.getElementById('reactionMechanism').innerHTML = mechanismHtml || '<div>No mechanism data</div>';

    // Show modal
    document.getElementById('reactionModal').style.display = 'flex';
}

// Setup reactions event listeners
function setupReactionsListeners() {
    const applyReactionBtn = document.getElementById('applyReactionBtn');
    if (applyReactionBtn) {
        applyReactionBtn.addEventListener('click', async function() {
            if (!selectedReaction) return;

            try {
                const response = await fetch('/api/reactions/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nodes: nodes,
                        bonds: bonds,
                        reactionId: selectedReaction.id
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    alert(`✓ Reaction Applied!\n\n${selectedReaction.name}\n\nNote: Product visualization coming soon.\nCheck the console for product structure.`);
                    console.log('Reaction products:', data.products);

                    // Save reaction to user profile
                    const currentUser = JSON.parse(localStorage.getItem('chemhelp_currentUser') || '{}');
                    if (currentUser.email) {
                        await fetch(`/api/user/${encodeURIComponent(currentUser.email)}/save-reaction`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                reactant: { nodes, bonds },
                                reactionId: selectedReaction.id,
                                products: data.products
                            })
                        });
                    }

                    document.getElementById('reactionModal').style.display = 'none';
                    showFeedback(`✓ ${selectedReaction.name} applied!`, 'success');
                }
            } catch (err) {
                console.error('Error applying reaction:', err);
                showFeedback('✗ Error applying reaction', 'error');
            }
        });
    }

    // Reaction category filter
    const reactionCategory = document.getElementById('reactionCategory');
    if (reactionCategory) {
        reactionCategory.addEventListener('change', function() {
            if (this.value) {
                const filtered = allReactions.filter(r => r.category === this.value);
                displayApplicableReactions(filtered);
            } else {
                checkApplicableReactions();
            }
        });
    }

    // Close reaction modal on background click
    const reactionModal = document.getElementById('reactionModal');
    if (reactionModal) {
        reactionModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    }
}

// ==================== PROFILE MANAGEMENT ====================
let currentUser = null;

// Load current user from localStorage
function loadCurrentUser() {
    const userStr = localStorage.getItem('chemhelp_currentUser');
    if (userStr) {
        try {
            currentUser = JSON.parse(userStr);
            updateProfileDisplay();
        } catch (err) {
            console.error('Error loading user:', err);
        }
    }
}

// Update profile display
function updateProfileDisplay() {
    if (!currentUser) return;
    
    // Update username in toolbar
    const userNameDisplay = document.getElementById('userNameDisplay');
    if (userNameDisplay) {
        userNameDisplay.textContent = currentUser.fullName || currentUser.email || 'User';
    }
    
    // Update profile modal
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileStructures = document.getElementById('profileStructures');
    const loggedInAs = document.getElementById('loggedInAs');
    
    if (profileName) profileName.textContent = currentUser.fullName || 'N/A';
    if (profileEmail) profileEmail.textContent = currentUser.email || 'N/A';
    if (profileStructures) profileStructures.textContent = (currentUser.structures && currentUser.structures.length) || 0;
    if (loggedInAs) loggedInAs.textContent = currentUser.email || 'Not logged in';
    
    // Update profile photo
    const profilePhoto = document.getElementById('profilePhoto');
    if (profilePhoto && currentUser.photo) {
        profilePhoto.style.fontSize = '0';
        profilePhoto.style.backgroundImage = `url('${currentUser.photo}')`;
        profilePhoto.style.backgroundSize = 'cover';
        profilePhoto.style.backgroundPosition = 'center';
    }
}

// Fetch user profile from server
async function fetchUserProfile() {
    if (!currentUser || !currentUser.email) {
        console.log('No current user to fetch profile for');
        return;
    }
    
    // For demo users, skip server fetch
    if (currentUser.isDemo) {
        console.log('Demo user - skipping server fetch');
        updateProfileDisplay();
        return;
    }
    
    try {
        const response = await fetch(`/api/user/${encodeURIComponent(currentUser.email)}`);
        if (response.ok) {
            const userProfile = await response.json();
            currentUser = { ...currentUser, ...userProfile };
            updateProfileDisplay();
        } else {
            console.warn('Server returned:', response.status);
            updateProfileDisplay();
        }
    } catch (err) {
        console.warn('Error fetching user profile:', err);
        updateProfileDisplay();
    }
}

// Save current structure to user profile
async function saveStructureToProfile(structureName) {
    if (!currentUser || !currentUser.email) {
        alert('Please log in to save structures.');
        return;
    }
    
    try {
        const response = await fetch(`/api/user/${encodeURIComponent(currentUser.email)}/save-structure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: structureName || `Structure saved at ${new Date().toLocaleString()}`,
                nodes: nodes,
                bonds: bonds
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser.structures = currentUser.structures || [];
            currentUser.structures.push(data.structure);
            updateProfileDisplay();
            localStorage.setItem('chemhelp_currentUser', JSON.stringify(currentUser));
            showFeedback('✓ Structure saved to profile!', 'success');
        } else {
            showFeedback('✗ Failed to save structure', 'error');
        }
    } catch (err) {
        console.error('Error saving structure:', err);
        showFeedback('✗ Error saving structure', 'error');
    }
}

// Profile button click handler
document.addEventListener('DOMContentLoaded', function() {
    console.log('=== DOMContentLoaded started ===');
    
    // Initialize dark mode
    initDarkMode();
    
    // Dark mode toggle
    const darkModeBtn = document.getElementById('darkModeToggle');
    if (darkModeBtn) {
        darkModeBtn.addEventListener('click', toggleDarkMode);
    }
    
    const userProfileBtn = document.getElementById('userProfileBtn');
    console.log('Profile button found:', !!userProfileBtn);
    
    if (userProfileBtn) {
        userProfileBtn.addEventListener('click', function(e) {
            console.log('Profile button clicked');
            e.preventDefault();
            const profileModal = document.getElementById('profileModal');
            console.log('Profile modal found:', !!profileModal);
            if (profileModal) {
                profileModal.style.display = 'flex';
                console.log('Profile modal style set to flex');
                console.log('Current user:', currentUser);
                updateProfileDisplay();
                fetchUserProfile();
            }
        });
    }

    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    console.log('Logout button found:', !!logoutBtn);
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            localStorage.removeItem('chemhelp_currentUser');
            alert('You have been logged out.');
            window.location.href = 'login.html';
        });
    }

    // Close profile modal when clicking outside
    window.addEventListener('click', function(evt) {
        const profileModal = document.getElementById('profileModal');
        if (profileModal && evt.target === profileModal) {
            profileModal.style.display = 'none';
        }
    });

    // Update save menu to include profile save
    const mSave = document.getElementById('mSave');
    if (mSave) {
        mSave.addEventListener('click', function() {
            const choice = prompt('Save to:\n1. Local download (Press Enter for this)\n2. Profile\n\nEnter your choice (1 or 2) or press Cancel:');
            if (choice === null) return;
            
            if (choice === '2') {
                const structureName = prompt('Enter structure name:') || `Structure saved at ${new Date().toLocaleString()}`;
                saveStructureToProfile(structureName);
            } else {
                saveJSON();
            }
        });
    }

    // Initialize profile on page load
    console.log('Loading current user...');
    loadCurrentUser();
    console.log('Current user loaded:', currentUser);
    console.log('Fetching user profile...');
    fetchUserProfile();

    // Setup reactions feature
    console.log('Setting up reactions...');
    setupReactionsListeners();
    loadReactions();
    console.log('=== DOMContentLoaded completed ===');
});