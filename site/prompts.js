/* Конструктор промптов: поля слева, готовый текст справа.
   Чтобы добавить поле или подсказку — поправь описание в TYPES. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };

  // chips: [русский вариант, английский вариант]
  var STYLE = [["плоская векторная графика", "flat vector illustration"], ["рисунок от руки на бумаге", "hand-drawn on paper"], ["объёмный мультяшный 3D", "stylized 3D cartoon"], ["фотореализм", "photorealistic"], ["пластилин", "claymation"]];
  var LIGHT = [["мягкий дневной свет", "soft daylight"], ["неон", "neon glow"], ["золотой час", "golden hour"], ["контровой свет", "backlight"], ["тёплая лампа", "warm lamp light"]];
  var MOOD = [["смешно и абсурдно", "funny and absurd"], ["уютно", "cozy"], ["напряжённо", "tense"], ["трогательно", "heartwarming"]];
  var RATIO = [["9:16", "9:16"], ["16:9", "16:9"], ["1:1", "1:1"]];

  var TYPES = {
    video: {
      label: "Видео",
      fields: [
        { id: "subject", label: "Кто или что в кадре", ph: "человечек из палочек с красным шарфом" },
        { id: "action", label: "Что происходит", ph: "бежит за автобусом и роняет кофе" },
        { id: "setting", label: "Где", ph: "утренняя улица, остановка" },
        { id: "style", label: "Стиль", chips: STYLE },
        { id: "camera", label: "Камера", chips: [["камера неподвижна", "static camera"], ["медленный наезд", "slow push-in"], ["панорама слева направо", "pan left to right"], ["камера следует за героем", "tracking shot"], ["с рук", "handheld"]] },
        { id: "light", label: "Свет", chips: LIGHT },
        { id: "mood", label: "Настроение", chips: MOOD },
        { id: "ratio", label: "Формат", chips: RATIO },
        { id: "duration", label: "Длина, секунд", chips: [["4", "4"], ["6", "6"], ["8", "8"]] },
        { id: "avoid", label: "Чего не должно быть", ph: "текст в кадре, лишние персонажи", chips: [["текст и водяные знаки", "text and watermarks"], ["лишние пальцы и конечности", "extra fingers or limbs"], ["резкая смена сцены", "scene cuts"]] }
      ],
      example: { subject: "человечек из палочек с красным шарфом", action: "бежит за уезжающим автобусом и роняет стаканчик кофе", setting: "утренняя улица, остановка", style: "рисунок от руки на бумаге", camera: "камера следует за героем", light: "мягкий дневной свет", mood: "смешно и абсурдно", ratio: "9:16", duration: "8", avoid: "текст и водяные знаки" }
    },
    image: {
      label: "Картинка",
      fields: [
        { id: "subject", label: "Кто или что в кадре", ph: "розовый персонаж в круглых очках" },
        { id: "action", label: "Поза или действие", ph: "сидит за ноутбуком и машет рукой" },
        { id: "setting", label: "Где", ph: "тёмная комната с фиолетовой подсветкой" },
        { id: "style", label: "Стиль", chips: STYLE },
        { id: "camera", label: "Кадр", chips: [["крупный план", "close-up"], ["средний план", "medium shot"], ["общий план", "wide shot"], ["вид сверху", "top-down view"]] },
        { id: "light", label: "Свет", chips: LIGHT },
        { id: "mood", label: "Настроение", chips: MOOD },
        { id: "ratio", label: "Формат", chips: RATIO },
        { id: "avoid", label: "Чего не должно быть", ph: "текст, рамки", chips: [["текст и водяные знаки", "text and watermarks"], ["рамки", "borders"], ["размытие", "blur"]] }
      ],
      example: { subject: "розовый персонаж в круглых очках", action: "сидит за ноутбуком и машет рукой", setting: "тёмная комната с фиолетовой подсветкой", style: "плоская векторная графика", camera: "средний план", light: "неон", mood: "уютно", ratio: "9:16", avoid: "текст и водяные знаки" }
    },
    text: {
      label: "Текст",
      fields: [
        { id: "role", label: "Роль", hint: "кем должна быть нейросеть", ph: "сценарист коротких анимационных роликов" },
        { id: "task", label: "Задача", ph: "придумай историю на 5 сцен про человечка, который опаздывает", area: true },
        { id: "context", label: "Контекст", hint: "что важно знать", ph: "ролик для YouTube Shorts, без слов, длина до 40 секунд", area: true },
        { id: "format", label: "Формат ответа", ph: "нумерованный список, по два предложения на сцену", chips: [["нумерованный список", "a numbered list"], ["таблица", "a table"], ["короткий абзац", "one short paragraph"], ["JSON", "JSON"]] },
        { id: "limits", label: "Ограничения", ph: "без диалогов, концовка с неожиданным поворотом" },
        { id: "sample", label: "Пример хорошего ответа", hint: "если есть", ph: "вставь сюда образец", area: true }
      ],
      example: { role: "сценарист коротких анимационных роликов", task: "придумай историю на 5 сцен про человечка из палочек, который опаздывает на автобус", context: "ролик для YouTube Shorts, без слов, длина до 40 секунд", format: "нумерованный список", limits: "без диалогов, концовка с неожиданным поворотом", sample: "" }
    }
  };

  var WORDS = {
    ru: { style: "Стиль", camera: "Камера", shot: "Кадр", light: "Свет", mood: "Настроение", format: "Формат", sec: "секунд", avoid: "Не добавляй", role: "Ты —", task: "Задача", context: "Контекст", answer: "Формат ответа", limits: "Ограничения", sample: "Пример хорошего ответа" },
    en: { style: "Style", camera: "Camera", shot: "Shot", light: "Lighting", mood: "Mood", format: "Format", sec: "seconds", avoid: "Avoid", role: "You are", task: "Task", context: "Context", answer: "Answer format", limits: "Constraints", sample: "Example of a good answer" }
  };

  var type = store.get("kadr.prompt.type", "video");
  if (!TYPES[type]) type = "video";
  var lang = store.get("kadr.prompt.lang", "ru") === "en" ? "en" : "ru";
  var drafts = store.get("kadr.prompt.drafts", null);
  var isExample = !drafts;
  if (!drafts) { drafts = {}; Object.keys(TYPES).forEach(function (k) { drafts[k] = Object.assign({}, TYPES[k].example); }); }
  var saved = store.get("kadr.prompt.saved", []);

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dot(s) { return /[.!?…]$/.test(s) ? s : s + "."; }
  function build() {
    var v = {}, w = WORDS[lang], out = [];
    TYPES[type].fields.forEach(function (f) { v[f.id] = (drafts[type][f.id] || "").trim(); });
    function line(label, val) { if (val) out.push(label + ": " + dot(val)); }
    if (type === "text") {
      if (v.role) out.push(dot(w.role + " " + v.role));
      line(w.task, v.task); line(w.context, v.context); line(w.answer, v.format); line(w.limits, v.limits);
      if (v.sample) out.push(w.sample + ":\n" + v.sample);
      return out.join("\n\n");
    }
    var scene = [v.subject, v.action, v.setting].filter(Boolean).join(", ");
    if (scene) out.push(dot(cap(scene)));
    line(w.style, v.style); line(type === "image" ? w.shot : w.camera, v.camera); line(w.light, v.light); line(w.mood, v.mood);
    var fmt = [v.ratio, v.duration ? v.duration + " " + w.sec : ""].filter(Boolean).join(", ");
    line(w.format, fmt); line(w.avoid, v.avoid);
    return out.join("\n");
  }

  function renderResult() {
    var text = build(), pre = $("out");
    pre.textContent = text || "Заполни поля слева — промпт соберётся здесь.";
    pre.classList.toggle("empty", !text);
    $("out-meta").textContent = text ? text.length + " знаков" : "пусто";
    $("out-tag").textContent = isExample ? "пример — замени своим" : "твой промпт";
    $("copy").disabled = $("save").disabled = !text;
  }

  function renderFields() {
    var box = $("fields"); box.textContent = "";
    TYPES[type].fields.forEach(function (f) {
      var wrap = document.createElement("div"); wrap.className = "field";
      var label = document.createElement("label"); label.htmlFor = "f-" + f.id; label.textContent = f.label;
      if (f.hint) { var sm = document.createElement("small"); sm.textContent = f.hint; label.appendChild(sm); }
      var input = document.createElement(f.area ? "textarea" : "input");
      input.id = "f-" + f.id; if (f.area) input.rows = 3; else input.type = "text";
      input.placeholder = f.ph || (f.chips ? "выбери ниже или впиши своё" : "");
      input.value = drafts[type][f.id] || "";
      input.addEventListener("input", function () { drafts[type][f.id] = input.value; changed(); });
      wrap.appendChild(label); wrap.appendChild(input);
      if (f.chips) {
        var chips = document.createElement("div"); chips.className = "chips";
        f.chips.forEach(function (c) {
          var b = document.createElement("button"); b.type = "button"; b.className = "chip";
          b.textContent = c[lang === "en" ? 1 : 0];
          b.addEventListener("click", function () { input.value = b.textContent; drafts[type][f.id] = input.value; changed(); });
          chips.appendChild(b);
        });
        wrap.appendChild(chips);
      }
      box.appendChild(wrap);
    });
  }
  function changed() { isExample = false; store.set("kadr.prompt.drafts", drafts); renderResult(); }

  function seg(id, value, onPick) {
    $(id).querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === value));
      b.addEventListener("click", function () {
        $(id).querySelectorAll("button").forEach(function (o) { o.setAttribute("aria-pressed", String(o === b)); });
        onPick(b.dataset.v);
      });
    });
  }
  seg("type", type, function (v) { type = v; store.set("kadr.prompt.type", v); renderFields(); renderResult(); });
  seg("lang", lang, function (v) { lang = v; store.set("kadr.prompt.lang", v); renderFields(); renderResult(); });

  function say(msg) { $("say").textContent = msg; }
  function copyText(text, done) {
    var ok = function () { say(done); };
    var fallback = function () {
      var r = document.createRange(); r.selectNodeContents($("out"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      say("Не получилось скопировать сам. Текст выделен — нажми Ctrl+C.");
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
  }
  $("copy").addEventListener("click", function () { copyText(build(), "Скопировано."); });
  $("clear").addEventListener("click", function () { drafts[type] = {}; changed(); renderFields(); say("Поля очищены."); });
  $("example").addEventListener("click", function () { drafts[type] = Object.assign({}, TYPES[type].example); store.set("kadr.prompt.drafts", drafts); isExample = true; renderFields(); renderResult(); say("Подставлен пример."); });
  $("save").addEventListener("click", function () {
    saved.unshift({ kind: TYPES[type].label, text: build(), at: Date.now() });
    store.set("kadr.prompt.saved", saved); renderSaved(); say("Сохранено ниже, в этом браузере.");
  });

  function renderSaved() {
    var box = $("saved"); box.textContent = "";
    if (!saved.length) {
      var e = document.createElement("div"); e.className = "empty-box";
      e.textContent = "Пока пусто. Собери промпт и нажми «Сохранить» — он появится здесь.";
      box.appendChild(e); return;
    }
    saved.forEach(function (item, i) {
      var a = document.createElement("article");
      var k = document.createElement("span"); k.className = "kind"; k.style.margin = "0";
      k.textContent = item.kind + " · " + new Date(item.at).toLocaleDateString("ru-RU");
      var p = document.createElement("p"); p.textContent = item.text;
      var row = document.createElement("div"); row.className = "row";
      var c = document.createElement("button"); c.type = "button"; c.className = "link"; c.textContent = "Скопировать";
      c.addEventListener("click", function () {
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(item.text).then(function () { c.textContent = "Скопировано"; }, function () { c.textContent = "Выдели текст вручную"; });
        else c.textContent = "Выдели текст вручную";
      });
      var d = document.createElement("button"); d.type = "button"; d.className = "link danger"; d.textContent = "Удалить";
      d.addEventListener("click", function () {
        if (d.dataset.sure) { saved.splice(i, 1); store.set("kadr.prompt.saved", saved); renderSaved(); }
        else { d.dataset.sure = "1"; d.textContent = "Точно удалить?"; }
      });
      row.appendChild(c); row.appendChild(d); a.appendChild(k); a.appendChild(p); a.appendChild(row); box.appendChild(a);
    });
  }

  renderFields(); renderResult(); renderSaved();
})();
