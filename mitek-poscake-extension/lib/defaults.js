// Cấu hình mặc định. Người dùng chỉnh trong trang Tuỳ chọn của extension.
(function (root) {
  'use strict';
  const DEFAULTS = {
    // --- Mitek ---
    apiBase: '',                 // VD: https://api.mitek.vn  (dùng để xin quyền truy cập + ghép link tương đối)
    cdrUrlTemplate: '',          // VD: https://api.mitek.vn/v1/cdr?phone={phone}&from={from}&to={to}
    authHeaderName: 'Authorization',
    authHeaderValue: '',         // VD: Bearer xxxxxxxx  (để trống nếu dùng cookie đăng nhập)
    sendCookies: true,           // gửi cookie phiên đăng nhập Mitek trên Chrome (link ghi âm cần đăng nhập)
    dateFormat: 'datetime',      // datetime | date | unix | unixms
    lookbackDays: 90,

    // --- Ánh xạ trường trong JSON trả về ---
    listPath: 'data',            // đường dẫn tới mảng cuộc gọi
    fieldTime: 'start_time',
    fieldDuration: 'duration',
    fieldDirection: 'direction',
    fieldAgent: 'extension',
    fieldRecording: 'recording_url',
    recordingUrlTemplate: '',    // nếu API chỉ trả mã file: https://api.mitek.vn/v1/recording/{value}
    extraOrigins: '',            // tên miền khác chứa file ghi âm, mỗi dòng 1 cái. VD: https://rec.mitek.vn

    // --- POScake ---
    phoneSelector: ''            // CSS selector vùng chứa SĐT trên trang đơn hàng (để trống = tự dò)
  };
  root.MITEK_DEFAULTS = DEFAULTS;
  if (typeof module !== 'undefined' && module.exports) module.exports = DEFAULTS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
