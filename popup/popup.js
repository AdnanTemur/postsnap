// PostSnap Popup Script

function captureViewport() {
  chrome.runtime.sendMessage({ action: 'captureVisibleTab' }, (res) => {
    if (res && res.dataUrl) {
      chrome.runtime.sendMessage({ action: 'openEditor', dataUrl: res.dataUrl });
    }
    window.close();
  });
}

function startElement() {
  chrome.runtime.sendMessage({ action: 'startElementSelector' }, () => {
    window.close();
  });
}

function startRegion() {
  chrome.runtime.sendMessage({ action: 'startRegionSelector' }, () => {
    window.close();
  });
}

function captureFullPage() {
  chrome.runtime.sendMessage({ action: 'captureFullPage' }, () => {
    window.close();
  });
}

document.getElementById('btn-viewport').addEventListener('click', captureViewport);
document.getElementById('btn-element').addEventListener('click', startElement);
document.getElementById('btn-region').addEventListener('click', startRegion);
document.getElementById('btn-fullpage').addEventListener('click', captureFullPage);
