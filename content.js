// Global autoplay killer (document_start)
// Fixes: YouTube thumbs not loading, tab freezes / unresponsive pages.

(function () {
  const KEY = 'globalEnabled';
  let enabled = false;

  // Track recent user gesture (allow legit plays)
  let userGesture = false;
  const GESTURE_MS = 5000;
  const flagGesture = () => {
    userGesture = true;
    setTimeout(() => { userGesture = false; }, GESTURE_MS);
  };
  ['pointerdown','keydown','mousedown','touchstart'].forEach(ev =>
    addEventListener(ev, flagGesture, { capture: true, passive: true })
  );

  // Markers to avoid duplicate work/listeners
  const SYM_INIT = Symbol('apk_init');         // element wired once
  const SYM_PLAY_HDL = Symbol('apk_play_hdl'); // play handler ref

  function hardStop(el) {
    try { el.pause && el.pause(); } catch {}
    el.autoplay = false;
    // Don't force el.muted=false globally; that breaks some sites (YouTube previews).
    // Just remove the autoplay attribute; let site manage muted as it wishes.
    if (el.hasAttribute('autoplay')) el.removeAttribute('autoplay');
    if (el.preload !== 'metadata') el.preload = 'metadata';
  }

  function wireMedia(el) {
    if (!(el instanceof HTMLMediaElement)) return;
    if (el[SYM_INIT]) {
      // Refresh the autoplay/preload bits minimally
      if (enabled) {
        if (el.autoplay || el.hasAttribute('autoplay')) { el.autoplay = false; el.removeAttribute('autoplay'); }
        if (el.preload !== 'metadata') el.preload = 'metadata';
        if (!userGesture && !el.paused) hardStop(el);
      }
      return;
    }

    // One-time listener per element
    const onPlay = () => {
      if (!enabled) return;
      if (!userGesture) hardStop(el);
    };
    el.addEventListener('play', onPlay, { capture: true });
    el[SYM_PLAY_HDL] = onPlay;

    // Initial sanitize
    if (enabled) {
      if (el.autoplay || el.hasAttribute('autoplay')) { el.autoplay = false; el.removeAttribute('autoplay'); }
      if (el.preload !== 'metadata') el.preload = 'metadata';
      if (!userGesture && !el.paused) hardStop(el);
    }

    el[SYM_INIT] = true;
  }

  function unwireMedia(el) {
    if (!(el instanceof HTMLMediaElement)) return;
    if (el[SYM_PLAY_HDL]) {
      try { el.removeEventListener('play', el[SYM_PLAY_HDL], { capture: true }); } catch {}
      el[SYM_PLAY_HDL] = null;
    }
    el[SYM_INIT] = false;
  }

  // Batch new/changed nodes to avoid thrashing (esp. on YouTube)
  let pending = new Set();
  let scheduled = false;
  function scheduleFlush() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      if (!pending.size) return;
      const take = pending;
      pending = new Set();
      take.forEach(node => {
        if (node instanceof HTMLMediaElement) wireMedia(node);
        else if (node?.querySelectorAll) node.querySelectorAll('video,audio').forEach(wireMedia);
      });
    });
  }

  const mo = new MutationObserver(muts => {
    if (!enabled) return; // idle when OFF
    for (const m of muts) {
      if (m.type === 'childList') {
        m.addedNodes.forEach(n => { pending.add(n); });
      } else if (m.type === 'attributes') {
        if (m.target instanceof HTMLMediaElement) pending.add(m.target);
      }
    }
    scheduleFlush();
  });

  function startObserver() {
    mo.observe(document.documentElement || document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['autoplay','preload'] // avoid noisy 'muted' churn on YT
    });
  }
  function stopObserver() {
    try { mo.disconnect(); } catch {}
  }

  // Initial sweep (cheap)
  function initialWire() {
    document.querySelectorAll('video,audio').forEach(wireMedia);
  }

  // Minimal YouTube nudge (no heavy polling)
  function youtubeNudge() {
    const host = location.hostname;
    if (host.endsWith('youtube.com') || host === 'youtu.be') {
      try {
        localStorage.setItem('yt-player-autoplay','false');
        localStorage.setItem('yt.autonav::autonav_disabled','true');
      } catch {}
      // Pause main player once per navigation settle (event not always present; safe no-op)
      const pause = () => {
        if (!enabled) return;
        const v = document.querySelector('video');
        if (v && !userGesture) hardStop(v);
      };
      addEventListener('yt-navigate-finish', () => setTimeout(pause, 0), true);
      // Also nudge shortly after load
      setTimeout(pause, 800);
    }
  }

  function applyState() {
    if (enabled) {
      initialWire();
      startObserver();
      youtubeNudge();
    } else {
      stopObserver();
      // Keep listeners (cheap) but they won't fire heavy logic while disabled
    }
  }

  // Read initial state
  chrome.storage.sync.get(KEY, (o) => {
    enabled = !!o[KEY];
    applyState();
  });

  // Live toggle
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'sync' || !(KEY in changes)) return;
    enabled = !!changes[KEY].newValue;
    applyState();
    if (enabled) initialWire();
  });
})();
