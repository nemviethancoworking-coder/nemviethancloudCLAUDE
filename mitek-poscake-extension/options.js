(function () {
  'use strict';
  const D = window.MITEK_DEFAULTS;
  const $ = (id) => document.getElementById(id);
  const msg = $('msg');
  const out = $('out');

  function load() {
    chrome.storage.sync.get(D, function (cfg) {
      Object.keys(D).forEach(function (k) {
        const input = $(k);
        if (!input) return;
        if (input.type === 'checkbox') input.checked = !!cfg[k];
        else input.value = cfg[k] == null ? '' : cfg[k];
      });
    });
  }

  function read() {
    const cfg = {};
    Object.keys(D).forEach(function (k) {
      const input = $(k);
      if (!input) return;
      if (input.type === 'checkbox') cfg[k] = input.checked;
      else if (input.type === 'number') cfg[k] = Number(input.value) || D[k];
      else cfg[k] = input.value.trim();
    });
    return cfg;
  }

  function originsOf(cfg) {
    const urls = [cfg.apiBase, cfg.cdrUrlTemplate, cfg.recordingUrlTemplate].concat(cfg.extraOrigins.split(/\s+/));
    const set = new Set();
    urls.forEach(function (u) {
      if (!u) return;
      try { set.add(new URL(u.replace(/\{\w+\}/g, 'x')).origin + '/*'); } catch (e) { /* bỏ qua */ }
    });
    return Array.from(set);
  }

  // Phải gọi trong sự kiện click để Chrome hiện hộp thoại xin quyền.
  function save() {
    const cfg = read();
    const origins = originsOf(cfg);
    const grant = origins.length ? chrome.permissions.request({ origins }) : Promise.resolve(true);
    return grant.then(function (granted) {
      return chrome.storage.sync.set(cfg).then(function () {
        msg.style.color = granted ? 'green' : '#cf1322';
        msg.textContent = granted ? 'Đã lưu.' : 'Đã lưu, nhưng bạn chưa cấp quyền truy cập Mitek, nên extension sẽ không gọi được.';
        return granted;
      });
    });
  }

  function test() {
    const phone = $('testPhone').value.trim();
    if (!phone) { msg.style.color = '#cf1322'; msg.textContent = 'Nhập SĐT để thử.'; return; }
    save().then(function () {
      msg.style.color = '#555';
      msg.textContent = 'Đang gọi Mitek…';
      chrome.runtime.sendMessage({ type: 'testCalls', phone }, function (res) {
        out.hidden = false;
        if (!res || !res.ok) {
          msg.style.color = '#cf1322';
          msg.textContent = '⚠ ' + ((res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message));
          out.textContent = res && res.raw ? 'JSON trả về:\n' + JSON.stringify(res.raw, null, 2).slice(0, 5000) : '';
          return;
        }
        msg.style.color = 'green';
        msg.textContent = 'Kết nối OK, ' + res.data.calls.length + ' cuộc gọi.';
        out.textContent =
          'Kết quả sau ánh xạ (3 cuộc đầu):\n' + JSON.stringify(res.data.calls.slice(0, 3), null, 2) +
          '\n\nJSON gốc:\n' + JSON.stringify(res.data.raw, null, 2).slice(0, 5000);
      });
    });
  }

  $('save').addEventListener('click', save);
  $('test').addEventListener('click', test);
  load();
})();
