// Service worker: gọi API Mitek (content script trên POScake bị chặn CORS nên phải gọi từ đây).
importScripts('lib/defaults.js', 'lib/utils.js');

const U = self.MitekUtils;

async function getConfig() {
  const stored = await chrome.storage.sync.get(self.MITEK_DEFAULTS);
  return Object.assign({}, self.MITEK_DEFAULTS, stored);
}

function buildInit(cfg) {
  const headers = {};
  if (cfg.authHeaderName && cfg.authHeaderValue) {
    headers[cfg.authHeaderName] = cfg.authHeaderValue;
  }
  return { headers, credentials: cfg.sendCookies ? 'include' : 'omit' };
}

async function getCalls(phone) {
  return (await fetchCalls(phone)).calls;
}

// Trả về cả JSON gốc để trang Tuỳ chọn hiển thị khi "Thử kết nối".
async function fetchCalls(phone) {
  const cfg = await getConfig();
  if (!cfg.cdrUrlTemplate) {
    throw new Error('Chưa cấu hình API Mitek. Mở Tuỳ chọn của extension để điền.');
  }
  const to = new Date();
  const from = new Date(to.getTime() - Number(cfg.lookbackDays || 90) * 86400000);
  const url = U.fillTemplate(cfg.cdrUrlTemplate, {
    phone: U.normalizePhone(phone),
    from: U.formatDate(from, cfg.dateFormat),
    to: U.formatDate(to, cfg.dateFormat)
  });

  const res = await fetch(url, buildInit(cfg));
  if (res.status === 401 || res.status === 403) {
    throw new Error('Mitek từ chối truy cập (' + res.status + '). Kiểm tra API key hoặc đăng nhập lại Mitek trên Chrome.');
  }
  if (!res.ok) throw new Error('Lỗi gọi Mitek: HTTP ' + res.status);

  const json = await res.json();
  const list = U.getPath(json, cfg.listPath);
  if (!Array.isArray(list)) {
    const err = new Error('Không tìm thấy danh sách cuộc gọi tại "' + (cfg.listPath || '(gốc)') + '". Kiểm tra ô "Đường dẫn danh sách".');
    err.raw = json;
    throw err;
  }
  return { raw: json, calls: list.map(function (item) { return U.mapCall(item, cfg); }) };
}

async function blobToDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return 'data:' + (blob.type || 'audio/mpeg') + ';base64,' + btoa(bin);
}

async function getRecording(url) {
  const cfg = await getConfig();
  const res = await fetch(url, buildInit(cfg));
  if (res.status === 401 || res.status === 403) {
    throw new Error('Cần đăng nhập Mitek trên Chrome (hoặc API key) để nghe ghi âm.');
  }
  if (!res.ok) throw new Error('Không tải được ghi âm: HTTP ' + res.status);
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) {
    throw new Error('Mitek trả về trang đăng nhập. Hãy đăng nhập Mitek trên Chrome rồi thử lại.');
  }
  return blobToDataUrl(await res.blob());
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  const handlers = {
    getCalls: () => getCalls(msg.phone),
    testCalls: () => fetchCalls(msg.phone),
    getRecording: () => getRecording(msg.url)
  };
  const fn = handlers[msg && msg.type];
  if (!fn) return false;
  fn().then(
    (data) => sendResponse({ ok: true, data }),
    (err) => sendResponse({ ok: false, error: String((err && err.message) || err), raw: err && err.raw })
  );
  return true; // trả lời bất đồng bộ
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    id: 'mitek-lookup',
    title: 'Nghe ghi âm Mitek của số "%s"',
    contexts: ['selection'],
    documentUrlPatterns: ['https://pos.pages.fm/*']
  });
});

chrome.contextMenus.onClicked.addListener(function (info, tab) {
  if (info.menuItemId === 'mitek-lookup' && tab && tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: 'openPanel', phone: info.selectionText });
  }
});

chrome.action.onClicked.addListener(function () {
  chrome.runtime.openOptionsPage();
});
