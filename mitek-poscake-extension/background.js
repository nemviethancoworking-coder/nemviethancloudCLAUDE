// Service worker: gọi API Mitek (content script trên POScake bị chặn CORS nên phải gọi từ đây).
importScripts('lib/defaults.js', 'lib/utils.js');

const U = self.MitekUtils;

async function getConfig() {
  return chrome.storage.local.get(self.MITEK_DEFAULTS);
}

async function postCallLog(cfg, body) {
  let res;
  try {
    res = await fetch(U.callLogUrl(cfg.mitekUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit'
    });
  } catch (e) {
    throw new Error('Không kết nối được Mitek (' + e.message + '). Kiểm tra MITEK_URL và đã bấm Lưu + cấp quyền trong Tuỳ chọn chưa.');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Mitek từ chối truy cập (' + res.status + '). Kiểm tra secret.');
  }
  if (!res.ok) throw new Error('Lỗi gọi Mitek: HTTP ' + res.status);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch (e) {
    const err = new Error('Mitek không trả về JSON.');
    err.raw = text.slice(0, 2000);
    throw err;
  }
  const list = U.extractList(json);
  if (!list) {
    const err = new Error('Mitek trả về dữ liệu không đúng dạng danh sách cuộc gọi (có thể secret sai).');
    err.raw = json;
    throw err;
  }
  return { list, json };
}

// Lấy toàn bộ cuộc gọi theo 1 chiều (srcs = khách gọi đến, dsts = gọi ra cho khách), phân trang 100/lần.
async function fetchDirection(cfg, phone, field, from, to) {
  const items = [];
  let firstRaw = null;
  for (let page = 0; page < Number(cfg.maxPages || 5); page++) {
    const body = U.buildCallLogBody({ secret: cfg.secret, phone, field, from, to, offset: page * 100 });
    const { list, json } = await postCallLog(cfg, body);
    if (firstRaw === null) firstRaw = json;
    items.push.apply(items, list);
    if (list.length < 100) break;
  }
  return { items, raw: firstRaw };
}

async function fetchCalls(rawPhone) {
  const cfg = await getConfig();
  if (!cfg.mitekUrl || !cfg.secret) {
    throw new Error('Chưa cấu hình Mitek. Mở Tuỳ chọn của extension để điền MITEK_URL và secret.');
  }
  const phone = U.normalizePhone(rawPhone);
  const to = new Date();
  const from = new Date(to.getTime() - Number(cfg.lookbackDays || 90) * 86400000);
  const [inbound, outbound] = await Promise.all([
    fetchDirection(cfg, phone, 'srcs', from, to),
    fetchDirection(cfg, phone, 'dsts', from, to)
  ]);
  const map = (it) => U.mapCall(it, phone);
  return {
    calls: U.mergeCalls([inbound.items.map(map), outbound.items.map(map)]),
    raw: { srcs: inbound.raw, dsts: outbound.raw }
  };
}

async function blobToDataUrl(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode.apply(null, buf.subarray(i, i + chunk));
  }
  return 'data:' + (blob.type || 'audio/wav') + ';base64,' + btoa(bin);
}

async function getRecording(url) {
  const cfg = await getConfig();
  const origin = U.originOf(url);
  if (!origin || !(await chrome.permissions.contains({ origins: [origin + '/*'] }))) {
    throw new Error('Chưa cấp quyền cho tên miền ghi âm ' + origin + '. Mở Tuỳ chọn → Thử kết nối → bấm "Cấp quyền nghe ghi âm".');
  }
  let res;
  try {
    res = await fetch(url, { credentials: cfg.sendCookies ? 'include' : 'omit' });
  } catch (e) {
    throw new Error('Không tải được ghi âm (' + e.message + ').');
  }
  if (res.status === 401 || res.status === 403) {
    throw new Error('Cần đăng nhập Mitek trên Chrome này để nghe ghi âm.');
  }
  if (!res.ok) throw new Error('Không tải được ghi âm: HTTP ' + res.status);
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) {
    throw new Error('Mitek trả về trang đăng nhập. Hãy đăng nhập Mitek trên Chrome này rồi thử lại.');
  }
  return blobToDataUrl(await res.blob());
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  const handlers = {
    getCalls: () => fetchCalls(msg.phone).then((r) => r.calls),
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
