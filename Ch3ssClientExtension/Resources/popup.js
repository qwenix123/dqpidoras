const FILES = 'abcdefgh';
const PIECE_SYMBOLS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };

const THEMES = [
  { id: 'mono',   arrow: '#ffffff' },
  { id: 'dark',   arrow: '#f4f4f5' },
  { id: 'silver', arrow: '#e5e7eb' },
  { id: 'gray',   arrow: '#d4d4d8' }
];

const $ = id => document.getElementById(id);
const tabBtns = [...document.querySelectorAll('.ca-tab-btn')];
const tabPanes = [...document.querySelectorAll('.ca-tab-pane')];
const modeBtns = [...document.querySelectorAll('.ca-mode-btn')];
const patBtns = [...document.querySelectorAll('.ca-pat-btn')];
const typeBtns = [...document.querySelectorAll('.ca-type-btn')];
const rateChips = [...document.querySelectorAll('.ca-rate-chip')];
const marginBtns = [...document.querySelectorAll('.ca-margin-btn')];
const presetLoadBtns = [...document.querySelectorAll('.ca-load-btn[data-preset]')];

const els = {
  openTab:        $('ca-open-tab'),
  themeBtn:       $('ca-theme-btn'),
  soundBtn:       $('ca-sound-btn'),
  soundIcon:      $('ca-sound-icon'),
  mbGrid:         $('ca-mb-grid'),
  mbArrow:        $('ca-mb-arrow'),
  evalFill:       $('ca-evalfill'),
  turnPill:       $('ca-turn-pill'),
  turnTxt:        $('ca-turn-txt'),
  evalVal:        $('ca-eval'),
  depthVal:       $('ca-depth'),
  moveVal:        $('ca-move'),
  advTag:         $('ca-adv-tag'),
  graphSvg:       $('ca-graph-svg'),
  graphMeta:      $('ca-graph-meta'),
  graphReset:     $('ca-graph-reset'),

  // Humanizer
  patBadge:       $('ca-pattern-badge'),
  chanceBox:      $('ca-chance-box'),
  stepBox:        $('ca-step-box'),
  errorRate:      $('ca-error-rate'),
  errorHint:      $('ca-error-hint'),
  errorStep:      $('ca-error-step'),
  safeBadge:      $('ca-safe-badge'),
  protectMate:    $('ca-protect-mate'),
  dynamicTiming:  $('ca-dynamic-timing'),
  delayMin:       $('ca-delay-min'),
  delayMinVal:    $('ca-delay-min-val'),
  delayMax:       $('ca-delay-max'),
  delayMaxVal:    $('ca-delay-max-val'),

  // Configs
  cfgExportBtn:   $('ca-cfg-export-btn'),
  cfgImportBtn:   $('ca-cfg-import-btn'),
  cfgFileInput:   $('ca-cfg-file-input'),
  newCfgName:     $('ca-new-cfg-name'),
  saveCfgBtn:     $('ca-save-cfg-btn'),
  cfgCount:       $('ca-cfg-count'),
  userCfgList:    $('ca-user-cfg-list'),

  // Toggles & Actions
  autoQueue:      $('ca-auto-queue'),
  showArrow:      $('ca-show-arrow'),
  startBtn:       $('ca-start-btn'),
  startTxt:       $('ca-start-txt'),
  startIcon:      $('ca-start-icon'),
  statusTxt:      $('ca-status-txt'),
  movesCount:     $('ca-moves-count')
};

let currentState = {
  running: false,
  mode: 'human_safe',
  autoQueue: true,
  showArrow: true,
  sound: true,
  theme: 'mono',
  errorRate: 15,
  errorPattern: 'chance',
  errorStep: 2,
  errorType: 'inaccuracy',
  protectMate: true,
  safeMargin: 120,
  delayMin: 1000,
  delayMax: 2600,
  dynamicTiming: true,
  configs: [],
  activeTab: 'game',
  live: {
    board: {},
    flipped: false,
    turn: 'w',
    bestScore: '0.00',
    scoreNum: 0,
    isMate: false,
    depth: 0,
    lastBest: null,
    status: 'Откройте chess.com',
    movesMade: 0,
    evalHistory: [0]
  }
};

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function getErrorDesc(rate) {
  if (rate === 0) return 'Только лучшие ходы (выкл)';
  if (rate <= 10) return 'Редко (~1 из 10 ходов)';
  if (rate <= 20) return 'Умеренно (~1 из 5 ходов)';
  if (rate <= 35) return 'Часто (~1 из 3 ходов)';
  if (rate <= 50) return 'Каждый 2-й ход';
  return 'Почти каждый ход';
}

function getPatternBadgeText(pat, rate, step) {
  if (pat === 'chance') return `Шанс: ${rate}%`;
  if (pat === 'every2') return 'Каждый 2-й ход';
  if (pat === 'every3') return 'Каждый 3-й ход';
  if (pat === 'every4') return 'Каждый 4-й ход';
  return `Каждый ${step}-й ход`;
}

function getThemeObj(id) {
  return THEMES.find(t => t.id === id) || THEMES[0];
}

/* ===== Мини-доска ===== */
function renderMiniBoard(board, flipped, lastBest, themeId) {
  let html = '';
  for (let R = 0; R < 8; R++) {
    for (let C = 0; C < 8; C++) {
      const fileIdx = flipped ? 7 - C : C;
      const rank = flipped ? R + 1 : 8 - R;
      const sq = FILES[fileIdx] + rank;
      const piece = board ? board[sq] : null;
      const isLight = (fileIdx + rank) % 2 === 0;
      let cls = 'ca-mb-sq ' + (isLight ? 'lt' : 'dk');
      if (lastBest) {
        if (lastBest.from === sq) cls += ' from';
        else if (lastBest.to === sq) cls += ' to';
      }
      html += `<div class="${cls}">`;
      if (piece) {
        html += `<span class="ca-mb-pc ${piece[0]}">${PIECE_SYMBOLS[piece[1]] || ''}</span>`;
      }
      html += '</div>';
    }
  }
  els.mbGrid.innerHTML = html;

  if (!lastBest) {
    els.mbArrow.innerHTML = '';
    return;
  }

  const cell = 156 / 8;
  const pos = sq => {
    const f = FILES.indexOf(sq[0]);
    const r = +sq[1];
    return flipped
      ? { x: (7 - f + 0.5) * cell, y: (r - 1 + 0.5) * cell }
      : { x: (f + 0.5) * cell, y: (8 - r + 0.5) * cell };
  };
  const a = pos(lastBest.from);
  const b = pos(lastBest.to);
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const endX = b.x - Math.cos(angle) * (cell * 0.34);
  const endY = b.y - Math.sin(angle) * (cell * 0.34);
  const hs = cell * 0.42;
  const p1x = endX + Math.cos(angle) * hs, p1y = endY + Math.sin(angle) * hs;
  const p2x = endX + Math.cos(angle + Math.PI / 2) * hs * 0.56, p2y = endY + Math.sin(angle + Math.PI / 2) * hs * 0.56;
  const p3x = endX + Math.cos(angle - Math.PI / 2) * hs * 0.56, p3y = endY + Math.sin(angle - Math.PI / 2) * hs * 0.56;

  let col = getThemeObj(themeId).arrow;
  if (lastBest && lastBest.isError) {
    if (lastBest.tag === 'Зевок') col = '#71717a';
    else if (lastBest.tag === 'Ошибка') col = '#a1a1aa';
    else if (lastBest.tag === 'Неточность') col = '#e4e4e7';
  }

  els.mbArrow.innerHTML = `
    <line x1="${a.x}" y1="${a.y}" x2="${endX}" y2="${endY}"
          stroke="${col}" stroke-opacity="0.92" stroke-width="${cell * 0.17}" stroke-linecap="round"
          style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))"/>
    <polygon points="${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y}"
             fill="${col}" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6))"/>`;
}

/* ===== График оценки партии ===== */
function renderEvalGraph(history, themeId) {
  const W = 300;
  const H = 58;
  const midY = H / 2;
  const padX = 6;
  const padY = 5;
  const col = getThemeObj(themeId).arrow;

  const data = Array.isArray(history) && history.length ? history : [0];
  const points = data.length === 1 ? [data[0], data[0]] : data;

  const toY = cp => {
    const norm = Math.tanh(Math.max(-2000, Math.min(2000, cp)) / 420);
    return midY - norm * (midY - padY);
  };

  const coords = points.map((cp, i) => {
    const x = padX + (i / (points.length - 1)) * (W - padX * 2);
    const y = toY(cp);
    return { x, y };
  });

  const lineD = coords.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaD = `${lineD} L${coords[coords.length - 1].x.toFixed(1)},${midY} L${coords[0].x.toFixed(1)},${midY} Z`;
  const last = coords[coords.length - 1];

  const lastCp = data[data.length - 1] || 0;
  if (Math.abs(lastCp) >= 9000) {
    els.graphMeta.textContent = lastCp > 0 ? 'Белые: Мат' : 'Чёрные: Мат';
  } else {
    els.graphMeta.textContent = (lastCp > 0 ? '+' : '') + (lastCp / 100).toFixed(2);
  }

  els.graphSvg.innerHTML = `
    <defs>
      <clipPath id="ca-clip-white">
        <rect x="0" y="0" width="${W}" height="${midY}" />
      </clipPath>
      <clipPath id="ca-clip-black">
        <rect x="0" y="${midY}" width="${W}" height="${midY}" />
      </clipPath>
      <linearGradient id="ca-grad-white" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${col}" stop-opacity="0.55" />
        <stop offset="100%" stop-color="${col}" stop-opacity="0.06" />
      </linearGradient>
      <linearGradient id="ca-grad-black" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#52525b" stop-opacity="0.06" />
        <stop offset="100%" stop-color="#52525b" stop-opacity="0.38" />
      </linearGradient>
    </defs>
    <line x1="0" y1="${midY}" x2="${W}" y2="${midY}"
          stroke="rgba(255,255,255,0.16)" stroke-width="1" stroke-dasharray="3,3" />
    <path d="${areaD}" fill="url(#ca-grad-white)" clip-path="url(#ca-clip-white)" />
    <path d="${areaD}" fill="url(#ca-grad-black)" clip-path="url(#ca-clip-black)" />
    <path d="${lineD}" fill="none" stroke="${col}" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="4.5" fill="${col}" fill-opacity="0.28" />
    <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="2.5" fill="${col}" />
  `;
}

/* ===== Отрисовка сохраненных конфигов ===== */
function renderUserConfigs(configs) {
  const list = configs || [];
  els.cfgCount.textContent = list.length;
  if (!list.length) {
    els.userCfgList.innerHTML = '<div class="ca-empty-cfg">Нет сохранённых профилей</div>';
    return;
  }
  els.userCfgList.innerHTML = list.map(c => `
    <div class="ca-user-cfg-card" data-id="${c.id}">
      <div class="ca-cfg-card-left">
        <span class="ca-cfg-card-name">${escapeHtml(c.name)}</span>
        <span class="ca-cfg-card-date">${c.date || ''} • ${c.settings?.mode || 'custom'}</span>
      </div>
      <div class="ca-cfg-card-actions">
        <button class="ca-load-btn" data-apply-id="${c.id}">Применить</button>
        <button class="ca-icon-action-btn" data-dl-id="${c.id}" title="Скачать .cfg">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="ca-icon-action-btn del" data-del-id="${c.id}" title="Удалить">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

/* ===== Экспорт и импорт .cfg ===== */
function exportActiveConfig() {
  const configData = {
    app: 'Ch3ss Client',
    version: '1.1',
    createdAt: new Date().toISOString(),
    name: currentState.mode || 'config',
    settings: {
      mode: currentState.mode,
      errorPattern: currentState.errorPattern,
      errorRate: currentState.errorRate,
      errorStep: currentState.errorStep,
      errorType: currentState.errorType,
      safeMargin: currentState.safeMargin,
      protectMate: currentState.protectMate,
      dynamicTiming: currentState.dynamicTiming,
      delayMin: currentState.delayMin,
      delayMax: currentState.delayMax,
      autoQueue: currentState.autoQueue,
      showArrow: currentState.showArrow,
      sound: currentState.sound,
      theme: currentState.theme
    }
  };
  const jsonStr = JSON.stringify(configData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chess_${currentState.mode || 'config'}.cfg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportSavedConfig(cfgId) {
  const list = currentState.configs || [];
  const item = list.find(c => c.id === cfgId);
  if (!item) return;
  const configData = {
    app: 'Ch3ss Client',
    version: '1.1',
    createdAt: new Date().toISOString(),
    name: item.name,
    settings: item.settings
  };
  const jsonStr = JSON.stringify(configData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${item.name.replace(/\s+/g, '_')}.cfg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function importConfigFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const obj = JSON.parse(e.target.result);
      const s = obj.settings || obj;
      const patch = {};
      if (s.mode !== undefined) patch.mode = s.mode;
      if (s.errorPattern !== undefined) patch.errorPattern = s.errorPattern;
      if (s.errorRate !== undefined) patch.errorRate = s.errorRate;
      if (s.errorStep !== undefined) patch.errorStep = s.errorStep;
      if (s.errorType !== undefined) patch.errorType = s.errorType;
      if (s.safeMargin !== undefined) patch.safeMargin = s.safeMargin;
      if (s.protectMate !== undefined) patch.protectMate = s.protectMate;
      if (s.dynamicTiming !== undefined) patch.dynamicTiming = s.dynamicTiming;
      if (s.delayMin !== undefined) patch.delayMin = s.delayMin;
      if (s.delayMax !== undefined) patch.delayMax = s.delayMax;
      if (s.autoQueue !== undefined) patch.autoQueue = s.autoQueue;
      if (s.showArrow !== undefined) patch.showArrow = s.showArrow;

      const profileName = obj.name || file.name.replace(/\.(cfg|json)$/i, '') || 'Импортированный';
      const existing = currentState.configs || [];
      const newCfg = {
        id: 'cfg_' + Date.now(),
        name: profileName,
        date: new Date().toLocaleDateString('ru-RU'),
        settings: { ...currentState, ...patch }
      };
      patch.configs = [newCfg, ...existing.filter(c => c.name !== profileName)];
      extApi.storage.local.set(patch);
    } catch (err) {
      alert('Ошибка при импорте .cfg файла: ' + err.message);
    }
  };
  reader.readAsText(file);
}

/* ===== Переключение вкладок ===== */
function switchTab(tabKey) {
  const valid = ['game', 'human', 'configs'];
  const safeTab = valid.includes(tabKey) ? tabKey : 'game';
  currentState.activeTab = safeTab;
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === safeTab));
  tabPanes.forEach(p => p.classList.toggle('active', p.id === `pane-${safeTab}`));
  extApi.storage.local.set({ activeTab: safeTab });
}

/* ===== Обновление всего UI ===== */
function renderAll(st) {
  currentState = { ...currentState, ...st, live: { ...currentState.live, ...(st.live || {}) } };
  const {
    running, mode = 'human_safe', autoQueue = true, showArrow = true, sound = true, theme = 'mono',
    errorRate = 15, errorPattern = 'chance', errorStep = 2, errorType = 'inaccuracy',
    protectMate = true, safeMargin = 120, delayMin = 1000, delayMax = 2600, dynamicTiming = true,
    configs = [], activeTab = 'game', live
  } = currentState;

  const validTabs = ['game', 'human', 'configs'];
  const safeTab = validTabs.includes(activeTab) ? activeTab : 'game';
  currentState.activeTab = safeTab;

  document.body.dataset.theme = theme;
  document.body.classList.toggle('running', !!running);

  // Старт/Стоп кнопка
  els.startBtn.classList.toggle('running', !!running);
  els.startTxt.textContent = running ? 'Остановить' : 'Запустить';
  els.startIcon.innerHTML = running
    ? '<rect x="4" y="4" width="16" height="16" rx="2"></rect>'
    : '<polygon points="5 3 19 12 5 21 5 3"></polygon>';

  // Вкладки
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === safeTab));
  tabPanes.forEach(p => p.classList.toggle('active', p.id === `pane-${safeTab}`));

  // Режимы
  modeBtns.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  // Тумблеры
  els.autoQueue.checked = !!autoQueue;
  els.showArrow.checked = !!showArrow;

  // Звук
  els.soundIcon.innerHTML = sound
    ? '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>'
    : '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line>';
  els.soundBtn.classList.toggle('muted', !sound);

  // Humanizer: паттерны
  patBtns.forEach(b => b.classList.toggle('active', b.dataset.pat === errorPattern));
  els.chanceBox.style.display = (errorPattern === 'chance') ? 'flex' : 'none';
  els.stepBox.style.display = (errorPattern === 'everyN') ? 'block' : 'none';
  els.errorRate.value = errorRate;
  els.errorStep.value = errorStep;
  els.errorHint.textContent = getErrorDesc(errorRate);
  els.patBadge.textContent = getPatternBadgeText(errorPattern, errorRate, errorStep);
  rateChips.forEach(c => c.classList.toggle('active', +c.dataset.rate === errorRate));

  // Humanizer: типы
  typeBtns.forEach(b => b.classList.toggle('active', b.dataset.type === errorType));

  // Humanizer: безопасность
  marginBtns.forEach(b => b.classList.toggle('active', +b.dataset.margin === safeMargin));
  els.safeBadge.textContent = safeMargin === 0 ? 'Без лимита (0.0)' : `Safe (+${(safeMargin / 100).toFixed(1)})`;
  els.protectMate.checked = !!protectMate;

  // Humanizer: тайминги
  els.dynamicTiming.checked = !!dynamicTiming;
  els.delayMin.value = delayMin;
  els.delayMinVal.textContent = `${delayMin} мс`;
  els.delayMax.value = delayMax;
  els.delayMaxVal.textContent = `${delayMax} мс`;

  // Очередь хода и eval-бар
  els.turnPill.classList.toggle('black', live.turn === 'b');
  els.turnTxt.textContent = live.turn === 'b' ? 'Ход чёрных' : 'Ход белых';

  const whiteScore = live.turn === 'w' ? live.scoreNum : -live.scoreNum;
  const pct = live.isMate
    ? (whiteScore > 0 ? 100 : 0)
    : 50 + 46 * Math.tanh(Math.max(-2000, Math.min(2000, whiteScore)) / 420);
  els.evalFill.style.height = pct + '%';

  els.evalVal.textContent = live.bestScore || '0.00';
  els.evalVal.className = 'ca-stat-val ' + (live.scoreNum > 40 ? 'pos' : live.scoreNum < -40 ? 'neg' : '');
  els.depthVal.textContent = live.depth || '—';
  els.moveVal.textContent = live.lastBest ? `${live.lastBest.from} → ${live.lastBest.to}` : '—';

  if (live.lastBest && live.lastBest.isError && live.lastBest.tag) {
    els.advTag.textContent = live.lastBest.tag;
    els.advTag.className = 'ca-adv-tag ' + (
      live.lastBest.tag === 'Зевок' ? 'blunder' :
      live.lastBest.tag === 'Ошибка' ? 'mistake' : 'inacc'
    );
  } else {
    els.advTag.className = 'ca-adv-tag';
    if (live.isMate) els.advTag.textContent = live.scoreNum > 0 ? 'Мат!' : 'Опасно';
    else if (live.scoreNum >= 350) els.advTag.textContent = 'Победа';
    else if (live.scoreNum >= 120) els.advTag.textContent = 'Перевес';
    else if (live.scoreNum <= -250) els.advTag.textContent = 'Тяжело';
    else if (live.scoreNum <= -100) els.advTag.textContent = 'Хуже';
    else els.advTag.textContent = 'Равно';
  }

  els.statusTxt.textContent = live.status || 'Готов к работе';
  els.movesCount.textContent = `Ходов: ${live.movesMade || 0}`;

  renderMiniBoard(live.board, live.flipped, live.lastBest, theme);
  renderEvalGraph(live.evalHistory, theme);
  renderUserConfigs(configs);
}

/* ===== События вкладки ===== */
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

els.openTab.addEventListener('click', () => {
  extApi.runtime.sendMessage({ type: 'ENSURE_CHESS_TAB', focus: true });
});

els.themeBtn.addEventListener('click', () => {
  const idx = THEMES.findIndex(t => t.id === currentState.theme);
  const next = THEMES[(idx + 1) % THEMES.length].id;
  extApi.storage.local.set({ theme: next });
});

els.soundBtn.addEventListener('click', () => {
  extApi.storage.local.set({ sound: !currentState.sound });
});

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    extApi.storage.local.set({ mode: btn.dataset.mode });
  });
});

els.autoQueue.addEventListener('change', () => {
  extApi.storage.local.set({ autoQueue: els.autoQueue.checked });
});

els.showArrow.addEventListener('change', () => {
  extApi.storage.local.set({ showArrow: els.showArrow.checked });
});

els.graphReset.addEventListener('click', () => {
  extApi.storage.local.set({
    live: { ...currentState.live, evalHistory: [0], movesMade: 0 }
  });
});

// Humanizer events
patBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    extApi.storage.local.set({ errorPattern: btn.dataset.pat });
  });
});

els.errorRate.addEventListener('input', () => {
  const val = parseInt(els.errorRate.value, 10);
  els.errorHint.textContent = getErrorDesc(val);
  els.patBadge.textContent = getPatternBadgeText('chance', val, currentState.errorStep);
  rateChips.forEach(c => c.classList.toggle('active', +c.dataset.rate === val));
  extApi.storage.local.set({ errorRate: val });
});

rateChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const val = parseInt(chip.dataset.rate, 10);
    extApi.storage.local.set({ errorRate: val });
  });
});

els.errorStep.addEventListener('change', () => {
  const val = Math.max(1, parseInt(els.errorStep.value, 10) || 2);
  extApi.storage.local.set({ errorStep: val });
});

typeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    extApi.storage.local.set({ errorType: btn.dataset.type });
  });
});

marginBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    extApi.storage.local.set({ safeMargin: parseInt(btn.dataset.margin, 10) });
  });
});

els.protectMate.addEventListener('change', () => {
  extApi.storage.local.set({ protectMate: els.protectMate.checked });
});

els.dynamicTiming.addEventListener('change', () => {
  extApi.storage.local.set({ dynamicTiming: els.dynamicTiming.checked });
});

els.delayMin.addEventListener('input', () => {
  const val = parseInt(els.delayMin.value, 10);
  els.delayMinVal.textContent = `${val} мс`;
  if (val > parseInt(els.delayMax.value, 10)) {
    els.delayMax.value = val;
    els.delayMaxVal.textContent = `${val} мс`;
    extApi.storage.local.set({ delayMin: val, delayMax: val });
  } else {
    extApi.storage.local.set({ delayMin: val });
  }
});

els.delayMax.addEventListener('input', () => {
  const val = parseInt(els.delayMax.value, 10);
  els.delayMaxVal.textContent = `${val} мс`;
  if (val < parseInt(els.delayMin.value, 10)) {
    els.delayMin.value = val;
    els.delayMinVal.textContent = `${val} мс`;
    extApi.storage.local.set({ delayMin: val, delayMax: val });
  } else {
    extApi.storage.local.set({ delayMax: val });
  }
});

// Configs events
els.cfgExportBtn.addEventListener('click', exportActiveConfig);

els.cfgImportBtn.addEventListener('click', () => {
  els.cfgFileInput.value = '';
  els.cfgFileInput.click();
});

els.cfgFileInput.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) {
    importConfigFile(e.target.files[0]);
  }
});

els.saveCfgBtn.addEventListener('click', () => {
  const name = (els.newCfgName.value || '').trim();
  if (!name) return;
  const existing = currentState.configs || [];
  const newCfg = {
    id: 'cfg_' + Date.now(),
    name,
    date: new Date().toLocaleDateString('ru-RU'),
    settings: {
      mode: currentState.mode,
      errorPattern: currentState.errorPattern,
      errorRate: currentState.errorRate,
      errorStep: currentState.errorStep,
      errorType: currentState.errorType,
      safeMargin: currentState.safeMargin,
      protectMate: currentState.protectMate,
      dynamicTiming: currentState.dynamicTiming,
      delayMin: currentState.delayMin,
      delayMax: currentState.delayMax,
      autoQueue: currentState.autoQueue,
      showArrow: currentState.showArrow
    }
  };
  const updated = [newCfg, ...existing.filter(c => c.name !== name)];
  els.newCfgName.value = '';
  extApi.storage.local.set({ configs: updated });
});

presetLoadBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const p = btn.dataset.preset;
    if (p === 'human_safe') {
      extApi.storage.local.set({
        mode: 'human_safe',
        errorPattern: 'chance',
        errorRate: 15,
        errorType: 'inaccuracy',
        safeMargin: 120,
        protectMate: true,
        dynamicTiming: true,
        delayMin: 1000,
        delayMax: 2600
      });
    } else if (p === 'legit') {
      extApi.storage.local.set({
        mode: 'legit',
        errorPattern: 'every4',
        errorStep: 4,
        errorRate: 20,
        errorType: 'inaccuracy',
        safeMargin: 70,
        protectMate: true,
        dynamicTiming: true,
        delayMin: 700,
        delayMax: 1800
      });
    } else if (p === 'autowin') {
      extApi.storage.local.set({
        mode: 'autowin',
        errorPattern: 'chance',
        errorRate: 0,
        errorType: 'inaccuracy',
        safeMargin: 0,
        protectMate: true,
        dynamicTiming: false,
        delayMin: 120,
        delayMax: 250
      });
    }
  });
});

els.userCfgList.addEventListener('click', e => {
  const applyBtn = e.target.closest('[data-apply-id]');
  if (applyBtn) {
    const id = applyBtn.dataset.applyId;
    const cfg = (currentState.configs || []).find(c => c.id === id);
    if (cfg && cfg.settings) extApi.storage.local.set(cfg.settings);
    return;
  }
  const dlBtn = e.target.closest('[data-dl-id]');
  if (dlBtn) {
    exportSavedConfig(dlBtn.dataset.dlId);
    return;
  }
  const delBtn = e.target.closest('[data-del-id]');
  if (delBtn) {
    const id = delBtn.dataset.delId;
    const updated = (currentState.configs || []).filter(c => c.id !== id);
    extApi.storage.local.set({ configs: updated });
  }
});

// Старт / Стоп
els.startBtn.addEventListener('click', () => {
  const nextRunning = !currentState.running;
  extApi.storage.local.set({ running: nextRunning });
  if (nextRunning) {
    extApi.runtime.sendMessage({ type: 'ENSURE_CHESS_TAB', focus: false });
  }
});

// Первоначальная загрузка и подписка
extApi.storage.local.get(null).then(data => renderAll(data));
extApi.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  const patch = {};
  for (const [k, v] of Object.entries(changes)) patch[k] = v.newValue;
  renderAll(patch);
});
