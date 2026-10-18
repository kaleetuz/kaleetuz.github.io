/* Kaleet Admin — boshqaruv paneli.
   Barcha ma'lumot Supabase'dagi admin_* funksiyalaridan olinadi (supabase/admin.sql).
   Har bir funksiya chaqiruvchi admin ekanini serverda tekshiradi. */
(function () {
  "use strict";

  var CFG = {
    url: "https://mbtswvehjtmcheocgosf.supabase.co",
    key: "sb_publishable_ZVv4y53suvbbAI7UXZdwTw_kkvlGnTm",
    loginDomain: "admin.kaleet.uz"
  };
  var SK = "kaleet.admin.session", TK = "kaleet.admin.theme";
  var S = load(SK), ME = null, NAVC = {}, REFRESH = null;
  var root = document.getElementById("root");

  /* ---------- yordamchilar ---------- */
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || "null") } catch (e) { return null } }
  function save(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(n) { n = Number(n) || 0; return n.toLocaleString("ru-RU").replace(/ /g, " ") }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0 }
  function pad(n) { return (n < 10 ? "0" : "") + n }
  function dt(s) {
    if (!s) return "—"; var d = new Date(s);
    return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() + ", " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function dOnly(s) { if (!s) return "—"; var d = new Date(s); return pad(d.getDate()) + "." + pad(d.getMonth() + 1) + "." + d.getFullYear() }
  function ago(s) {
    if (!s) return "—"; var m = Math.round((Date.now() - new Date(s).getTime()) / 60000);
    if (m < 2) return "Hozir"; if (m < 60) return m + " daqiqa oldin";
    var h = Math.round(m / 60); if (h < 24) return h + " soat oldin";
    var d = Math.round(h / 24); if (d === 1) return "Kecha"; if (d < 7) return d + " kun oldin";
    if (d < 35) return Math.round(d / 7) + " hafta oldin"; if (d < 365) return Math.round(d / 30) + " oy oldin";
    return dOnly(s);
  }
  function ini(name, email) {
    var n = String(name || "").trim();
    if (n) { var p = n.split(/\s+/); return (p[0][0] + (p[1] ? p[1][0] : "")).toUpperCase() }
    return String(email || "?").charAt(0).toUpperCase();
  }
  /* Profil rasmi: avval harflar ko'rinadi, rasm bazadan kelgach ustiga qo'yiladi */
  /* Ilovadagi bilan bir xil: ism bosh harfi + Apple ranglaridagi gradient (rang ismga qarab, har doim bir xil);
     ism bo'lmasa — kulrang fon va odamcha belgisi */
  var AVC = [["#4a6fb5", "#1b2f5e"], ["#3e9a6e", "#14513a"], ["#5aaeff", "#0a6fe0"], ["#6fd3e8", "#1e9db8"], ["#6bdd8a", "#26a84a"], ["#ffbe5c", "#f0850a"], ["#ff7e98", "#e0304f"], ["#a5abb9", "#7d828e"]];
  var IC_USER = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c1-4 4-6 8-6s7 2 8 6"/></svg>';
  function avCol(n) { var h = 0, i; n = String(n || "").trim().toLowerCase(); for (i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0; return AVC[h % AVC.length] }
  function av(cls, uid, name) {
    name = String(name || "").trim();
    var c = name ? avCol(name) : AVC[7];
    return '<span class="' + cls + ' avx" style="--g1:' + c[0] + ";--g2:" + c[1] + '"' + (uid ? ' data-photo="' + esc(uid) + '"' : "") + ' aria-hidden="true">' +
      (name ? esc(Array.from(name)[0].toUpperCase()) : IC_USER) + "</span>";
  }
  var PHOTO = {}, PHOTO_OFF = false, photoBusy = false;
  function paintPhotos() {
    $$("[data-photo]").forEach(function (el) {
      var url = PHOTO[el.dataset.photo];
      if (!url || el.querySelector("img")) return;
      var im = new Image(); im.alt = ""; im.decoding = "async"; im.referrerPolicy = "no-referrer";
      im.onload = function () { el.classList.add("has-ph") };
      im.onerror = function () { im.remove(); el.classList.remove("has-ph") };
      im.src = url; el.appendChild(im);
      if (el.classList.contains("pa")) { el.title = "Rasmni kattaroq ko'rish"; el.dataset.big = url }
    });
  }
  function loadPhotos() {
    if (PHOTO_OFF || photoBusy || !S) return;
    var ids = [];
    $$("[data-photo]").forEach(function (el) { var id = el.dataset.photo; if (!(id in PHOTO) && ids.indexOf(id) < 0) ids.push(id) });
    if (!ids.length) return paintPhotos();
    photoBusy = true;
    rpc("admin_user_photos", { p_ids: ids.slice(0, 500) }).then(function (m) {
      ids.forEach(function (id) { PHOTO[id] = (m && m[id]) || "" });
    }, function (e) {
      if (/admin_user_photos|PGRST202|Could not find/.test((e.code || "") + " " + (e.message || ""))) PHOTO_OFF = true;  /* SQL hali qo'shilmagan */
    }).then(function () { photoBusy = false; paintPhotos(); if (!PHOTO_OFF) setTimeout(loadPhotos, 0) });
  }
  new MutationObserver(debounce(loadPhotos, 60)).observe(root, { childList: true, subtree: true });

  function debounce(fn, ms) { var t; return function () { var a = arguments; clearTimeout(t); t = setTimeout(function () { fn.apply(null, a) }, ms) } }
  function $(sel, el) { return (el || document).querySelector(sel) }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)) }

  var ROLE = { owner: "Mulk egasi", buyer: "Xaridor", realtor: "Rieltor", none: "Ko'rsatilmagan", "": "Ko'rsatilmagan" };
  var PLAT = { ios: "iOS", android: "Android", web: "Web" };
  var LANGN = { uz: "O'zbek", ru: "Rus", none: "Noma'lum" };
  var PROV = { google: "Google", phone: "Telefon (SMS)", email: "Email", apple: "Apple" };
  var LST = { active: ["Faol", "ok"], pending: ["Moderatsiyada", "warn"], rejected: ["Rad etilgan", "bad"], archived: ["Arxivda", "mut"] };
  var RST = { "new": ["Yangi", "warn"], in_progress: ["Ko'rib chiqilmoqda", "acc"], resolved: ["Hal qilingan", "ok"], dismissed: ["Asossiz", "mut"] };
  var ACT = {
    user_blocked: "Bloklandi", user_unblocked: "Blokdan chiqarildi", user_warned: "Ogohlantirish berildi", note_added: "Izoh qo'shildi",
    listing_active: "E'lon faollashtirildi", listing_rejected: "E'lon rad etildi", listing_archived: "E'lon arxivlandi", listing_pending: "E'lon moderatsiyaga qaytarildi",
    report_resolved: "Shikoyat hal qilindi", report_dismissed: "Shikoyat asossiz deb topildi", report_in_progress: "Shikoyat ko'rib chiqilmoqda", report_new: "Shikoyat qayta ochildi",
    admin_role_set: "Admin roli berildi", admin_role_removed: "Admin roli olib tashlandi"
  };
  function badge(map, k) { var v = map[k] || [k, "mut"]; return '<span class="b ' + v[1] + '">' + esc(v[0]) + "</span>" }

  var I = {
    stats: '<path d="M4 20V11M10 20V5M16 20v-6M21 20H3"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c1.9.6 3.1 2.6 3.5 5.5"/>',
    home: '<path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-6h4v6"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6l-8-3Z"/><path d="m9 12 2 2 4-4"/>',
    out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    photo: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
    ban: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
    alert: '<path d="M12 3 2 21h20L12 3ZM12 10v5M12 18h.01"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5v5M17.5 9.5v5"/>',
    trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>'
  };
  function ic(n, s) { return '<svg width="' + (s || 20) + '" height="' + (s || 20) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + I[n] + "</svg>" }

  /* ---------- mavzu ---------- */
  function theme() { var t = load(TK); if (t === "dark" || t === "light") return t; return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" }
  function applyTheme() { document.documentElement.setAttribute("data-theme", theme()) }
  function themeBtn() { return '<button class="ib" type="button" data-act="theme" aria-label="Yorug\' / qorong\'i rejim">' + ic(theme() === "dark" ? "sun" : "moon") + "</button>" }
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { if (!load(TK)) { applyTheme(); render() } });

  /* ---------- toast va dialog ---------- */
  function toast(msg) {
    var t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); t.textContent = msg;
    document.body.appendChild(t); setTimeout(function () { t.remove() }, 3200);
  }
  function ask(o) {
    return new Promise(function (res) {
      var d = document.createElement("div"); d.className = "dlg";
      d.innerHTML = '<div class="in" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><h2 id="dlg-t">' + esc(o.title) + "</h2>" +
        (o.text ? "<p>" + esc(o.text) + "</p>" : "") +
        (o.input ? '<label class="field">' + esc(o.input) + '<textarea maxlength="' + (o.max || 300) + '" placeholder="' + esc(o.ph || "") + '"></textarea></label>' : "") +
        (o.word ? '<label class="field"><span>Tasdiqlash uchun katta harflarda <b style="color:var(--tx)">' + esc(o.word) + '</b> deb yozing</span><input type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="' + esc(o.word) + '"></label>' : "") +
        '<div class="acts"><button class="btn soft" type="button" data-x="0">Bekor qilish</button><button class="btn ' + (o.danger ? "bad" : "pri") + '" type="button" data-x="1"' + (o.word ? " disabled" : "") + ">" + esc(o.ok || "Tasdiqlash") + "</button></div></div>";
      document.body.appendChild(d);
      var ta = $("textarea", d), wi = o.word ? $("input", d) : null, okb = $('[data-x="1"]', d);
      (ta || wi || okb).focus();
      if (wi) wi.addEventListener("input", function () { okb.disabled = wi.value.trim() !== o.word });
      function done(v) { d.remove(); document.removeEventListener("keydown", key); res(v) }
      function key(e) { if (e.key === "Escape") done(null); else if (e.key === "Enter" && wi && !okb.disabled) done(true) }
      document.addEventListener("keydown", key);
      d.addEventListener("click", function (e) {
        if (e.target === d) return done(null);
        var x = e.target.closest("[data-x]"); if (!x) return;
        if (x.dataset.x === "0") return done(null);
        if (wi && wi.value.trim() !== o.word) { wi.focus(); return }
        var v = ta ? ta.value.trim() : true;
        if (ta && o.required && !v) { ta.focus(); return }
        done(v);
      });
    });
  }

  /* ---------- Supabase ---------- */
  function E(code, msg, status) { var e = new Error(msg || code); e.code = code; e.status = status; return e }
  function req(path, o) {
    o = o || {};
    var h = { apikey: CFG.key, "Content-Type": "application/json" };
    if (o.token) h.Authorization = "Bearer " + o.token;
    return fetch(CFG.url + path, { method: o.method || "POST", headers: h, body: o.body != null ? JSON.stringify(o.body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var j = null; try { j = t ? JSON.parse(t) : null } catch (x) {}
          if (!r.ok) throw E(String((j && (j.error_code || j.message || j.code || j.error)) || "error"), String((j && (j.msg || j.message || j.error_description)) || ""), r.status);
          return j;
        });
      }, function () { throw E("network") });
  }
  function setSession(j) {
    S = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600) };
    save(SK, S);
  }
  var refreshing = null;
  function token() {
    if (!S) return Promise.reject(E("auth_required"));
    if (S.expires_at * 1000 - Date.now() > 60000) return Promise.resolve(S.access_token);
    if (!refreshing) refreshing = req("/auth/v1/token?grant_type=refresh_token", { body: { refresh_token: S.refresh_token } })
      .then(function (j) { refreshing = null; setSession(j); return S.access_token },
            function (e) { refreshing = null; if (e.code !== "network") signOut(true); throw E("auth_required") });
    return refreshing;
  }
  function rpc(fn, args) {
    return token().then(function (t) { return req("/rest/v1/rpc/" + fn, { token: t, body: args || {} }) })
      .catch(function (e) {
        if (e.status === 401 || e.code === "not_admin" || e.code === "auth_required") { signOut(true); }
        throw e;
      });
  }
  /* VAQTINCHA: foydalanuvchining listing-photos/<id>/ papkasidagi barcha rasmlarni o'chirish */
  function purgeFiles(id) {
    function list() {
      return token().then(function (tk) { return req("/storage/v1/object/list/listing-photos", { token: tk, body: { prefix: id + "/", limit: 1000, offset: 0 } }) });
    }
    function step(n) {
      return list().then(function (a) {
        var names = (a || []).filter(function (x) { return x && x.id && x.name }).map(function (x) { return id + "/" + x.name });
        if (!names.length) return;
        if (n > 20) throw E("storage_not_empty");
        return token().then(function (tk) { return req("/storage/v1/object/listing-photos", { method: "DELETE", token: tk, body: { prefixes: names } }) })
          .then(function () { return step(n + 1) });
      });
    }
    return step(0);
  }
  function errText(e) {
    var c = e && e.code || "";
    if (c === "network") return "Internet aloqasi yo'q. Qayta urinib ko'ring.";
    if (c === "developer_only") return "Bu amal faqat dasturchi uchun.";
    if (c === "cannot_block_admin") return "Adminni bloklab bo'lmaydi.";
    if (c === "login_not_found") return "Bu login Supabase'da topilmadi. Avval foydalanuvchini yarating.";
    if (c === "cannot_remove_self") return "O'zingizni olib tashlay olmaysiz.";
    if (c === "cannot_delete_self") return "O'zingizni o'chira olmaysiz.";
    if (c === "cannot_delete_admin") return "Adminni o'chirib bo'lmaydi. Avval uni adminlar ro'yxatidan olib tashlang.";
    if (c === "storage_not_empty") return "Foydalanuvchi rasmlarini o'chirib bo'lmadi. Bazada app_update_8.sql o'rnatilganini tekshiring.";
    if (/admin_delete_user/.test(c + (e.message || ""))) return "Bazada o'chirish funksiyasi yo'q (supabase/app_update_8.sql).";
    if (/admin_stats|Could not find the function|PGRST202/.test(c + (e.message || ""))) return "Bazada admin funksiyalari hali o'rnatilmagan (supabase/admin.sql).";
    return "Xatolik yuz berdi. Qayta urinib ko'ring.";
  }
  function signOut(silent) {
    var t = S && S.access_token;
    S = null; ME = null; save(SK, null); clearInterval(REFRESH);
    if (t) req("/auth/v1/logout", { token: t }).catch(function () {});
    if (!silent) toast("Hisobdan chiqdingiz.");
    if (location.hash !== "#/login") location.hash = "#/login"; else render();
  }

  /* ---------- kirish ---------- */
  function loginView(err) {
    return '<div class="login"><div class="top">' + themeBtn() + '</div><div class="mid"><div class="lcard">' +
      '<span class="logo" style="width:96px;height:96px;border-radius:24px"><img src="logo.png" alt="Kaleet"></span>' +
      '<div><h1>Kaleet <span>Admin</span></h1><p>Boshqaruv paneli faqat dasturchi va moderatorlar uchun</p></div>' +
      '<form id="lf" novalidate>' +
      '<label class="field">Login<input name="login" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="Loginingizni kiriting"></label>' +
      '<label class="field">Parol<span class="pw"><input name="pw" type="password" autocomplete="current-password" required placeholder="Parolingizni kiriting">' +
      '<button class="ib" type="button" data-act="pw" aria-label="Parolni ko\'rsatish">' + ic("eye") + "</button></span></label>" +
      (err ? '<div class="err" role="alert">' + esc(err) + "</div>" : "") +
      '<button class="btn pri" type="submit">Kirish</button></form>' +
      '<div class="note" role="note">' + ic("shield", 18) + "<span>Login va parolni dasturchi beradi. Ruxsatsiz urinishlar qayd etiladi.</span></div>" +
      '</div></div><p class="foot">© ' + new Date().getFullYear() + " Kaleet</p></div>";
  }
  function bindLogin() {
    var f = $("#lf"); if (!f) return;
    f.login.focus();
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var login = f.login.value.trim(), pw = f.pw.value;
      if (!login || !pw) { root.innerHTML = loginView("Login va parolni kiriting."); bindLogin(); return }
      var b = $("button[type=submit]", f); b.disabled = true; b.textContent = "Tekshirilmoqda…";
      var email = login.indexOf("@") > 0 ? login.toLowerCase() : login.toLowerCase() + "@" + CFG.loginDomain;
      req("/auth/v1/token?grant_type=password", { body: { email: email, password: pw } })
        .then(function (j) { setSession(j); return rpc("admin_me") })
        .then(function (me) {
          if (!me) { signOut(true); throw E("not_admin") }
          ME = me; location.hash = "#/"; render();
        })
        .catch(function (e) {
          if (S) { S = null; save(SK, null) }
          var m = e.code === "network" ? "Internet aloqasi yo'q. Qayta urinib ko'ring."
            : e.code === "not_admin" ? "Bu hisobga panelga kirish ruxsati yo'q."
            : e.status === 429 ? "Urinishlar juda ko'p. Birozdan keyin qayta urinib ko'ring."
            : e.status === 400 || /invalid/i.test(e.code + " " + e.message) ? "Login yoki parol noto'g'ri."
            : errText(e);
          root.innerHTML = loginView(m); bindLogin(); $("#lf").login.value = login;
        });
    });
  }

  /* ---------- karkas ---------- */
  function shell(active, body) {
    var dev = ME && ME.role === "developer";
    function a(id, href, icon, label, cnt) {
      return '<a href="' + href + '" class="' + (active === id ? "on" : "") + '"' + (active === id ? ' aria-current="page"' : "") + ">" + ic(icon) + label +
        (cnt ? '<span class="cnt">' + num(cnt) + "</span>" : "") + "</a>";
    }
    return '<div class="app"><aside class="side">' +
      '<a class="brand" href="#/"><span class="logo" style="width:40px;height:40px"><img src="logo.png" alt=""></span><span><b>Kaleet</b><small>Admin panel</small></span></a>' +
      '<nav class="nav" aria-label="Asosiy menyu">' +
      a("stats", "#/", "stats", "Statistika") + a("users", "#/users", "users", "Foydalanuvchilar") +
      a("listings", "#/listings", "home", "E'lonlar", (NAVC.pending || 0) + (NAVC.review || 0)) + a("reports", "#/reports", "flag", "Shikoyatlar", NAVC.reports) +
      a("revenue", "#/revenue", "money", "Daromad") +
      (dev ? a("admins", "#/admins", "shield", "Adminlar") : "") + "</nav>" +
      '<div class="me">' + av("av", "", ME && (ME.name || ME.login)) + '<span class="who"><b>' + esc(ME && (ME.name || ME.login) || "") +
      "</b><small>" + (dev ? "Dasturchi" : "Moderator") + "</small></span>" +
      '<button class="ib ghost" type="button" data-act="logout" aria-label="Chiqish">' + ic("out") + "</button></div>" +
      '</aside><main id="main">' + body + "</main></div>";
  }
  function header(title, sub, extra) {
    return '<header class="hd"><div><h1>' + esc(title) + "</h1>" + (sub ? "<p>" + sub + "</p>" : "") + '</div><div class="tools">' + (extra || "") +
      '<button class="ib mob" type="button" data-act="logout" aria-label="Chiqish">' + ic("out") + "</button>" + themeBtn() + "</div></header>";
  }
  function setNavCounts(st) {
    NAVC.pending = st.listings_by_status && st.listings_by_status.pending || 0;
    NAVC.reports = st.reports_new || 0;
  }

  /* ---------- 1. Statistika ---------- */
  var PER = 14;
  function statsPage() {
    root.innerHTML = shell("stats", header("Statistika", "Yuklanmoqda…") + '<div class="loading">Ma\'lumotlar olinmoqda…</div>');
    var load = function () {
      return Promise.all([rpc("admin_stats"), rpc("admin_daily", { p_days: PER }), rpc("admin_sold_stats").catch(function () { return null })]).then(function (r) {
        if (route().name !== "stats") return;
        setNavCounts(r[0]);
        root.innerHTML = shell("stats", statsView(r[0], r[1], r[2]));
      });
    };
    load().catch(showErr);
    clearInterval(REFRESH);
    REFRESH = setInterval(function () { if (route().name === "stats" && !document.hidden && !$(".dlg")) load().catch(function () {}) }, 30000);
  }
  function statsView(s, days, sold) {
    var on = s.online_registered + s.online_guests, d = new Date(s.now);
    var dn = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"][d.getDay()];
    var ls = s.listings_by_status || {}, tracking = !!s.tracking_since;
    var h = header("Statistika", esc(dn + ", " + dt(s.now)) + " holatiga · har 30 soniyada yangilanadi",
      '<button class="ib" type="button" data-act="reload" aria-label="Yangilash">' + ic("refresh") + "</button>");

    h += '<section class="kpis" aria-label="Asosiy ko\'rsatkichlar">' +
      kpi("Ro'yxatdan o'tganlar", num(s.users_total), '<span class="s up">+' + num(s.users_7d) + " so'nggi 7 kunda</span>") +
      '<div class="kpi"><span class="l"><span class="dot pulse"></span>Hozir onlayn</span><span class="v">' + num(on) + "</span>" +
      (tracking ? '<div class="split2"><span style="width:' + pct(s.online_registered, on) + '%;background:var(--tx)"></span><span style="width:' + pct(s.online_guests, on) + '%;background:var(--acc)"></span></div>' +
        '<span class="s"><b style="color:var(--tx)">' + num(s.online_registered) + "</b> ro'yxatdan o'tgan · <b style=\"color:var(--tx)\">" + num(s.online_guests) + "</b> mehmon</span>"
        : '<span class="s">Ilovaning yangi versiyasi chiqqach hisoblana boshlaydi</span>') + "</div>" +
      kpi("Jami e'lonlar", num(s.listings_total), '<span class="s up">+' + num(s.listings_7d) + " so'nggi 7 kunda</span>") +
      kpi("Moderatsiya kutmoqda", '<span style="color:var(--acct)">' + num(ls.pending || 0) + "</span>", '<a class="link" href="#/listings?s=pending" style="font-size:13px">Ko\'rib chiqish →</a>') +
      "</section>";

    h += '<section class="minis" aria-label="Qo\'shimcha ko\'rsatkichlar">' +
      mini("Bugun ro'yxatdan o'tgan", num(s.users_today)) + mini("Bugungi e'lonlar", num(s.listings_today)) +
      mini("Kunlik faol (DAU)", tracking ? num(s.dau) : "—") + mini("Oylik faol (MAU)", tracking ? num(s.mau) : "—") +
      mini("Yangi shikoyatlar", num(s.reports_new)) + mini("Bloklanganlar", num(s.users_blocked)) +
      (sold ? mini("Ilova orqali sotildi", num(sold.sold) + (sold.sold_7d ? ' <small style="color:var(--ok);font-size:12px">+' + num(sold.sold_7d) + " 7 kunda</small>" : "")) +
        mini("Ijaraga berildi", num(sold.rented) + (sold.rented_7d ? ' <small style="color:var(--ok);font-size:12px">+' + num(sold.rented_7d) + " 7 kunda</small>" : "")) : "") + "</section>";

    var mx = 1; days.forEach(function (x) { mx = Math.max(mx, x.users, x.listings) });
    var every = days.length > 31 ? 7 : days.length > 14 ? 3 : 1;
    var chart = '<div class="chart" role="img" aria-label="So\'nggi ' + days.length + ' kun dinamikasi">' + days.map(function (x) {
      var t = x.day.slice(8, 10) + "." + x.day.slice(5, 7) + ": " + x.users + " ta ro'yxat, " + x.listings + " ta e'lon";
      return '<div class="d" title="' + esc(t) + '"><span style="height:' + (x.users / mx * 100) + '%;background:var(--tx)"></span><span style="height:' + (x.listings / mx * 100) + '%;background:var(--acc)"></span></div>';
    }).join("") + '</div><div class="xl" aria-hidden="true">' + days.map(function (x, i) {
      return "<span>" + ((days.length - 1 - i) % every === 0 ? esc(x.day.slice(8, 10)) : "") + "</span>";
    }).join("") + "</div>";
    var tu = 0, tl = 0; days.forEach(function (x) { tu += x.users; tl += x.listings });

    var plat = s.devices_by_platform || {}, pt = 0; Object.keys(plat).forEach(function (k) { pt += plat[k] });
    var lang = s.devices_by_lang || {}, lt = 0; Object.keys(lang).forEach(function (k) { lt += lang[k] });
    var noTrack = '<p class="mut" style="margin:0;font-size:14px">Ilova faollik signalini yuboradigan versiya chiqqach shu yerda paydo bo\'ladi.</p>';

    h += '<div class="split"><section class="card"><div class="ch"><div><h2>Dinamika</h2><span>' + num(tu) + " ta ro'yxatdan o'tish · " + num(tl) + " ta yangi e'lon</span></div>" +
      '<div class="seg" role="group" aria-label="Davr">' + [7, 14, 30, 90].map(function (p) {
        return '<button type="button" data-per="' + p + '" class="' + (PER === p ? "on" : "") + '" aria-pressed="' + (PER === p) + '">' + p + " kun</button>";
      }).join("") + "</div></div>" +
      '<div class="lg"><span><i style="background:var(--tx)"></i>Ro\'yxatdan o\'tganlar</span><span><i style="background:var(--acc)"></i>Yangi e\'lonlar</span></div>' + chart + "</section>" +
      '<div class="col"><section class="card"><h2>Platformalar</h2>' + (pt ? bars(plat, PLAT, pt) + '<span class="mut" style="font-size:13px">So\'nggi 30 kunda faol qurilmalar</span>' : noTrack) + "</section>" +
      '<section class="card"><h2>Interfeys tili</h2>' + (lt ? bars(lang, LANGN, lt) : noTrack) + "</section></div></div>";

    var cat = s.listings_by_category || {}, ct = s.listings_total || 0, roles = s.users_by_role || {};
    h += '<div class="grid3"><section class="card"><h2>E\'lonlar holati</h2>' +
      '<div class="split2" style="height:12px;border-radius:6px;gap:2px">' + ["active", "pending", "rejected", "archived"].map(function (k) {
        return ls[k] ? '<span style="width:' + (ls[k] / Math.max(ct, 1) * 100) + "%;background:var(--" + { active: "ok", pending: "warn", rejected: "bad", archived: "tx2" }[k] + ')"></span>' : "";
      }).join("") + "</div>" +
      ["active", "pending", "rejected", "archived"].map(function (k) {
        return '<a href="#/listings?s=' + k + '" style="display:flex;align-items:center;gap:10px;font-size:14px;min-height:32px;text-decoration:none"><span class="dot" style="width:10px;height:10px;border-radius:5px;background:var(--' +
          { active: "ok", pending: "warn", rejected: "bad", archived: "tx2" }[k] + ')"></span><span style="flex:1">' + LST[k][0] + "</span><b>" + num(ls[k] || 0) + "</b></a>";
      }).join("") + "</section>" +
      '<section class="card"><h2>Mulk turlari</h2>' + (ct ? bars(cat, {}, ct) : '<p class="mut" style="margin:0">E\'lonlar hali yo\'q</p>') + "</section>" +
      '<section class="card"><h2>Foydalanuvchi turlari</h2>' + (s.users_total ? bars(roles, ROLE, s.users_total) : '<p class="mut" style="margin:0">Foydalanuvchilar hali yo\'q</p>') + "</section></div>";

    var cities = s.listings_by_city || [], top = cities.slice(0, 8), rest = 0, cmax = top.length ? top[0].n : 1;
    cities.slice(8).forEach(function (c) { rest += c.n });
    h += '<section class="card"><h2>Hududlar bo\'yicha e\'lonlar</h2>' + (top.length ? top.map(function (c, i) {
      return '<div class="reg"><span>' + esc(c.city) + '</span><div class="bar"><span style="width:' + (c.n / cmax * 100) + "%;background:" + (i ? "var(--tx)" : "var(--acc)") + '"></span></div><b>' + num(c.n) + "</b></div>";
    }).join("") + (rest ? '<div class="reg"><span>Boshqalar</span><div class="bar"><span style="width:' + Math.min(100, rest / cmax * 100) + '%"></span></div><b>' + num(rest) + "</b></div>" : "")
      : '<p class="mut" style="margin:0">E\'lonlar hali yo\'q</p>') + "</section>";
    return h;
  }
  function kpi(l, v, s) { return '<div class="kpi"><span class="l">' + l + '</span><span class="v">' + v + "</span>" + s + "</div>" }
  function mini(l, v) { return "<div><span>" + l + "</span><b>" + v + "</b></div>" }
  function bars(obj, names, total) {
    var ks = Object.keys(obj).sort(function (a, b) { return obj[b] - obj[a] }), mx = ks.length ? obj[ks[0]] : 1;
    return ks.map(function (k) {
      return '<div class="brow"><div class="t"><span style="font-weight:500">' + esc(names[k] || k) + '</span><span class="mut">' + num(obj[k]) + " · " + pct(obj[k], total) +
        '%</span></div><div class="bar"><span style="width:' + (obj[k] / mx * 100) + '%"></span></div></div>';
    }).join("");
  }

  /* ---------- 2. Foydalanuvchilar ---------- */
  var UQ = { q: "", f: "all", page: 0 }, UPS = 25;
  function usersPage() {
    var p = route().params; if (p.f) UQ.f = p.f;
    root.innerHTML = shell("users", header("Foydalanuvchilar", "Yuklanmoqda…") +
      '<div class="row"><label class="search">' + ic("search", 18) + '<span class="sr">Qidirish</span><input id="uq" type="search" value="' + esc(UQ.q) + '" placeholder="Ism, email, telefon yoki ID bo\'yicha qidirish"></label></div>' +
      '<div class="chips" id="uf" role="group" aria-label="Filtr"></div><section class="card flush" id="ut"><div class="loading">Yuklanmoqda…</div></section>');
    $("#uq").addEventListener("input", debounce(function (e) { UQ.q = e.target.value.trim(); UQ.page = 0; loadUsers() }, 300));
    loadUsers();
  }
  function loadUsers() {
    rpc("admin_users", { p_search: UQ.q, p_filter: UQ.f, p_limit: UPS, p_offset: UQ.page * UPS }).then(function (r) {
      if (route().name !== "users") return;
      var c = r.counts || {};
      $(".hd p").textContent = "Jami " + num(c.all) + " ta ro'yxatdan o'tgan";
      $("#uf").innerHTML = [["all", "Hammasi"], ["active", "Faol"], ["blocked", "Bloklangan"], ["owner", "Mulk egalari"], ["buyer", "Xaridorlar"], ["realtor", "Rieltorlar"]].map(function (x) {
        return '<button type="button" class="chip' + (UQ.f === x[0] ? " on" : "") + '" data-uf="' + x[0] + '" aria-pressed="' + (UQ.f === x[0]) + '">' + x[1] + " <i>" + num(c[x[0]] || 0) + "</i></button>";
      }).join("");
      var rows = r.rows || [];
      $("#ut").innerHTML = rows.length ? '<div class="tw"><table><thead><tr><th>Foydalanuvchi</th><th>Turi</th><th>E\'lonlar</th><th>Holat</th><th>Kirish usuli</th><th>Platforma</th><th>Ro\'yxatdan o\'tgan</th><th>Oxirgi faollik</th></tr></thead><tbody>' +
        rows.map(function (u) {
          return "<tr><td><a class=\"u\" href=\"#/user/" + esc(u.id) + '">' + av("ua", u.id, u.name, u.email) + "<span><b>" + esc(u.name || "Ism kiritilmagan") +
            "</b><small>" + esc(u.email || u.phone || "") + "</small></span></a></td><td class=\"nw\">" + esc(ROLE[u.role] || u.role) + '</td><td style="font-weight:600">' + num(u.listings) +
            '</td><td><span style="display:flex;flex-direction:column;align-items:flex-start;gap:6px">' + (u.blocked ? '<span class="b bad">Bloklangan</span>' : '<span class="b ok">Faol</span>') +
            '<button class="btn ' + (u.blocked ? "soft" : "bad") + '" type="button" data-act="block" data-uid="' + esc(u.id) + '" data-v="' + (u.blocked ? 0 : 1) + '" style="height:32px;padding:0 12px;font-size:13px;white-space:nowrap">' +
            ic("ban", 16) + (u.blocked ? "Blokdan chiqarish" : "Bloklash") + "</button></span>" + '</td><td class="nw mut">' + esc(PROV[u.provider] || u.provider || "—") +
            '</td><td class="nw mut">' + esc(PLAT[u.platform] || "—") + '</td><td class="nw mut">' + dOnly(u.created_at) + '</td><td class="nw mut">' + ago(u.last_seen || u.last_sign_in_at) +
            "</td></tr>";
        }).join("") + "</tbody></table></div>" + pager(UQ.page, UPS, r.total, "u")
        : '<div class="empty">' + (UQ.q || UQ.f !== "all" ? "Mos foydalanuvchi topilmadi" : "Hali ro'yxatdan o'tgan foydalanuvchi yo'q") + "</div>";
    }).catch(showErr);
  }
  function pager(page, size, total, k) {
    if (total <= size) return '<div class="pager"><span>' + num(total) + " ta</span></div>";
    var from = page * size + 1, to = Math.min(total, (page + 1) * size);
    return '<div class="pager"><span>' + num(from) + "–" + num(to) + " / " + num(total) + '</span><div class="row">' +
      '<button class="ib" type="button" data-pg="' + k + ':-1" aria-label="Oldingi sahifa"' + (page ? "" : " disabled") + ">" + ic("left", 18) + "</button>" +
      '<button class="ib" type="button" data-pg="' + k + ':1" aria-label="Keyingi sahifa"' + (to < total ? "" : " disabled") + ">" + ic("right", 18) + "</button></div></div>";
  }

  /* ---------- 3. Foydalanuvchi profili ---------- */
  function userPage(id) {
    root.innerHTML = shell("users", '<div class="loading">Yuklanmoqda…</div>');
    rpc("admin_user", { p_id: id }).then(function (u) {
      if (route().name !== "user") return;
      var ls = u.listings_by_status || {}, total = 0; Object.keys(ls).forEach(function (k) { total += ls[k] });
      var dv = u.device || {};
      var h = '<div class="hd"><a href="#/users" class="btn soft" style="background:transparent;padding:0;color:var(--tx2)">' + ic("left", 18) + 'Foydalanuvchilar</a><div class="tools">' + themeBtn() + "</div></div>";
      h += '<section class="prof">' + av("pa", u.id, u.name, u.email) + '<div style="flex:1 1 260px;min-width:0;display:flex;flex-direction:column;gap:8px"><h1>' +
        esc(u.name || "Ism kiritilmagan") + '</h1><span class="mut">' + esc(u.email || u.phone || "") + (u.provider ? " · " + esc(PROV[u.provider] || u.provider) + " orqali" : "") + "</span>" +
        '<div class="row" style="gap:8px">' + (u.blocked ? '<span class="b bad">Bloklangan</span>' : '<span class="b ok">Faol</span>') +
        (u.role ? '<span class="b acc">' + esc(ROLE[u.role] || u.role) + "</span>" : "") + (dv.platform ? '<span class="b mut">' + esc(PLAT[dv.platform]) + "</span>" : "") +
        (dv.lang ? '<span class="b mut">' + esc(LANGN[dv.lang]) + " tili</span>" : "") + "</div></div>" +
        '<div class="row"><button class="btn soft" type="button" data-act="grant">' + ic("money", 18) + "Hamyonga qo'shish</button><button class=\"btn soft\" type=\"button\" data-act=\"warn\">" + ic("alert", 18) + "Ogohlantirish</button>" +
        '<button class="btn bad" type="button" data-act="block" data-v="' + (u.blocked ? 0 : 1) + '">' + ic("ban", 18) + (u.blocked ? "Blokdan chiqarish" : "Bloklash") + "</button>" +
        /* VAQTINCHA: sinov profillarini tozalash (app_update_8.sql). Kerak bo'lmaganda olib tashlanadi. */
        (ME && ME.role === "developer" ? '<button class="btn bad" type="button" data-act="purge">' + ic("trash", 18) + "Butunlay o'chirish</button>" : "") + "</div></section>";
      h += '<section class="stat4" aria-label="E\'lonlar">' + [["Jami e'lonlar", total, ""], ["Faol", ls.active, "ok"], ["Moderatsiyada", ls.pending, "warn"], ["Rad etilgan", ls.rejected, "bad"], ["Arxivda", ls.archived, ""]].map(function (x) {
        return "<div><span>" + x[0] + '</span><b style="' + (x[2] ? "color:var(--" + x[2] + ")" : "") + '">' + num(x[1] || 0) + "</b></div>";
      }).join("") + "</section>";
      var ints = Array.isArray(u.interests) ? u.interests : [];
      h += '<div class="grid2"><section class="card"><h2>Asosiy ma\'lumotlar</h2><dl class="kv">' +
        "<dt>ID</dt><dd class=\"mono\">" + esc(u.id) + "</dd>" +
        "<dt>Telefon</dt><dd>" + (u.phone ? "+998 " + esc(u.phone) + (u.phone_confirmed ? " · tasdiqlangan" : " · tasdiqlanmagan") : "—") + "</dd>" +
        "<dt>Email</dt><dd>" + esc(u.email || "—") + "</dd>" +
        "<dt>Turi</dt><dd>" + esc(ROLE[u.role] || u.role || "—") + "</dd>" +
        "<dt>Qiziqishlar</dt><dd>" + (ints.length ? esc(ints.join(", ")) : "—") + "</dd>" +
        "<dt>Ro'yxatdan o'tgan</dt><dd>" + dt(u.created_at) + "</dd>" +
        "<dt>Oxirgi kirish</dt><dd>" + dt(u.last_sign_in_at) + "</dd>" +
        "<dt>Oxirgi faollik</dt><dd>" + (dv.last_seen ? ago(dv.last_seen) : "—") + "</dd></dl></section>";
      var ll = u.listings || [];
      h += '<section class="card"><div class="ch"><h2>E\'lonlari</h2>' + (ll.length ? '<span>' + num(ll.length) + " ta</span>" : "") + "</div>" + (ll.length ? "<div>" + ll.map(function (l) {
        return '<div class="li"><span style="min-width:0"><b>' + esc(l.title) + "</b><small>" + esc((l.deal === "rent" ? "Ijara · " : "") + l.category + " · " + l.city + " · " + l.price + (l.deal === "rent" ? " / oy" : "") + " · " + dOnly(l.created_at)) +
          (l.moderation_note ? " · " + esc(l.moderation_note) : "") + "</small></span>" + badge(LST, l.status) + "</div>";
      }).join("") + "</div>" : '<p class="mut" style="margin:0">E\'lon joylamagan</p>') + "</section>";
      var ra = u.reports_against || [], ws = u.warnings || [];
      h += '<section class="card"><h2>Shikoyatlar va ogohlantirishlar</h2><div class="stat4">' +
        '<div style="background:var(--page)"><span>Unga kelgan</span><b>' + num(ra.length) + '</b></div><div style="background:var(--page)"><span>U yuborgan</span><b>' + num(u.reports_sent) +
        '</b></div><div style="background:var(--page)"><span>Ogohlantirish</span><b>' + num(ws.length) + "</b></div></div>" +
        (ra.length ? "<div>" + ra.map(function (r) { return '<div class="li"><span><b>' + esc(r.reason) + "</b><small>" + esc((r.reporter || "—") + " · " + ago(r.created_at)) + "</small></span>" + badge(RST, r.status) + "</div>" }).join("") + "</div>" : "") +
        (ws.length ? "<div>" + ws.map(function (w) { return '<div class="li"><span><b>' + esc(w.reason) + "</b><small>" + esc((w.author || "—") + " · " + dt(w.created_at)) + '</small></span><span class="b warn">Ogohlantirish</span></div>' }).join("") + "</div>" : "") +
        "</section>";
      var ns = u.notes || [];
      h += '<section class="card"><div class="row" style="gap:8px"><h2>Moderator izohlari</h2><span class="b mut">Faqat adminlarga ko\'rinadi</span></div>' +
        ns.map(function (n) { return '<div class="box"><span style="white-space:pre-line">' + esc(n.body) + "</span><small>" + esc((n.author || "—") + " · " + dt(n.created_at)) + "</small></div>" }).join("") +
        '<form id="nf" style="display:flex;flex-direction:column;gap:10px"><label class="field">Yangi izoh<textarea name="b" maxlength="1000" placeholder="Masalan: rieltor guvohnomasi tekshirildi"></textarea></label>' +
        '<button class="btn pri" type="submit" style="align-self:flex-end">Saqlash</button></form></section></div>';
      var lg = u.log || [];
      h += '<section class="card"><h2>Harakatlar logi</h2>' + (lg.length ? "<div>" + lg.map(function (g) {
        var why = g.details && (g.details.reason || g.details.note);
        return '<div class="tl"><i></i><span><b style="font-weight:500">' + esc(ACT[g.action] || g.action) + (why ? ": " + esc(why) : "") + "</b><small>" + esc(g.actor || "—") + "</small></span><time>" + dt(g.created_at) + "</time></div>";
      }).join("") + "</div>" : '<p class="mut" style="margin:0">Hali admin harakati yo\'q</p>') + "</section>";
      root.innerHTML = shell("users", h);
      $("#nf").addEventListener("submit", function (e) {
        e.preventDefault(); var b = this.b.value.trim(); if (!b) return;
        rpc("admin_add_note", { p_id: id, p_body: b }).then(function () { toast("Izoh saqlandi."); userPage(id) }).catch(showErr);
      });
      root.dataset.user = id;
    }).catch(showErr);
  }

  /* ---------- 4. E'lonlar ---------- */
  var LQ = { s: "active", q: "", cat: "", city: "", page: 0 }, LPS = 24;
  function listingsPage() {
    var p = route().params; if (p.s) LQ.s = p.s; if (p.q != null) LQ.q = p.q;
    root.innerHTML = shell("listings", header("E'lonlar", "Yuklanmoqda…") +
      '<div class="tabs" id="lt" role="group" aria-label="E\'lon holati"></div>' +
      '<div class="row"><label class="search">' + ic("search", 18) + '<span class="sr">Qidirish</span><input id="lq" type="search" value="' + esc(LQ.q) + '" placeholder="Sarlavha, manzil, ism yoki e\'lon raqami"></label>' +
      '<label><span class="sr">Mulk turi</span><select class="sel" id="lcat"><option value="">Barcha turlar</option>' + ["Hovli", "Kvartira", "Ofis", "Do'kon", "Yer maydoni", "Ombor", "O'quv markazi", "Biznes markazi", "Savdo markazi", "Restoran / Kafe"].map(function (c) {
        return '<option' + (LQ.cat === c ? " selected" : "") + ">" + esc(c) + "</option>";
      }).join("") + '</select></label><label><span class="sr">Hudud</span><select class="sel" id="lcity"><option value="">Barcha hududlar</option></select></label></div>' +
      '<div id="lg"><div class="loading">Yuklanmoqda…</div></div>');
    $("#lq").addEventListener("input", debounce(function (e) { LQ.q = e.target.value.trim(); LQ.page = 0; loadListings() }, 300));
    $("#lcat").addEventListener("change", function (e) { LQ.cat = e.target.value; LQ.page = 0; loadListings() });
    $("#lcity").addEventListener("change", function (e) { LQ.city = e.target.value; LQ.page = 0; loadListings() });
    loadListings();
  }
  function loadListings() {
    rpc("admin_listings", { p_status: LQ.s, p_search: LQ.q, p_category: LQ.cat, p_city: LQ.city, p_limit: LPS, p_offset: LQ.page * LPS }).then(function (r) {
      if (route().name !== "listings") return;
      var c = r.counts || {}, all = 0; Object.keys(c).forEach(function (k) { all += c[k] });
      NAVC.pending = c.pending || 0; NAVC.review = c.review || 0;
      var rv = c.review || 0, pd = c.paid || 0; delete c.review; delete c.paid; all = 0; Object.keys(c).forEach(function (k) { all += c[k] });
      $(".hd p").textContent = "Jami " + num(all) + " ta e'lon";
      $("#lt").innerHTML = [["review", "To'lovli · tekshirilmagan"], ["pending", "Moderatsiyada"], ["active", "Faol"], ["paid", "Pullik"], ["rejected", "Rad etilgan"], ["archived", "Arxiv"], ["all", "Hammasi"]].map(function (x) {
        var n = x[0] === "all" ? all : x[0] === "review" ? rv : x[0] === "paid" ? pd : c[x[0]] || 0;
        return '<button type="button" class="tab' + (LQ.s === x[0] ? " on" : "") + '" data-ls="' + x[0] + '" aria-pressed="' + (LQ.s === x[0]) + '">' + x[1] + ' <span class="b ' + (x[0] === "review" && n ? "warn" : "mut") + '" style="height:22px">' + num(n) + "</span></button>";
      }).join("");
      var cs = $("#lcity"); if (cs.options.length <= 1) (r.cities || []).sort().forEach(function (x) { var o = document.createElement("option"); o.textContent = x; o.value = x; if (x === LQ.city) o.selected = true; cs.appendChild(o) });
      var rows = r.rows || [];
      $("#lg").innerHTML = rows.length ? '<div class="lgrid">' + rows.map(listingCard).join("") + "</div>" +
        (r.total > LPS ? '<section class="card flush" style="margin-top:16px">' + pager(LQ.page, LPS, r.total, "l") + "</section>" : "")
        : '<div class="card empty">' + (LQ.s === "pending" ? "Moderatsiya kutayotgan e'lon yo'q" : LQ.s === "review" ? "Tekshirilmagan pullik e'lon yo'q" : "Mos e'lon topilmadi") + "</div>";
    }).catch(showErr);
  }
  function som(n) { return num(n) + " so'm" }
  function promoBox(l) {
    var now = Date.now(), t = [], ps = l.purchases || [];
    if (l.top_until && Date.parse(l.top_until) > now) t.push('<span class="b acc">TOP · ' + dOnly(l.top_until) + " gacha</span>");
    if (l.vip_until && Date.parse(l.vip_until) > now) t.push('<span class="b warn">VIP · ' + dOnly(l.vip_until) + " gacha</span>");
    if (l.autobump_until && Date.parse(l.autobump_until) > now) t.push('<span class="b mut">Avto-ko\'tarish · ' + dOnly(l.autobump_until) + " gacha</span>");
    if (l.bumps_left) t.push('<span class="b mut">Ko\'tarish: ' + num(l.bumps_left) + "</span>");
    if (!ps.length && !t.length) return "";
    var sum = 0; ps.forEach(function (p) { sum += p.amount });
    return '<div class="box"><small>Pullik xizmatlar' + (ps.length ? " · jami " + som(sum) : "") + "</small>" + (t.length ? '<span class="row" style="gap:6px;flex-wrap:wrap">' + t.join("") + "</span>" : "") +
      ps.map(function (p) { return '<span style="font-size:13px;display:flex;justify-content:space-between;gap:8px"><span>' + esc(p.title) + " · " + esc(PMN[p.method] || p.method) + (p.test ? ' <span class="b mut" style="height:18px;font-size:11px">sinov</span>' : "") +
        '</span><span class="mut">' + som(p.amount) + " · " + dt(p.created_at) + "</span></span>" }).join("") + "</div>";
  }
  var PMN = { wallet: "Hamyon", click: "Click", payme: "Payme", admin: "Admin" };
  function listingCard(l) {
    var a = "", paid = !!l.paid_at;
    if (l.review_needed) a += '<button class="btn pri" type="button" data-rev="' + l.id + '">' + ic("check", 18) + "Ko'rib chiqildi</button>";
    if (!paid && (l.status === "active" || l.status === "pending")) a += '<button class="btn bad" type="button" data-mod="rejected" data-id="' + l.id + '">Rad etish</button>';
    if (l.status === "pending" || l.status === "rejected") a += '<button class="btn pri" type="button" data-mod="active" data-id="' + l.id + '">' + (l.status === "pending" ? "Tasdiqlash" : "Qayta faollashtirish") + "</button>";
    if (l.status === "active" && !paid) a += '<button class="btn soft" type="button" data-mod="archived" data-id="' + l.id + '">Arxivlash</button>';
    if (l.owner_id) a += '<button class="btn bad" type="button" data-del="' + l.id + '" data-paid="' + (paid ? 1 : 0) + '">' + ic("trash", 18) + "O'chirish</button>";
    return '<article class="lc"><div class="ph">' + (l.image ? '<img src="' + esc(l.image) + '" alt="" loading="lazy" referrerpolicy="no-referrer">' : ic("photo", 40)) +
      '<span class="b acc">' + esc(l.category) + "</span>" + (l.photos ? '<span class="n">' + num(l.photos) + " rasm</span>" : "") + "</div>" +
      '<div class="bd"><div class="row" style="justify-content:space-between;gap:8px"><span class="mut" style="font-size:13px">№ ' + l.id + "</span><span class=\"row\" style=\"gap:6px\">" + (l.deal === "rent" ? '<span class="b acc">Ijara</span>' : "") + (l.closed_reason ? '<span class="b ok">' + (l.closed_reason === "rented" ? "Ijaraga berildi" : "Sotildi") + "</span>" : "") + (l.edited_at && (l.status === "pending" || l.review_needed) ? '<span class="b acc">Tahrirlangan</span>' : "") + (l.review_needed && !l.edited_at ? '<span class="b warn">To\'lov bilan faollashgan</span>' : paid && !l.review_needed ? '<span class="b acc">Pullik</span>' : "") + badge(LST, l.status) + "</span></div>" +
      "<h3>" + esc(l.title) + '</h3><span class="pr">' + esc(l.price) + (l.deal === "rent" ? " / oy" : "") + "</span>" +
      '<span class="mut" style="font-size:14px;display:flex;gap:6px;align-items:center">' + ic("pin", 16) + esc(l.city + ", " + l.address) + "</span>" +
      (l.details ? '<span style="font-size:14px">' + esc(l.details) + "</span>" : "") +
      (l.dups && l.dups.length ? '<div class="box dup"><small>⚠ O\'xshash e\'lon bor</small><span>' + l.dups.map(function (x) { return '<a class="link" href="#/listings?s=all&q=' + x + '">№ ' + x + "</a>" }).join(", ") + ' — bir xil telefon yoki egasi, tur va xonalar soni</span></div>' : "") +
      (l.moderation_note ? '<div class="box"><small>Moderator izohi</small><span>' + esc(l.moderation_note) + "</span></div>" : "") + promoBox(l) +
      (l.note ? '<div class="box"><small>Tavsif</small><span style="white-space:pre-line">' + esc(l.note) + "</span></div>" : "") +
      (l.owner_phone ? '<span class="mut" style="font-size:13px">Tel: +' + esc(String(l.owner_phone).replace(/^\+/, "")) + "</span>" : "") +
      '<div class="ft">' + (l.owner_id ? '<a class="u sm" href="#/user/' + esc(l.owner_id) + '" style="color:var(--tx);font-weight:600">' + av("ua", l.owner_id, l.owner_name || l.contact_name) + "<span>" + esc(l.owner_name || l.contact_name || "Muallif") + "</span></a>"
        : "<span>" + esc(l.contact_name || "Namuna e'lon") + "</span>") + "<span>" + ago(l.created_at) + "</span></div>" +
      (a ? '<div class="ac">' + a + "</div>" : "") + "</div></article>";
  }

  /* ---------- Daromad ---------- */
  var REVP = 30;
  function revenuePage() {
    root.innerHTML = shell("revenue", header("Daromad", "Pullik xizmatlar va Kaleet hamyoni") + '<div id="rvb"><div class="card empty">Yuklanmoqda…</div></div>');
    Promise.all([rpc("admin_revenue", { p_days: REVP }), rpc("admin_free_mode").catch(function () { return null })]).then(function (a) {
      var r = a[0], fm = a[1];
      if (route().name !== "revenue") return;
      var mx = 1; (r.days || []).forEach(function (x) { mx = Math.max(mx, x.amount) });
      var dev = ME && ME.role === "developer";
      var h = (fm === true || fm === false ? '<section class="card" style="margin-bottom:16px;display:flex;flex-direction:row;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;min-height:0' + (fm ? ';border:1px solid var(--ok)' : '') + '"><div style="flex:1 1 300px;min-width:0"><h2 style="margin:0 0 6px;display:flex;align-items:center;gap:8px">' +
          (fm ? 'Bepul davr <span class="b ok">Yoqilgan</span>' : 'Pullik rejim <span class="b acc">Yoqilgan</span>') + '</h2><span class="mut" style="font-size:14px">' +
          (fm ? "Ilovada tariflar, paketlar, hamyon va reklama yashirilgan. Har bir foydalanuvchi 3 tagacha e'lon joylaydi va har bir e'lonni 5 martagacha bepul ko'taradi. To'lovlar qabul qilinmaydi."
              : "Ilovada tariflar, paketlar, hamyon va reklama ko'rinadi. Bepul limit — 1 ta e'lon.") + "</span></div>" +
          (dev ? '<button class="btn ' + (fm ? "pri" : "soft") + '" type="button" data-act="free" data-v="' + (fm ? 0 : 1) + '">' + (fm ? "Pullik rejimni yoqish" : "Bepul davrni yoqish") + "</button>" : "") + "</section>" : "") +
        (r.test ? '<div class="card" style="border:1px solid var(--warn,#f5a623);margin-bottom:16px"><b>Sinov rejimi yoqilgan.</b> Click va Payme to\'lovlari haqiqiy pul yechmasdan «muvaffaqiyatli» hisoblanadi. Ular quyida «sinov» belgisi bilan ko\'rsatiladi.</div>' : "") +
        '<div class="seg" role="group" aria-label="Davr" style="margin-bottom:16px">' + [7, 30, 90, 365].map(function (p) {
          return '<button type="button" data-rper="' + p + '" class="' + (REVP === p ? "on" : "") + '" aria-pressed="' + (REVP === p) + '">' + (p === 365 ? "1 yil" : p + " kun") + "</button>" }).join("") + "</div>" +
        '<section class="stat4" style="margin-bottom:16px">' + kpi("Davr bo'yicha tushum", num(r.period) + ' <small style="font-size:15px;font-weight:600">so\'m</small>', '<span class="mut" style="font-size:13px">so\'nggi ' + REVP + " kun</span>") +
        kpi("Jami haqiqiy tushum", num(r.total) + ' <small style="font-size:15px;font-weight:600">so\'m</small>', '<span class="mut" style="font-size:13px">sinov to\'lovlarisiz</span>') +
        kpi("Hamyonlar to'ldirildi", num(r.topups) + ' <small style="font-size:15px;font-weight:600">so\'m</small>', '<span class="mut" style="font-size:13px">so\'nggi ' + REVP + " kun</span>") +
        kpi("Hamyonlardagi qoldiq", num(r.wallets) + ' <small style="font-size:15px;font-weight:600">so\'m</small>', '<span class="mut" style="font-size:13px">foydalanuvchilar mablag\'i</span>') + "</section>" +
        ((r.days || []).length ? '<section class="card" style="margin-bottom:16px"><h2>Kunlar bo\'yicha</h2>' + r.days.map(function (x) {
          return '<div style="display:flex;align-items:center;gap:10px;font-size:14px;min-height:30px"><span style="width:90px" class="mut">' + dOnly(x.day) + '</span><span style="flex:1;height:10px;border-radius:5px;background:var(--bg3)"><span style="display:block;height:100%;border-radius:5px;background:var(--acc,#0878b8);width:' + Math.max(2, Math.round(100 * x.amount / mx)) + '%"></span></span><b style="width:120px;text-align:right">' + som(x.amount) + "</b></div>" }).join("") + "</section>" : "") +
        '<section class="card" style="margin-bottom:16px"><h2>Xizmatlar bo\'yicha</h2>' + ((r.products || []).length ? r.products.map(function (x) {
          return '<div class="li"><span><b>' + esc(x.title) + "</b><small>" + num(x.n) + " ta xarid</small></span><b>" + som(x.amount) + "</b></div>" }).join("") : '<div class="empty">Hali xarid yo\'q</div>') + "</section>" +
        '<section class="card"><h2>Oxirgi xaridlar</h2>' + ((r.recent || []).length ? r.recent.map(function (x) {
          return '<div class="li"><span><b>' + esc(x.title) + (x.test ? ' <span class="b mut" style="height:18px;font-size:11px">sinov</span>' : "") + "</b><small>" + esc((x.user_name || "—") + " · " + (PMN[x.method] || x.method) + " · " + dt(x.created_at)) +
            (x.listing_id ? ' · <a class="link" href="#/listings?s=all&q=' + x.listing_id + '">' + esc(x.listing_title || ("№ " + x.listing_id)) + "</a>" : "") + "</small></span><b>" + som(x.amount) + "</b></div>" }).join("") : '<div class="empty">Hali xarid yo\'q</div>') + "</section>";
      $("#rvb").innerHTML = h;
    }).catch(function (e) { $("#rvb").innerHTML = '<div class="card empty">' + esc(errText(e)) + "<br><small>Supabase'da app_update_5.sql ishga tushirilganini tekshiring.</small></div>" });
  }

  /* ---------- 5. Shikoyatlar ---------- */
  var RQ = { s: "new" };
  function reportsPage() {
    root.innerHTML = shell("reports", header("Shikoyatlar", "E'lonlar va foydalanuvchilar ustidan kelgan shikoyatlar") + '<div id="rb"><div class="loading">Yuklanmoqda…</div></div>');
    loadReports();
  }
  function loadReports() {
    rpc("admin_reports", { p_status: RQ.s }).then(function (r) {
      if (route().name !== "reports") return;
      var c = r.counts || {}; NAVC.reports = c["new"] || 0;
      var rows = r.rows || [];
      $("#rb").innerHTML = '<section class="stat4" aria-label="Ko\'rsatkichlar" style="margin-bottom:20px">' +
        "<div><span>Yangi</span><b style=\"color:var(--warn)\">" + num(c["new"] || 0) + "</b></div><div><span>Ko'rib chiqilmoqda</span><b>" + num(c.in_progress || 0) +
        "</b></div><div><span>Hal qilingan</span><b style=\"color:var(--ok)\">" + num(c.resolved || 0) + "</b></div><div><span>O'rtacha javob vaqti</span><b>" +
        (r.avg_hours != null ? esc(String(r.avg_hours).replace(".", ",")) + " soat" : "—") + "</b></div></section>" +
        '<div class="chips" role="group" aria-label="Holat" style="margin-bottom:20px">' + [["new", "Yangi"], ["in_progress", "Ko'rib chiqilmoqda"], ["resolved", "Hal qilingan"], ["dismissed", "Asossiz"], ["all", "Hammasi"]].map(function (x) {
          return '<button type="button" class="chip' + (RQ.s === x[0] ? " on" : "") + '" data-rs="' + x[0] + '" aria-pressed="' + (RQ.s === x[0]) + '">' + x[1] + "</button>";
        }).join("") + "</div>" +
        '<section class="card flush">' + (rows.length ? '<div class="tw"><table><thead><tr><th>Sabab</th><th>Kimga / nimaga</th><th>Yuborgan</th><th>Vaqt</th><th>Holat</th><th><span class="sr">Amal</span></th></tr></thead><tbody>' +
          rows.map(function (x) {
            var tgt = x.listing_id ? '<span class="b mut" style="height:22px;font-size:12px">E\'lon № ' + x.listing_id + '</span><a class="link" href="#/listings?s=all&q=' + x.listing_id + '">' + esc(x.listing_title || "O'chirilgan") + "</a>"
              : '<span class="b mut" style="height:22px;font-size:12px">Foydalanuvchi</span><a class="link" href="#/user/' + esc(x.target_user_id) + '">' + esc(x.target_name || "—") + "</a>";
            var acts = x.status === "new" ? '<button class="btn soft" type="button" data-rep="in_progress" data-id="' + x.id + '">Ko\'rib chiqish</button>' : "";
            if (x.status === "new" || x.status === "in_progress") acts += '<button class="btn pri" type="button" data-rep="resolved" data-id="' + x.id + '">Hal qilindi</button><button class="btn soft" type="button" data-rep="dismissed" data-id="' + x.id + '">Asossiz</button>';
            var bu = x.target_user_id || x.listing_owner;
            if (bu) acts += '<button class="btn bad" type="button" data-act="block" data-uid="' + esc(bu) + '" data-v="1">' + ic("ban", 18) + (x.listing_id ? "Egasini bloklash" : "Bloklash") + "</button>";
            var shots = (x.images || []).filter(function (u) { return /^https:\/\//.test(String(u)); });
            return "<tr><td><b>" + esc(x.reason) + "</b>" + (x.note ? '<small class="mut" style="display:block;font-size:13px">' + esc(x.note) + "</small>" : "") +
              (shots.length ? '<span style="display:flex;gap:6px;margin-top:8px">' + shots.map(function (u, i) {
                return '<a href="' + esc(u) + '" target="_blank" rel="noopener" title="Skrinshot ' + (i + 1) + '"><img src="' + esc(u) + '" alt="Skrinshot ' + (i + 1) + '" loading="lazy" style="display:block;width:48px;height:48px;object-fit:cover;border-radius:10px;background:var(--page)"></a>';
              }).join("") + "</span>" : "") +
              '</td><td><span style="display:flex;flex-direction:column;gap:4px;align-items:flex-start">' + tgt + "</span></td><td>" +
              (x.reporter_id ? '<a class="u sm" href="#/user/' + esc(x.reporter_id) + '">' + av("ua", x.reporter_id, x.reporter_name) + "<span>" + esc(x.reporter_name || "—") + "</span></a>" : "—") +
              '</td><td class="nw mut">' + ago(x.created_at) + "</td><td>" + badge(RST, x.status) + '</td><td><div class="row" style="justify-content:flex-end;flex-wrap:nowrap">' + acts + "</div></td></tr>";
          }).join("") + "</tbody></table></div>"
          : '<div class="empty">' + (RQ.s === "new" ? "Yangi shikoyat yo'q" : "Shikoyat topilmadi") + "<br><small>Ilovadan yuborilgan shikoyatlar (sabab, izoh, skrinshot) shu yerda paydo bo'ladi.</small></div>") + "</section>";
    }).catch(showErr);
  }

  /* ---------- 6. Adminlar ---------- */
  var PERMS = [["Statistikani ko'rish", 1], ["E'lonlarni tasdiqlash va rad etish", 1], ["Shikoyatlarni ko'rib chiqish", 1], ["Foydalanuvchini ogohlantirish va bloklash", 1],
    ["Moderator izohi qoldirish", 1], ["Adminlar va rollarni boshqarish", 0]];
  function adminsPage() {
    if (!ME || ME.role !== "developer") { location.hash = "#/"; return }
    root.innerHTML = shell("admins", header("Adminlar va rollar", "Bu bo'lim faqat dasturchiga ko'rinadi") + '<div id="ab"><div class="loading">Yuklanmoqda…</div></div>');
    rpc("admin_admins").then(function (rows) {
      if (route().name !== "admins") return;
      $("#ab").innerHTML = '<div class="split"><section class="card flush"><div style="padding:18px 20px 8px"><h2 style="font-size:18px">Panelga kira oladiganlar</h2></div><div class="tw"><table style="min-width:620px"><thead><tr><th>Admin / login</th><th>Rol</th><th>Qo\'shilgan</th><th>Oxirgi kirish</th><th><span class="sr">Amal</span></th></tr></thead><tbody>' +
        rows.map(function (a) {
          return '<tr><td><span class="u">' + av("ua", a.user_id, a.display_name || a.login) + "<span><b>" + esc(a.display_name || a.login) + (a.me ? " (siz)" : "") + "</b><small>" + esc(a.login) +
            "</small></span></span></td><td>" + (a.role === "developer" ? '<span class="b acc">Dasturchi</span>' : '<span class="b mut">Moderator</span>') + '</td><td class="nw mut">' + dOnly(a.created_at) +
            '</td><td class="nw mut">' + ago(a.last_sign_in_at) + '</td><td style="text-align:right">' + (a.me ? "" : '<button class="btn soft" type="button" style="color:var(--bad)" data-rm="' + esc(a.user_id) + '" data-n="' + esc(a.login) + '">Olib tashlash</button>') + "</td></tr>";
        }).join("") + "</tbody></table></div></section>" +
        '<section class="card"><h2>Yangi admin qo\'shish</h2><form id="af" style="display:flex;flex-direction:column;gap:14px">' +
        '<label class="field">Ism<input name="n" type="text" maxlength="60" placeholder="Masalan: Moderator 1"></label>' +
        '<label class="field">Login<input name="l" type="text" maxlength="40" autocapitalize="none" spellcheck="false" required placeholder="moderator1"></label>' +
        '<label class="field">Rol<select name="r"><option value="moderator">Moderator</option><option value="developer">Dasturchi</option></select></label>' +
        '<button class="btn pri" type="submit">' + ic("plus", 18) + "Qo'shish</button></form>" +
        '<div class="note" role="note">' + ic("shield", 18) + "<span>Avval Supabase → Authentication → Users → Add user orqali <b>login@" + CFG.loginDomain +
        "</b> email va parol bilan foydalanuvchi yarating (Auto Confirm belgilangan). So'ng shu yerda unga rol bering.</span></div></section></div>" +
        '<section class="card flush" style="margin-top:20px"><div style="padding:18px 20px 8px"><h2 style="font-size:18px">Huquqlar</h2></div><div class="tw"><table style="min-width:520px"><thead><tr><th>Huquq</th><th style="text-align:center">Dasturchi</th><th style="text-align:center">Moderator</th></tr></thead><tbody>' +
        PERMS.map(function (p) {
          return '<tr><td style="font-weight:500">' + p[0] + '</td><td style="text-align:center;color:var(--ok)">✓</td><td style="text-align:center;' + (p[1] ? "color:var(--ok)" : "color:var(--tx2)") + '">' + (p[1] ? "✓" : "—") + "</td></tr>";
        }).join("") + "</tbody></table></div></section>";
      $("#af").addEventListener("submit", function (e) {
        e.preventDefault(); var f = this, l = f.l.value.trim(); if (!l) { f.l.focus(); return }
        rpc("admin_set_role", { p_login: l, p_role: f.r.value, p_name: f.n.value.trim() }).then(function () { toast("Rol berildi."); adminsPage() }).catch(showErr);
      });
    }).catch(showErr);
  }

  /* ---------- umumiy hodisalar ---------- */
  function showErr(e) {
    if (!S) return;
    var m = errText(e); toast(m);
    var l = $(".loading"); if (l) l.textContent = m;
  }
  document.addEventListener("click", function (e) {
    var big = e.target.closest("[data-big]");
    if (big) { window.open(big.dataset.big, "_blank", "noopener"); return }
    var t = e.target.closest("[data-act],[data-per],[data-uf],[data-pg],[data-ls],[data-mod],[data-rs],[data-rep],[data-rm],[data-rev],[data-del],[data-rper]"); if (!t) return;
    var d = t.dataset, uid = d.uid || root.dataset.user;
    if (d.act === "theme") { save(TK, theme() === "dark" ? "light" : "dark"); applyTheme(); $$('[data-act="theme"]').forEach(function (b) { b.innerHTML = ic(theme() === "dark" ? "sun" : "moon") }); return }
    if (d.act === "pw") { var i = t.previousElementSibling; i.type = i.type === "password" ? "text" : "password"; t.setAttribute("aria-label", i.type === "password" ? "Parolni ko'rsatish" : "Parolni yashirish"); return }
    if (d.act === "logout") { signOut(false); return }
    if (d.act === "reload") { statsPage(); return }
    if (d.per) { PER = +d.per; statsPage(); return }
    if (d.uf) { UQ.f = d.uf; UQ.page = 0; loadUsers(); return }
    if (d.pg) { var p = d.pg.split(":"); if (p[0] === "u") { UQ.page = Math.max(0, UQ.page + +p[1]); loadUsers() } else { LQ.page = Math.max(0, LQ.page + +p[1]); loadListings() } window.scrollTo(0, 0); return }
    if (d.ls) { LQ.s = d.ls; LQ.page = 0; loadListings(); return }
    if (d.rs) { RQ.s = d.rs; loadReports(); return }
    if (d.rev) { rpc("admin_listing_reviewed", { p_id: +d.rev }).then(function () { toast("Belgilandi: ko'rib chiqildi."); loadListings() }).catch(showErr); return }
    if (d.del) {
      ask({ title: "E'lonni o'chirish", text: "E'lon butunlay o'chiriladi. Egasiga sabab bilan xabar boradi." + (d.paid === "1" ? " Bu pullik e'lon — to'langan summa qaytarilmaydi." : ""),
            input: "Sabab (egasiga ko'rinadi)", ph: "Masalan: soxta rasmlar, noto'g'ri narx, takroriy e'lon", required: true, ok: "O'chirish", danger: true }).then(function (v) {
        if (v) rpc("admin_delete_listing", { p_id: +d.del, p_reason: v }).then(function () { toast("E'lon o'chirildi, egasiga xabar yuborildi."); loadListings() }).catch(showErr);
      });
      return;
    }
    if (d.rper) { REVP = +d.rper; revenuePage(); return }
    if (d.act === "free") {
      var fon = d.v === "1";
      ask(fon ? { title: "Bepul davrni yoqish", text: "Ilovada pullik xizmatlar yashiriladi: har bir foydalanuvchi 3 tagacha e'lon joylaydi va har bir e'lonni 5 martagacha bepul ko'taradi. To'lovlar qabul qilinmaydi.", ok: "Yoqish" }
              : { title: "Pullik rejimni yoqish", text: "Ilovada tariflar, paketlar, hamyon va reklama qaytadi. Bepul limit 1 ta e'longa tushadi; bepul davrda joylangan e'lonlar faol qoladi. Foydalanuvchilar ilovani keyingi ochishda o'zgarishni ko'radi.", ok: "Pullik rejimni yoqish" }).then(function (v) {
        if (!v) return;
        rpc("admin_set_free_mode", { p_on: fon }).then(function () { toast(fon ? "Bepul davr yoqildi." : "Pullik rejim yoqildi."); revenuePage() }).catch(showErr);
      });
      return;
    }
    if (d.act === "grant") {
      ask({ title: "Hamyonga qo'shish", text: "Summa foydalanuvchi hamyoniga qo'shiladi (manfiy son — yechiladi).", input: "Summa, so'm", ph: "Masalan: 50000", required: true, ok: "Qo'shish" }).then(function (v) {
        var n = Math.round(Number(String(v || "").replace(/[^0-9-]/g, ""))); if (!v) return; if (!n) { toast("Summani raqam bilan kiriting."); return }
        rpc("admin_wallet_grant", { p_user: uid, p_amount: n, p_note: "Kaleet bonusi" }).then(function (r) { toast("Hamyon: " + som(r.balance)) }).catch(showErr);
      });
      return;
    }
    if (d.mod) {
      var st = d.mod, id = +d.id;
      var o = st === "rejected" ? { title: "E'lonni rad etish", text: "E'lon ilovada boshqalarga ko'rinmay qoladi. Egasi uni o'zi qayta faollashtira olmaydi.", input: "Sabab (egasiga va adminlarga ko'rinadi)", ph: "Masalan: rasmlar boshqa obyektga tegishli", required: true, ok: "Rad etish", danger: true }
        : st === "archived" ? { title: "E'lonni arxivlash", text: "E'lon ilovada ko'rinmay qoladi. Egasi uni qayta faollashtirishi mumkin.", ok: "Arxivlash" }
        : { title: "E'lonni faollashtirish", text: "E'lon ilovada hammaga ko'rinadi.", ok: "Faollashtirish" };
      ask(o).then(function (v) {
        if (v == null) return;
        rpc("admin_set_listing_status", { p_id: id, p_status: st, p_note: typeof v === "string" ? v : "" })
          .then(function () { toast(st === "rejected" ? "E'lon rad etildi." : st === "archived" ? "E'lon arxivlandi." : "E'lon faollashtirildi."); loadListings() }).catch(showErr);
      });
      return;
    }
    if (d.rep) { rpc("admin_set_report_status", { p_id: +d.id, p_status: d.rep }).then(function () { toast("Shikoyat holati yangilandi."); loadReports() }).catch(showErr); return }
    if (d.rm) {
      ask({ title: "Adminni olib tashlash", text: d.n + " endi panelga kira olmaydi.", ok: "Olib tashlash", danger: true }).then(function (v) {
        if (v) rpc("admin_remove_role", { p_user: d.rm }).then(function () { toast("Olib tashlandi."); adminsPage() }).catch(showErr);
      });
      return;
    }
    if (d.act === "purge") {
      ask({ title: "Foydalanuvchini butunlay o'chirish", text: "Hisob, profil, barcha e'lonlar va rasmlar, hamyon, tariflar va bildirishnomalar butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi. U qayta kirsa, yangi foydalanuvchi sifatida noldan boshlaydi.",
            word: "TASDIQLAYMAN", ok: "Butunlay o'chirish", danger: true }).then(function (v) {
        if (!v) return;
        t.disabled = true; toast("O'chirilmoqda…");
        purgeFiles(uid).then(function () { return rpc("admin_delete_user", { p_id: uid }) }).then(function () {
          toast("Foydalanuvchi butunlay o'chirildi."); location.hash = "#/users";
        }).catch(function (e) { t.disabled = false; showErr(e) });
      });
      return;
    }
    if (d.act === "block") {
      var on = d.v === "1";
      ask(on ? { title: "Foydalanuvchini bloklash", text: "U darhol hisobidan chiqariladi va qayta kira olmaydi. E'lonlari o'chirilmaydi.", input: "Sabab", required: true, ok: "Bloklash", danger: true }
             : { title: "Blokdan chiqarish", text: "Foydalanuvchi yana ilovaga kira oladi.", ok: "Blokdan chiqarish" }).then(function (v) {
        if (v == null) return;
        rpc("admin_block_user", { p_id: uid, p_block: on, p_reason: typeof v === "string" ? v : "" }).then(function () {
          toast(on ? "Bloklandi." : "Blokdan chiqarildi.");
          var rn = route().name; if (rn === "users") loadUsers(); else if (rn === "reports") loadReports(); else userPage(uid);
        }).catch(showErr);
      });
      return;
    }
    if (d.act === "warn") {
      ask({ title: "Ogohlantirish berish", text: "Ogohlantirish profil tarixida saqlanadi.", input: "Sabab", required: true, ok: "Saqlash" }).then(function (v) {
        if (v) rpc("admin_warn_user", { p_id: uid, p_reason: v }).then(function () { toast("Ogohlantirish saqlandi."); userPage(uid) }).catch(showErr);
      });
    }
  });

  /* ---------- marshrutlash ---------- */
  function route() {
    var h = location.hash.replace(/^#/, "") || "/", q = h.split("?"), path = q[0], params = {};
    (q[1] || "").split("&").forEach(function (kv) { if (!kv) return; var p = kv.split("="); params[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || "") });
    var m;
    if (path === "/login") return { name: "login", params: params };
    if (path === "/users") return { name: "users", params: params };
    if ((m = path.match(/^\/user\/([0-9a-f-]{36})$/))) return { name: "user", id: m[1], params: params };
    if (path === "/listings") return { name: "listings", params: params };
    if (path === "/reports") return { name: "reports", params: params };
    if (path === "/admins") return { name: "admins", params: params };
    if (path === "/revenue") return { name: "revenue", params: params };
    return { name: "stats", params: params };
  }
  function render() {
    var r = route();
    if (r.name !== "stats") clearInterval(REFRESH);
    delete root.dataset.user;
    if (!S) { if (r.name !== "login") { location.hash = "#/login"; return } root.innerHTML = loginView(); bindLogin(); return }
    if (!ME) {
      root.innerHTML = '<div class="loading">Yuklanmoqda…</div>';
      rpc("admin_me").then(function (me) {
        if (!me) { signOut(true); return }
        ME = me; rpc("admin_stats").then(setNavCounts).catch(function () {}).then(render);
      }).catch(function (e) { if (S) root.innerHTML = '<div class="loading">' + esc(errText(e)) + '<br><br><button class="btn" type="button" data-act="logout">Chiqish</button></div>' });
      return;
    }
    if (r.name === "login") { location.hash = "#/"; return }
    window.scrollTo(0, 0);
    ({ stats: statsPage, users: usersPage, listings: listingsPage, reports: reportsPage, admins: adminsPage, revenue: revenuePage }[r.name] || function () { userPage(r.id) })();
  }
  window.addEventListener("hashchange", render);
  render();
})();
