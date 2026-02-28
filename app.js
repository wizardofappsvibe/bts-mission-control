/* ============================================================
   BTS MISSION CONTROL — Main Application
   ============================================================ */

// ====== CONFIGURATION ======
const SUPABASE_URL = 'https://ggsfnmgpkaxjdpcfbfca.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdnc2ZubWdwa2F4amRwY2ZiZmNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0MTUzODAsImV4cCI6MjA1NDk5MTM4MH0.yMh_K95J_s7vvHG--rFnFmY-0RfCb1LQpbrlAfHvjEw';
// Factory project (BTS Factory) for live agent status
const FACTORY_SUPABASE_URL = 'https://tkjlbgzymqnthyfzlwug.supabase.co';
const FACTORY_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRramxiZ3p5bXFudGh5Znpsd3VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjA2ODgsImV4cCI6MjA4NzczNjY4OH0.CX2aNeHdsBgqSgSIkZrpgo18vvY6yjALmnXJppqTsks';
const AUTH_CODE = '02051967';
const OPENCLAW_URL = 'http://127.0.0.1:18789';

// ====== AGENT DATA ======
const AGENTS = {
    luna: { name: 'Luna', emoji: '🔍', role: 'Research Scout — Stage 1', color: '#E879F9', telegram: '@LunaResearchBot' },
    blaze: { name: 'Blaze', emoji: '🔥', role: 'CMO — Branding & Trademark', color: '#DC2626', telegram: '@BlaceCMObot' },
    ivy: { name: 'Ivy', emoji: '🏗️', role: 'Builder #1 — Stage 2', color: '#34D399', telegram: '@IvyBuilderBot' },
    vex: { name: 'Vex', emoji: '🔨', role: 'Builder #2 — Stage 2', color: '#2563EB', telegram: '@VexCEObot' },
    ozzy: { name: 'Ozzy', emoji: '🦾', role: 'QA & Code Review — Stage 3', color: '#7C3AED', telegram: '@OzzieManBot' },
    claude: { name: 'Claude', emoji: '🔧', role: 'IT + Code Review', color: '#6B7280', telegram: '@ITClaudebot' },
    jace: { name: 'Jace', emoji: '🎯', role: 'Growth & ASO — Marketing', color: '#059669', telegram: '@JaceAngelBot' },
    appstar: { name: 'App Star', emoji: '⭐', role: 'App Store Design — Nova\'s Partner', color: '#F59E0B', telegram: '@AppStarBot' },
    nova: { name: 'Nova', emoji: '🚀', role: 'Distribution — Stage 4', color: '#60A5FA', telegram: '@NovaLaunchBot' },
};

const AGENT_RESPONSIBILITIES = {
    luna: ['Research App Store market gaps', 'Product brief generation', 'Trademark/domain/social vetting', 'Dumps ideas into queue/', 'WIP limit: max 5 unvetted'],
    blaze: ['Verify brand names & trademarks', 'USPTO database queries', 'Domain registration (Vercel)', 'Social media handle checks', 'Final naming approval'],
    ivy: ['Pull apps from queue/ ONE at a time', 'Build complete Xcode projects', 'All Swift files + xcodeproj', 'Write HANDOFF.md when done', 'Contact Claude for build issues'],
    vex: ['Second builder — works with Ivy', 'Pull from queue/ (different apps)', 'Build complete Xcode projects', 'Write HANDOFF.md when done', 'Coordinate with Ivy via sessions_send'],
    ozzy: ['Review builds for quality', 'xcodebuild compile checks', 'Write REVIEW.md with findings', 'Send approved builds to App Star + Nova', 'Catch bugs before distribution'],
    claude: ['Gateway & Ollama monitoring', 'Code review builds (REVIEW.md)', 'Help Ivy/Ozzy debug errors', 'Infrastructure troubleshooting', 'Agent skill management'],
    jace: ['App Store Optimization (ASO.md)', 'Keyword research & metadata', 'Social media launch plans', 'Marketing copy for listings', 'Coordinate with Blaze on branding'],
    appstar: ['Competitive screenshot analysis', 'Pro screenshot templates', 'Device frame mockups', 'App icon design', 'Beat top 10 competitors visually'],
    nova: ['App Store screenshots & video', 'Native Simulator for captures', 'TestFlight upload (Tammy-approved only)', 'App Store submission prep', 'Create appstore/ folder with assets'],
};

// ====== STATE ======
let projects = [];
let feedItems = [];
let currentSection = 'dashboard';
let expandedProjectId = null;

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
        // No simulated data — only real activity shows here
        feed.innerHTML = '<div class="feed-item" style="opacity:0.5;text-align:center;padding:2rem">No activity yet — agents will post updates here when they run.</div>';
        return;
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
        // Pre-populate with real product inventory
        projects = [
            { id: 1, title: 'PhoneTransfer.app', agent: 'nova', status: 'built', priority: 'high', type: '🍎 iOS', domain: 'phonetransfer.app', note: 'TestFlight ready — needs assets + submit', repoUrl: '', updates: [{ agent: 'nova', date: '2026-02-27', text: 'TestFlight build uploaded, waiting for review' }] },
            { id: 2, title: 'PhotoChef.io', agent: 'ivy', status: 'broken', priority: 'high', type: '🍎 iOS', domain: 'photochef.io', note: 'Web done — needs SwiftUI port', repoUrl: '', updates: [{ agent: 'ivy', date: '2026-02-27', text: 'Starting SwiftUI port from web version' }] },
            { id: 3, title: 'Trademark Scanner', agent: 'vex', status: 'broken', priority: 'high', type: '🌐 Web+Ext+iOS', domain: 'marketplacetrademarkscanner.com', note: 'Full stack — consolidate 5 repos + relaunch', repoUrl: '', updates: [{ agent: 'vex', date: '2026-02-27', text: 'QA review in progress — checking 5 repo consolidation' }] },
            { id: 4, title: 'Artsy Suite', agent: 'ivy', status: 'broken', priority: 'medium', type: '🌐 Web', note: 'Etsy tool — consolidate 4 repos', repoUrl: '', updates: [] },
            { id: 5, title: 'VibeGuard', agent: 'ivy', status: 'broken', priority: 'medium', type: '🍎 iOS', note: 'Consolidate 6 repos — rebuild SwiftUI', repoUrl: '', updates: [] },
            { id: 6, title: 'Launch Fleet', agent: 'vex', status: 'broken', priority: 'medium', type: '🍎 iOS', note: 'Has landing page', repoUrl: '', updates: [] },
            { id: 7, title: 'PostWizard', agent: 'ivy', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Social media posting app', repoUrl: '', updates: [] },
            { id: 8, title: 'Video Producer', agent: 'ivy', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Video creation app', repoUrl: '', updates: [] },
            { id: 9, title: 'KidSync', agent: 'luna', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Parent monitoring app', repoUrl: '', updates: [] },
            { id: 10, title: 'Plot Twist', agent: 'luna', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Short story app', repoUrl: '', updates: [] },
            { id: 11, title: 'Coding Kids Studio', agent: 'luna', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Kids coding app', repoUrl: '', updates: [] },
            { id: 12, title: 'AppCandy', agent: 'luna', status: 'idea', priority: 'low', type: '🌐 Web', note: 'Needs assessment', repoUrl: '', updates: [] },
            { id: 13, title: 'Market Talk', agent: 'luna', status: 'idea', priority: 'low', type: '🌐 Web', note: 'Social media tools', repoUrl: '', updates: [] },
            { id: 14, title: 'Beer Bong Olympics', agent: 'luna', status: 'idea', priority: 'low', type: '🍎 iOS', note: 'Party game app', repoUrl: '', updates: [] },
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

function renderProjectCard(p, isExpanded) {
    const agent = AGENTS[p.agent] || { emoji: '👤', name: p.agent };
    const priorityBadge = p.priority === 'high' ? '<span class="badge-high">🔴 HIGH</span>' : p.priority === 'medium' ? '<span class="badge-med">🟡 MED</span>' : '<span class="badge-low">🟢 LOW</span>';
    const updateCount = (p.updates || []).length;
    const chevron = isExpanded ? '▼' : '▶';

    let folderHtml = '';
    if (isExpanded) {
        const repoLink = p.repoUrl
            ? `<a href="${p.repoUrl}" target="_blank" class="folder-repo-link">🔗 ${p.repoUrl.replace('https://github.com/', '')}</a>`
            : `<button class="folder-repo-add" onclick="event.stopPropagation(); editProjectRepo(${p.id})">+ Add GitHub Repo</button>`;

        const updatesHtml = (p.updates || []).length > 0
            ? (p.updates || []).map(u => {
                const ua = AGENTS[u.agent] || { emoji: '👤', name: u.agent };
                return `<div class="folder-update-entry">
                    <span class="folder-update-agent">${ua.emoji} ${ua.name}</span>
                    <span class="folder-update-date">${u.date}</span>
                    <div class="folder-update-text">${u.text}</div>
                </div>`;
            }).join('')
            : '<div class="folder-empty">No updates yet</div>';

        const previewHtml = p.domain
            ? `<div class="folder-preview">
                <iframe src="https://${p.domain}" class="folder-preview-iframe" sandbox="allow-scripts allow-same-origin"></iframe>
                <a href="https://${p.domain}" target="_blank" class="folder-preview-link">Open ${p.domain} ↗</a>
              </div>`
            : (p.type && p.type.includes('iOS'))
                ? `<div class="folder-preview folder-preview-placeholder">📱 iOS App — Use Xcode Simulator to preview</div>`
                : `<div class="folder-preview folder-preview-placeholder">🌐 No preview available</div>`;

        folderHtml = `
        <div class="project-folder" onclick="event.stopPropagation()">
            <div class="folder-section">
                <div class="folder-section-title">📦 Repository</div>
                ${repoLink}
            </div>
            <div class="folder-section">
                <div class="folder-section-title">📋 Agent Updates <span class="folder-count">${updateCount}</span></div>
                <div class="folder-updates-list">${updatesHtml}</div>
                <button class="folder-add-update" onclick="event.stopPropagation(); addProjectUpdate(${p.id})">+ Add Update</button>
            </div>
            <div class="folder-section">
                <div class="folder-section-title">👁️ Preview</div>
                ${previewHtml}
            </div>
        </div>`;
    }

    return `
    <div class="kanban-card ${isExpanded ? 'kanban-card-expanded' : ''}" data-agent="${p.agent}" data-id="${p.id}"
         draggable="${!isExpanded}" ondragstart="dragStart(event, ${p.id})"
         onclick="toggleProjectFolder(${p.id})">
      <div class="kanban-card-header-row">
        <div class="kanban-card-type">${p.type || ''}</div>
        <span class="kanban-card-chevron">${chevron}</span>
      </div>
      <div class="kanban-card-title">${p.title}</div>
      <div class="kanban-card-note">${p.note || ''}</div>
      <div class="kanban-card-agent">
        ${agent.emoji} ${agent.name} ${priorityBadge}
        ${updateCount > 0 ? `<span class="update-badge">${updateCount} update${updateCount > 1 ? 's' : ''}</span>` : ''}
      </div>
      ${p.domain ? `<div class="kanban-card-domain">🌐 ${p.domain}</div>` : ''}
      ${p.repoUrl ? `<div class="kanban-card-domain">🔗 ${p.repoUrl.replace('https://github.com/', '')}</div>` : ''}
      ${folderHtml}
    </div>
  `;
}

function renderKanban() {
    const PIPELINE = ['idea', 'built', 'broken'];
    PIPELINE.forEach(status => {
        const column = document.getElementById(`kanban-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        if (!column) return;

        const filtered = projects.filter(p => p.status === status);
        if (countEl) countEl.textContent = filtered.length ? `(${filtered.length})` : '';
        column.innerHTML = filtered.map(p => renderProjectCard(p, expandedProjectId === p.id)).join('');
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

function toggleProjectFolder(projectId) {
    expandedProjectId = expandedProjectId === projectId ? null : projectId;
    renderKanban();
}

function addProjectUpdate(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const text = prompt(`Add update for "${project.title}":`);
    if (!text) return;
    if (!project.updates) project.updates = [];
    project.updates.unshift({
        agent: project.agent,
        date: new Date().toISOString().split('T')[0],
        text: text,
    });
    saveProjects();
    renderKanban();
}

function editProjectRepo(projectId) {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const url = prompt(`GitHub repo URL for "${project.title}":`, project.repoUrl || 'https://github.com/');
    if (url === null) return;
    project.repoUrl = url;
    saveProjects();
    renderKanban();
}

function dragStart(event, projectId) {
    event.dataTransfer.setData('text/plain', projectId);
}

function filterProjects() {
    const filter = document.getElementById('project-agent-filter')?.value;
    const PIPELINE = ['idea', 'built', 'broken'];
    PIPELINE.forEach(status => {
        const column = document.getElementById(`kanban-${status}`);
        const countEl = document.getElementById(`count-${status}`);
        if (!column) return;
        const filtered = projects.filter(p => p.status === status && (filter === 'all' || p.agent === filter));
        if (countEl) countEl.textContent = filtered.length ? `(${filtered.length})` : '';
        column.innerHTML = filtered.map(p => {
            const agent = AGENTS[p.agent] || { emoji: '👤', name: p.agent };
            const priorityBadge = p.priority === 'high' ? '<span class="badge-high">🔴 HIGH</span>' : p.priority === 'medium' ? '<span class="badge-med">🟡 MED</span>' : '<span class="badge-low">🟢 LOW</span>';
            return `
        <div class="kanban-card" data-agent="${p.agent}" data-id="${p.id}"
             draggable="true" ondragstart="dragStart(event, ${p.id})">
          <div class="kanban-card-type">${p.type || ''}</div>
          <div class="kanban-card-title">${p.title}</div>
          <div class="kanban-card-note">${p.note || ''}</div>
          <div class="kanban-card-agent">
            ${agent.emoji} ${agent.name} ${priorityBadge}
          </div>
          ${p.domain ? `<div class="kanban-card-domain">🌐 ${p.domain}</div>` : ''}
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
      <textarea id="new-project-desc" class="textarea-elegant" rows="3" placeholder="Description / notes"></textarea>
      <input type="text" id="new-project-repo" class="input-elegant" placeholder="GitHub repo URL (optional)" style="width:100%">
      <input type="text" id="new-project-domain" class="input-elegant" placeholder="Domain (optional, e.g. myapp.com)" style="width:100%">
      <select id="new-project-type" class="select-elegant">
        <option value="🍎 iOS">🍎 iOS App</option>
        <option value="🌐 Web">🌐 Web App</option>
        <option value="🌐 Web+Ext+iOS">🌐 Web + Extension + iOS</option>
      </select>
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
        note: document.getElementById('new-project-desc').value,
        repoUrl: document.getElementById('new-project-repo')?.value || '',
        domain: document.getElementById('new-project-domain')?.value || '',
        type: document.getElementById('new-project-type')?.value || '🍎 iOS',
        agent: document.getElementById('new-project-agent').value,
        priority: document.getElementById('new-project-priority').value,
        status: 'idea',
        updates: [],
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

// ====== XCODE SIMULATOR ======
function bootSimulator() {
    const deviceId = document.getElementById('xcode-device')?.value;
    if (!deviceId) return;
    const deviceName = document.getElementById('xcode-device')?.selectedOptions[0]?.text || 'Simulator';
    alert(`🚀 To boot ${deviceName}:\nRun in Terminal:\nxcrun simctl boot ${deviceId} && open -a Simulator`);
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

// ====== LIVE ACTIVITY MONITOR (REAL DATA ONLY) ======
function renderLiveActivity() {
    const grid = document.getElementById('live-activity-grid');
    if (!grid) return;

    grid.innerHTML = Object.entries(AGENTS).map(([id, agent]) => {
        const fs = factoryStatus[id];
        let statusLabel = '⏳ No data yet';
        let taskText = 'Waiting for factory to start...';
        let lastUpdated = '';
        let statusClass = 'idle';

        if (fs) {
            if (fs.status === 'working') {
                statusLabel = '🟢 WORKING';
                statusClass = 'working';
            } else if (fs.status === 'idle') {
                statusLabel = '💤 Idle';
                statusClass = 'idle';
            } else if (fs.status === 'error') {
                statusLabel = '🔴 Error';
                statusClass = 'error';
            } else {
                statusLabel = `📡 ${fs.status}`;
            }
            taskText = fs.current_task || 'No task info';
            if (fs.last_updated) {
                lastUpdated = timeSince(new Date(fs.last_updated)) + ' ago';
            }
        }

        return `
      <div class="activity-panel ${statusClass === 'working' ? 'agent-working' : ''}" onclick="expandActivity('${id}')">
        <div class="activity-panel-header">
          ${agent.emoji} ${agent.name}
          <span class="activity-status-label">${statusLabel}</span>
        </div>
        <div class="activity-log">
          <div class="log-line"><span class="log-time">[task]</span> ${taskText}</div>
          ${lastUpdated ? `<div class="log-line"><span class="log-time">[updated]</span> ${lastUpdated}</div>` : ''}
          <div class="log-line"><span class="log-time">[role]</span> ${agent.role}</div>
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
  simctl    — Boot Xcode Simulator
  xcodebuild — Show xcodebuild help
  clear      — Clear terminal`;
    } else if (cmd === 'agents') {
        output = Object.entries(AGENTS).map(([id, a]) => `  ${a.emoji} ${a.name.padEnd(10)} ${a.role.padEnd(30)} ✅ Online`).join('\n');
    } else if (cmd === 'health') {
        output = `System Health:\n  Open http://127.0.0.1:18789/ for real-time status\n  Run 'ollama ps' in terminal for model status\n  Run 'openclaw cron list' for agent schedule`;
    } else if (cmd === 'projects') {
        output = projects.map(p => `  ${AGENTS[p.agent]?.emoji || '?'} [${p.status.toUpperCase().padEnd(8)}] ${p.title}`).join('\n');
    } else if (cmd.startsWith('simctl') || cmd.startsWith('xcrun simctl')) {
        output = '📱 Available simulators:\n  xcrun simctl list devices available\n  xcrun simctl boot <UDID>\n  open -a Simulator';
    } else if (cmd.startsWith('xcodebuild')) {
        output = '🛠️ Xcode Build:\n  xcodebuild -list\n  xcodebuild -scheme <name> -destination "platform=iOS Simulator"';
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

// ====== APPLE DEVELOPER PANEL ======
function loadApplePanel(url, label) {
    const wrapper = document.getElementById('apple-iframe-wrapper');
    const iframe = document.getElementById('apple-iframe');
    const labelEl = document.getElementById('apple-panel-label');
    const fallback = document.getElementById('apple-fallback');
    const fallbackLink = document.getElementById('apple-fallback-link');

    if (labelEl) labelEl.textContent = `Loading ${label}...`;

    // Apple sites block iframes, so always open in new tab
    // But try iframe first for documentation/HIG which may work
    if (url.includes('human-interface-guidelines') || url.includes('/documentation/')) {
        // These might work in iframe
        if (wrapper) wrapper.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
        if (iframe) iframe.src = url;
        if (labelEl) labelEl.textContent = `📄 ${label} — loaded in panel`;
    } else {
        // ASC/developer portal will block iframes — open directly
        if (wrapper) wrapper.style.display = 'none';
        if (fallback) fallback.style.display = 'block';
        if (fallbackLink) {
            fallbackLink.onclick = () => window.open(url, '_blank');
            fallbackLink.textContent = `Open ${label} in New Tab ↗`;
        }
        if (labelEl) labelEl.textContent = `🔒 ${label} — Apple requires direct access`;
        window.open(url, '_blank');
    }
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

// ====== LIVE FACTORY STATUS (REAL DATA ONLY) ======
let factoryStatus = {};
let countdownInterval = null;

async function pollAgentStatus() {
    // Try FACTORY Supabase for agent status (new BTS Factory project)
    try {
        const res = await fetch(`${FACTORY_SUPABASE_URL}/rest/v1/factory_status?select=*&order=last_updated.desc`, {
            headers: {
                'apikey': FACTORY_SUPABASE_KEY,
                'Authorization': `Bearer ${FACTORY_SUPABASE_KEY}`,
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
                factoryStatus = {};
                data.forEach(row => { factoryStatus[row.agent_id] = row; });
            }
        }
    } catch { /* Factory Supabase table may not exist yet */ }

    // Update dashboard agent cards with REAL status
    Object.entries(AGENTS).forEach(([id, agent]) => {
        const statusEl = document.getElementById(`agent-status-${id}`);
        if (!statusEl) return;

        const fs = factoryStatus[id];
        if (fs && fs.status === 'working') {
            statusEl.innerHTML = `<span class="status-live">🟢 WORKING</span> — ${fs.current_task || 'Processing...'}`;
            statusEl.closest('.agent-card')?.classList.add('agent-working');
        } else if (fs && fs.current_task) {
            statusEl.textContent = `💤 ${fs.current_task}`;
            statusEl.closest('.agent-card')?.classList.remove('agent-working');
        } else {
            statusEl.textContent = '⏳ No status from Supabase yet';
        }
    });

    // Update factory pipeline cards (Luna, Ivy, Nova)
    ['luna', 'ivy', 'nova'].forEach(id => {
        const el = document.getElementById(`factory-status-${id}`);
        if (!el) return;
        const fs = factoryStatus[id];
        if (fs && fs.status === 'working') {
            el.textContent = `🟢 ${fs.current_task || 'Working...'}`;
            el.style.background = '#D1FAE5';
            el.style.color = '#059669';
        } else if (fs && fs.current_task) {
            el.textContent = `💤 ${fs.current_task}`;
            el.style.background = '';
            el.style.color = '';
        } else {
            el.textContent = '⏳ No status yet';
        }
    });

    // Re-render Live Activity with real data
    renderLiveActivity();

    // Update countdown timer
    updateCountdown();
}

function updateCountdown() {
    const cdEl = document.getElementById('factory-countdown');
    if (!cdEl) return;

    // Use real last-run from Supabase or estimate from page load
    const lunaStatus = factoryStatus['luna'];
    let nextRun;
    if (lunaStatus && lunaStatus.last_updated) {
        nextRun = new Date(new Date(lunaStatus.last_updated).getTime() + 7200000);
    } else {
        // Estimate: next run is on the 2-hour mark
        const now = new Date();
        const hours = now.getHours();
        const nextHour = hours + (2 - (hours % 2));
        nextRun = new Date(now);
        nextRun.setHours(nextHour, 0, 0, 0);
        if (nextRun <= now) nextRun.setHours(nextRun.getHours() + 2);
    }

    const diff = Math.max(0, nextRun - new Date());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    cdEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeSince(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
}

// Write factory status to Supabase (called by daemon via curl)
async function writeFactoryStatus(agentId, status, currentTask) {
    await supabaseInsert('factory_status', {
        agent_id: agentId,
        status: status,
        current_task: currentTask,
        last_updated: new Date().toISOString(),
    });
}

// ====== FACTORY PIPELINE TRACKER ======
const STAGES = ['new-idea', 'vetted', 'building', 'testing', 'approval', 'distributing', 'launched'];
const STAGE_COLORS = {
    'new-idea': '#E879F9',
    vetted: '#A78BFA',
    research: '#E879F9',
    building: '#34D399',
    testing: '#F97316',
    approval: '#F59E0B',
    distributing: '#60A5FA',
    launched: '#34C759',
};

let factoryItems = [];

function loadFactory() {
    // Use real scanned data from factory-data.js if available
    if (window.FACTORY_SCAN && window.FACTORY_SCAN.length > 0) {
        factoryItems = window.FACTORY_SCAN;
        saveFactory();
    } else {
        const saved = localStorage.getItem('bts-factory');
        if (saved) {
            factoryItems = JSON.parse(saved);
        } else {
            factoryItems = [];
            saveFactory();
        }
    }
    renderTracker();
}

// ====== FACTORY APP VIEWER ======
function viewFactoryItem(itemId) {
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;

    const agent = AGENTS[item.agent] || { emoji: '👤', name: item.agent };
    const buildPath = `~/.openclaw/factory/builds/${item.slug}`;
    const stageLabels = { 'new-idea': '💡 New Idea', vetted: '✅ Vetted', building: '🔨 Building', testing: '🧪 Testing', approval: '⏳ Awaiting Approval', distributing: '📦 Distributing', launched: '🚀 Launched' };
    const stageLabel = stageLabels[item.stage] || item.stage;

    // iPhone frame — shows QR if TestFlight URL exists, otherwise simulator button
    const hasXcode = item.xcodeProj && item.xcodeProj.length > 0;
    const tfUrl = item.testflightUrl || '';

    let iphoneContent = '';
    if (tfUrl) {
        // Auto-show QR code inside the iPhone frame — ready to scan!
        iphoneContent = `<div style="text-align:center;padding:20px 12px">
              <div style="font-size:11px;font-weight:600;color:#007AFF;margin-bottom:8px">✈️ SCAN TO INSTALL</div>
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(tfUrl)}" style="width:140px;height:140px;border-radius:8px">
              <div style="font-weight:600;font-size:14px;margin-top:10px">${item.name}</div>
              <div style="font-size:10px;color:#888;margin-top:4px">TestFlight Beta</div>
              <div style="font-size:9px;color:#007AFF;margin-top:8px;word-break:break-all">${tfUrl}</div>
            </div>`;
    } else if (hasXcode) {
        iphoneContent = `<div style="text-align:center;padding:40px 20px">
              <div style="font-size:48px;margin-bottom:16px">📱</div>
              <div style="font-weight:600;font-size:16px;margin-bottom:8px">${item.name}</div>
              <div style="font-size:12px;color:#888;margin-bottom:20px">${item.revenue}</div>
              <button class="btn-primary" onclick="bootAppInSimulator('${item.slug}', '${item.xcodeProj}')" style="font-size:13px">▶ Boot in Simulator</button>
            </div>`;
    } else {
        iphoneContent = `<div style="text-align:center;padding:40px 20px">
              <div style="font-size:48px;margin-bottom:16px">🚧</div>
              <div style="font-weight:600;font-size:14px;margin-bottom:8px">No Xcode Project Yet</div>
              <div style="font-size:11px;color:#888">Ivy needs to create the .xcodeproj</div>
            </div>`;
    }

    const simulatorSection = `<div class="viewer-iphone">
        <div class="viewer-iphone-frame">
          <div class="viewer-iphone-notch"></div>
          <div class="viewer-iphone-screen">${iphoneContent}</div>
          <div class="viewer-iphone-home"></div>
        </div>
      </div>`;

    // TestFlight URL save/edit section
    const testflightSection = tfUrl
        ? `<div class="viewer-section">
        <h4 class="viewer-section-title">✈️ TestFlight</h4>
        <div style="display:flex;align-items:center;gap:8px;padding:4px 0">
          <div style="flex:1;font-size:11px;color:#007AFF;word-break:break-all">${tfUrl}</div>
          <button class="btn-sm" onclick="editTestFlightUrl(${item.id})" style="font-size:10px;white-space:nowrap">Edit</button>
        </div>
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:4px">✅ QR code showing on iPhone — scan with camera!</div>
      </div>`
        : `<div class="viewer-section">
        <h4 class="viewer-section-title">✈️ TestFlight</h4>
        <div style="display:flex;gap:6px;padding:4px 0">
          <input type="text" id="viewer-tf-url" class="input-elegant" placeholder="Paste TestFlight URL" style="flex:1;font-size:11px">
          <button class="btn-primary" onclick="saveTestFlightUrl(${item.id})" style="font-size:11px;padding:6px 12px">Save</button>
        </div>
        <div style="font-size:10px;color:var(--text-tertiary);margin-top:4px">QR auto-appears on iPhone frame once saved</div>
      </div>`;

    // Workflow buttons based on stage
    let workflowButtons = '';
    if (item.stage === 'approval') {
        workflowButtons = `
        <div class="viewer-workflow">
          <button class="btn-nova" onclick="sendToNova(${item.id})">🚀 Send to Nova for Assets & Screenshots</button>
          <div class="viewer-workflow-note">Nova will use the native Simulator for screenshots and video</div>
        </div>`;
    } else if (item.stage === 'distributing') {
        workflowButtons = `
        <div class="viewer-workflow">
          <button class="btn-approve" onclick="approveFinalLaunch(${item.id})">✅ Tammy's Final Approval — Ship It!</button>
          <div class="viewer-workflow-note">This sends the build to App Store Connect for review</div>
        </div>`;
    }

    document.getElementById('modal-title').textContent = item.name;
    document.getElementById('modal-body').innerHTML = `
    <div class="viewer-layout">
      ${simulatorSection}
      <div class="viewer-details">
        <div class="viewer-section">
          <h4 class="viewer-section-title">📋 Build Info</h4>
          <div class="viewer-info-row"><span>Status</span><span class="viewer-badge">${stageLabel}</span></div>
          <div class="viewer-info-row"><span>Agent</span><span>${agent.emoji} ${agent.name}</span></div>
          <div class="viewer-info-row"><span>Description</span><span>${item.revenue}</span></div>
          <div class="viewer-info-row"><span>Build Path</span><span style="font-size:10px;word-break:break-all">${buildPath}</span></div>
          ${hasXcode ? `<div class="viewer-info-row"><span>Xcode</span><span style="font-size:10px">${item.xcodeProj}</span></div>` : ''}
        </div>
        ${testflightSection}
        ${item.brand ? `<div class="viewer-section">
          <h4 class="viewer-section-title">🔥 Brand Verification — Blaze</h4>
          <div class="viewer-info-row"><span>🌐 Domain</span><span style="color:#007AFF;font-weight:600">${item.brand.domain || 'Pending'}</span></div>
          <div class="viewer-info-row"><span>📱 Socials</span><span>${item.brand.socials || 'Pending'}</span></div>
          <div class="viewer-info-row"><span>™️ Trademark</span><span style="color:${item.brand.trademark === 'cleared' ? '#34C759' : '#FF9500'};font-weight:600">${item.brand.trademark === 'cleared' ? '✅ CLEARED' : '⏳ ' + (item.brand.trademark || 'Pending')}</span></div>
        </div>` : ''}
        ${workflowButtons}
      </div>
    </div>`;
    document.getElementById('modal-overlay').classList.add('active');
}

function saveTestFlightUrl(itemId) {
    const url = document.getElementById('viewer-tf-url')?.value?.trim();
    if (!url) return;
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;
    item.testflightUrl = url;
    saveFactory();
    viewFactoryItem(itemId); // Refresh viewer to show QR
}

function editTestFlightUrl(itemId) {
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;
    const newUrl = prompt('TestFlight URL:', item.testflightUrl || '');
    if (newUrl !== null) {
        item.testflightUrl = newUrl.trim();
        saveFactory();
        viewFactoryItem(itemId);
    }
}

function bootAppInSimulator(slug, xcodeProj) {
    const buildPath = `~/.openclaw/factory/builds/${slug}`;
    alert(`To preview this app:\n\n1. Open Terminal\n2. Run: open ${buildPath}/${xcodeProj}\n3. Press Cmd+R to build & run\n\nOr use the iOS Simulator page to boot a device first.`);
}

function sendToNova(itemId) {
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;
    item.stage = 'distributing';
    saveFactory();
    renderTracker();
    closeModal();
    // Send task to Nova
    const slug = item.name.toLowerCase().replace(/\s+/g, '-');
    sendAgentTask('nova', `FACTORY DISTRIBUTE: "${item.name}". The build is at ~/.openclaw/factory/builds/${item.slug}/. Create: 1) 5 App Store screenshots (6.7" and 5.5") 2) App icon if missing 3) App Store description + keywords 4) Privacy policy. Put everything in ~/.openclaw/factory/builds/${item.slug}/appstore/. Then notify Tammy for final approval.`);
    alert(`✅ Sent to Nova!\n\nNova will create App Store assets for ${item.name} and notify you when ready for final approval.`);
}

function approveFinalLaunch(itemId) {
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(`🚀 FINAL APPROVAL\n\nShip "${item.name}" to the App Store?\n\nThis will tell Nova to submit to App Store Connect.`)) return;
    item.stage = 'launched';
    saveFactory();
    renderTracker();
    closeModal();
    const slug = item.name.toLowerCase().replace(/\s+/g, '-');
    sendAgentTask('nova', `FACTORY LAUNCH: "${item.name}" is APPROVED by Tammy. Submit to App Store Connect NOW. Build at ~/.openclaw/factory/builds/${item.slug}/. Use xcrun altool or Xcode to upload. Create TestFlight build first. Report back with TestFlight link.`);
    alert(`🎉 ${item.name} approved for launch!\n\nNova is submitting to App Store Connect.`);
}

function saveFactory() {
    localStorage.setItem('bts-factory', JSON.stringify(factoryItems));
}

function renderTracker() {
    const MAX_VISIBLE = 5;

    STAGES.forEach(stage => {
        const lane = document.getElementById(`tracker-${stage}`);
        const count = document.getElementById(`tcount-${stage}`);
        if (!lane) return;

        const items = factoryItems.filter(i => i.stage === stage);
        if (count) count.textContent = items.length;

        const typeStyles = {
            app: { bg: '#EEF2FF', color: '#4F46E5', label: 'App' },
            web: { bg: '#FEF3C7', color: '#D97706', label: 'Web' },
            ebook: { bg: '#FDE8E8', color: '#DC2626', label: 'eBook' },
        };

        if (items.length === 0) {
            lane.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-tertiary);font-size:11px">Empty</div>';
            return;
        }

        const renderItem = (item) => {
            const t = typeStyles[item.type] || typeStyles.app;
            const agentInfo = AGENTS[item.agent] ? `${AGENTS[item.agent].emoji} ${AGENTS[item.agent].name}` : '';
            const nextStage = STAGES[STAGES.indexOf(item.stage) + 1];
            const isApproval = item.stage === 'approval';

            let actions = '';
            if (nextStage) {
                if (isApproval) {
                    actions = `<div class="tracker-item-actions">
                      <button class="tracker-move-btn approve" onclick="event.stopPropagation();moveFactoryItem(${item.id}, '${nextStage}')">Approve & Ship</button>
                    </div>`;
                } else {
                    actions = `<div class="tracker-item-actions">
                      <button class="tracker-move-btn" onclick="event.stopPropagation();moveFactoryItem(${item.id}, '${nextStage}')">Move →</button>
                    </div>`;
                }
            }

            return `
              <div class="tracker-item" draggable="true" ondragstart="factoryDragStart(event, ${item.id})" onclick="viewFactoryItem(${item.id})" style="cursor:pointer">
                <div class="tracker-item-name">${item.name}</div>
                <div class="tracker-item-meta">
                  <span class="tracker-item-type" style="background:${t.bg};color:${t.color}">${t.label}</span>
                  <span style="font-size:10px;color:var(--text-secondary)">${agentInfo}</span>
                </div>
                ${item.revenue ? `<div style="font-size:10px;color:var(--text-tertiary);margin-top:2px">${item.revenue}</div>` : ''}
                ${actions}
              </div>
            `;
        };

        const needsCollapse = items.length > MAX_VISIBLE;
        const visibleItems = needsCollapse ? items.slice(0, MAX_VISIBLE) : items;
        const hiddenItems = needsCollapse ? items.slice(MAX_VISIBLE) : [];
        const collapseId = `collapse-${stage}`;

        let html = visibleItems.map(renderItem).join('');

        if (needsCollapse) {
            html += `<div id="${collapseId}" style="display:none">${hiddenItems.map(renderItem).join('')}</div>`;
            html += `<button class="tracker-show-more" onclick="toggleLaneCollapse('${stage}')" id="toggle-${stage}" 
                      style="width:100%;padding:8px;border:1px dashed var(--border-color);border-radius:8px;background:none;color:var(--text-secondary);font-size:11px;cursor:pointer;margin-top:4px">
                      ▼ Show ${hiddenItems.length} more
                    </button>`;
        }

        lane.innerHTML = html;
    });

    // Setup drag-and-drop on lanes (factory items only)
    document.querySelectorAll('.tracker-lane-items').forEach(lane => {
        lane.ondragover = e => { e.preventDefault(); lane.style.background = 'rgba(0,113,227,0.04)'; };
        lane.ondragleave = () => { lane.style.background = ''; };
        lane.ondrop = e => {
            e.preventDefault();
            lane.style.background = '';
            const itemId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStage = lane.id.replace('tracker-', '');
            moveFactoryItem(itemId, newStage);
        };
    });
}

function factoryDragStart(event, itemId) {
    event.dataTransfer.setData('text/plain', itemId);
}

function toggleLaneCollapse(stage) {
    const hidden = document.getElementById(`collapse-${stage}`);
    const btn = document.getElementById(`toggle-${stage}`);
    if (!hidden || !btn) return;

    if (hidden.style.display === 'none') {
        hidden.style.display = 'block';
        btn.textContent = '▲ Show less';
    } else {
        hidden.style.display = 'none';
        const count = hidden.querySelectorAll('.tracker-item').length;
        btn.textContent = `▼ Show ${count} more`;
    }
}

function moveFactoryItem(itemId, newStage) {
    event && event.stopPropagation();
    const item = factoryItems.find(i => i.id === itemId);
    if (!item) return;
    const prevStage = item.stage;
    item.stage = newStage;
    // Update agent based on stage
    if (newStage === 'research') item.agent = 'luna';
    else if (newStage === 'building') item.agent = 'ivy';
    else if (newStage === 'testing') item.agent = 'vex';
    else if (newStage === 'approval') item.agent = 'boss';
    else if (newStage === 'distributing' || newStage === 'launched') item.agent = 'nova';
    saveFactory();
    renderTracker();
    // Notify the assigned agent
    const slug = item.name.toLowerCase().replace(/\s+/g, '-');
    if (newStage === 'building') {
        sendAgentTask('ivy', `FACTORY BUILD: "${item.name}". Read brief at ~/.openclaw/factory/briefs/${slug}.md. Follow ~/.openclaw/factory/BUILD_STANDARDS.md. RevenueCat + Supabase + StoreKit 2. Deliver to ~/.openclaw/factory/builds/${slug}/`);
    } else if (newStage === 'testing') {
        sendAgentTask('vex', `FACTORY QA: "${item.name}". iOS QA review needed. Check build at ~/.openclaw/factory/builds/${slug}/HANDOFF.md. Verify: compiles, no crashes, RevenueCat works, Supabase auth works, 5 screenshots correct, icon present, demo video captured, legal docs present. Touch QA_PASSED if good, write QA_ISSUES.md if not.`);
    } else if (newStage === 'approval') {
        sendAgentTask('main', `FACTORY APPROVAL: "${item.name}" passed Vex QA. Ready for Boss Tammy review. Build at ~/.openclaw/factory/builds/${slug}/`);
    } else if (newStage === 'distributing') {
        sendAgentTask('nova', `FACTORY SUBMIT: "${item.name}" approved by Boss. Submit to App Store Connect. Build at ~/.openclaw/factory/builds/${slug}/HANDOFF.md.`);
    }
}

function addFactoryIdea() {
    document.getElementById('modal-title').textContent = 'New Factory Idea';
    document.getElementById('modal-body').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <input type="text" id="factory-idea-name" class="input-elegant" placeholder="Product name" style="width:100%">
      <select id="factory-idea-type" class="select-elegant">
        <option value="app">Mobile App</option>
        <option value="web">Web App</option>
        <option value="ebook">eBook / Digital Product</option>
      </select>
      <input type="text" id="factory-idea-revenue" class="input-elegant" placeholder="Revenue estimate (e.g. $5K/mo)">
      <button class="btn-primary" onclick="submitFactoryIdea()">Send to Luna</button>
    </div>
  `;
    document.getElementById('modal-overlay').classList.add('active');
}

function submitFactoryIdea() {
    const name = document.getElementById('factory-idea-name').value.trim();
    if (!name) return;
    const idea = {
        id: Date.now(),
        name,
        type: document.getElementById('factory-idea-type').value,
        stage: 'research',
        agent: 'luna',
        created: 'just now',
        revenue: document.getElementById('factory-idea-revenue').value || '',
    };
    factoryItems.push(idea);
    saveFactory();
    renderTracker();
    closeModal();
    // DM Luna to start researching this idea
    sendAgentTask('luna', `New factory idea: "${name}" (${idea.type}). Revenue target: ${idea.revenue || 'TBD'}. Research this immediately — find competitors, market size, revenue potential, and competitor App Store screenshots. Deliver a product brief to ~/.openclaw/factory/briefs/${name.toLowerCase().replace(/\s+/g, '-')}.md`);
}

// Send a task message to an agent via OpenClaw gateway
async function sendAgentTask(agentId, message) {
    try {
        const res = await fetch(`${OPENCLAW_URL}/api/sessions/${agentId}/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
            signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
            console.log(`✅ Task sent to ${agentId}: ${message.substring(0, 50)}...`);
            feedItems.unshift({
                agent: agentId,
                text: `📋 New task received: ${message.substring(0, 100)}...`,
                time: 'just now',
            });
            renderFeed();
        } else {
            console.warn(`⚠️ Failed to reach ${agentId}, task saved locally`);
        }
    } catch (e) {
        console.warn(`⚠️ Gateway unavailable for ${agentId}, task saved locally`);
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
    loadFactory();
    updateClock();
    pollAgentStatus();

    // Update clock + countdown every second
    setInterval(() => { updateClock(); updateCountdown(); }, 1000);

    // Poll agent status every 30 seconds (from Supabase — real data)
    setInterval(pollAgentStatus, 30000);

    // Refresh live activity every 60 seconds
    setInterval(renderLiveActivity, 60000);
});

