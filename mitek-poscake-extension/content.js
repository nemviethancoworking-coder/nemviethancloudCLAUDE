// Chạy trên POScake: hiển thị nút "Ghi âm" và bảng danh sách cuộc gọi Mitek theo SĐT khách của đơn hàng.
(function () {
  'use strict';
  const U = window.MitekUtils;
  let phoneSelector = '';
  let panel = null;
  let fab = null;

  chrome.storage.sync.get({ phoneSelector: '' }, function (c) { phoneSelector = c.phoneSelector || ''; });
  chrome.storage.onChanged.addListener(function (ch) {
    if (ch.phoneSelector) phoneSelector = ch.phoneSelector.newValue || '';
  });

  function send(msg) {
    return new Promise(function (resolve, reject) {
      chrome.runtime.sendMessage(msg, function (res) {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!res) return reject(new Error('Không có phản hồi từ extension.'));
        res.ok ? resolve(res.data) : reject(new Error(res.error));
      });
    });
  }

  function isOrderPage() {
    return /order/i.test(location.pathname + location.search + location.hash);
  }

  function isVisible(el) {
    return !!(el && el.offsetParent !== null && el.getClientRects().length);
  }

  // Ưu tiên vùng người dùng cấu hình, sau đó là modal/drawer chi tiết đơn đang mở, cuối cùng là cả trang.
  function detectPhones() {
    let scopes = [];
    if (phoneSelector) {
      try { scopes = Array.from(document.querySelectorAll(phoneSelector)).filter(isVisible); } catch (e) { /* selector sai */ }
    }
    if (!scopes.length) {
      scopes = Array.from(document.querySelectorAll('.ant-modal, .ant-drawer-content, [role="dialog"]')).filter(isVisible);
      scopes = scopes.slice(-1);
    }
    if (!scopes.length) scopes = [document.body];
    const phones = [];
    scopes.forEach(function (el) {
      if (panel && panel.contains(el)) return;
      U.findPhones(el.innerText).forEach(function (p) { if (phones.indexOf(p) < 0) phones.push(p); });
    });
    return phones;
  }

  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function buildPanel() {
    const phoneInput = el('input', { class: 'mtk-input', placeholder: 'Số điện thoại', list: 'mtk-phones' });
    const datalist = el('datalist', { id: 'mtk-phones' });
    const status = el('div', { class: 'mtk-status' });
    const list = el('div', { class: 'mtk-list' });

    function search() {
      const phone = U.normalizePhone(phoneInput.value);
      list.innerHTML = '';
      if (!phone) { status.textContent = 'Nhập số điện thoại.'; return; }
      status.textContent = 'Đang tải lịch sử cuộc gọi của ' + phone + '…';
      send({ type: 'getCalls', phone: phone }).then(function (calls) {
        status.textContent = calls.length ? calls.length + ' cuộc gọi' : 'Không có cuộc gọi nào với ' + phone + '.';
        calls.forEach(function (c) { list.appendChild(renderCall(c)); });
      }).catch(function (err) { status.textContent = '⚠ ' + err.message; });
    }

    phoneInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });

    panel = el('div', { class: 'mtk-panel' }, [
      el('div', { class: 'mtk-head' }, [
        el('strong', { text: '🎧 Ghi âm Mitek' }),
        el('button', { class: 'mtk-x', title: 'Đóng', text: '×', onclick: function () { panel.style.display = 'none'; } })
      ]),
      el('div', { class: 'mtk-row' }, [
        phoneInput, datalist,
        el('button', { class: 'mtk-btn', text: 'Tìm', onclick: search })
      ]),
      status,
      list
    ]);
    panel.search = search;
    panel.setPhones = function (phones, preferred) {
      datalist.innerHTML = '';
      phones.forEach(function (p) { datalist.appendChild(el('option', { value: p })); });
      phoneInput.value = preferred || phones[0] || '';
    };
    document.body.appendChild(panel);
  }

  function renderCall(c) {
    const player = el('div', { class: 'mtk-player' });
    const dir = String(c.direction).toLowerCase();
    // Kiểm tra "out" trước vì "outgoing" cũng chứa chữ "in".
    const icon = /^(out|gọi đi|goi di|đi|di|ra)/.test(dir) ? '↗ Gọi đi' : /^(in|gọi đến|goi den|đến|den|vào|vao)/.test(dir) ? '↙ Gọi đến' : '•';
    const meta = [c.time, U.formatDuration(c.duration), c.agent ? 'máy lẻ ' + c.agent : ''].filter(Boolean).join(' · ');
    const btn = el('button', {
      class: 'mtk-btn',
      text: c.recordingUrl ? '▶ Nghe' : 'Không có ghi âm'
    });
    if (!c.recordingUrl) btn.disabled = true;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      btn.textContent = 'Đang tải…';
      send({ type: 'getRecording', url: c.recordingUrl }).then(function (dataUrl) {
        btn.remove();
        const audio = el('audio', { controls: '', autoplay: '', src: dataUrl, class: 'mtk-audio' });
        player.appendChild(audio);
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = '▶ Thử lại';
        player.appendChild(el('div', { class: 'mtk-err', text: '⚠ ' + err.message }));
      });
    });
    return el('div', { class: 'mtk-call' }, [
      el('div', { class: 'mtk-meta', text: icon + ' ' + meta }),
      btn,
      player
    ]);
  }

  function openPanel(preferredPhone) {
    if (!panel) buildPanel();
    const phones = detectPhones();
    const pref = preferredPhone ? U.normalizePhone(preferredPhone) : '';
    if (pref && phones.indexOf(pref) < 0) phones.unshift(pref);
    panel.setPhones(phones, pref);
    panel.style.display = 'flex';
    panel.search();
  }

  function ensureFab() {
    const show = isOrderPage();
    if (show && !fab) {
      fab = el('button', { class: 'mtk-fab', title: 'Nghe ghi âm Mitek của khách', text: '🎧 Ghi âm', onclick: function () { openPanel(); } });
      document.body.appendChild(fab);
    }
    if (fab) fab.style.display = show ? '' : 'none';
    if (!show && panel) panel.style.display = 'none';
  }

  // POScake là SPA nên URL đổi mà không tải lại trang.
  setInterval(ensureFab, 1000);
  ensureFab();

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg && msg.type === 'openPanel') openPanel(msg.phone);
  });
})();
