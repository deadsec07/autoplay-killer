// Global ON/OFF toggle via toolbar click. When ON:
// 1) badge = ON everywhere
// 2) pause all media in all tabs immediately
// 3) content.js (already injected on all sites at document_start) prevents future autoplay

const KEY = 'globalEnabled';

async function getEnabled() {
  const { [KEY]: on = false } = await chrome.storage.sync.get(KEY);
  return !!on;
}
async function setEnabled(on) {
  await chrome.storage.sync.set({ [KEY]: !!on });
}

async function setBadge(on) {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map(t =>
    chrome.action.setBadgeText({ tabId: t.id, text: on ? 'ON' : '' }).catch(() => {})
  ));
}

async function pauseAllTabs() {
  const tabs = await chrome.tabs.query({ url: ['http://*/*','https://*/*'] });
  await Promise.all(tabs.map(t => chrome.scripting.executeScript({
    target: { tabId: t.id },
    func: () => { document.querySelectorAll('video,audio').forEach(m => m.pause?.()); }
  }).catch(() => {})));
}

chrome.action.onClicked.addListener(async () => {
  const on = await getEnabled();
  const next = !on;
  await setEnabled(next);
  await setBadge(next);
  if (next) await pauseAllTabs();
});

chrome.runtime.onInstalled.addListener(async () => {
  const on = await getEnabled();
  await setBadge(on);
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const on = await getEnabled();
  await chrome.action.setBadgeText({ tabId, text: on ? 'ON' : '' });
});
chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status === 'loading') {
    const on = await getEnabled();
    await chrome.action.setBadgeText({ tabId, text: on ? 'ON' : '' });
  }
});
