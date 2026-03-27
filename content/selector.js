// PostSnap Content Script — Element & Region Selector

(function() {
  'use strict';

  let mode = null; // 'element' | 'region'
  let hoveredEl = null;
  let tooltip = null;
  let regionOverlay = null;
  let regionBox = null;
  let startX, startY, isDragging = false;

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'startElementSelector') {
      startElementMode();
      sendResponse({ ok: true });
    } else if (msg.action === 'startRegionSelector') {
      startRegionMode();
      sendResponse({ ok: true });
    }
  });

  function showTooltip(text) {
    removeTooltip();
    tooltip = document.createElement('div');
    tooltip.className = 'postsnap-tooltip';
    tooltip.textContent = text;
    document.body.appendChild(tooltip);
  }

  function removeTooltip() {
    if (tooltip) { tooltip.remove(); tooltip = null; }
  }

  // ─── Element Mode ───
  function startElementMode() {
    cleanup();
    mode = 'element';
    showTooltip('Click any element to capture · ESC to cancel · Scroll to resize selection');
    document.addEventListener('mouseover', onElementHover, true);
    document.addEventListener('mouseout', onElementOut, true);
    document.addEventListener('click', onElementClick, true);
    document.addEventListener('keydown', onEscape, true);
    document.addEventListener('wheel', onElementScroll, { capture: true, passive: false });
    selectedDepth = 0;
    hoveredStack = [];
  }

  let selectedDepth = 0;
  let hoveredStack = [];

  function buildAncestorStack(el) {
    const stack = [];
    let node = el;
    while (node && node !== document.body && node !== document.documentElement) {
      stack.push(node);
      node = node.parentElement;
    }
    return stack;
  }

  function onElementHover(e) {
    if (mode !== 'element') return;
    e.stopPropagation();
    if (hoveredEl) hoveredEl.classList.remove('postsnap-hover-outline');
    hoveredStack = buildAncestorStack(e.target);
    selectedDepth = 0;
    hoveredEl = hoveredStack[selectedDepth] || e.target;
    hoveredEl.classList.add('postsnap-hover-outline');
  }

  function onElementScroll(e) {
    if (mode !== 'element') return;
    e.preventDefault();
    e.stopPropagation();
    if (hoveredStack.length === 0) return;

    if (hoveredEl) hoveredEl.classList.remove('postsnap-hover-outline');

    // Scroll up = go to parent, scroll down = go to child
    if (e.deltaY > 0) {
      selectedDepth = Math.max(0, selectedDepth - 1);
    } else {
      selectedDepth = Math.min(hoveredStack.length - 1, selectedDepth + 1);
    }

    hoveredEl = hoveredStack[selectedDepth];
    hoveredEl.classList.add('postsnap-hover-outline');
  }

  function onElementOut(e) {
    if (mode !== 'element') return;
    // Don't remove outline on mouseout — only on new hover
  }

  function onElementClick(e) {
    if (mode !== 'element') return;
    e.preventDefault();
    e.stopPropagation();

    const el = hoveredEl || e.target;
    if (el) el.classList.remove('postsnap-hover-outline');

    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    const crop = {
      x: Math.max(0, Math.round(rect.left * dpr)),
      y: Math.max(0, Math.round(rect.top * dpr)),
      width: Math.round(rect.width * dpr),
      height: Math.round(rect.height * dpr)
    };

    cleanup();
    chrome.runtime.sendMessage({ action: 'captureAndOpenEditor', crop });
  }

  // ─── Region Mode ───
  function startRegionMode() {
    cleanup();
    mode = 'region';
    showTooltip('Drag to select a region · ESC to cancel');

    regionOverlay = document.createElement('div');
    regionOverlay.className = 'postsnap-region-overlay';
    document.body.appendChild(regionOverlay);

    regionBox = document.createElement('div');
    regionBox.className = 'postsnap-region-selection';
    regionBox.style.display = 'none';
    document.body.appendChild(regionBox);

    regionOverlay.addEventListener('mousedown', onRegionStart);
    regionOverlay.addEventListener('mousemove', onRegionMove);
    regionOverlay.addEventListener('mouseup', onRegionEnd);
    document.addEventListener('keydown', onEscape, true);
  }

  function onRegionStart(e) {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    regionBox.style.display = 'block';
    regionBox.style.left = startX + 'px';
    regionBox.style.top = startY + 'px';
    regionBox.style.width = '0px';
    regionBox.style.height = '0px';
    regionBox.innerHTML = '';
  }

  function onRegionMove(e) {
    if (!isDragging) return;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    regionBox.style.left = x + 'px';
    regionBox.style.top = y + 'px';
    regionBox.style.width = w + 'px';
    regionBox.style.height = h + 'px';

    regionBox.innerHTML = `<span class="postsnap-region-dims">${w} × ${h}</span>`;
  }

  function onRegionEnd(e) {
    if (!isDragging) return;
    isDragging = false;

    const dpr = window.devicePixelRatio || 1;
    const x = Math.min(e.clientX, startX);
    const y = Math.min(e.clientY, startY);
    const w = Math.abs(e.clientX - startX);
    const h = Math.abs(e.clientY - startY);

    if (w < 10 || h < 10) {
      cleanup();
      return;
    }

    const crop = {
      x: Math.round(x * dpr),
      y: Math.round(y * dpr),
      width: Math.round(w * dpr),
      height: Math.round(h * dpr)
    };

    cleanup();
    chrome.runtime.sendMessage({ action: 'captureAndOpenEditor', crop });
  }

  // ─── Shared ───
  function onEscape(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      cleanup();
    }
  }

  function cleanup() {
    mode = null;
    isDragging = false;
    selectedDepth = 0;
    hoveredStack = [];
    removeTooltip();

    if (hoveredEl) { hoveredEl.classList.remove('postsnap-hover-outline'); hoveredEl = null; }
    document.removeEventListener('mouseover', onElementHover, true);
    document.removeEventListener('mouseout', onElementOut, true);
    document.removeEventListener('click', onElementClick, true);
    document.removeEventListener('wheel', onElementScroll, { capture: true });

    if (regionOverlay) { regionOverlay.remove(); regionOverlay = null; }
    if (regionBox) { regionBox.remove(); regionBox = null; }
    document.removeEventListener('keydown', onEscape, true);
  }
})();
