// Cấu hình mặc định. Người dùng chỉnh trong trang Tuỳ chọn của extension (lưu ở chrome.storage.local).
(function (root) {
  'use strict';
  const DEFAULTS = {
    mitekUrl: '',        // MITEK_URL trong tài liệu, VD: https://abc.mitek.vn  (API: MITEK_URL/cdr/getCallsLog)
    secret: '',          // secret do Mitek cấp
    lookbackDays: 90,    // tra cứu cuộc gọi trong N ngày gần nhất
    maxPages: 5,         // mỗi trang tối đa 100 cuộc (giới hạn của Mitek)
    sendCookies: true,   // gửi cookie đăng nhập Mitek trên Chrome khi tải file ghi âm
    extraOrigins: '',    // tên miền chứa file ghi âm (VD: https://rec.mitek.vn), mỗi dòng 1 cái
    phoneSelector: ''    // CSS selector vùng chứa SĐT trên trang đơn hàng POScake (để trống = tự dò)
  };
  root.MITEK_DEFAULTS = DEFAULTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = DEFAULTS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
