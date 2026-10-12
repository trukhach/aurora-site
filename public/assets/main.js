(function () {
  "use strict";
  var doc = document;


  /* floating pill: turns dark while a dark sheet sits under it (IntersectionObserver, no scroll listener) */
  var pill = doc.getElementById("pill");
  var darks = doc.querySelectorAll(".hero__sheet, .sheet");
  var under = new Set();
  function pillTone() { if (pill) pill.classList.toggle("is-dark", under.size > 0); }
  if (pill && "IntersectionObserver" in window) {
    var band = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) under.add(en.target); else under.delete(en.target); });
      pillTone();
    }, { rootMargin: "-36px 0px -" + (window.innerHeight - 40) + "px 0px" });
    darks.forEach(function (el) { band.observe(el); });
  }

  /* menu sheet */
  var menuBtn = doc.getElementById("menu-btn");
  var menu = doc.getElementById("menu");
  function setMenu(open, instant) {
    if (!menu || !menuBtn) return;
    menu.classList.toggle("no-anim", !!instant);
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
    menuBtn.addEventListener("click", function (e) { setMenu(menuBtn.getAttribute("aria-expanded") !== "true", e.detail === 0); });   /* Enter/Space on the button: no animation */
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { setMenu(false, true); menuBtn.focus(); }
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
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    function follow() {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;           /* spring-like easing toward the cursor */
      peek.style.transform = "translate3d(" + (cx - 120) + "px," + (cy - 150) + "px,0)";
      raf = (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.5) ? requestAnimationFrame(follow) : 0;
    }
    items.forEach(function (li) {
      var pre = new Image(); pre.src = li.getAttribute("data-preview");
      li.addEventListener("mouseenter", function (e) {
        pimg.src = li.getAttribute("data-preview");
        if (!peek.classList.contains("is-on")) { cx = tx = e.clientX + 150; cy = ty = e.clientY; follow(); }
        peek.classList.add("is-on");
      });
      li.addEventListener("mouseleave", function () { peek.classList.remove("is-on"); });
      li.addEventListener("mousemove", function (e) { tx = e.clientX + 150; ty = e.clientY; if (!raf) raf = requestAnimationFrame(follow); });
    });
  }

  /* works photos: reveal once as they scroll into view; anything already on screen at load stays as is */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var shots = doc.querySelectorAll(".shot__img");
    var seen = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("is-visible");
        seen.unobserve(en.target);
      });
    }, { rootMargin: "0px 0px -80px 0px" });
    shots.forEach(function (el, i) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 3) * 60 + "ms";   /* small stagger across a row */
      seen.observe(el);
    });
  }


  /* hero background: a soft mint light spill on the dark facade, drawn with a tiny WebGL shader.
     Brightens when the sign is on. Paused off-screen and in hidden tabs; one still frame under reduced motion. */
  (function () {
    var cv = doc.getElementById("aurora-bg");
    if (!cv) return;
    var gl = cv.getContext("webgl", { antialias: false, premultipliedAlpha: true, alpha: true });
    if (!gl) return;
    var vs = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";
    var fs = [
      "precision mediump float;",
      "uniform vec2 r;uniform float t;uniform float on;",
      "float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}",
      "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
      " return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
      "float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p*=2.02;a*=.5;}return v;}",
      "void main(){",
      " vec2 uv=gl_FragCoord.xy/r; vec2 q=uv; q.x*=r.x/r.y;",
      " float y=uv.y;",
      " float band=fbm(vec2(q.x*1.3+t*.04, y*2.2-t*.03));",
      " float curtain=smoothstep(.15,.95,band)*smoothstep(1.05,.35,y)*smoothstep(-.1,.45,y);",
      " float glow=exp(-pow(distance(uv,vec2(.5,.56))*2.1,2.));",
      " float a=curtain*.12+glow*(.04+.15*on);",
      " vec3 mint=vec3(.129,.941,.659);",
      " gl_FragColor=vec4(mint*a,a);",
      "}"].join("\n");
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null; }
    var v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return;
    var pr = gl.createProgram(); gl.attachShader(pr, v); gl.attachShader(pr, f); gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
    gl.useProgram(pr);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(pr, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(pr, "r"), uT = gl.getUniformLocation(pr, "t"), uOn = gl.getUniformLocation(pr, "on");
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var visible = true, raf = 0, onNow = 0, start = performance.now();
    function size() {
      var scale = 0.5;   /* half resolution: it is a blur of light, sharpness buys nothing */
      var w = Math.max(1, Math.round(cv.clientWidth * scale)), hgt = Math.max(1, Math.round(cv.clientHeight * scale));
      if (cv.width !== w || cv.height !== hgt) { cv.width = w; cv.height = hgt; gl.viewport(0, 0, w, hgt); }
    }
    function frame(now) {
      raf = 0;
      size();
      var target = sign && sign.classList.contains("is-on") ? 1 : 0;
      onNow += (target - onNow) * 0.06;
      gl.uniform2f(uR, cv.width, cv.height);
      gl.uniform1f(uT, still ? 12.0 : (now - start) / 1000);
      gl.uniform1f(uOn, onNow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!cv.classList.contains("is-ready")) cv.classList.add("is-ready");
      if (visible && !doc.hidden && (!still || Math.abs(target - onNow) > 0.01)) raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf && visible && !doc.hidden) raf = requestAnimationFrame(frame); }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; kick(); }).observe(cv);
    }
    doc.addEventListener("visibilitychange", kick);
    window.addEventListener("resize", kick);
    if (sw) sw.addEventListener("click", kick);
    kick();
  })();

  /* copy phone number */
  doc.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy");
      var swap = function (text) { btn.classList.add("is-swapping"); setTimeout(function () { btn.textContent = text; btn.classList.remove("is-swapping"); }, 120); };
      var done = function () { var old = btn.textContent; swap("Скопировано"); setTimeout(function () { swap(old); }, 1600); };
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
    phone: function (v) { var d = v.replace(/\D/g, ""); return (d.length < 10 || d.length > 12) ? "Проверьте номер: нужно 10 или 11 цифр" : ""; },
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
