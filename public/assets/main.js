(function () {
  "use strict";
  var doc = document;

  /* header border after scroll */
  var top = doc.querySelector(".top");
  if (top) {
    var onScroll = function () { top.classList.toggle("is-scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* floating pill: turns dark over dark sheets */
  var pill = doc.getElementById("pill");
  var darks = doc.querySelectorAll(".hero__sheet, .sheet");
  function pillTone() {
    if (!pill) return;
    var r = pill.getBoundingClientRect(), y = r.top + r.height / 2, dark = false;
    darks.forEach(function (el) { var b = el.getBoundingClientRect(); if (y >= b.top && y <= b.bottom) dark = true; });
    pill.classList.toggle("is-dark", dark);
  }
  window.addEventListener("scroll", pillTone, { passive: true });
  window.addEventListener("resize", pillTone);
  pillTone();

  /* menu sheet */
  var menuBtn = doc.getElementById("menu-btn");
  var menu = doc.getElementById("menu");
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    if (open) { menu.hidden = false; void menu.offsetWidth; }
    menu.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
    menuBtn.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    doc.body.classList.toggle("menu-open", open);
    if (pill) pill.classList.toggle("is-dark", open || pill.classList.contains("is-dark"));
    if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
    else { setTimeout(function () { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 560); pillTone(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener("click", function () { setMenu(menuBtn.getAttribute("aria-expanded") !== "true"); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false); menuBtn.focus(); }
    });
  }

  /* sign on a timer: lit from 18:00 to 06:00 Chelyabinsk time */
  var sign = doc.getElementById("sign");
  var sw = doc.getElementById("sign-switch");
  var clock = doc.getElementById("sign-clock");
  var manual = false;

  function chelyabinskNow() {
    try {
      var parts = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Yekaterinburg", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === "hour") h = +p.value; if (p.type === "minute") m = +p.value; });
      return { h: h % 24, m: m };
    } catch (e) {
      var d = new Date(); return { h: d.getHours(), m: d.getMinutes() };
    }
  }
  function setSign(on) {
    if (!sign || !sw) return;
    sign.classList.toggle("is-on", on);
    sw.setAttribute("aria-pressed", on ? "true" : "false");
    sw.querySelector(".switch__label").textContent = on ? "Подсветка включена" : "Подсветка выключена";
  }
  function tick() {
    var t = chelyabinskNow();
    var hh = (t.h < 10 ? "0" : "") + t.h, mm = (t.m < 10 ? "0" : "") + t.m;
    if (clock) clock.textContent = "В Челябинске " + hh + ":" + mm;
    if (!manual) setSign(t.h >= 18 || t.h < 6);
  }
  if (sign && sw) {
    sw.addEventListener("click", function () {
      manual = true;
      setSign(sw.getAttribute("aria-pressed") !== "true");
    });
    tick();
    setInterval(tick, 30000);
    /* daytime visitors see the letters light up once, then the timer state returns */
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduce && !sign.classList.contains("is-on")) {
      setTimeout(function () { if (!manual) setSign(true); }, 900);
      setTimeout(function () { if (!manual) tick(); }, 3200);
    }
  }

  /* service words: photo follows the cursor (mouse only) */
  var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var items = doc.querySelectorAll(".stack li[data-preview]");
  if (fine && !reduceMotion && items.length) {
    var peek = doc.createElement("div"); peek.className = "peek"; peek.setAttribute("aria-hidden", "true");
    var pimg = doc.createElement("img"); pimg.alt = ""; peek.appendChild(pimg); doc.body.appendChild(peek);
    items.forEach(function (li) {
      var pre = new Image(); pre.src = li.getAttribute("data-preview");
      li.addEventListener("mouseenter", function () { pimg.src = li.getAttribute("data-preview"); peek.classList.add("is-on"); });
      li.addEventListener("mouseleave", function () { peek.classList.remove("is-on"); });
      li.addEventListener("mousemove", function (e) { peek.style.left = (e.clientX + 150) + "px"; peek.style.top = e.clientY + "px"; });
    });
  }

  /* copy phone number */
  doc.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var done = function () { var old = btn.textContent; btn.textContent = "Скопировано"; setTimeout(function () { btn.textContent = old; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectText(btn.previousElementSibling); });
      } else { selectText(btn.previousElementSibling); }
    });
  });
  function selectText(el) {
    if (!el) return;
    var r = doc.createRange(); r.selectNodeContents(el);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* contact form */
  var form = doc.getElementById("lead-form");
  if (!form) return;
  var status = doc.getElementById("form-status");
  var startedAt = Date.now();
  var endpoint = form.getAttribute("data-endpoint") || "";
  var token = "";

  function fetchToken() {
    if (!endpoint || token) return;
    fetch(endpoint + "?token=1", { credentials: "same-origin", headers: { "X-Requested-With": "fetch" } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && typeof j.token === "string") token = j.token; })
      .catch(function () {});
  }
  form.addEventListener("focusin", fetchToken, { once: true });

  var rules = {
    name: function (v) { return v.length < 2 ? "Напишите, как к вам обращаться" : v.length > 60 ? "Слишком длинное имя" : ""; },
    phone: function (v) { var d = v.replace(/\D/g, ""); return (d.length < 10 || d.length > 12) ? "Проверьте номер: нужно 10–11 цифр" : ""; },
    message: function (v) { return v.length > 1000 ? "Сократите сообщение до 1000 знаков" : ""; }
  };
  function check(field) {
    var rule = rules[field.name]; if (!rule) return true;
    var msg = rule(field.value.trim());
    var err = doc.getElementById(field.id + "-err");
    field.setAttribute("aria-invalid", msg ? "true" : "false");
    if (err) err.textContent = msg;
    return !msg;
  }
  form.querySelectorAll("input[name], textarea[name]").forEach(function (f) {
    f.addEventListener("blur", function () { if (f.value) check(f); });
  });
  var phone = doc.getElementById("f-phone");
  if (phone) phone.addEventListener("input", function () { phone.value = phone.value.replace(/[^\d+()\-\s]/g, "").slice(0, 20); });

  function say(text, isError) { status.textContent = text; status.classList.toggle("is-error", !!isError); }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var ok = true;
    ["f-name", "f-phone", "f-message"].forEach(function (id) { if (!check(doc.getElementById(id))) ok = false; });
    var consent = doc.getElementById("f-consent");
    if (!consent.checked) { say("Отметьте согласие на обработку данных", true); return; }
    if (!ok) { say("Исправьте поля, отмеченные красным", true); return; }
    if (form.website.value) return;                 /* honeypot */
    if (Date.now() - startedAt < 3000) { say("Подождите пару секунд и отправьте снова", true); return; }

    if (!endpoint) { say("Это предпросмотр сайта, заявка никуда не отправлена. Позвоните или напишите в Telegram."); return; }

    var btn = form.querySelector("button[type=submit]");
    btn.disabled = true; say("Отправляем…");
    var data = new FormData(form);
    data.append("token", token);
    data.append("elapsed", String(Date.now() - startedAt));
    fetch(endpoint, { method: "POST", body: data, credentials: "same-origin", headers: { "X-Requested-With": "fetch" } })
      .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
      .then(function (j) {
        if (j && j.ok) { form.reset(); say("Заявка отправлена. Перезвоним в рабочее время."); }
        else { say((j && j.error) || "Не получилось отправить. Позвоните нам или напишите в Telegram.", true); token = ""; fetchToken(); }
      })
      .catch(function () { say("Нет связи с сервером. Позвоните нам или напишите в Telegram.", true); })
      .finally(function () { btn.disabled = false; });
  });
})();
