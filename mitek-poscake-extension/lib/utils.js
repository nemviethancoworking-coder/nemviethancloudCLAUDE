// Hàm tiện ích dùng chung cho background, content script, options page và test (Node).
(function (root) {
  'use strict';

  // Chuẩn hoá số điện thoại VN về dạng 0xxxxxxxxx để so khớp giữa POScake và Mitek.
  function normalizePhone(raw) {
    if (raw == null) return '';
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('0084')) d = d.slice(4);
    else if (d.startsWith('84') && d.length >= 11) d = d.slice(2);
    if (d.length === 9) d = '0' + d;
    return d;
  }

  // Tìm các số điện thoại VN (di động + cố định) trong một đoạn văn bản.
  function findPhones(text) {
    if (!text) return [];
    const re = /(?:\+?84|0)(?:[\s.\-]?\d){8,10}/g;
    const out = [];
    const seen = new Set();
    let m;
    while ((m = re.exec(text)) !== null) {
      const p = normalizePhone(m[0]);
      if (/^0\d{9,10}$/.test(p) && !seen.has(p)) {
        seen.add(p);
        out.push(p);
      }
    }
    return out;
  }

  // Lấy giá trị theo đường dẫn "a.b.0.c". Đường dẫn rỗng trả về chính đối tượng.
  function getPath(obj, path) {
    if (!path) return obj;
    return String(path).split('.').reduce(function (cur, key) {
      return cur == null ? undefined : cur[key];
    }, obj);
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatDate(d, fmt) {
    if (fmt === 'unix') return String(Math.floor(d.getTime() / 1000));
    if (fmt === 'unixms') return String(d.getTime());
    const date = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    if (fmt === 'date') return date;
    return date + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // Thay {key} trong template bằng giá trị đã encode URL.
  function fillTemplate(tpl, vars) {
    return String(tpl).replace(/\{(\w+)\}/g, function (all, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? encodeURIComponent(vars[key]) : all;
    });
  }

  // Chuyển 1 bản ghi CDR của Mitek sang định dạng thống nhất theo cấu hình ánh xạ trường.
  function mapCall(item, cfg) {
    let rec = getPath(item, cfg.fieldRecording);
    if (rec && cfg.recordingUrlTemplate) {
      rec = fillTemplate(cfg.recordingUrlTemplate, { value: rec });
    }
    if (rec && cfg.apiBase && !/^https?:\/\//i.test(rec)) {
      try {
        rec = new URL(rec, cfg.apiBase).href;
      } catch (e) { /* giữ nguyên */ }
    }
    return {
      time: getPath(item, cfg.fieldTime) || '',
      duration: getPath(item, cfg.fieldDuration),
      direction: getPath(item, cfg.fieldDirection) || '',
      agent: getPath(item, cfg.fieldAgent) || '',
      recordingUrl: rec || ''
    };
  }

  function formatDuration(sec) {
    const s = parseInt(sec, 10);
    if (isNaN(s)) return '';
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  const api = { normalizePhone, findPhones, getPath, formatDate, fillTemplate, mapCall, formatDuration };
  root.MitekUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
