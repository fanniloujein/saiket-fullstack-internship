/* Fakhar — landing page interactions (vanilla JavaScript)
 *  - product grid: category filters, search, sort, wishlist
 *  - quick view with colour variants and quantity
 *  - cart (Bootstrap offcanvas): quantities, promo code, free-shipping bar, saved in localStorage
 *  - checkout and newsletter forms with JavaScript validation
 *  - countdown, dark-mode toggle, copy promo code, toasts
 */
(function () {
  "use strict";

  var FREE_SHIPPING = 150;
  var SHIPPING_FEE = 8;
  var PROMO_CODES = { FAKHAR15: 0.15, BIENVENUE10: 0.1 };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var byId = {};
  PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  // localStorage may be unavailable (private mode): the page must still work
  var store = {
    get: function (k, fallback) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch (e) { return fallback; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  };

  var state = {
    filter: "all",
    query: "",
    sort: "popular",
    cart: store.get("fk-cart", []).filter(function (l) { return byId[l.id]; }),
    wishlist: store.get("fk-wish", []).filter(function (id) { return byId[id]; }),
    promo: store.get("fk-promo", null),
  };

  function money(n) { return n.toFixed(3).replace(".", ",") + " DT"; }
  function art(p, colorIndex) {
    var c = p.colors[colorIndex || 0];
    return drawCeramic({ shape: p.shape, pattern: p.pattern, a: c.a, b: c.b, label: p.name + " — " + c.name });
  }
  function stars(r) { return '<span class="star">★</span> ' + r.toFixed(1).replace(".", ","); }

  /* ------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------ */
  var toastEl = $("#toast");
  function toast(message, type) {
    $("#toast-text").textContent = message;
    var ic = $("#toast-ic");
    ic.querySelector("use").setAttribute("href", type === "error" ? "#i-alert" : "#i-check");
    ic.setAttribute("class", "ic " + (type === "error" ? "text-danger" : "text-success"));
    bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 3500 }).show();
  }

  /* ------------------------------------------------------------------
     Dark mode (simple toggle button)
     ------------------------------------------------------------------ */
  var themeBtn = $("#theme-toggle");
  function syncThemeButton() {
    var dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
    themeBtn.querySelector("use").setAttribute("href", dark ? "#i-sun" : "#i-moon");
    themeBtn.setAttribute("aria-label", dark ? "Activer le mode clair" : "Activer le mode sombre");
    themeBtn.setAttribute("aria-pressed", String(dark));
  }
  themeBtn.addEventListener("click", function () {
    var next = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-bs-theme", next);
    try { localStorage.setItem("fk-theme", next); } catch (e) { /* ignore */ }
    syncThemeButton();
  });
  syncThemeButton();

  /* ------------------------------------------------------------------
     Countdown to the end of the current month (sale end)
     ------------------------------------------------------------------ */
  var now0 = new Date();
  var saleEnd = new Date(now0.getFullYear(), now0.getMonth() + 1, 1, 0, 0, 0);
  function tickCountdown() {
    var diff = Math.max(0, saleEnd - new Date());
    var parts = {
      d: Math.floor(diff / 864e5),
      h: Math.floor(diff / 36e5) % 24,
      m: Math.floor(diff / 6e4) % 60,
      s: Math.floor(diff / 1e3) % 60,
    };
    Object.keys(parts).forEach(function (u) { $('[data-unit="' + u + '"]').textContent = String(parts[u]).padStart(2, "0"); });
  }
  tickCountdown();
  setInterval(tickCountdown, 1000);

  // Copy the promo code
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var code = btn.dataset.copy;
      var done = function () { toast("Code " + code + " copié ! Collez-le dans votre panier."); };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(code).then(done, done);
      else done();
      $("#promo-input").value = code;
    });
  });

  /* ------------------------------------------------------------------
     Hero plate with colour swatches
     ------------------------------------------------------------------ */
  var heroProduct = byId["jasmin-plate"];
  function drawHero(i) { $("#hero-plate").innerHTML = art(heroProduct, i); }
  $$("[data-hero]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      $$("[data-hero]").forEach(function (b) { b.classList.toggle("active", b === btn); });
      drawHero(Number(btn.dataset.hero));
    });
  });
  drawHero(0);

  /* ------------------------------------------------------------------
     Product grid: filters, search, sort
     ------------------------------------------------------------------ */
  var filtersEl = $("#filters");
  var grid = $("#products");

  function renderFilters() {
    var keys = Object.keys(CATEGORIES).concat(["fav"]);
    filtersEl.innerHTML = keys.map(function (key) {
      var count = key === "all" ? PRODUCTS.length
        : key === "fav" ? state.wishlist.length
        : PRODUCTS.filter(function (p) { return p.category === key; }).length;
      var label = key === "fav" ? "♥ Favoris" : CATEGORIES[key];
      return '<button type="button" class="filter-pill" data-filter="' + key + '" aria-pressed="' + (state.filter === key) + '">' +
        label + '<span class="n">' + count + "</span></button>";
    }).join("");
  }

  function visibleProducts() {
    var q = state.query.trim().toLowerCase();
    var list = PRODUCTS.filter(function (p) {
      if (state.filter === "fav" && state.wishlist.indexOf(p.id) < 0) return false;
      if (state.filter !== "all" && state.filter !== "fav" && p.category !== state.filter) return false;
      if (!q) return true;
      var haystack = (p.name + " " + p.description + " " + CATEGORIES[p.category] + " " + p.colors.map(function (c) { return c.name; }).join(" ")).toLowerCase();
      return haystack.indexOf(q) >= 0;
    });
    var sorters = {
      popular: function (a, b) { return b.popularity - a.popularity; },
      new: function (a, b) { return b.added.localeCompare(a.added); },
      "price-asc": function (a, b) { return a.price - b.price; },
      "price-desc": function (a, b) { return b.price - a.price; },
      rating: function (a, b) { return b.rating - a.rating || b.reviews - a.reviews; },
    };
    return list.sort(sorters[state.sort]);
  }

  var BADGES = { promo: "Promo", new: "Nouveau", best: "Best-seller" };

  function productCard(p, index) {
    var wished = state.wishlist.indexOf(p.id) >= 0;
    var badge = p.badge ? '<span class="p-badge ' + p.badge + '">' + (p.badge === "promo" ? "-" + Math.round((1 - p.price / p.oldPrice) * 100) + " %" : BADGES[p.badge]) + "</span>" : "";
    return '<div class="col"><article class="product" style="animation-delay:' + index * 40 + 'ms">' +
      '<div class="position-relative">' +
        '<button type="button" class="product-media" data-quick="' + p.id + '" aria-label="Aperçu rapide : ' + p.name + '">' + art(p) +
          '<span class="quick"><svg class="ic ic-sm"><use href="#i-eye"/></svg>Aperçu rapide</span></button>' +
        badge +
        '<button type="button" class="wish" data-wish="' + p.id + '" aria-pressed="' + wished + '" aria-label="' + (wished ? "Retirer des favoris" : "Ajouter aux favoris") + " : " + p.name + '"><svg class="ic ic-sm"><use href="#i-heart"/></svg></button>' +
      "</div>" +
      '<div class="product-body">' +
        '<div class="d-flex justify-content-between align-items-center mb-1"><small class="text-body-secondary">' + CATEGORIES[p.category] + '</small><span class="rating">' + stars(p.rating) + " (" + p.reviews + ")</span></div>" +
        '<h3 class="product-name">' + p.name + "</h3>" +
        '<div class="mini-swatches my-2" aria-label="' + p.colors.length + ' couleurs">' + p.colors.map(function (c) { return '<span style="--a:' + c.a + '" title="' + c.name + '"></span>'; }).join("") + "</div>" +
        '<div class="d-flex align-items-center justify-content-between mt-auto pt-2">' +
          '<span class="price">' + money(p.price) + (p.oldPrice ? '<span class="old-price">' + money(p.oldPrice) + "</span>" : "") + "</span>" +
          '<button type="button" class="btn btn-clay btn-sm btn-add" data-add="' + p.id + '" aria-label="Ajouter au panier : ' + p.name + '"><svg class="ic ic-sm"><use href="#i-bag"/></svg> Ajouter</button>' +
        "</div>" +
      "</div></article></div>";
  }

  function renderProducts() {
    var list = visibleProducts();
    grid.innerHTML = list.map(productCard).join("");
    $("#empty").classList.toggle("d-none", list.length > 0);
    $("#result-info").textContent = list.length + " pièce" + (list.length > 1 ? "s" : "") +
      (state.filter !== "all" ? " · " + (state.filter === "fav" ? "Favoris" : CATEGORIES[state.filter]) : "") +
      (state.query ? " · « " + state.query + " »" : "");
  }

  function setFilter(key) {
    state.filter = key;
    renderFilters();
    renderProducts();
  }

  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-filter]");
    if (btn) setFilter(btn.dataset.filter);
  });

  var searchTimer;
  $("#search").addEventListener("input", function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { state.query = e.target.value; renderProducts(); }, 150);
  });
  $("#sort").addEventListener("change", function (e) { state.sort = e.target.value; renderProducts(); });
  $("#reset-filters").addEventListener("click", function () {
    state.query = ""; $("#search").value = ""; state.sort = "popular"; $("#sort").value = "popular";
    setFilter("all");
  });

  // Footer category links and the header heart jump to a filtered grid
  $$("[data-filter-link]").forEach(function (a) {
    a.addEventListener("click", function () { setFilter(a.dataset.filterLink); });
  });
  $("#wishlist-link").addEventListener("click", function () { setFilter("fav"); });

  // Grid actions (event delegation): add to cart, wishlist, quick view
  grid.addEventListener("click", function (e) {
    var add = e.target.closest("[data-add]");
    var wish = e.target.closest("[data-wish]");
    var quick = e.target.closest("[data-quick]");
    if (add) {
      addToCart(add.dataset.add, 0, 1);
      add.classList.add("added");
      add.innerHTML = '<svg class="ic ic-sm"><use href="#i-check"/></svg> Ajouté';
      setTimeout(function () {
        add.classList.remove("added");
        add.innerHTML = '<svg class="ic ic-sm"><use href="#i-bag"/></svg> Ajouter';
      }, 1400);
    } else if (wish) {
      toggleWish(wish.dataset.wish);
    } else if (quick) {
      openQuickView(quick.dataset.quick);
    }
  });

  /* ------------------------------------------------------------------
     Wishlist
     ------------------------------------------------------------------ */
  function toggleWish(id) {
    var i = state.wishlist.indexOf(id);
    if (i >= 0) state.wishlist.splice(i, 1); else state.wishlist.push(id);
    store.set("fk-wish", state.wishlist);
    toast(i >= 0 ? "Retiré des favoris." : byId[id].name + " ajouté aux favoris ♥");
    updateBadge("#wish-count", state.wishlist.length);
    renderFilters();
    renderProducts();
  }

  function updateBadge(sel, n) {
    var el = $(sel);
    var changed = el.textContent !== String(n);
    el.textContent = n;
    el.classList.toggle("d-none", n === 0);
    if (changed && n > 0) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  }

  /* ------------------------------------------------------------------
     Quick view (Bootstrap modal)
     ------------------------------------------------------------------ */
  var qv = { product: null, color: 0 };
  var qvModal = bootstrap.Modal.getOrCreateInstance($("#quickview"));

  function renderQuickColor() {
    var p = qv.product;
    $("#qv-img").innerHTML = art(p, qv.color);
    $("#qv-color-name").textContent = p.colors[qv.color].name;
    $$("#qv-colors .swatch").forEach(function (s, i) {
      s.setAttribute("aria-checked", String(i === qv.color));
      s.tabIndex = i === qv.color ? 0 : -1;
    });
  }

  function openQuickView(id) {
    var p = byId[id];
    qv.product = p;
    qv.color = 0;
    $("#qv-cat").textContent = CATEGORIES[p.category];
    $("#qv-title").textContent = p.name;
    $("#qv-rating").innerHTML = stars(p.rating) + " · " + p.reviews + " avis";
    $("#qv-price").innerHTML = money(p.price) + (p.oldPrice ? '<span class="old-price">' + money(p.oldPrice) + "</span>" : "");
    $("#qv-desc").textContent = p.description;
    $("#qv-qty").value = 1;
    $("#qv-colors").innerHTML = p.colors.map(function (c, i) {
      return '<button type="button" class="swatch" role="radio" data-color="' + i + '" style="--a:' + c.a + '" aria-label="' + c.name + '"></button>';
    }).join("");
    renderQuickColor();
    qvModal.show();
  }

  $("#qv-colors").addEventListener("click", function (e) {
    var s = e.target.closest("[data-color]");
    if (s) { qv.color = Number(s.dataset.color); renderQuickColor(); }
  });
  // Arrow keys move between colours (radio group behaviour)
  $("#qv-colors").addEventListener("keydown", function (e) {
    if (["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp"].indexOf(e.key) < 0) return;
    e.preventDefault();
    var n = qv.product.colors.length;
    qv.color = (qv.color + (e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : n - 1)) % n;
    renderQuickColor();
    $$("#qv-colors .swatch")[qv.color].focus();
  });

  function clampQty(v) { v = parseInt(v, 10); return isNaN(v) ? 1 : Math.min(20, Math.max(1, v)); }
  $("#qv-minus").addEventListener("click", function () { $("#qv-qty").value = clampQty($("#qv-qty").value - 1); });
  $("#qv-plus").addEventListener("click", function () { $("#qv-qty").value = clampQty(+$("#qv-qty").value + 1); });
  $("#qv-qty").addEventListener("change", function (e) { e.target.value = clampQty(e.target.value); });
  $("#qv-add").addEventListener("click", function () {
    addToCart(qv.product.id, qv.color, clampQty($("#qv-qty").value));
    qvModal.hide();
  });

  /* ------------------------------------------------------------------
     Cart (Bootstrap offcanvas)
     ------------------------------------------------------------------ */
  function saveCart() { store.set("fk-cart", state.cart); store.set("fk-promo", state.promo); }

  function addToCart(id, color, qty) {
    var line = state.cart.filter(function (l) { return l.id === id && l.color === color; })[0];
    if (line) line.qty = Math.min(20, line.qty + qty);
    else state.cart.push({ id: id, color: color, qty: qty });
    saveCart();
    renderCart();
    toast(byId[id].name + " (" + byId[id].colors[color].name + ") ajouté au panier.");
  }

  function totals() {
    var sub = state.cart.reduce(function (s, l) { return s + byId[l.id].price * l.qty; }, 0);
    var discount = state.promo ? Math.round(sub * PROMO_CODES[state.promo] * 1000) / 1000 : 0;
    var afterDiscount = sub - discount;
    var shipping = sub === 0 || afterDiscount >= FREE_SHIPPING ? 0 : SHIPPING_FEE;
    return { sub: sub, discount: discount, afterDiscount: afterDiscount, shipping: shipping, total: afterDiscount + shipping };
  }

  function renderCart() {
    var list = $("#cart-items");
    var empty = state.cart.length === 0;
    list.classList.toggle("d-none", empty);
    $("#cart-empty").classList.toggle("d-none", !empty);
    $("#cart-footer").classList.toggle("d-none", empty);

    list.innerHTML = state.cart.map(function (l, i) {
      var p = byId[l.id];
      return '<li class="cart-item">' +
        '<div class="cart-thumb">' + art(p, l.color) + "</div>" +
        "<div><p class=\"fw-semibold mb-0 small\">" + p.name + '</p><p class="text-body-secondary small mb-1">' + p.colors[l.color].name + " · " + money(p.price) + "</p>" +
          '<div class="qty-mini"><button type="button" data-dec="' + i + '" aria-label="Diminuer"><svg class="ic ic-sm"><use href="#i-minus"/></svg></button><span aria-live="polite">' + l.qty + '</span><button type="button" data-inc="' + i + '" aria-label="Augmenter"><svg class="ic ic-sm"><use href="#i-plus"/></svg></button></div></div>' +
        '<div class="text-end"><p class="fw-bold small mb-1">' + money(p.price * l.qty) + '</p><button type="button" class="btn-remove" data-remove="' + i + '" aria-label="Retirer ' + p.name + '"><svg class="ic ic-sm"><use href="#i-trash"/></svg></button></div>' +
        "</li>";
    }).join("");

    var t = totals();
    $("#t-sub").textContent = money(t.sub);
    $("#t-discount-row").classList.toggle("d-none", !t.discount);
    $("#t-discount").textContent = "-" + money(t.discount);
    $("#t-code").textContent = state.promo ? "(" + state.promo + ")" : "";
    $("#t-ship").textContent = t.shipping ? money(t.shipping) : "Offerte";
    $("#t-total").textContent = money(t.total);
    $("#co-total").textContent = money(t.total);

    var missing = FREE_SHIPPING - t.afterDiscount;
    $("#ship-msg").innerHTML = missing > 0
      ? "Plus que <b>" + money(missing) + "</b> pour la livraison offerte 🚚"
      : "<b>Bravo !</b> La livraison est offerte 🎉";
    $("#ship-bar").style.width = Math.min(100, (t.afterDiscount / FREE_SHIPPING) * 100) + "%";

    updateBadge("#cart-count", state.cart.reduce(function (s, l) { return s + l.qty; }, 0));
  }

  $("#cart-items").addEventListener("click", function (e) {
    var inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-remove]");
    if (inc) state.cart[+inc.dataset.inc].qty = Math.min(20, state.cart[+inc.dataset.inc].qty + 1);
    else if (dec) {
      var line = state.cart[+dec.dataset.dec];
      line.qty -= 1;
      if (line.qty < 1) state.cart.splice(+dec.dataset.dec, 1);
    } else if (rm) state.cart.splice(+rm.dataset.remove, 1);
    else return;
    saveCart();
    renderCart();
  });

  // Promo code
  $("#promo-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var input = $("#promo-input");
    var msg = $("#promo-msg");
    var code = input.value.trim().toUpperCase();
    input.classList.remove("is-invalid", "is-valid");
    if (!code) {
      msg.className = "small mb-2 text-danger";
      msg.textContent = "Entrez un code promo.";
      input.classList.add("is-invalid");
    } else if (!PROMO_CODES[code]) {
      msg.className = "small mb-2 text-danger";
      msg.textContent = "Le code « " + code + " » n'existe pas ou a expiré.";
      input.classList.add("is-invalid");
    } else {
      state.promo = code;
      msg.className = "small mb-2 text-success";
      msg.textContent = "Code " + code + " appliqué : -" + PROMO_CODES[code] * 100 + " % 🎉";
      input.classList.add("is-valid");
      saveCart();
      renderCart();
    }
  });

  /* ------------------------------------------------------------------
     Form validation helpers (Bootstrap classes, our own rules)
     ------------------------------------------------------------------ */
  function showFieldError(input, errorEl, message) {
    input.classList.toggle("is-invalid", !!message);
    input.classList.toggle("is-valid", !message);
    input.setAttribute("aria-invalid", String(!!message));
    errorEl.textContent = message || "";
    return !message;
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  /* ---------- Checkout ---------- */
  var checkoutForm = $("#checkout-form");
  var checkoutModal = bootstrap.Modal.getOrCreateInstance($("#checkout"));
  var CHECKOUT_RULES = {
    name: function (v) {
      if (!v) return "Indiquez votre nom et prénom.";
      if (v.length < 3) return "Au moins 3 caractères.";
      if (!/^[\p{L}][\p{L}\s'’-]*$/u.test(v)) return "Lettres, espaces, apostrophes et tirets uniquement.";
      return "";
    },
    phone: function (v) {
      var digits = v.replace(/[\s.-]/g, "");
      if (!digits) return "Indiquez votre numéro de téléphone.";
      if (!/^[2-9]\d{7}$/.test(digits)) return "Numéro tunisien à 8 chiffres (ex. 20 123 456).";
      return "";
    },
    city: function (v) { return v ? "" : "Choisissez votre gouvernorat."; },
    address: function (v) {
      if (!v) return "Indiquez votre adresse de livraison.";
      if (v.length < 10) return "Adresse trop courte : rue, numéro, ville.";
      return "";
    },
  };

  function validateCheckoutField(name) {
    var input = checkoutForm.elements[name];
    return showFieldError(input, $("#co-" + name + "-err"), CHECKOUT_RULES[name](input.value.trim()));
  }

  Object.keys(CHECKOUT_RULES).forEach(function (name) {
    var input = checkoutForm.elements[name];
    input.addEventListener("blur", function () { if (input.value.trim()) { input.dataset.touched = "1"; validateCheckoutField(name); } });
    input.addEventListener(name === "city" ? "change" : "input", function () {
      if (name === "city") input.dataset.touched = "1";
      if (input.dataset.touched) validateCheckoutField(name);
    });
  });

  // The checkout cannot open with an empty cart
  $("#checkout").addEventListener("show.bs.modal", function (e) {
    if (!state.cart.length) { e.preventDefault(); toast("Votre panier est vide.", "error"); }
  });

  checkoutForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var invalid = Object.keys(CHECKOUT_RULES).filter(function (name) {
      checkoutForm.elements[name].dataset.touched = "1";
      return !validateCheckoutField(name);
    });
    if (invalid.length) { checkoutForm.elements[invalid[0]].focus(); return; }

    var order = "FKH-" + Date.now().toString(36).slice(-5).toUpperCase();
    var firstName = checkoutForm.elements.name.value.trim().split(/\s+/)[0];
    state.cart = [];
    state.promo = null;
    saveCart();
    renderCart();
    checkoutForm.reset();
    $$(".is-valid, .is-invalid", checkoutForm).forEach(function (el) { el.classList.remove("is-valid", "is-invalid"); delete el.dataset.touched; });
    $("#promo-input").value = "";
    $("#promo-msg").textContent = "";
    checkoutModal.hide();
    var cart = bootstrap.Offcanvas.getInstance($("#cart"));
    if (cart) cart.hide();
    toast("Merci " + firstName + " ! Commande " + order + " confirmée (démo).");
  });

  /* ---------- Newsletter ---------- */
  var newsForm = $("#news-form");
  var newsEmail = $("#news-email");
  function validateNews() {
    var v = newsEmail.value.trim();
    var msg = !v ? "Entrez votre adresse e-mail." : !EMAIL_RE.test(v) ? "Adresse invalide (ex. : nom@domaine.com)." : "";
    return showFieldError(newsEmail, $("#news-error"), msg);
  }
  newsEmail.addEventListener("input", function () { if (newsEmail.classList.contains("is-invalid")) validateNews(); });
  newsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validateNews()) { newsEmail.focus(); return; }
    newsForm.reset();
    newsEmail.classList.remove("is-valid");
    $("#promo-input").value = "BIENVENUE10";
    toast("Bienvenue ! Votre code -10 % : BIENVENUE10 (déjà prêt dans le panier).");
  });

  /* ------------------------------------------------------------------
     Navigation: close the mobile menu after a click, active link on scroll
     ------------------------------------------------------------------ */
  $$("#nav-menu .nav-link").forEach(function (link) {
    link.addEventListener("click", function () {
      var menu = bootstrap.Collapse.getInstance($("#nav-menu"));
      if (menu) menu.hide();
    });
  });
  new bootstrap.ScrollSpy(document.body, { target: "#nav-menu", rootMargin: "0px 0px -60%" });

  /* ------------------------------------------------------------------
     Init
     ------------------------------------------------------------------ */
  if (state.promo && !PROMO_CODES[state.promo]) state.promo = null;
  $("#year").textContent = new Date().getFullYear();
  renderFilters();
  renderProducts();
  renderCart();
  updateBadge("#wish-count", state.wishlist.length);
})();
