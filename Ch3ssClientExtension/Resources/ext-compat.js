(function () {
  'use strict';
  if (globalThis.extApi) return;

  const raw = (typeof browser !== 'undefined' && browser && browser.runtime)
    ? browser
    : (typeof chrome !== 'undefined' ? chrome : null);

  const isBrowserPromise = (typeof browser !== 'undefined' && raw === browser);

  function promisify(obj, method, ...args) {
    if (!obj || typeof obj[method] !== 'function') {
      return Promise.resolve(undefined);
    }
    if (isBrowserPromise) {
      try {
        return Promise.resolve(obj[method](...args));
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return new Promise((resolve, reject) => {
      try {
        obj[method](...args, res => {
          const err = raw?.runtime?.lastError;
          if (err) reject(new Error(err.message || String(err)));
          else resolve(res);
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  globalThis.extApi = {
    raw,
    storage: {
      local: {
        get: (keys = null) => promisify(raw?.storage?.local, 'get', keys).then(r => r || {}),
        set: (items) => promisify(raw?.storage?.local, 'set', items).catch(() => {})
      },
      onChanged: raw?.storage?.onChanged || { addListener() {} }
    },
    runtime: {
      id: raw?.runtime?.id,
      getURL: (path) => raw?.runtime?.getURL ? raw.runtime.getURL(path) : path,
      sendMessage: (msg) => promisify(raw?.runtime, 'sendMessage', msg).catch(() => null),
      sendNativeMessage: (appId, msg) => promisify(raw?.runtime, 'sendNativeMessage', appId, msg).catch(() => null),
      onMessage: raw?.runtime?.onMessage || { addListener() {} },
      onInstalled: raw?.runtime?.onInstalled || { addListener() {} },
      onStartup: raw?.runtime?.onStartup || { addListener() {} }
    },
    tabs: {
      available: !!(raw?.tabs?.query),
      query: (q) => promisify(raw?.tabs, 'query', q).then(r => r || []).catch(() => []),
      update: (id, props) => promisify(raw?.tabs, 'update', id, props).catch(() => null),
      create: (props) => promisify(raw?.tabs, 'create', props).catch(() => null)
    },
    action: raw?.action || raw?.browserAction || null
  };
})();
