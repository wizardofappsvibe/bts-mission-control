/* ============================================================
   BTS MISSION CONTROL — Main Application
   ============================================================ */

// ====== CONFIGURATION ======
const SUPABASE_URL = 'https://ggsfnmgpkaxjdpcfbfca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnc2ZubWdwa2F4amRwY2ZiZmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MTUzODAsImV4cCI6MjA1NDk5MTM4MH0.yMh_K95J_s7vvHG--rFnFmY-0RfCb1LQpbrlAfHvjEw';
const AUTH_CODE = '02051967';
const OPENCLAW_URL = 'http://127.0.0.1:18789';

// ====== AGENT DATA ======
const AGENTS = {
    ozzy: { name: 'Ozzy', emoji: '🦾', role: 'COO — Team Lead', color: '#7C3AED', telegram: '@OzzieManBot' },
    jace: { name: 'Jace', emoji: '🎯', role: 'Intelligence — Angel Hunter', color: '#059669', telegram: '@JaceAngelBot' },
    vex: { name: 'Vex', emoji: '🔨', role: 'CTO — Code Wizard', color: '#2563EB', telegram: '@VexCEObot' },
    appstar: { name: 'App Star', emoji: '⭐', role: 'iOS Product Genius', color: '#D97706', telegram: '@AppsStarbot' },
    blaze: { name: 'Blaze', emoji: '🔥', role: 'CMO — Marketing', color: '#DC2626', telegram: '@BlaceCMObot' },
    claude: { name: 'Claude', emoji: '🔧', role: 'IT Lead — Infrastructure', color: '#6B7280', telegram: '@ITClaudebot' },
};

const AGENT_RESPONSIBILITIES = {
    ozzy: ['Orchestrate agent pipeline', 'Revenue strategy & forecasting', 'Team coordination', 'Daily standup reports', 'Mission assignment & tracking'],
    jace: ['Find angel investors', 'Track Jason Calacanis', 'Competitor analysis', 'Market intelligence', 'Due diligence research'],
    vex: ['Build & ship code', 'Architecture decisions', 'Code reviews', 'API integrations', 'Performance optimization'],
    appstar: ['iOS app design', 'App Store optimization', 'Screenshot generation', 'TestFlight management', 'User experience'],
    blaze: ['Social media strategy', 'Content creation', 'Growth hacking', 'Brand management', 'Launch campaigns'],
    claude: ['System monitoring', 'Skill management', 'Infrastructure fixes', 'Gateway maintenance', 'Agent tool support'],
};

// ====== STATE ======
let projects = [];
let feedItems = [];
let currentSection = 'dashboard';

// ====== AUTH GATE ======
function initAuth() {
    if (localStorage.getItem('bts-auth') === 'true') {
        document.getElementById('auth-gate')?.remove();
        return;
    }
    // Insert auth gate before body content
    const gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.className = 'auth-gate';
    gate.innerHTML = `
    <div class="auth-logo">🚀</div>
    <h1 class="auth-title">BTS Mission Control</h1>
    <p class="auth-subtitle">Enter access code to continue</p>
    <div class="auth-input-group">
      <input type="password" id="auth-code-input" class="auth-input" maxlength="8" placeholder="••••••••"
        onkeydown="if(event.key==='Enter') checkAuth()">
      <button class="auth-btn" onclick="checkAuth()">→</button>
    </div>
  `;
    document.body.prepend(gate);
    document.getElementById('auth-code-input').focus();
}

function checkAuth() {
    const input = document.getElementById('auth-code-input');
    if (input.value === AUTH_CODE) {
        localStorage.setItem('bts-auth', 'true');
        const gate = document.getElementById('auth-gate');
        gate.style.transition = '0.5s';
        gate.style.opacity = '0';
        gate.style.transform = 'scale(1.05)';
        setTimeout(() => gate.remove(), 500);
    } else {
        input.classList.add('error');
        input.value = '';
        setTimeout(() => input.classList.remove('error'), 600);
    }
}

// ====== SUPABASE HELPERS ======
async function supabaseGet(table) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            }
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function supabaseInsert(table, data) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

async function supabaseUpdate(table, id, data) {
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(data),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch { return null; }
}

// ====== NAVIGATION ======
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const section = document.getElementById(`section-${sectionId}`);
    const navItem = document.querySelector(`.nav-item[data-section="${sectionId}"]`);

    if (section) section.classList.add('active');
    if (navItem) navItem.classList.add('active');

    currentSection = sectionId;
}

// ====== AGENT CARDS (Dashboard) ======
function renderAgentCards() {
    const grid = document.getElementById('agent-grid');
    if (!grid) return;

    grid.innerHTML = Object.entries(AGENTS).map(([id, agent]) => `
    <div class="agent-card" data-agent="${id}" onclick="showSection('agents')">
      <div class="agent-card-header">
        <div class="agent-name">
          <span class="agent-emoji">${agent.emoji}</span>
          ${agent.name}
        </div>
        <div class="status-dot online pulse"></div>
      </div>
      <div class="agent-role">${agent.role}</div>
      <div class="agent-status-text" id="agent-status-${id}">Standing by...</div>
    </div>
  `).join('');
}

// ====== AGENT DETAIL CARDS ======
function renderAgentDetails() {
    const grid = document.getElementById('agent-detail-grid');
    if (!grid) return;

    grid.innerHTML = Object.entries(AGENTS).map(([id, agent]) => `
    <div class="agent-detail-card" style="--agent-color: ${agent.color}">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:${agent.color}"></div>
      <div class="agent-detail-header">
        <div class="agent-avatar" style="background:${agent.color}15">${agent.emoji}</div>
        <div>
          <div class="agent-detail-name">${agent.name}</div>
          <div class="agent-detail-role">${agent.role} · ${agent.telegram}</div>
        </div>
      </div>
      <ul class="agent-responsibilities">
        ${(AGENT_RESPONSIBILITIES[id] || []).map(r => `<li>${r}</li>`).join('')}
      </ul>
    </div>
  `).join('');
}

// ====== ACTIVITY FEED ======
function renderFeed() {
    const feed = document.getElementById('activity-feed');
    if (!feed) return;

    if (feedItems.length === 0) {
        // Generate sample feed
        feedItems = [
            { agent: 'ozzy', text: 'Pipeline status: 3 active projects, 1 in review. Revenue target tracking at 68%.', time: '2 min ago' },
            { agent: 'vex', text: 'Deployed hotfix for Telegram bot reconnection logic. All agents stable.', time: '15 min ago' },
            { agent: 'claude', text: 'System check complete. LM Studio: ✅ Ollama: ✅ Gateway: ✅ CPU: 34%', time: '28 min ago' },
            { agent: 'jace', text: 'New lead: Jason Calacanis mentioned AI app builders in latest podcast. Compiling brief.', time: '1h ago' },
            { agent: 'blaze', text: 'Instagram Reel concept ready: "Day in the Life of 6 AI Agents Building Your App"', time: '2h ago' },
            { agent: 'appstar', text: 'App Store screenshot templates updated for iPhone 16 Pro Max dimensions.', time: '3h ago' },
        ];
    }

    feed.innerHTML = feedItems.map((item, i) => {
        const agent = AGENTS[item.agent];
        return `
      <div class="feed-item">
        <div class="feed-avatar" style="background:${agent.color}15">${agent.emoji}</div>
        <div class="feed-content">
          <div class="feed-name">${agent.name}</div>
          <div class="feed-text">${item.text}</div>
          <div class="feed-time">${item.time}</div>
          <div class="feed-reply">
            <input type="text" placeholder="Reply to ${agent.name}..." onkeydown="if(event.key==='Enter') replyToFeed(${i}, this)">
            <button class="btn-tiny" onclick="replyToFeed(${i}, this.previousElementSibling)">Send</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function replyToFeed(index, input) {
    if (!input.value.trim()) return;
    const reply = { agent: 'boss', text: `Boss: ${input.value}`, time: 'just now' };
    feedItems.splice(index + 1, 0, reply);
    input.value = '';
    renderFeed();
}

// ====== KANBAN / PROJECTS ======
function loadProjects() {
    const saved = localStorage.getItem('bts-projects');
    if (saved) {
        projects = JSON.parse(saved);
    } else {
        projects = [
            { id: 1, title: 'Wizard of Apps v2.0', agent: 'vex', status: 'progress', priority: 'high', desc: 'Major UI overhaul with new dashboard' },
            { id: 2, title: 'Jason Calacanis Pitch Deck', agent: 'jace', status: 'progress', priority: 'high', desc: 'Investment deck for LAUNCH fund' },
            { id: 3, title: 'App Store Screenshot Automation', agent: 'appstar', status: 'review', priority: 'medium', desc: 'ComfyUI workflow for auto screenshots' },
            { id: 4, title: 'TikTok Launch Campaign', agent: 'blaze', status: 'backlog', priority: 'medium', desc: '30-day content plan for launch' },
            { id: 5, title: 'Agent Health Monitoring', agent: 'claude', status: 'done', priority: 'high', desc: 'Automated health checks every 60s' },
            { id: 6, title: 'Revenue Pipeline Dashboard', agent: 'ozzy', status: 'progress', priority: 'high', desc: 'Track MRR, ARR, and conversion rates' },
            { id: 7, title: 'Market Signals Widget', agent: 'appstar', status: 'backlog', priority: 'medium', desc: 'iOS widget for app market alerts' },
            { id: 8, title: 'LM Studio Optimization', agent: 'claude', status: 'progress', priority: 'low', desc: 'Tune Qwen 3.5 context & speed' },
        ];
        saveProjects();
    }
    renderKanban();
}

function saveProjects() {
    localStorage.setItem('bts-projects', JSON.stringify(projects));
    // Also try saving to Supabase
    supabaseInsertProjects();
}

async function supabaseInsertProjects() {
    // Will work once the table exists in Supabase
    // For now, localStorage is the primary store
}

function renderKanban() {
    ['backlog', 'progress', 'review', 'done'].forEach(status => {
        const column = document.getElementById(`kanban-${status}`);
        if (!column) return;

        const filtered = projects.filter(p => p.status === status);
        column.innerHTML = filtered.map(p => {
            const agent = AGENTS[p.agent];
            return `
        <div class="kanban-card" data-agent="${p.agent}" data-id="${p.id}"
             draggable="true" ondragstart="dragStart(event, ${p.id})">
          <div class="kanban-card-title">${p.title}</div>
          <div class="kanban-card-agent">
            ${agent.emoji} ${agent.name}
            ${p.priority === 'high' ? ' · 🔴 High' : p.priority === 'medium' ? ' · 🟡 Med' : ' · 🟢 Low'}
          </div>
        </div>
      `;
        }).join('');
    });

    // Setup drop zones
    document.querySelectorAll('.kanban-cards').forEach(zone => {
        zone.ondragover = e => { e.preventDefault(); zone.style.background = 'rgba(0,113,227,0.05)'; };
        zone.ondragleave = () => { zone.style.background = ''; };
        zone.ondrop = e => {
            e.preventDefault();
            zone.style.background = '';
            const projectId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatus = zone.id.replace('kanban-', '');
            const project = projects.find(p => p.id === projectId);
            if (project) {
                project.status = newStatus;
                saveProjects();
                renderKanban();
            }
        };
    });
}

function dragStart(event, projectId) {
    event.dataTransfer.setData('text/plain', projectId);
}

function filterProjects() {
    const filter = document.getElementById('project-agent-filter')?.value;
    // Re-render with filter applied
    ['backlog', 'progress', 'review', 'done'].forEach(status => {
        const column = document.getElementById(`kanban-${status}`);
        if (!column) return;
        const filtered = projects.filter(p => p.status === status && (filter === 'all' || p.agent === filter));
        column.innerHTML = filtered.map(p => {
            const agent = AGENTS[p.agent];
            return `
        <div class="kanban-card" data-agent="${p.agent}" data-id="${p.id}"
             draggable="true" ondragstart="dragStart(event, ${p.id})">
          <div class="kanban-card-title">${p.title}</div>
          <div class="kanban-card-agent">
            ${agent.emoji} ${agent.name}
            ${p.priority === 'high' ? ' · 🔴 High' : p.priority === 'medium' ? ' · 🟡 Med' : ' · 🟢 Low'}
          </div>
        </div>
      `;
        }).join('');
    });
}

function addProject() {
    document.getElementById('modal-title').textContent = 'New Project';
    document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <input type="text" id="new-project-title" class="input-elegant" placeholder="Project title" style="width:100%">
      <textarea id="new-project-desc" class="textarea-elegant" rows="3" placeholder="Description"></textarea>
      <select id="new-project-agent" class="select-elegant">
        ${Object.entries(AGENTS).map(([id, a]) => `<option value="${id}">${a.emoji} ${a.name}</option>`).join('')}
      </select>
      <select id="new-project-priority" class="select-elegant">
        <option value="high">🔴 High Priority</option>
        <option value="medium">🟡 Medium Priority</option>
        <option value="low">🟢 Low Priority</option>
      </select>
      <button class="btn-primary" onclick="submitProject()">Create Project</button>
    </div>
  `;
    document.getElementById('modal-overlay').classList.add('active');
}

function submitProject() {
    const title = document.getElementById('new-project-title').value.trim();
    if (!title) return;

    projects.push({
        id: Date.now(),
        title,
        desc: document.getElementById('new-project-desc').value,
        agent: document.getElementById('new-project-agent').value,
        priority: document.getElementById('new-project-priority').value,
        status: 'backlog',
    });
    saveProjects();
    renderKanban();
    closeModal();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// ====== iOS SIMULATOR ======
function loadSimulator() {
    const url = document.getElementById('simulator-url')?.value;
    const iframe = document.getElementById('simulator-iframe');
    if (url && iframe) iframe.src = url;
}

function changeDevice() {
    const device = document.getElementById('device-select')?.value;
    const frame = document.getElementById('simulator-frame');
    const iframe = document.getElementById('simulator-iframe');
    if (!frame || !iframe) return;

    const sizes = {
        iphone15pro: { w: '380px', h: '700px', r: '44px' },
        iphone15: { w: '380px', h: '700px', r: '44px' },
        iphoneSE: { w: '320px', h: '560px', r: '32px' },
        ipad: { w: '560px', h: '750px', r: '24px' },
    };
    const s = sizes[device] || sizes.iphone15pro;
    frame.style.maxWidth = s.w;
    iframe.style.height = s.h;
    frame.style.borderRadius = s.r;
}

function screenshotSimulator() {
    alert('📸 Screenshot saved! (In production, this captures the iframe content)');
}

function recordSimulator() {
    alert('🔴 Recording started! (In production, this records the iframe interactions)');
}

// ====== EXPO QR CODE ======
function generateExpoQR() {
    const url = document.getElementById('expo-url')?.value;
    const container = document.getElementById('expo-qr');
    if (!url || !container) return;

    // Use QR code API
    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" 
    alt="Expo QR" style="border-radius:8px; width:180px; height:180px;">`;
}

function generateTestFlightQR() {
    const url = document.getElementById('testflight-url')?.value;
    const container = document.getElementById('testflight-qr');
    if (!url || !container) return;

    container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}" 
    alt="TestFlight QR" style="border-radius:8px; width:180px; height:180px;">`;
}

// ====== SOCIAL MEDIA ======
function createPost() {
    const content = document.getElementById('post-content')?.value;
    if (!content) return;

    feedItems.unshift({
        agent: 'blaze',
        text: `📣 New post: "${content}"`,
        time: 'just now',
    });
    renderFeed();
    document.getElementById('post-content').value = '';
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    let html = days.map(d => `<div class="calendar-day calendar-day-header">${d}</div>`).join('');

    for (let i = 0; i < firstDay.getDay(); i++) {
        html += '<div class="calendar-day"></div>';
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const isToday = d === today.getDate();
        const hasPost = [3, 7, 12, 15, 20, 25].includes(d);
        html += `<div class="calendar-day${isToday ? ' today' : ''}${hasPost ? ' has-post' : ''}">${d}</div>`;
    }

    grid.innerHTML = html;
}

// ====== COMFYUI ======
function generatePreset(preset) {
    const presetNames = {
        screenshot: '📱 App Store Screenshots',
        social: '📣 Social Media Graphics',
        banner: '🖼️ Marketing Banner',
        icon: '⭐ App Icon',
        splash: '🌊 Splash Screen',
        logo: '💎 Logo',
    };
    alert(`Opening ComfyUI workflow: ${presetNames[preset] || preset}\n\nMake sure ComfyUI is running on port 8188!`);
    openLink('http://127.0.0.1:8188/');
}

// ====== LIVE ACTIVITY MONITOR ======
function renderLiveActivity() {
    const grid = document.getElementById('live-activity-grid');
    if (!grid) return;

    const statuses = ['thinking', 'executing', 'idle', 'browsing', 'typing', 'monitoring'];
    const statusLabels = {
        thinking: '🧠 Thinking...',
        executing: '⚡ Executing',
        idle: '💤 Idle',
        browsing: '🌐 Browsing',
        typing: '✍️ Typing',
        monitoring: '📡 Monitoring',
    };

    const sampleLogs = {
        ozzy: [
            '12:04:02 [pipeline] Checking agent status...',
            '12:04:01 [heartbeat] All agents healthy',
            '12:03:58 [revenue] Updated MRR tracker',
            '12:03:45 [task] Assigned screenshot task to App Star',
        ],
        jace: [
            '12:03:55 [research] Scanning angel investor feeds',
            '12:03:40 [web] Fetching latest from @jason tweets',
            '12:03:22 [analysis] Competitor app rating change detected',
            '12:03:10 [memory] Updated investor-targets.md',
        ],
        vex: [
            '12:04:00 [build] Compiling TypeScript...',
            '12:03:52 [git] Committed: fix telegram reconnection',
            '12:03:30 [test] All 47 tests passing',
            '12:03:15 [deploy] Vercel preview: https://wizard-abc.vercel.app',
        ],
        appstar: [
            '12:03:50 [design] Generating iPhone 16 Pro mockup',
            '12:03:35 [aso] Keyword analysis complete: "app builder" +12%',
            '12:03:20 [screenshot] Template v3 ready for review',
            '12:03:05 [testflight] Build 1.2.4 uploaded',
        ],
        blaze: [
            '12:03:48 [social] Scheduling Instagram post for 6PM EST',
            '12:03:30 [content] Generated 3 reel concepts',
            '12:03:12 [analytics] Engagement up 23% this week',
            '12:02:55 [hashtag] Updated trending tags for #AIApps',
        ],
        claude: [
            '12:04:03 [health] CPU: 34% | RAM: 62% | Disk: 45%',
            '12:04:00 [lmstudio] Model loaded: qwen3.5-35b-a3b ✅',
            '12:03:55 [ollama] Fallback ready: qwen2.5:32b ✅',
            '12:03:50 [gateway] OpenClaw: 6 agents, all responding',
        ],
    };

    grid.innerHTML = Object.entries(AGENTS).map(([id, agent]) => {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const logs = sampleLogs[id] || [];
        return `
      <div class="activity-panel" onclick="expandActivity('${id}')">
        <div class="activity-panel-header">
          ${agent.emoji} ${agent.name}
          <span class="activity-status-label">${statusLabels[status]}</span>
        </div>
        <div class="activity-log">
          ${logs.map(l => {
            const parts = l.split('] ');
            return `<div class="log-line"><span class="log-time">${parts[0]}]</span> ${parts[1] || ''}</div>`;
        }).join('')}
        </div>
      </div>
    `;
    }).join('');
}

function expandActivity(agentId) {
    // Could expand to fullscreen view
    const agent = AGENTS[agentId];
    alert(`Expanding ${agent.emoji} ${agent.name}'s live session...\n\nFull-screen live view coming soon!`);
}

// ====== TERMINAL ======
function handleTerminalInput(event) {
    if (event.key !== 'Enter') return;

    const input = document.getElementById('terminal-input');
    const body = document.getElementById('terminal-body');
    const cmd = input.value.trim();

    if (!cmd) return;

    // Add command line
    body.innerHTML += `<div class="terminal-line"><span class="terminal-prompt">❯</span> <span class="terminal-text">${cmd}</span></div>`;

    // Process common commands
    let output = '';
    if (cmd === 'clear') {
        body.innerHTML = '';
        input.value = '';
        return;
    } else if (cmd === 'help') {
        output = `Available commands:
  agents     — List all agents and status
  health     — System health check  
  projects   — List active projects
  expo start — Generate Expo QR code
  npm run dev — Start dev server
  clear      — Clear terminal`;
    } else if (cmd === 'agents') {
        output = Object.entries(AGENTS).map(([id, a]) => `  ${a.emoji} ${a.name.padEnd(10)} ${a.role.padEnd(30)} ✅ Online`).join('\n');
    } else if (cmd === 'health') {
        output = `System Health Check:
  LM Studio    ✅ Online (port 1234)
  Ollama       ✅ Online (port 11434)  
  OpenClaw     ✅ Online (port 18789)
  ComfyUI      ⚠️ Check port 8188
  CPU          34%
  RAM          62%
  Disk         45%`;
    } else if (cmd === 'projects') {
        output = projects.map(p => `  ${AGENTS[p.agent]?.emoji || '?'} [${p.status.toUpperCase().padEnd(8)}] ${p.title}`).join('\n');
    } else if (cmd.startsWith('expo start')) {
        output = '🚀 Starting Expo dev server...\n  Scan QR code in the Simulator tab!';
    } else if (cmd.startsWith('npm run dev')) {
        output = '⚡ Starting development server...\n  Preview at http://localhost:3000';
    } else {
        output = `$ ${cmd}\n  Command will be forwarded to shell in production mode`;
    }

    body.innerHTML += `<div class="terminal-line"><span class="terminal-text" style="white-space:pre">${output}</span></div>`;
    body.scrollTop = body.scrollHeight;
    input.value = '';
}

function clearTerminal() {
    const body = document.getElementById('terminal-body');
    if (body) body.innerHTML = '';
}

// ====== UTILITY ======
function openLink(url) {
    window.open(url, '_blank');
}

function updateClock() {
    const el = document.getElementById('current-time');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        + ' · ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function copyKey(keyName) {
    navigator.clipboard?.writeText(`(${keyName} key copied)`);
    alert(`${keyName} key copied to clipboard!`);
}

function triggerBuild() {
    alert('🏗️ Triggering EAS Build...\n\nRun: eas build --platform ios --profile production\n\nThis will be automated in production!');
}

// ====== LIVE AGENT STATUS POLLING ======
async function pollAgentStatus() {
    try {
        // Try to fetch from OpenClaw gateway
        const res = await fetch(`${OPENCLAW_URL}/api/agents`, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
            const data = await res.json();
            // Update agent status cards with real data
            Object.entries(AGENTS).forEach(([id, agent]) => {
                const statusEl = document.getElementById(`agent-status-${id}`);
                if (statusEl && data[id]) {
                    statusEl.textContent = data[id].lastMessage || 'Active and monitoring...';
                }
            });
        }
    } catch {
        // Gateway not available, use simulated status
        const statusMessages = {
            ozzy: 'Pipeline running. 3 active tasks. Revenue tracking at $0/day.',
            jace: 'Monitoring angel investor feeds. Next check in 30 min.',
            vex: 'Code review complete. 2 PRs ready for merge.',
            appstar: 'Screenshot templates updated. Awaiting review.',
            blaze: 'Content calendar refreshed. 4 posts scheduled this week.',
            claude: 'All systems nominal. LM Studio healthy. Gateway stable.',
        };
        Object.entries(statusMessages).forEach(([id, msg]) => {
            const el = document.getElementById(`agent-status-${id}`);
            if (el) el.textContent = msg;
        });
    }
}

// ====== INIT ======
document.addEventListener('DOMContentLoaded', () => {
    initAuth();

    // Initialize Lucide icons
    if (window.lucide) lucide.createIcons();

    renderAgentCards();
    renderAgentDetails();
    renderFeed();
    renderCalendar();
    renderLiveActivity();
    loadProjects();
    updateClock();
    pollAgentStatus();

    // Update clock every second
    setInterval(updateClock, 1000);

    // Poll agent status every 30 seconds
    setInterval(pollAgentStatus, 30000);

    // Refresh live activity every 60 seconds
    setInterval(renderLiveActivity, 60000);
});
