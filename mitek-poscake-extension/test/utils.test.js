// Chạy: npm test
const test = require('node:test');
const assert = require('node:assert');
const U = require('../lib/utils.js');

test('normalizePhone', () => {
  assert.strictEqual(U.normalizePhone('0912 345 678'), '0912345678');
  assert.strictEqual(U.normalizePhone('+84 912.345.678'), '0912345678');
  assert.strictEqual(U.normalizePhone('84912345678'), '0912345678');
  assert.strictEqual(U.normalizePhone('912345678'), '0912345678');
  assert.strictEqual(U.normalizePhone('02438123456'), '02438123456');
  assert.strictEqual(U.normalizePhone(null), '');
});

test('findPhones bỏ trùng và bỏ số rác', () => {
  const text = 'Khách: Nguyễn A - 0912.345.678\nSĐT 2: +84912345678, mã đơn 123456, CĐ 024 3812 3456';
  assert.deepStrictEqual(U.findPhones(text), ['0912345678', '02438123456']);
});

test('formatDateTime theo định dạng Mitek', () => {
  assert.strictEqual(U.formatDateTime(new Date(2026, 0, 5, 7, 8, 9)), '2026-01-05 07:08:09');
});

test('callLogUrl bỏ dấu / thừa', () => {
  assert.strictEqual(U.callLogUrl('https://abc.mitek.vn/ '), 'https://abc.mitek.vn/cdr/getCallsLog');
});

test('buildCallLogBody: phân trang tối đa 100', () => {
  const body = U.buildCallLogBody({
    secret: 's', phone: '0912345678', field: 'srcs', offset: 100,
    from: new Date(2026, 8, 1, 0, 0, 0), to: new Date(2026, 8, 30, 23, 59, 59)
  });
  assert.deepStrictEqual(body, {
    secret: 's', startDate: '2026-09-01 00:00:00', endDate: '2026-09-30 23:59:59',
    offset: '100', limit: '200', srcs: ['0912345678']
  });
});

test('extractList', () => {
  assert.deepStrictEqual(U.extractList([1]), [1]);
  assert.deepStrictEqual(U.extractList({ code: 200, data: [2] }), [2]);
  assert.strictEqual(U.extractList({ code: 401, message: 'x' }), null);
});

// Mẫu theo tài liệu Mitek "Get Call Logs".
const inbound = {
  calldate: '2020-03-03 10:38:26', callrefid: '1583206702.488', caller: '0927545408', called: '107',
  did: '19001238', calltype: 'in', callstatus: 'ANSWERED', billsec: 22, duration: 27,
  recordingfile: 'https://rec.example/zU0NTQwOC5XQVY='
};
const outbound = {
  calldate: '2020-03-04 09:00:00', callrefid: '1583290000.1', caller: '108', called: '0927545408',
  calltype: 'out', callstatus: 'NO ANSWER', billsec: 0, duration: 15, recordingfile: ''
};

test('mapCall lấy máy lẻ ở phía không phải khách', () => {
  assert.deepStrictEqual(U.mapCall(inbound, '0927545408'), {
    id: '1583206702.488', time: '2020-03-03 10:38:26', direction: 'in', status: 'ANSWERED',
    duration: 22, agent: '107', recordingUrl: 'https://rec.example/zU0NTQwOC5XQVY='
  });
  assert.strictEqual(U.mapCall(outbound, '0927545408').agent, '108');
});

test('mergeCalls bỏ trùng và sắp xếp mới nhất trước', () => {
  const a = U.mapCall(inbound, '0927545408');
  const b = U.mapCall(outbound, '0927545408');
  const merged = U.mergeCalls([[a], [b, a]]);
  assert.deepStrictEqual(merged.map((c) => c.id), ['1583290000.1', '1583206702.488']);
});

test('formatDuration / originOf', () => {
  assert.strictEqual(U.formatDuration(75), '1:15');
  assert.strictEqual(U.formatDuration('x'), '');
  assert.strictEqual(U.originOf('https://rec.example:8443/a?f=1'), 'https://rec.example:8443');
  assert.strictEqual(U.originOf('abc'), '');
});
