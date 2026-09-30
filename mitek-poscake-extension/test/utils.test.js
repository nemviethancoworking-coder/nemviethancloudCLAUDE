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

test('getPath', () => {
  const o = { data: { items: [{ a: 1 }] } };
  assert.strictEqual(U.getPath(o, 'data.items.0.a'), 1);
  assert.strictEqual(U.getPath(o, ''), o);
  assert.strictEqual(U.getPath(o, 'x.y'), undefined);
});

test('fillTemplate encode giá trị', () => {
  assert.strictEqual(
    U.fillTemplate('https://x/cdr?p={phone}&f={from}&k={keep}', { phone: '0912', from: '2026-01-01 00:00:00' }),
    'https://x/cdr?p=0912&f=2026-01-01%2000%3A00%3A00&k={keep}'
  );
});

test('formatDate', () => {
  const d = new Date(2026, 0, 5, 7, 8, 9);
  assert.strictEqual(U.formatDate(d, 'date'), '2026-01-05');
  assert.strictEqual(U.formatDate(d, 'datetime'), '2026-01-05 07:08:09');
  assert.strictEqual(U.formatDate(d, 'unix'), String(Math.floor(d.getTime() / 1000)));
});

test('mapCall: link tương đối và mẫu URL', () => {
  const cfg = {
    apiBase: 'https://api.mitek.example',
    fieldTime: 'start', fieldDuration: 'bill', fieldDirection: 'dir', fieldAgent: 'ext',
    fieldRecording: 'rec.file', recordingUrlTemplate: ''
  };
  const item = { start: '2026-09-01 10:00', bill: 75, dir: 'inbound', ext: '101', rec: { file: '/rec/a.mp3' } };
  assert.deepStrictEqual(U.mapCall(item, cfg), {
    time: '2026-09-01 10:00', duration: 75, direction: 'inbound', agent: '101',
    recordingUrl: 'https://api.mitek.example/rec/a.mp3'
  });
  cfg.recordingUrlTemplate = 'https://api.mitek.example/recording/{value}';
  item.rec.file = 'abc 1';
  assert.strictEqual(U.mapCall(item, cfg).recordingUrl, 'https://api.mitek.example/recording/abc%201');
});

test('formatDuration', () => {
  assert.strictEqual(U.formatDuration(75), '1:15');
  assert.strictEqual(U.formatDuration('x'), '');
});
