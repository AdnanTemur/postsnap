// PostSnap Background Service Worker

// Context menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'postsnap-element',
    title: 'PostSnap this element',
    contexts: ['all']
  });
  chrome.contextMenus.create({
    id: 'postsnap-page',
    title: 'PostSnap full page',
    contexts: ['all']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;
  if (info.menuItemId === 'postsnap-element') {
    await injectAndSend(tab.id, { action: 'startElementSelector' });
  } else if (info.menuItemId === 'postsnap-page') {
    await captureFullPage();
  }
});

chrome.commands.onCommand.addListener((command) => {
  if (command === 'take-screenshot') {
    captureVisibleTab();
  }
});

async function injectAndSend(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content/selector.js']
      });
      await chrome.scripting.insertCSS({
        target: { tabId },
        files: ['content/selector.css']
      });
      await new Promise(r => setTimeout(r, 150));
      await chrome.tabs.sendMessage(tabId, message);
    } catch (err) {
      console.warn('PostSnap: Cannot inject into this page', err);
    }
  }
}

// ─── Full Page Scroll Capture ───
async function captureFullPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  // Get page dimensions
  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => ({
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      originalScrollX: window.scrollX,
      originalScrollY: window.scrollY
    })
  });

  const dims = result.result;
  const { scrollWidth, scrollHeight, viewportWidth, viewportHeight, devicePixelRatio } = dims;
  const capW = viewportWidth * devicePixelRatio;
  const capH = viewportHeight * devicePixelRatio;

  const totalW = scrollWidth * devicePixelRatio;
  const totalH = scrollHeight * devicePixelRatio;

  // If page fits in one viewport, just capture it
  if (scrollHeight <= viewportHeight + 5) {
    captureVisibleTab();
    return;
  }

  // Stitch captures
  const captures = [];
  const rows = Math.ceil(scrollHeight / viewportHeight);

  for (let i = 0; i < rows; i++) {
    const scrollY = Math.min(i * viewportHeight, scrollHeight - viewportHeight);

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (y) => window.scrollTo(0, y),
      args: [scrollY]
    });

    // Wait for scroll + repaint
    await new Promise(r => setTimeout(r, 250));

    const dataUrl = await new Promise((resolve) => {
      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (url) => {
        resolve(url);
      });
    });

    captures.push({
      dataUrl,
      scrollY: scrollY * devicePixelRatio,
      isLast: i === rows - 1
    });
  }

  // Restore original scroll position
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (x, y) => window.scrollTo(x, y),
    args: [dims.originalScrollX, dims.originalScrollY]
  });

  // Stitch in an offscreen canvas via the content script
  const [stitchResult] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (captures, totalW, totalH, capW, capH) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = totalW;
        canvas.height = totalH;
        const ctx = canvas.getContext('2d');

        let loaded = 0;
        captures.forEach((cap) => {
          const img = new Image();
          img.onload = () => {
            // For the last row, align to bottom to avoid overlap duplication
            if (cap.isLast) {
              const srcY = capH - (totalH - cap.scrollY);
              if (srcY > 0) {
                ctx.drawImage(img, 0, srcY, capW, capH - srcY, 0, cap.scrollY + srcY, capW, capH - srcY);
              } else {
                ctx.drawImage(img, 0, cap.scrollY);
              }
            } else {
              ctx.drawImage(img, 0, cap.scrollY);
            }
            loaded++;
            if (loaded === captures.length) {
              resolve(canvas.toDataURL('image/png'));
            }
          };
          img.src = cap.dataUrl;
        });
      });
    },
    args: [captures, totalW, totalH, capW, capH]
  });

  if (stitchResult.result) {
    openEditor(stitchResult.result);
  }
}

// ─── Message Listener ───
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true;
  }

  if (msg.action === 'captureAndOpenEditor') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ error: chrome.runtime.lastError.message });
        return;
      }
      openEditor(dataUrl, msg.crop || null);
      sendResponse({ ok: true });
    });
    return true;
  }

  if (msg.action === 'openEditor') {
    openEditor(msg.dataUrl, msg.crop || null);
    sendResponse({ ok: true });
    return true;
  }

  if (msg.action === 'captureFullPage') {
    captureFullPage().then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.action === 'startElementSelector') {
    (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await injectAndSend(tabs[0].id, { action: 'startElementSelector' });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (msg.action === 'startRegionSelector') {
    (async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        await injectAndSend(tabs[0].id, { action: 'startRegionSelector' });
      }
      sendResponse({ ok: true });
    })();
    return true;
  }
});

function captureVisibleTab() {
  chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
    if (!chrome.runtime.lastError && dataUrl) {
      openEditor(dataUrl);
    }
  });
}

function openEditor(dataUrl, crop) {
  const editorUrl = chrome.runtime.getURL('editor/editor.html');
  // Use IndexedDB — no size quota like chrome.storage.local (10MB limit)
  const req = indexedDB.open('PostSnapDB', 2);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('pending')) {
      db.createObjectStore('pending', { keyPath: 'key' });
    }
  };
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('pending', 'readwrite');
    tx.objectStore('pending').put({ key: 'screenshot', dataUrl, crop: crop || null });
    tx.oncomplete = () => {
      chrome.tabs.create({ url: editorUrl });
    };
  };
  req.onerror = () => {
    // Fallback: open editor anyway, it'll show empty
    chrome.tabs.create({ url: editorUrl });
  };
}
