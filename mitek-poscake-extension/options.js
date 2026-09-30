(function () {
  'use strict';
  const D = window.MITEK_DEFAULTS;
  const U = window.MitekUtils;
  const $ = (id) => document.getElementById(id);
  const msg = $('msg');
  const out = $('out');
  const grantBtn = $('grant');

  function say(text, color) {
    msg.style.color = color || '#555';
    msg.textContent = text;
  }

  function load() {
    chrome.storage.local.get(D, function (cfg) {
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

  function originPatterns(cfg) {
    const set = new Set();
    [cfg.mitekUrl].concat(cfg.extraOrigins.split(/\s+/)).forEach(function (u) {
      const o = U.originOf(u);
      if (o) set.add(o + '/*');
    });
    return Array.from(set);
  }

  // Phải gọi ngay trong sự kiện click để Chrome hiện hộp thoại xin quyền.
  function save() {
    const cfg = read();
    const origins = originPatterns(cfg);
    const grant = origins.length ? chrome.permissions.request({ origins }) : Promise.resolve(true);
    return grant.then(function (granted) {
      return chrome.storage.local.set(cfg).then(function () {
        if (granted) say('Đã lưu.', 'green');
        else say('Đã lưu, nhưng bạn chưa cấp quyền truy cập Mitek, nên extension sẽ không gọi được.', '#cf1322');
        return granted;
      });
    });
  }

  // Sau khi thử kết nối: tìm tên miền file ghi âm chưa có quyền và đề nghị cấp.
  function offerRecordingOrigins(calls) {
    const known = $('extraOrigins').value.split(/\s+/).filter(Boolean);
    const found = [];
    calls.forEach(function (c) {
      const o = U.originOf(c.recordingUrl);
      if (o && known.indexOf(o) < 0 && found.indexOf(o) < 0) found.push(o);
    });
    if (!found.length) return;
    $('extraOrigins').value = known.concat(found).join('\n');
    grantBtn.hidden = false;
    grantBtn.textContent = 'Cấp quyền nghe ghi âm (' + found.join(', ') + ')';
  }

  function test() {
    const phone = $('testPhone').value.trim();
    if (!phone) { say('Nhập SĐT để thử.', '#cf1322'); return; }
    save().then(function () {
      say('Đang gọi Mitek…');
      chrome.runtime.sendMessage({ type: 'testCalls', phone }, function (res) {
        out.hidden = false;
        if (!res || !res.ok) {
          say('⚠ ' + ((res && res.error) || (chrome.runtime.lastError && chrome.runtime.lastError.message)), '#cf1322');
          out.textContent = res && res.raw ? 'Dữ liệu Mitek trả về:\n' + JSON.stringify(res.raw, null, 2).slice(0, 5000) : '';
          return;
        }
        const calls = res.data.calls;
        say('Kết nối OK: ' + calls.length + ' cuộc gọi với ' + U.normalizePhone(phone) + '.', 'green');
        out.textContent = '3 cuộc gần nhất:\n' + JSON.stringify(calls.slice(0, 3), null, 2);
        offerRecordingOrigins(calls);
      });
    });
  }

  $('save').addEventListener('click', save);
  $('test').addEventListener('click', test);
  grantBtn.addEventListener('click', function () {
    save().then(function (granted) {
      if (granted) { grantBtn.hidden = true; say('Đã cấp quyền nghe ghi âm.', 'green'); }
    });
  });
  load();
})();
