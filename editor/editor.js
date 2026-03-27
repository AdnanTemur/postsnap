// PostSnap Editor — Canvas Engine

(function() {
  'use strict';

  // ─── State ───
  const state = {
    image: null,
    crop: null,
    bg: { type: 'gradient', color1: '#ff6b35', color2: '#ff3366', direction: 135, solid: '#1a1a2e' },
    padding: 64,
    radius: 12,
    frame: 'none',
    shadow: 'medium',
    shadowCustom: { blur: 20, spread: 0, opacity: 30, color: '#000000' },
    text: { title: '', size: 24, color: '#ffffff', position: 'top', font: 'Outfit' },
    watermark: true,
    aspect: 'free',
    codeTheme: 'dracula',
    codeFontSize: 14,
    codeLineNums: true,
    exportFormat: 'png',
    exportQuality: 0.92,
    exportScale: 1,
  };

  // ─── Gradient Presets ───
  const GRADIENTS = [
    { c1: '#ff6b35', c2: '#ff3366', dir: 135, name: 'Sunset' },
    { c1: '#ff3366', c2: '#8b5cf6', dir: 135, name: 'Berry' },
    { c1: '#8b5cf6', c2: '#06b6d4', dir: 135, name: 'Cosmic' },
    { c1: '#06b6d4', c2: '#10b981', dir: 135, name: 'Ocean' },
    { c1: '#10b981', c2: '#eab308', dir: 135, name: 'Jungle' },
    { c1: '#eab308', c2: '#ff6b35', dir: 135, name: 'Fire' },
    { c1: '#ec4899', c2: '#f97316', dir: 90, name: 'Flamingo' },
    { c1: '#3b82f6', c2: '#8b5cf6', dir: 90, name: 'Indigo' },
    { c1: '#1e293b', c2: '#334155', dir: 180, name: 'Slate' },
    { c1: '#0f172a', c2: '#1e293b', dir: 180, name: 'Midnight' },
    { c1: '#fafafa', c2: '#e5e5e5', dir: 180, name: 'Snow' },
    { c1: '#fef3c7', c2: '#fde68a', dir: 135, name: 'Cream' },
    { c1: '#f0abfc', c2: '#c084fc', dir: 135, name: 'Lavender' },
    { c1: '#a3e635', c2: '#22d3ee', dir: 135, name: 'Lime' },
    { c1: '#fb923c', c2: '#f43f5e', dir: 45, name: 'Coral' },
    { c1: '#2dd4bf', c2: '#818cf8', dir: 135, name: 'Aqua' },
  ];

  // ─── Frame Configs ───
  const FRAMES = {
    none: null,
    'macos-dark': { bg: '#1e1e1e', titlebar: 32, dots: ['#ff5f57','#febc2e','#28c840'], textColor: '#999', radius: 10 },
    'macos-light': { bg: '#ffffff', titlebar: 32, dots: ['#ff5f57','#febc2e','#28c840'], textColor: '#666', radius: 10 },
    'browser-dark': { bg: '#1e1e1e', titlebar: 40, addressbar: true, textColor: '#999', radius: 10 },
    'browser-light': { bg: '#ffffff', titlebar: 40, addressbar: true, textColor: '#666', radius: 10 },
    'phone': { bg: '#000', bezel: 16, notch: true, radius: 28 },
  };

  // ─── Shadow Presets ───
  const SHADOWS = {
    none: null,
    light: { blur: 12, spread: 0, opacity: 15, color: '#000000' },
    medium: { blur: 24, spread: 0, opacity: 25, color: '#000000' },
    heavy: { blur: 48, spread: 4, opacity: 40, color: '#000000' },
    glow: { blur: 40, spread: 8, opacity: 30, color: '#8b5cf6' },
    colored: { blur: 32, spread: 4, opacity: 35, color: '#ff6b35' },
  };

  const canvas = document.getElementById('main-canvas');
  const ctx = canvas.getContext('2d');

  // ─── Init ───
  async function init() {
    // Read pending screenshot from IndexedDB (avoids chrome.storage 10MB quota)
    const pending = await getPending();
    if (pending) {
      state.crop = pending.crop || null;
      loadImage(pending.dataUrl);
      await clearPending();
    } else {
      document.getElementById('loading-screen').style.display = 'none';
      document.getElementById('editor-view').style.display = 'flex';
      document.getElementById('editor-view').style.flexDirection = 'column';
      document.getElementById('editor-view').style.height = '100vh';
    }

    setupUI();
    buildGradientGrid();
  }

  function loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      if (state.crop) {
        // Crop the image
        const tc = document.createElement('canvas');
        tc.width = state.crop.width;
        tc.height = state.crop.height;
        const tctx = tc.getContext('2d');
        tctx.drawImage(img, state.crop.x, state.crop.y, state.crop.width, state.crop.height, 0, 0, state.crop.width, state.crop.height);
        const cropped = new Image();
        cropped.onload = () => {
          state.image = cropped;
          finishLoad();
        };
        cropped.src = tc.toDataURL();
      } else {
        state.image = img;
        finishLoad();
      }
    };
    img.src = dataUrl;
  }

  function finishLoad() {
    document.getElementById('loading-screen').style.display = 'none';
    const ev = document.getElementById('editor-view');
    ev.style.display = 'flex';
    ev.style.flexDirection = 'column';
    ev.style.height = '100vh';
    render();
  }

  // ─── Render Engine ───
  function render() {
    if (!state.image) return;

    const img = state.image;
    const pad = state.padding;
    const frameConf = FRAMES[state.frame];
    const r = state.radius;

    // Original image size
    const origW = img.width;
    const origH = img.height;

    // Frame dimensions
    let frameTop = 0, frameBottom = 0, frameSide = 0;
    if (frameConf) {
      if (state.frame === 'phone') {
        frameTop = frameConf.bezel + 24;
        frameBottom = frameConf.bezel + 8;
        frameSide = frameConf.bezel;
      } else {
        frameTop = frameConf.titlebar;
        frameBottom = 0;
        frameSide = 0;
      }
    }

    // Text space
    let textTopH = 0, textBottomH = 0;
    if (state.text.title) {
      const lineH = state.text.size * 1.5;
      if (state.text.position === 'top') textTopH = lineH + 10;
      else textBottomH = lineH + 10;
    }

    // Content area = image + frame chrome
    let contentW = origW + frameSide * 2;
    let contentH = origH + frameTop + frameBottom;

    // For aspect ratio: compute total canvas size, then letterbox image inside
    let totalW, totalH;
    let imgDrawX, imgDrawY, imgDrawW, imgDrawH;

    if (state.aspect !== 'free') {
      const [aw, ah] = state.aspect.split(':').map(Number);
      const targetRatio = aw / ah;

      // Canvas = aspect ratio applied to the content+padding area
      // Start from original content dimensions, expand to match ratio
      const innerW = contentW + pad * 2;
      const innerH = contentH + pad * 2 + textTopH + textBottomH;
      const currentRatio = innerW / innerH;

      if (currentRatio > targetRatio) {
        // Too wide — increase height
        totalW = innerW;
        totalH = Math.round(innerW / targetRatio);
      } else {
        // Too tall — increase width
        totalH = innerH;
        totalW = Math.round(innerH * targetRatio);
      }

      // Image draws at its original size, centered in the available space
      const availW = totalW - pad * 2 - frameSide * 2;
      const availH = totalH - pad * 2 - frameTop - frameBottom - textTopH - textBottomH;

      // Scale image to fit within available area (contain)
      const scaleX = availW / origW;
      const scaleY = availH / origH;
      const scale = Math.min(scaleX, scaleY, 1); // Don't upscale

      imgDrawW = Math.round(origW * scale);
      imgDrawH = Math.round(origH * scale);

      // Recalculate content to match drawn image
      contentW = imgDrawW + frameSide * 2;
      contentH = imgDrawH + frameTop + frameBottom;

      // Center the content block in the canvas
      const contentX = Math.round((totalW - contentW) / 2);
      const contentYBase = Math.round((totalH - contentH - textTopH - textBottomH) / 2) + textTopH;
      imgDrawX = contentX + frameSide;
      imgDrawY = contentYBase + frameTop;
    } else {
      totalW = contentW + pad * 2;
      totalH = contentH + pad * 2 + textTopH + textBottomH;
      imgDrawW = origW;
      imgDrawH = origH;
      imgDrawX = pad + frameSide;
      imgDrawY = pad + textTopH + frameTop;
    }

    canvas.width = totalW;
    canvas.height = totalH;

    // Draw background
    drawBackground(totalW, totalH);

    // Compute content rect (frame + image area) for shadow/frame drawing
    const cX = imgDrawX - frameSide;
    const cY = imgDrawY - frameTop;
    const cW = imgDrawW + frameSide * 2;
    const cH = imgDrawH + frameTop + frameBottom;

    // ─── Shadow (offscreen canvas approach — no artifacts) ───
    const shadowConf = state.shadow === 'none' ? null :
      (SHADOWS[state.shadow] || state.shadowCustom);

    if (shadowConf) {
      const margin = shadowConf.blur * 2 + 20;
      const offW = cW + margin * 2;
      const offH = cH + margin * 2;
      const offCanvas = document.createElement('canvas');
      offCanvas.width = offW;
      offCanvas.height = offH;
      const offCtx = offCanvas.getContext('2d');

      // Draw shadow source shape on offscreen canvas
      offCtx.shadowBlur = shadowConf.blur;
      offCtx.shadowOffsetX = 0;
      offCtx.shadowOffsetY = Math.max(2, shadowConf.blur * 0.15);
      const alpha = Math.round(shadowConf.opacity * 2.55).toString(16).padStart(2, '0');
      offCtx.shadowColor = shadowConf.color + alpha;
      offCtx.fillStyle = 'rgba(0,0,0,1)';
      roundRect(offCtx, margin, margin, cW, cH, r, true, false);

      // Clear the inner shape so only shadow remains
      offCtx.save();
      offCtx.globalCompositeOperation = 'destination-out';
      offCtx.fillStyle = '#000';
      roundRect(offCtx, margin, margin, cW, cH, r, true, false);
      offCtx.restore();

      // Composite the shadow-only offscreen onto main canvas
      ctx.drawImage(offCanvas, cX - margin, cY - margin);
    }

    // ─── Frame ───
    if (frameConf) {
      drawFrame(cX, cY, cW, cH, frameConf);
    }

    // ─── Image with rounded corners ───
    ctx.save();
    if (r > 0 && !frameConf) {
      roundRectClip(ctx, imgDrawX, imgDrawY, imgDrawW, imgDrawH, r);
    }
    ctx.drawImage(img, 0, 0, origW, origH, imgDrawX, imgDrawY, imgDrawW, imgDrawH);
    ctx.restore();

    // ─── Text ───
    if (state.text.title) {
      ctx.save();
      ctx.font = `${state.text.size}px "${state.text.font}", sans-serif`;
      ctx.fillStyle = state.text.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (state.text.position === 'top') {
        ctx.fillText(state.text.title, totalW / 2, textTopH / 2 + 4);
      } else {
        ctx.fillText(state.text.title, totalW / 2, totalH - textBottomH / 2 - 4);
      }
      ctx.restore();
    }

    // ─── Watermark ───
    if (state.watermark) {
      ctx.save();
      ctx.font = '12px "Outfit", sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('Made with PostSnap', totalW - 16, totalH - 10);
      ctx.restore();
    }

    // Scale canvas to fit viewport
    fitCanvasToView();
  }

  function fitCanvasToView() {
    const area = document.getElementById('canvas-area');
    if (!area) return;
    const availW = area.clientWidth - 48;
    const availH = area.clientHeight - 48;
    const cw = canvas.width;
    const ch = canvas.height;

    if (cw <= availW && ch <= availH) {
      canvas.style.width = '';
      canvas.style.height = '';
    } else {
      const scale = Math.min(availW / cw, availH / ch);
      canvas.style.width = Math.round(cw * scale) + 'px';
      canvas.style.height = Math.round(ch * scale) + 'px';
    }
  }

  function drawBackground(w, h) {
    if (state.bg.type === 'transparent') {
      // Checkerboard
      const sz = 12;
      for (let y = 0; y < h; y += sz) {
        for (let x = 0; x < w; x += sz) {
          ctx.fillStyle = ((x / sz + y / sz) % 2 === 0) ? '#ccc' : '#fff';
          ctx.fillRect(x, y, sz, sz);
        }
      }
      return;
    }

    if (state.bg.type === 'solid') {
      ctx.fillStyle = state.bg.solid;
      ctx.fillRect(0, 0, w, h);
      return;
    }

    // Gradient
    const angle = state.bg.direction * Math.PI / 180;
    const cx = w / 2, cy = h / 2;
    const len = Math.max(w, h);
    const x1 = cx - Math.cos(angle) * len / 2;
    const y1 = cy - Math.sin(angle) * len / 2;
    const x2 = cx + Math.cos(angle) * len / 2;
    const y2 = cy + Math.sin(angle) * len / 2;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, state.bg.color1);
    grad.addColorStop(1, state.bg.color2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle noise overlay
    ctx.save();
    ctx.globalAlpha = 0.015;
    for (let i = 0; i < w * h * 0.01; i++) {
      const nx = Math.random() * w;
      const ny = Math.random() * h;
      ctx.fillStyle = Math.random() > 0.5 ? '#fff' : '#000';
      ctx.fillRect(nx, ny, 1, 1);
    }
    ctx.restore();
  }

  function drawFrame(x, y, w, h, conf) {
    ctx.save();

    if (state.frame === 'phone') {
      // Phone frame
      roundRect(ctx, x, y, w, h, conf.radius, false, false);
      ctx.fillStyle = conf.bg;
      ctx.fill();

      // Notch
      if (conf.notch) {
        const notchW = 80, notchH = 20, notchR = 10;
        const nx = x + w / 2 - notchW / 2;
        const ny = y;
        ctx.fillStyle = conf.bg;
        roundRect(ctx, nx, ny, notchW, notchH, notchR, true, false);
      }
    } else {
      // Window frame - draw titlebar
      ctx.fillStyle = conf.bg;
      const r = conf.radius || 10;

      // Titlebar rounded top
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + conf.titlebar, x, y + conf.titlebar, 0);
      ctx.lineTo(x, y + conf.titlebar);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      ctx.fill();

      // Traffic light dots
      if (conf.dots) {
        const dotY = y + conf.titlebar / 2;
        conf.dots.forEach((color, i) => {
          ctx.beginPath();
          ctx.arc(x + 18 + i * 20, dotY, 6, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
        });
      }

      // Address bar for browser
      if (conf.addressbar) {
        const barW = Math.min(w * 0.5, 300);
        const barH = 22;
        const barX = x + w / 2 - barW / 2;
        const barY = y + (conf.titlebar - barH) / 2;
        ctx.fillStyle = conf.bg === '#1e1e1e' ? '#333' : '#eee';
        roundRect(ctx, barX, barY, barW, barH, barH / 2, true, false);
        ctx.font = '11px "Outfit", sans-serif';
        ctx.fillStyle = conf.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('postsnap.dev', x + w / 2, y + conf.titlebar / 2);
      }
    }

    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r, fill = true, stroke = false) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  function roundRectClip(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.clip();
  }

  // Same as roundRectClip but doesn't call clip — just traces the path
  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // Re-fit on window resize
  window.addEventListener('resize', () => {
    if (state.image) fitCanvasToView();
  });

  // ─── Export ───
  function getExportCanvas() {
    const scale = state.exportScale;
    if (scale === 1) return canvas;

    const ec = document.createElement('canvas');
    ec.width = canvas.width * scale;
    ec.height = canvas.height * scale;
    const ectx = ec.getContext('2d');
    ectx.scale(scale, scale);

    // Re-render at scale
    const origCanvas = canvas;
    const origCtx = ctx;
    // Just scale the existing canvas
    ectx.drawImage(canvas, 0, 0);

    return ec;
  }

  function exportImage() {
    const ec = getExportCanvas();
    let mimeType, ext;

    switch (state.exportFormat) {
      case 'jpeg': mimeType = 'image/jpeg'; ext = 'jpg'; break;
      case 'webp': mimeType = 'image/webp'; ext = 'webp'; break;
      default: mimeType = 'image/png'; ext = 'png';
    }

    const quality = state.exportFormat === 'png' ? undefined : state.exportQuality;
    const dataUrl = ec.toDataURL(mimeType, quality);

    // Download
    const a = document.createElement('a');
    a.download = `postsnap-${Date.now()}.${ext}`;
    a.href = dataUrl;
    a.click();

    showToast('Downloaded successfully');
  }

  async function copyToClipboard() {
    try {
      const ec = getExportCanvas();
      const blob = await new Promise(resolve => ec.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Copied to clipboard');
    } catch (e) {
      showToast('Copy failed — try downloading instead');
    }
  }

  // ─── IndexedDB (Pending Screenshot Transfer) ───
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('PostSnapDB', 2);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('pending')) {
          db.createObjectStore('pending', { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Pending screenshot transfer (background → editor)
  async function setPending(dataUrl, crop) {
    const db = await openDB();
    const tx = db.transaction('pending', 'readwrite');
    tx.objectStore('pending').put({ key: 'screenshot', dataUrl, crop: crop || null });
    return new Promise((resolve) => { tx.oncomplete = resolve; });
  }

  async function getPending() {
    try {
      const db = await openDB();
      const tx = db.transaction('pending', 'readonly');
      return new Promise((resolve) => {
        const req = tx.objectStore('pending').get('screenshot');
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
    } catch (e) { return null; }
  }

  async function clearPending() {
    try {
      const db = await openDB();
      const tx = db.transaction('pending', 'readwrite');
      tx.objectStore('pending').delete('screenshot');
    } catch (e) {}
  }

  // ─── Toast ───
  function showToast(msg) {
    let toast = document.querySelector('.toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  }

  // ─── UI Setup ───
  function setupUI() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.panel-content').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.querySelector(`.panel-content[data-panel="${btn.dataset.tab}"]`).classList.add('active');
      });
    });

    // Background controls
    document.getElementById('bg-color1').addEventListener('input', (e) => {
      state.bg.type = 'gradient'; state.bg.color1 = e.target.value; render();
    });
    document.getElementById('bg-color2').addEventListener('input', (e) => {
      state.bg.type = 'gradient'; state.bg.color2 = e.target.value; render();
    });
    document.getElementById('bg-direction').addEventListener('change', (e) => {
      state.bg.direction = parseInt(e.target.value); render();
    });
    document.getElementById('btn-solid').addEventListener('click', () => {
      state.bg.type = 'solid'; state.bg.solid = document.getElementById('bg-solid').value; render();
      clearGradientActive();
    });
    document.getElementById('bg-solid').addEventListener('input', (e) => {
      if (state.bg.type === 'solid') { state.bg.solid = e.target.value; render(); }
    });
    document.getElementById('btn-transparent').addEventListener('click', () => {
      state.bg.type = 'transparent'; render();
      clearGradientActive();
    });

    // Padding
    const padSlider = document.getElementById('padding-slider');
    padSlider.addEventListener('input', (e) => {
      state.padding = parseInt(e.target.value);
      document.getElementById('padding-val').textContent = state.padding;
      render();
    });

    // Frame
    document.querySelectorAll('.opt-btn[data-frame]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-frame]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.frame = btn.dataset.frame;
        render();
      });
    });

    // Radius
    const radSlider = document.getElementById('radius-slider');
    radSlider.addEventListener('input', (e) => {
      state.radius = parseInt(e.target.value);
      document.getElementById('radius-val').textContent = state.radius;
      render();
    });

    // Aspect
    document.querySelectorAll('.opt-btn[data-aspect]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-aspect]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.aspect = btn.dataset.aspect;
        render();
      });
    });

    // Shadow presets
    document.querySelectorAll('.opt-btn[data-shadow]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-shadow]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.shadow = btn.dataset.shadow;
        if (SHADOWS[state.shadow]) {
          const s = SHADOWS[state.shadow];
          document.getElementById('shadow-blur').value = s.blur;
          document.getElementById('shadow-spread').value = s.spread;
          document.getElementById('shadow-opacity').value = s.opacity;
          document.getElementById('shadow-color').value = s.color;
          document.getElementById('shadow-blur-val').textContent = s.blur;
          document.getElementById('shadow-spread-val').textContent = s.spread;
          document.getElementById('shadow-opacity-val').textContent = s.opacity;
        }
        render();
      });
    });

    // Custom shadow
    ['shadow-blur', 'shadow-spread', 'shadow-opacity'].forEach(id => {
      document.getElementById(id).addEventListener('input', (e) => {
        const key = id.replace('shadow-', '');
        state.shadowCustom[key] = parseInt(e.target.value);
        document.getElementById(`${id}-val`).textContent = e.target.value;
        state.shadow = 'custom';
        document.querySelectorAll('.opt-btn[data-shadow]').forEach(b => b.classList.remove('active'));
        render();
      });
    });
    document.getElementById('shadow-color').addEventListener('input', (e) => {
      state.shadowCustom.color = e.target.value;
      state.shadow = 'custom';
      render();
    });

    // Text
    document.getElementById('text-title').addEventListener('input', (e) => {
      state.text.title = e.target.value; render();
    });
    document.getElementById('text-size').addEventListener('input', (e) => {
      state.text.size = parseInt(e.target.value);
      document.getElementById('text-size-val').textContent = e.target.value;
      render();
    });
    document.getElementById('text-color').addEventListener('input', (e) => {
      state.text.color = e.target.value; render();
    });
    document.getElementById('text-position').addEventListener('change', (e) => {
      state.text.position = e.target.value; render();
    });
    document.getElementById('text-font').addEventListener('change', (e) => {
      state.text.font = e.target.value; render();
    });

    // Watermark
    document.getElementById('watermark-toggle').addEventListener('change', (e) => {
      state.watermark = e.target.checked; render();
    });

    // Code
    document.querySelectorAll('.opt-btn[data-theme]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-theme]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.codeTheme = btn.dataset.theme;
        render();
      });
    });
    document.getElementById('code-size').addEventListener('input', (e) => {
      state.codeFontSize = parseInt(e.target.value);
      document.getElementById('code-size-val').textContent = e.target.value;
      render();
    });
    document.getElementById('code-linenums').addEventListener('change', (e) => {
      state.codeLineNums = e.target.checked; render();
    });

    // Export
    document.querySelectorAll('.opt-btn[data-format]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-format]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.exportFormat = btn.dataset.format;
      });
    });
    document.getElementById('quality-slider').addEventListener('input', (e) => {
      state.exportQuality = parseInt(e.target.value) / 100;
      document.getElementById('quality-val').textContent = e.target.value;
    });
    document.querySelectorAll('.opt-btn[data-scale]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.opt-btn[data-scale]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.exportScale = parseInt(btn.dataset.scale);
      });
    });

    // Export buttons
    document.getElementById('btn-download').addEventListener('click', exportImage);
    document.getElementById('btn-copy').addEventListener('click', copyToClipboard);
    document.getElementById('btn-export-download').addEventListener('click', exportImage);
    document.getElementById('btn-export-copy').addEventListener('click', copyToClipboard);
  }

  // ─── Gradient Grid ───
  function buildGradientGrid() {
    const grid = document.getElementById('gradient-grid');
    GRADIENTS.forEach((g, i) => {
      const swatch = document.createElement('div');
      swatch.className = 'gradient-swatch' + (i === 0 ? ' active' : '');
      swatch.style.background = `linear-gradient(${g.dir}deg, ${g.c1}, ${g.c2})`;
      swatch.title = g.name;
      swatch.addEventListener('click', () => {
        state.bg.type = 'gradient';
        state.bg.color1 = g.c1;
        state.bg.color2 = g.c2;
        state.bg.direction = g.dir;
        document.getElementById('bg-color1').value = g.c1;
        document.getElementById('bg-color2').value = g.c2;
        document.getElementById('bg-direction').value = g.dir;
        clearGradientActive();
        swatch.classList.add('active');
        render();
      });
      grid.appendChild(swatch);
    });
  }

  function clearGradientActive() {
    document.querySelectorAll('.gradient-swatch').forEach(s => s.classList.remove('active'));
  }

  // ─── Start ───
  init();
})();
