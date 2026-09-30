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

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  // Định dạng "YYYY-mm-dd H:i:s" theo giờ máy, đúng yêu cầu startDate/endDate của Mitek.
  function formatDateTime(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  function callLogUrl(mitekUrl) {
    return String(mitekUrl || '').trim().replace(/\/+$/, '') + '/cdr/getCallsLog';
  }

  // Body cho API Get Call Logs. Mitek giới hạn (limit - offset) <= 100.
  // field là 'srcs' (khách gọi đến) hoặc 'dsts' (gọi ra cho khách).
  function buildCallLogBody(opts) {
    const body = {
      secret: opts.secret,
      startDate: formatDateTime(opts.from),
      endDate: formatDateTime(opts.to),
      offset: String(opts.offset),
      limit: String(opts.offset + 100)
    };
    body[opts.field] = [opts.phone];
    return body;
  }

  // Mitek trả về mảng; một số bản bọc trong { data: [...] }.
  function extractList(json) {
    if (Array.isArray(json)) return json;
    if (json && Array.isArray(json.data)) return json.data;
    return null;
  }

  function mapCall(item, customerPhone) {
    const caller = String(item.caller == null ? '' : item.caller);
    const called = String(item.called == null ? '' : item.called);
    const customerIsCaller = normalizePhone(caller) === customerPhone;
    return {
      id: item.callrefid || '',
      time: item.calldate || '',
      direction: item.calltype || (customerIsCaller ? 'in' : 'out'),
      status: item.callstatus || '',
      duration: item.billsec != null ? item.billsec : item.duration,
      agent: customerIsCaller ? called : caller,
      recordingUrl: item.recordingfile || ''
    };
  }

  // Gộp kết quả 2 chiều gọi, bỏ trùng theo callrefid, mới nhất lên đầu.
  function mergeCalls(lists) {
    const seen = new Set();
    const out = [];
    lists.forEach(function (list) {
      list.forEach(function (c) {
        const key = c.id || c.time + '|' + c.recordingUrl;
        if (seen.has(key)) return;
        seen.add(key);
        out.push(c);
      });
    });
    return out.sort(function (a, b) { return String(b.time).localeCompare(String(a.time)); });
  }

  function formatDuration(sec) {
    const s = parseInt(sec, 10);
    if (isNaN(s)) return '';
    return Math.floor(s / 60) + ':' + pad(s % 60);
  }

  function originOf(url) {
    try { return new URL(url).origin; } catch (e) { return ''; }
  }

  const api = {
    normalizePhone, findPhones, formatDateTime, callLogUrl, buildCallLogBody,
    extractList, mapCall, mergeCalls, formatDuration, originOf
  };
  root.MitekUtils = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
