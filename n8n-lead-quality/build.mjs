// Sinh workflow.json cho n8n từ các file code trong ./nodes
// Chạy: node build.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const code = (f) => readFileSync(join(here, 'nodes', f), 'utf8');

const SPREADSHEET_ID = '1a5ZFJZOVxJmUjqHoVf7glwXuX3Y7v-hvOakw89YmeLE';
const SHEETS_API = "=https://sheets.googleapis.com/v4/spreadsheets/{{ $('Cấu hình').first().json.spreadsheet_id }}";

const HEADERS = {
  BC_NGAY: ['Ngày', 'Tổng lead', 'Lead ngon', 'Lead dở', 'Chưa rõ', 'Lỗi AI', 'Tỉ lệ ngon (%)', 'Dở theo bộ lọc',
    'Lý do dở phổ biến', 'Điểm cộng phổ biến', 'Theo page', 'Ghi chú', 'Cập nhật lúc'],
  BC_CHI_TIET: ['Mã hội thoại', 'Ngày', 'Page', 'Khách hàng', 'Loại', 'Tin khách/page', 'Kết luận', 'Nhóm lý do', 'Lý do',
    'Chi tiết bộ lọc', 'Nhu cầu', 'Link Pancake', 'Cập nhật lúc'],
};
const colLetter = (n) => String.fromCharCode(64 + n);

const sheetsCred = { authentication: 'predefinedCredentialType', nodeCredentialType: 'googleSheetsOAuth2Api' };

let x = 0;
const pos = () => [(x += 220) - 220, 300];

const nodes = [
  {
    name: 'Mỗi ngày 7h sáng',
    type: 'n8n-nodes-base.scheduleTrigger',
    typeVersion: 1.2,
    position: [0, 200],
    parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 7, triggerAtMinute: 0 }] } },
  },
  {
    name: 'Chạy thử',
    type: 'n8n-nodes-base.manualTrigger',
    typeVersion: 1,
    position: [0, 400],
    parameters: {},
  },
];
x = 220;

nodes.push({
  name: 'Cấu hình',
  type: 'n8n-nodes-base.set',
  typeVersion: 3.4,
  position: pos(),
  notes: 'Điền Pancake access token (Pancake > Cài đặt tài khoản > API/Access token). Để trống ngay_bao_cao = tự lấy hôm qua; điền YYYY-MM-DD để chạy lại 1 ngày cụ thể.',
  parameters: {
    assignments: {
      assignments: [
        ['pancake_access_token', 'DIEN_PANCAKE_ACCESS_TOKEN_VAO_DAY'],
        ['spreadsheet_id', SPREADSHEET_ID],
        ['gemini_model', 'gemini-2.5-flash'],
        ['ngay_bao_cao', ''],
        ['chi_quet_page_ids', ''],
        ['so_hoi_thoai_moi_lan_goi_ai', 8],
        ['so_tin_nhan_toi_da', 80],
      ].map(([name, value], i) => ({
        id: `cfg-${i}`,
        name,
        value,
        type: typeof value === 'number' ? 'number' : 'string',
      })),
    },
    options: {},
  },
});

for (const tab of Object.keys(HEADERS)) {
  nodes.push({
    name: `Tạo tab ${tab}`,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: pos(),
    onError: 'continueRegularOutput',
    notes: 'Lỗi "already exists" ở các lần chạy sau là bình thường.',
    parameters: {
      method: 'POST',
      url: `${SHEETS_API}:batchUpdate`,
      ...sheetsCred,
      sendBody: true,
      specifyBody: 'json',
      jsonBody: JSON.stringify({ requests: [{ addSheet: { properties: { title: tab } } }] }),
      options: {},
    },
  });
}
for (const [tab, cols] of Object.entries(HEADERS)) {
  nodes.push({
    name: `Tiêu đề ${tab}`,
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: pos(),
    parameters: {
      method: 'PUT',
      url: `${SHEETS_API}/values/${tab}!A1:${colLetter(cols.length)}1`,
      ...sheetsCred,
      sendQuery: true,
      queryParameters: { parameters: [{ name: 'valueInputOption', value: 'RAW' }] },
      sendBody: true,
      specifyBody: 'json',
      jsonBody: JSON.stringify({ values: [cols] }),
      options: {},
    },
  });
}

nodes.push(
  {
    name: 'Đọc tiêu chí (summary)',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: pos(),
    parameters: {
      method: 'GET',
      url: `${SHEETS_API}/values/summary!A1:C100`,
      ...sheetsCred,
      options: {},
    },
  },
  {
    name: 'Lấy hội thoại Pancake',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: pos(),
    parameters: { jsCode: code('fetch-pancake.js') },
  },
  {
    name: 'Có hội thoại?',
    type: 'n8n-nodes-base.if',
    typeVersion: 2.2,
    position: pos(),
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{
          id: 'has-conv',
          leftValue: '={{ $json._empty === true }}',
          rightValue: '',
          operator: { type: 'boolean', operation: 'false', singleValue: true },
        }],
        combinator: 'and',
      },
      looseTypeValidation: true,
      options: {},
    },
  },
  {
    name: 'Chia lô gửi AI',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: pos(),
    parameters: { jsCode: code('build-batches.js') },
  },
  {
    name: 'Gemini chấm lead',
    type: 'n8n-nodes-base.httpRequest',
    typeVersion: 4.2,
    position: pos(),
    retryOnFail: true,
    maxTries: 5,
    waitBetweenTries: 5000,
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: "=https://generativelanguage.googleapis.com/v1beta/models/{{ $('Cấu hình').first().json.gemini_model }}:generateContent",
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'googlePalmApi',
      sendBody: true,
      specifyBody: 'json',
      jsonBody: '={{ JSON.stringify($json.body) }}',
      options: { batching: { batch: { batchSize: 1, batchInterval: 7000 } }, timeout: 180000 },
    },
  },
  {
    name: 'Tách kết quả AI',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: pos(),
    parameters: { jsCode: code('parse-results.js') },
  },
);

const [sx] = pos();
nodes.push(
  {
    name: 'Ghi BC_CHI_TIET',
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.5,
    position: [sx, 180],
    parameters: {
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'id', value: "={{ $('Cấu hình').first().json.spreadsheet_id }}" },
      sheetName: { __rl: true, mode: 'name', value: 'BC_CHI_TIET' },
      columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['Mã hội thoại'], schema: [] },
      options: { handlingExtraData: 'ignoreIt' },
    },
  },
  {
    name: 'Thống kê ngày',
    type: 'n8n-nodes-base.code',
    typeVersion: 2,
    position: [sx, 420],
    parameters: { jsCode: code('daily-stats.js') },
  },
  {
    name: 'Ghi BC_NGAY',
    type: 'n8n-nodes-base.googleSheets',
    typeVersion: 4.5,
    position: [sx + 220, 420],
    parameters: {
      operation: 'appendOrUpdate',
      documentId: { __rl: true, mode: 'id', value: "={{ $('Cấu hình').first().json.spreadsheet_id }}" },
      sheetName: { __rl: true, mode: 'name', value: 'BC_NGAY' },
      columns: { mappingMode: 'autoMapInputData', value: {}, matchingColumns: ['Ngày'], schema: [] },
      options: { handlingExtraData: 'ignoreIt' },
    },
  },
);

const chain = [
  'Cấu hình', 'Tạo tab BC_NGAY', 'Tạo tab BC_CHI_TIET', 'Tiêu đề BC_NGAY', 'Tiêu đề BC_CHI_TIET',
  'Đọc tiêu chí (summary)', 'Lấy hội thoại Pancake', 'Có hội thoại?',
];
const connections = {};
const link = (from, to, output = 0) => {
  connections[from] ||= { main: [] };
  while (connections[from].main.length <= output) connections[from].main.push([]);
  connections[from].main[output].push({ node: to, type: 'main', index: 0 });
};
link('Mỗi ngày 7h sáng', 'Cấu hình');
link('Chạy thử', 'Cấu hình');
chain.slice(0, -1).forEach((n, i) => link(n, chain[i + 1]));
link('Có hội thoại?', 'Chia lô gửi AI', 0);
link('Có hội thoại?', 'Thống kê ngày', 1);
link('Chia lô gửi AI', 'Gemini chấm lead');
link('Gemini chấm lead', 'Tách kết quả AI');
link('Tách kết quả AI', 'Ghi BC_CHI_TIET');
link('Tách kết quả AI', 'Thống kê ngày');
link('Thống kê ngày', 'Ghi BC_NGAY');

// "Thống kê ngày" nhận nhiều item nhưng chỉ cần chạy 1 lần
nodes.find((n) => n.name === 'Thống kê ngày').executeOnce = true;

const workflow = {
  name: 'Pancake - Đánh giá chất lượng lead hằng ngày (Gemini)',
  nodes: nodes.map((n, i) => ({ id: `node-${i}`, ...n })),
  connections,
  settings: { executionOrder: 'v1', timezone: 'Asia/Ho_Chi_Minh' },
};

writeFileSync(join(here, 'workflow.json'), JSON.stringify(workflow, null, 2) + '\n');
console.log(`workflow.json: ${nodes.length} nodes`);
