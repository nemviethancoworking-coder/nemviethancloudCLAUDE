/**
 * Kiểm thử làm sạch rich text (hàm thuần trong src/work.js) — KHÔNG cần PostgreSQL:
 *   node --test test/rich.test.js
 */
'use strict';
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { cleanRich, plainOf, RT } = require('../src/work.js');

const rt = html => RT + html;
const clean = html => cleanRich(rt(html), 20000);
const body = html => { const r = clean(html); assert.ok(r.startsWith(RT), 'kết quả phải còn tiền tố: ' + JSON.stringify(r)); return r.slice(RT.length); };

describe('Rich text: giữ đúng các thẻ cho phép', () => {
  test('b / i / br / span màu qua nguyên vẹn', () => {
    const ok = 'a <b>đậm</b> <i>nghiêng</i><br><span class="c-red">đỏ</span> <span class="c-orange">cam</span> <span class="c-blue">xanh</span> &amp; &lt;x&gt;';
    assert.equal(clean(ok), rt(ok));
  });
  test('strong/em → b/i; thẻ hoa; br tự đóng', () => {
    assert.equal(body('<STRONG>x</STRONG><EM>y</EM>a<br/>b</br>'), '<b>x</b><i>y</i>a<br>b');
  });
  test('class bằng nháy đơn hoặc không nháy', () => {
    assert.equal(body("<span class='c-blue'>x</span><span class=c-red>y</span>"), '<span class="c-blue">x</span><span class="c-red">y</span>');
  });
  test('idempotent', () => {
    const once = clean('<b>a</b><i><span class="c-red">b</span></i> <u>c</u> <script>d</script>');
    assert.equal(cleanRich(once, 20000), once);
  });
});

describe('Rich text: chống XSS', () => {
  test('script / style / iframe bị bỏ thẻ', () => {
    for (const bad of ['<script>alert(1)</script>', '<style>body{display:none}</style>', '<iframe src="//evil"></iframe>', '<object data=x></object>', '<SCRIPT SRC=//x></SCRIPT>']) {
      const out = body('a' + bad + 'b');
      assert.doesNotMatch(out, /<(script|style|iframe|object)/i, bad);
    }
  });
  test('thẻ có sự kiện / thuộc tính nguy hiểm', () => {
    assert.equal(body('<img src=x onerror=alert(1)>t'), 't');
    assert.equal(body('<b onclick="x()" style="color:red">t</b>'), '<b>t</b>');
    assert.equal(body('<i onmouseover=alert(1)>t</i>'), '<i>t</i>');
    assert.equal(body('<svg onload=alert(1)>t</svg>'), 't');
    assert.equal(body('<body onload=alert(1)>t'), 't');
  });
  test('span: bỏ style/onclick, chỉ giữ class hợp lệ', () => {
    assert.equal(body('<span style="color:red" class="c-red" onclick="x()">t</span>'), '<span class="c-red">t</span>');
    assert.equal(body('<span class="evil">t</span>'), 't');
    assert.equal(body('<span class="c-red evil">t</span>'), 't');
    assert.equal(body('<span class="c-red c-blue">t</span>'), 't');
    assert.equal(body('<span style="color:red">t</span>'), 't');
    assert.equal(body('<span title="class=c-red">t</span>'), 't', 'class nằm trong giá trị thuộc tính khác không tính');
    assert.equal(body('<span class="c-red" title="a>b">t</span>'), '<span class="c-red">t</span>', 'dấu > trong thuộc tính không phá thẻ');
  });
  test('href / javascript: bị bỏ, giữ chữ', () => {
    assert.equal(body('<a href="javascript:alert(1)">bấm</a>'), 'bấm');
    assert.equal(body('<a href=\'data:text/html,x\' target=_blank>bấm</a>'), 'bấm');
  });
  test('thẻ lồng sai / chưa đóng / đóng thừa', () => {
    assert.equal(body('<b><i>x</b>y</i>'), '<b><i>x</i></b><i>y</i>');
    assert.equal(body('<b>x'), '<b>x</b>');
    assert.equal(body('x</b></i></span>y'), 'xy');
    assert.equal(body('<b><span class="c-red"><i>x'), '<b><span class="c-red"><i>x</i></span></b>');
    assert.equal(body('<span class="evil"><b>x</span>y</b>'), '<b>x</b><b>y</b>');
  });
  test('thẻ vỡ / lẻ: không sinh thẻ mới', () => {
    for (const bad of ['<scr<script>ipt>alert(1)</scr</script>ipt>', '<<script>script>x', '<b <script>x', '<a href="x', '< script>x', '<img src="x" onerror="alert(1)"', '<!--<script>-->x', '<![CDATA[<script>]]>x', '<?php echo 1 ?>x']) {
      const out = body(bad);
      assert.doesNotMatch(out, /<(?!\/?(?:b|i|br|span)\b)/i, bad + ' → ' + out);
    }
  });
  test('entity: giải mã rồi escape lại, không thể "đổi" văn bản thành thẻ', () => {
    assert.equal(body('&lt;script&gt;alert(1)&lt;/script&gt;'), '&lt;script&gt;alert(1)&lt;/script&gt;');
    assert.equal(body('&amp;lt;b&amp;gt;'), '&amp;lt;b&amp;gt;');
    assert.equal(body('a < b & c > d'), 'a &lt; b &amp; c &gt; d');
    assert.equal(body('&quot;x&quot; &#39;y&#39; a&nbsp;b'), '"x" \'y\' a b');
    assert.equal(body('&#60;script&#62;'), '&amp;#60;script&amp;#62;', 'entity số khác không giải mã');
    assert.equal(body('&AMP;&LT;b&GT;'), '&amp;&lt;b&gt;');
  });
  test('ký tự điều khiển bị loại; \\r\\n chuẩn hoá', () => {
    assert.equal(body('a\u0000b\u0007c\u001fd\u007fe\r\nf'), 'abcde\nf');
  });
  test('ngoài ra: kết quả luôn thuộc văn phạm cho phép (fuzz)', () => {
    const frags = ['<b>', '</b>', '<i>', '</i>', '<span class="c-red">', '<span class="c-blue" style="x">', '<span class="zz">', '</span>', '<br>', '<br/>', '<div>', '</div>', '<p>', '</p>', '<li>', '</li>', '<script>', '</script>',
      '<img src=x onerror=1>', '<a href="javascript:1">', '</a>', '<', '>', '&', '&amp;', '&lt;', '&gt;', '&quot;', '&#39;', '&nbsp;', '&bogus;', '"', "'", '=', 'chữ', ' ', '\n', '<!--', '-->', '<![CDATA[', '<?', 'javascript:', 'on', 'x=1 '];
    let seed = 12345; const rnd = n => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    const GRAMMAR = /^(?:[^<>&]|&amp;|&lt;|&gt;|<br>|<\/?b>|<\/?i>|<span class="c-(?:red|orange|blue)">|<\/span>)*$/;
    for (let k = 0; k < 3000; k++) {
      let s = ''; for (let n = rnd(14); n >= 0; n--) s += frags[rnd(frags.length)];
      const out = cleanRich(rt(s), 100000);
      if (out === '') continue;
      const html = out.slice(RT.length);
      assert.match(html, GRAMMAR, JSON.stringify(s) + ' → ' + JSON.stringify(html));
      // cân bằng thẻ
      const stack = [];
      for (const t of html.match(/<\/?(?:b|i|span)\b[^>]*>/g) || []) {
        const name = /^<\/?(\w+)/.exec(t)[1];
        if (t[1] === '/') assert.equal(stack.pop(), name, 'thẻ không cân bằng: ' + html); else stack.push(name);
      }
      assert.equal(stack.length, 0, 'thẻ còn mở: ' + html);
      assert.equal(cleanRich(out, 100000), out, 'không idempotent: ' + html);
    }
  });
});

describe('Rich text: khối, rỗng, giới hạn, văn bản thuần', () => {
  test('đóng div/p/li → xuống dòng; bỏ <br> thừa hai đầu', () => {
    assert.equal(body('<div>a</div><div>b</div>'), 'a<br>b');
    assert.equal(body('<p>a</p><ul><li>x</li><li>y</li></ul>'), 'a<br>x<br>y');
    assert.equal(body('<br><br>a<br>'), 'a');
  });
  test('không còn chữ → rỗng', () => {
    for (const e of ['', '   ', '<br>', '<b></b>', '<b> <i></i> </b>', '<script></script>', '<div></div>', '&nbsp;', '<!-- c -->']) assert.equal(clean(e), '', JSON.stringify(e));
    assert.equal(cleanRich(RT, 100), '');
  });
  test('quá dài → lỗi, không cắt giữa thẻ', () => {
    assert.throws(() => cleanRich(rt('<b>' + 'x'.repeat(200) + '</b>'), 100), /quá dài/);
    assert.equal(cleanRich(rt('<b>' + 'x'.repeat(50) + '</b>'), 100).length, RT.length + 7 + 50);
  });
  test('chuỗi KHÔNG có tiền tố giữ nguyên', () => {
    for (const s of ['<script>alert(1)</script>', 'a & b <b>x</b>', '  khoảng trắng  ', 'dòng 1\ndòng 2', ' ' + RT + 'x', '']) assert.equal(cleanRich(s), s);
    assert.equal(cleanRich(undefined), '');
    assert.equal(cleanRich(null), '');
  });
  test('plainOf', () => {
    assert.equal(plainOf(rt('a<br><b>b &amp; c</b> &lt;i&gt;<span class="c-red">d</span>')), 'a\nb & c <i>d');
    assert.equal(plainOf('thuần <b>x</b> &amp;'), 'thuần <b>x</b> &amp;', 'văn bản thuần không bị đụng');
    assert.equal(plainOf(rt('<br> <b></b>')).trim(), '');
    assert.equal(plainOf(null), '');
  });
});
