'use strict';

const DEFAULTS = {
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
    evalHistory: [0],
    updatedAt: 0
  }
};

function updateBadge(running) {
  try {
    if (extApi.action?.setBadgeText) {
      extApi.action.setBadgeText({ text: running ? 'ON' : '' });
    }
    if (extApi.action?.setBadgeBackgroundColor) {
      extApi.action.setBadgeBackgroundColor({ color: running ? '#ffffff' : '#27272a' });
    }
  } catch (_) {}
  try {
    extApi.runtime.sendNativeMessage('ch3ss_native', { type: 'STATE', running: !!running });
  } catch (_) {}
}

async function ensureDefaults() {
  try {
    const existing = await extApi.storage.local.get(Object.keys(DEFAULTS));
    const toSet = {};
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (existing[k] === undefined) toSet[k] = v;
    }
    if (Object.keys(toSet).length) {
      await extApi.storage.local.set(toSet);
    }
    updateBadge(!!existing.running);
  } catch (_) {}
}

extApi.runtime.onInstalled.addListener(() => { ensureDefaults(); });
extApi.runtime.onStartup.addListener(() => { ensureDefaults(); });
ensureDefaults();

extApi.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.running) {
    updateBadge(!!changes.running.newValue);
  }
});

/* ===== Local Stockfish Engine inside Background Origin (CSP-safe & Offline) ===== */
let sfWorker = null;
let sfReadyPromise = null;
let sfQueue = Promise.resolve();

function getStockfishWorker() {
  if (sfWorker) return Promise.resolve(sfWorker);
  if (sfReadyPromise) return sfReadyPromise;
  if (typeof Worker === 'undefined') {
    return Promise.reject(new Error('NO_BG_WORKER'));
  }

  sfReadyPromise = new Promise((resolve, reject) => {
    try {
      const url = extApi.runtime.getURL('vendor/stockfish.js');
      const w = new Worker(url);
      const t = setTimeout(() => {
        try { w.terminate(); } catch (_) {}
        sfReadyPromise = null;
        reject(new Error('SF_TIMEOUT'));
      }, 15000);

      const onMsg = e => {
        if (typeof e.data === 'string' && e.data.includes('uciok')) {
          clearTimeout(t);
          w.removeEventListener('message', onMsg);
          sfWorker = w;
          resolve(w);
        }
      };
      w.addEventListener('error', err => {
        clearTimeout(t);
        sfReadyPromise = null;
        reject(err || new Error('SF_ERROR'));
      }, { once: true });
      w.addEventListener('message', onMsg);
      w.postMessage('uci');
    } catch (e) {
      sfReadyPromise = null;
      reject(e);
    }
  });

  return sfReadyPromise;
}

function runUciAnalysis({ fen, movetime = 1000, skill = 20, multiPv = 1 }) {
  const job = async () => {
    const w = await getStockfishWorker();
    return new Promise((resolve, reject) => {
      let bestScore = '0.00', scoreNum = 0, depth = 0, isMate = false;
      const lines = [];
      const timeout = setTimeout(() => {
        w.removeEventListener('message', handler);
        try { w.postMessage('stop'); } catch (_) {}
        reject(new Error('ANALYZE_TIMEOUT'));
      }, 20000);

      const handler = e => {
        const line = typeof e.data === 'string' ? e.data : '';
        if (line.startsWith('info') && line.includes(' pv ')) {
          const dep = line.match(/\bdepth (\d+)\b/);
          const sc = line.match(/\bscore (cp|mate) (-?\d+)\b/);
          const mp = line.match(/\bmultipv (\d+)\b/);
          const pv = line.match(/\bpv (([a-h][1-8][a-h][1-8][qrbn]?)\b.*)/);

          const mpIdx = mp ? parseInt(mp[1], 10) : 1;
          const lineDep = dep ? parseInt(dep[1], 10) : 0;
          let lineScoreNum = 0;
          let lineBestScore = '0.00';
          let lineIsMate = false;

          if (sc) {
            if (sc[1] === 'mate') {
              lineIsMate = true;
              const n = +sc[2];
              lineBestScore = (n > 0 ? '+' : '-') + 'M' + Math.abs(n);
              lineScoreNum = n > 0 ? (9999 - n) : (-9999 - n);
            } else {
              lineIsMate = false;
              lineScoreNum = +sc[2];
              lineBestScore = (lineScoreNum > 0 ? '+' : '') + (lineScoreNum / 100).toFixed(2);
            }
          }

          if (pv) {
            lines[mpIdx - 1] = {
              mp: mpIdx,
              move: pv[2],
              scoreNum: lineScoreNum,
              bestScore: lineBestScore,
              isMate: lineIsMate,
              depth: lineDep
            };
          }

          if (mpIdx === 1) {
            if (dep) depth = lineDep;
            isMate = lineIsMate;
            scoreNum = lineScoreNum;
            bestScore = lineBestScore;
          }
        }

        if (line.startsWith('bestmove')) {
          clearTimeout(timeout);
          w.removeEventListener('message', handler);
          const rawBest = line.split(' ')[1];
          if (!lines[0] || !lines[0].move) {
            lines[0] = { mp: 1, move: rawBest, scoreNum, bestScore, isMate, depth };
          } else if (rawBest && rawBest !== '(none)') {
            lines[0].move = rawBest;
          }
          const validLines = lines.filter(l => l && l.move && l.move.length >= 4);
          resolve({
            ok: true,
            bestmove: lines[0]?.move || rawBest,
            bestScore,
            scoreNum,
            depth,
            isMate,
            validLines
          });
        }
      };

      w.addEventListener('message', handler);
      w.postMessage('stop');
      w.postMessage(`setoption name MultiPV value ${multiPv}`);
      w.postMessage(`setoption name Skill Level value ${skill}`);
      w.postMessage('position fen ' + fen);
      w.postMessage(`go movetime ${movetime}`);
    });
  };

  const next = sfQueue.then(job, job);
  sfQueue = next.catch(() => {});
  return next;
}

extApi.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === 'ANALYZE_FEN') {
    runUciAnalysis(msg)
      .then(res => sendResponse(res))
      .catch(err => sendResponse({ ok: false, error: err?.message || 'SF_FAILED' }));
    return true;
  }

  if (msg?.type === 'ENSURE_CHESS_TAB') {
    (async () => {
      try {
        extApi.runtime.sendNativeMessage('ch3ss_native', { type: 'OPEN_CHESS', focus: !!msg.focus });
      } catch (_) {}
      if (!extApi.tabs.available) {
        return { ok: true, existed: true };
      }
      const tabs = await extApi.tabs.query({ url: ['https://www.chess.com/*', 'https://chess.com/*'] });
      if (tabs.length > 0) {
        if (msg.focus) {
          await extApi.tabs.update(tabs[0].id, { active: true });
        }
        return { ok: true, existed: true, tabId: tabs[0].id };
      } else {
        const tab = await extApi.tabs.create({ url: 'https://www.chess.com/play/online', active: true });
        return { ok: true, existed: false, tabId: tab?.id };
      }
    })().then(sendResponse, () => sendResponse({ ok: false }));
    return true;
  }
});
