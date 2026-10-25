/* Draws each ceramic piece as an inline SVG, so the shop needs no photos.
 * drawCeramic({ shape, pattern, a, b }) -> SVG markup string
 */
(function () {
  "use strict";

  var CREAM = "#f6eee1";
  var uid = 0;

  // Darken (amount < 0) or lighten (amount > 0) a hex colour
  function shade(hex, amount) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) : c) * amount))); }
    return "#" + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
  }

  function ring(count, radius, size, fill, cx, cy, ry) {
    var out = "";
    for (var i = 0; i < count; i++) {
      var angle = (i / count) * Math.PI * 2;
      var x = cx + Math.cos(angle) * radius;
      var y = cy + Math.sin(angle) * (ry || radius);
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + size + '" fill="' + fill + '"/>';
    }
    return out;
  }

  /* ---------- Decorations seen from above (plates, dishes) ---------- */
  function topPattern(pattern, a, b, cx, cy, sx, sy) {
    var g = '<g transform="translate(' + cx + " " + cy + ") scale(" + sx + " " + sy + ')">';
    if (pattern === "flower") {
      for (var i = 0; i < 8; i++) {
        g += '<ellipse cx="0" cy="-30" rx="10" ry="24" fill="' + a + '" transform="rotate(' + i * 45 + ')"/>';
      }
      g += '<circle r="12" fill="' + b + '"/>' + ring(8, 44, 3.2, b, 0, 0);
    } else if (pattern === "star") {
      g += '<rect x="-34" y="-34" width="68" height="68" fill="' + a + '"/>';
      g += '<rect x="-34" y="-34" width="68" height="68" fill="' + a + '" transform="rotate(45)"/>';
      g += '<circle r="20" fill="' + CREAM + '"/><circle r="9" fill="' + b + '"/>' + ring(16, 56, 2.6, a, 0, 0);
    } else {
      g += ring(18, 50, 4.5, a, 0, 0) + ring(12, 32, 4, b, 0, 0) + ring(6, 15, 3.5, a, 0, 0) + '<circle r="5" fill="' + b + '"/>';
    }
    return g + "</g>";
  }

  /* ---------- Painted bands for pieces seen from the side ---------- */
  function band(pattern, color, y, x1, x2) {
    var d = "", x, k;
    if (pattern === "zigzag") {
      d = "M" + x1 + " " + y;
      for (x = x1, k = 0; x <= x2; x += 10, k++) d += " L" + x + " " + (y + (k % 2 ? -7 : 7));
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linejoin="round"/>';
    }
    if (pattern === "wave") {
      d = "M" + x1 + " " + y;
      for (x = x1; x < x2; x += 20) d += " q5 -9 10 0 t10 0";
      return '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round"/>';
    }
    var out = "";
    for (x = x1; x <= x2; x += 12) out += '<circle cx="' + x + '" cy="' + y + '" r="3.6" fill="' + color + '"/>';
    return out;
  }

  function sideBands(pattern, b, top, bottom, clipId) {
    var lines = '<line x1="0" x2="200" y1="' + top + '" y2="' + top + '" stroke="' + b + '" stroke-width="3"/>';
    lines += '<line x1="0" x2="200" y1="' + bottom + '" y2="' + bottom + '" stroke="' + b + '" stroke-width="3"/>';
    var mid = (top + bottom) / 2;
    var p = pattern === "flower" || pattern === "star" ? "dots" : pattern;
    return '<g clip-path="url(#' + clipId + ')">' + lines + band(p, b, mid, 0, 200) + "</g>";
  }

  function shadow(cy, rx) {
    return '<ellipse cx="100" cy="' + cy + '" rx="' + rx + '" ry="7" fill="#000" opacity=".12"/>';
  }

  /* ---------- Shapes ---------- */
  var SHAPES = {
    plate: function (p, a, b) {
      return shadow(190, 70) +
        '<circle cx="100" cy="98" r="88" fill="' + a + '"/>' +
        ring(28, 81, 2.4, CREAM, 100, 98) +
        '<circle cx="100" cy="98" r="72" fill="' + CREAM + '"/>' +
        '<circle cx="100" cy="98" r="72" fill="none" stroke="' + b + '" stroke-width="3"/>' +
        topPattern(p, a, b, 100, 98, 1, 1) +
        '<path d="M40 60 A72 72 0 0 1 90 28" stroke="#fff" stroke-opacity=".35" stroke-width="6" fill="none" stroke-linecap="round"/>';
    },
    oval: function (p, a, b) {
      return shadow(176, 84) +
        '<ellipse cx="100" cy="100" rx="94" ry="66" fill="' + a + '"/>' +
        ring(30, 86, 2.4, CREAM, 100, 100, 58) +
        '<ellipse cx="100" cy="100" rx="78" ry="52" fill="' + CREAM + '"/>' +
        topPattern(p, a, b, 100, 100, 1.15, 0.78);
    },
    bowl: function (p, a, b, id) {
      var body = "M22 78 Q28 168 100 170 Q172 168 178 78 Z";
      return shadow(178, 60) +
        '<clipPath id="' + id + '"><path d="' + body + '"/></clipPath>' +
        '<path d="' + body + '" fill="' + a + '"/>' +
        sideBands(p, b, 104, 136, id) +
        '<ellipse cx="100" cy="78" rx="78" ry="17" fill="' + shade(a, -0.25) + '"/>' +
        '<ellipse cx="100" cy="80" rx="70" ry="12" fill="' + CREAM + '"/>' +
        '<path d="M40 100 Q44 140 70 156" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round"/>';
    },
    vase: function (p, a, b, id) {
      var body = "M82 22 H118 V40 Q116 52 124 60 Q176 84 168 138 Q160 182 100 184 Q40 182 32 138 Q24 84 76 60 Q84 52 82 40 Z";
      return shadow(188, 56) +
        '<clipPath id="' + id + '"><path d="' + body + '"/></clipPath>' +
        '<path d="' + body + '" fill="' + a + '"/>' +
        sideBands(p, b, 100, 136, id) +
        '<g clip-path="url(#' + id + ')">' + band("dots", b, 160, 20, 190) + "</g>" +
        '<ellipse cx="100" cy="23" rx="20" ry="5" fill="' + shade(a, -0.35) + '"/>' +
        '<path d="M50 104 Q48 140 66 166" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round"/>';
    },
    mug: function (p, a, b, id) {
      var body = "M48 54 H140 V150 Q140 172 118 172 H70 Q48 172 48 150 Z";
      return shadow(180, 56) +
        '<path d="M138 82 Q178 82 178 114 Q178 146 138 146" fill="none" stroke="' + shade(a, -0.15) + '" stroke-width="13"/>' +
        '<clipPath id="' + id + '"><path d="' + body + '"/></clipPath>' +
        '<path d="' + body + '" fill="' + a + '"/>' +
        sideBands(p, b, 92, 128, id) +
        '<ellipse cx="94" cy="54" rx="46" ry="10" fill="' + shade(a, -0.3) + '"/>' +
        '<ellipse cx="94" cy="55" rx="40" ry="7" fill="#5a3a24"/>' +
        '<path d="M62 76 V150" stroke="#fff" stroke-opacity=".3" stroke-width="6" stroke-linecap="round"/>';
    },
    tajine: function (p, a, b, id) {
      var lid = "M30 146 Q58 132 82 62 Q100 22 118 62 Q142 132 170 146 Z";
      return shadow(186, 86) +
        '<ellipse cx="100" cy="158" rx="92" ry="24" fill="' + shade(a, -0.2) + '"/>' +
        '<ellipse cx="100" cy="152" rx="84" ry="18" fill="' + a + '"/>' +
        '<clipPath id="' + id + '"><path d="' + lid + '"/></clipPath>' +
        '<path d="' + lid + '" fill="' + a + '"/>' +
        sideBands(p, b, 104, 130, id) +
        '<g clip-path="url(#' + id + ')">' + band("dots", b, 84, 60, 140) + "</g>" +
        '<circle cx="100" cy="36" r="11" fill="' + shade(a, -0.2) + '"/>' +
        '<path d="M70 120 Q84 84 92 60" stroke="#fff" stroke-opacity=".3" stroke-width="6" fill="none" stroke-linecap="round"/>';
    },
  };

  window.drawCeramic = function (opts) {
    var id = "fk-clip-" + uid++;
    var inner = SHAPES[opts.shape](opts.pattern, opts.a, opts.b, id);
    return '<svg viewBox="0 0 200 200" role="img" aria-label="' + (opts.label || "") + '" xmlns="http://www.w3.org/2000/svg">' + inner + "</svg>";
  };
})();
