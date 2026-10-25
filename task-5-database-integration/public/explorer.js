// API explorer: a tiny browser client for the Users API (vanilla JavaScript + fetch)
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var lastUserId = null;

  var ENDPOINTS = [
    { method: "GET", path: "/api/users", label: "List users" },
    { method: "GET", path: "/api/users?search=a&minAge=20&sort=-age&limit=3", label: "Search, filter, sort" },
    { method: "GET", path: "/api/users/stats", label: "Statistics (COUNT, AVG, GROUP BY)" },
    { method: "GET", path: "/api/users/:id", label: "Get one user" },
    { method: "POST", path: "/api/users", label: "Create a user", body: { name: "Loujein Fanni", email: "loujein@example.com", age: 25 } },
    { method: "PUT", path: "/api/users/:id", label: "Replace a user", body: { name: "Loujein F.", email: "loujein@example.com", age: 26 } },
    { method: "PATCH", path: "/api/users/:id", label: "Update some fields", body: { age: 27 } },
    { method: "DELETE", path: "/api/users/:id", label: "Delete a user" },
    { method: "POST", path: "/api/users", label: "Invalid data → 400", body: { name: "L", email: "nope", age: 200 } },
    { method: "GET", path: "/api/users?search=' OR 1=1; DROP TABLE users; --", label: "SQL injection attempt (harmless)" },
    { method: "GET", path: "/api/health", label: "Health check" },
  ];

  function withId(path) {
    return path.replace(":id", lastUserId || ":id");
  }

  // ---------- Endpoint list ----------
  $("endpoint-list").innerHTML = ENDPOINTS.map(function (e, i) {
    return '<li><button type="button" data-i="' + i + '"><span class="m m-' + e.method + '">' + e.method + "</span>" +
      '<span class="ep"><span class="mono">' + e.path.split("?")[0] + "</span><small>" + e.label + "</small></span></button></li>";
  }).join("");

  $("endpoint-list").addEventListener("click", function (ev) {
    var btn = ev.target.closest("[data-i]");
    if (!btn) return;
    var e = ENDPOINTS[btn.dataset.i];
    $("method").value = e.method;
    $("path").value = withId(e.path);
    $("body").value = e.body ? JSON.stringify(e.body, null, 2) : "";
    syncBody();
    document.querySelectorAll("#endpoint-list button").forEach(function (b) { b.classList.toggle("active", b === btn); });
    if (window.innerWidth < 900) $("request-form").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  function syncBody() {
    var hasBody = ["POST", "PUT", "PATCH"].indexOf($("method").value) >= 0;
    $("body").disabled = !hasBody;
    $("body-hint").textContent = hasBody ? "" : "(not sent with " + $("method").value + ")";
    $("body-error").textContent = "";
  }
  $("method").addEventListener("change", syncBody);

  // ---------- JSON syntax highlighting ----------
  function escapeHtml(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function highlight(json) {
    return escapeHtml(json).replace(/("(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(\.\d+)?)/g, function (m) {
      var cls = /^"/.test(m) ? (/:$/.test(m) ? "k" : "s") : /true|false|null/.test(m) ? "b" : "n";
      return '<span class="' + cls + '">' + m + "</span>";
    });
  }

  // ---------- Send a request ----------
  async function send(ev) {
    if (ev) ev.preventDefault();
    var method = $("method").value;
    var path = $("path").value.trim();
    var options = { method: method, headers: {} };

    if (!$("body").disabled && $("body").value.trim()) {
      try { JSON.parse($("body").value); } catch (e) {
        $("body-error").textContent = "Invalid JSON: " + e.message;
        return;
      }
      options.headers["Content-Type"] = "application/json";
      options.body = $("body").value;
    }
    $("body-error").textContent = "";

    var start = performance.now();
    try {
      var res = await fetch(path, options);
      var ms = Math.round(performance.now() - start);
      var text = await res.text();
      var data = text ? JSON.parse(text) : null;

      var cls = res.status < 300 ? "ok" : res.status < 500 ? "warn" : "err";
      $("res-status").className = "status " + cls;
      $("res-status").textContent = res.status + " " + res.statusText;
      $("res-time").textContent = ms + " ms";
      var location = res.headers.get("Location");
      $("res-location").textContent = location ? "Location: " + location : "";
      $("res-body").innerHTML = data ? highlight(JSON.stringify(data, null, 2)) : '<span class="muted">// empty body (204 No Content)</span>';

      renderSql(res.headers.get("X-Sql-Queries"));

      // Remember the last created user so :id endpoints can use it
      if (method === "POST" && res.status === 201) lastUserId = data.data.id;
      if (method === "DELETE" && res.status === 204 && path.indexOf(lastUserId) >= 0) lastUserId = null;
    } catch (err) {
      $("res-status").className = "status err";
      $("res-status").textContent = "Network error";
      $("res-body").textContent = String(err);
    }
    loadUsers();
  }

  $("request-form").addEventListener("submit", send);
  $("body").addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send(); });
  $("path").addEventListener("keydown", function (e) { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send(e); });

  // ---------- SQL panel ----------
  var SQL_KEYWORDS = /\b(SELECT|FROM|WHERE|AND|OR|ORDER BY|ASC|DESC|LIMIT|OFFSET|INSERT INTO|VALUES|RETURNING|UPDATE|SET|DELETE|COUNT|AVG|MIN|MAX|ROUND|GROUP BY|ILIKE|AS|CASE|WHEN|THEN|ELSE|END|split_part)\b/g;
  function highlightSql(sql) {
    return escapeHtml(sql)
      .replace(SQL_KEYWORDS, '<span class="kw">$1</span>')
      .replace(/(\$\d+)/g, '<span class="param">$1</span>');
  }
  function renderSql(header) {
    var list = [];
    try { list = header ? JSON.parse(decodeURIComponent(header)) : []; } catch (e) { list = []; }
    $("sql-count").textContent = list.length;
    $("sql-list").innerHTML = list.length
      ? list.map(function (q) {
          var params = q.params && q.params.length
            ? '<div class="sql-params">' + q.params.map(function (p, i) { return '<span><b>$' + (i + 1) + "</b> = " + escapeHtml(JSON.stringify(p)) + "</span>"; }).join("") + "</div>"
            : "";
          return '<div class="sql-item"><code class="sql">' + highlightSql(q.sql) + "</code>" + params +
            '<div class="sql-meta muted">' + q.rows + " row" + (q.rows === 1 ? "" : "s") + " · " + q.ms + " ms</div></div>";
        }).join("")
      : '<p class="muted small">No SQL for this request (validated and refused before reaching the database, or SHOW_SQL=false).</p>';
  }

  // ---------- Statistics ----------
  async function loadStats() {
    try {
      var s = (await (await fetch("/api/users/stats")).json()).data;
      $("st-total").textContent = s.total;
      $("st-avg").textContent = s.averageAge == null ? "–" : String(s.averageAge).replace(".", ",") + " years";
      $("st-range").textContent = s.total ? s.youngest + " · " + s.oldest : "–";
      var max = Math.max.apply(null, s.ageBrackets.map(function (b) { return b.users; }).concat(1));
      $("st-brackets").innerHTML = s.ageBrackets.map(function (b) {
        return '<div class="bar"><span class="bar-label">' + b.bracket + '</span><span class="bar-track"><span class="bar-fill" style="width:' + (b.users / max) * 100 + '%"></span></span><b>' + b.users + "</b></div>";
      }).join("");
    } catch (e) { /* offline */ }
  }

  // ---------- Live users table ----------
  async function loadUsers() {
    try {
      var res = await fetch("/api/users?limit=100");
      var json = await res.json();
      $("user-total").textContent = json.meta.total;
      loadStats();
      $("user-rows").innerHTML = json.data.map(function (u) {
        return "<tr><td>" + escapeHtml(u.name) + "</td><td>" + escapeHtml(u.email) + "</td><td>" + u.age +
          '</td><td class="mono muted">' + u.id.slice(0, 8) + '…</td><td><button type="button" class="use" data-id="' + u.id + '">Use id</button></td></tr>';
      }).join("");
    } catch (e) { /* server offline: health pill shows it */ }
  }

  $("user-rows").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-id]");
    if (!btn) return;
    lastUserId = btn.dataset.id;
    $("method").value = "GET";
    $("path").value = "/api/users/" + lastUserId;
    $("body").value = "";
    syncBody();
    send();
  });

  // ---------- Health ----------
  async function health() {
    try {
      var res = await fetch("/api/health");
      var json = await res.json();
      $("health").className = "pill " + (json.database === "connected" ? "up" : "down");
      $("health").innerHTML = '<span class="dot"></span> API online · PostgreSQL ' + json.database;
    } catch (e) {
      $("health").className = "pill down";
      $("health").innerHTML = '<span class="dot"></span> offline';
    }
  }

  syncBody();
  health();
  setInterval(health, 15000);
  loadUsers();
})();
