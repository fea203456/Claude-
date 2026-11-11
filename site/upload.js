/* Загрузки: файлы сохраняются в браузере (IndexedDB) на этом устройстве.
   Сервера нет, поэтому другие люди и другие устройства их не видят. */
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var grid = $("files"), drop = $("drop"), input = $("file-input"), status = $("status");
  var db = null, memory = [], nextId = 1, urls = [];

  function say(msg, bad) { status.textContent = msg; status.classList.toggle("bad", !!bad); }
  function size(n) {
    var u = ["Б", "КБ", "МБ", "ГБ"], i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (i ? n.toFixed(n < 10 ? 1 : 0) : n) + " " + u[i];
  }
  function plural(n) {
    var a = n % 10, b = n % 100;
    return n + " " + (a === 1 && b !== 11 ? "файл" : a >= 2 && a <= 4 && (b < 12 || b > 14) ? "файла" : "файлов");
  }

  function open() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open("kadr-files", 1);
        req.onupgradeneeded = function () { req.result.createObjectStore("files", { keyPath: "id", autoIncrement: true }); };
        req.onsuccess = function () { db = req.result; resolve(); };
        req.onerror = req.onblocked = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }
  function tx(mode, work) {
    return new Promise(function (resolve, reject) {
      var t = db.transaction("files", mode), r = work(t.objectStore("files"));
      t.oncomplete = function () { resolve(r && r.result); };
      t.onerror = t.onabort = function () { reject(t.error); };
    });
  }
  function all() { return db ? tx("readonly", function (s) { return s.getAll(); }) : Promise.resolve(memory.slice()); }
  function put(rec) {
    if (db) return tx("readwrite", function (s) { return s.add(rec); });
    rec.id = nextId++; memory.push(rec); return Promise.resolve();
  }
  function remove(id) {
    if (db) return tx("readwrite", function (s) { return s.delete(id); });
    memory = memory.filter(function (r) { return r.id !== id; }); return Promise.resolve();
  }

  function card(rec) {
    var url = URL.createObjectURL(rec.blob); urls.push(url);
    var el = document.createElement("article"); el.className = "file";
    var thumb = document.createElement("div"); thumb.className = "thumb";
    var t = rec.type || "", node;
    if (t.indexOf("image/") === 0) { node = document.createElement("img"); node.src = url; node.alt = rec.name; node.loading = "lazy"; }
    else if (t.indexOf("video/") === 0) { node = document.createElement("video"); node.src = url; node.controls = true; node.preload = "metadata"; node.playsInline = true; }
    else if (t.indexOf("audio/") === 0) { node = document.createElement("audio"); node.src = url; node.controls = true; }
    else { node = document.createElement("span"); node.className = "ext"; var m = /\.([^.]{1,8})$/.exec(rec.name); node.textContent = m ? m[1] : "файл"; }
    thumb.appendChild(node);
    var meta = document.createElement("div"); meta.className = "file-meta";
    var name = document.createElement("b"); name.textContent = rec.name;
    var info = document.createElement("span"); info.className = "mono";
    info.textContent = size(rec.size) + " · " + new Date(rec.added).toLocaleDateString("ru-RU");
    meta.appendChild(name); meta.appendChild(info);
    var row = document.createElement("div"); row.className = "row";
    var openA = document.createElement("a"); openA.className = "link"; openA.href = url; openA.target = "_blank"; openA.rel = "noopener"; openA.textContent = "Открыть";
    var save = document.createElement("a"); save.className = "link"; save.href = url; save.download = rec.name; save.textContent = "Скачать";
    var del = document.createElement("button"); del.type = "button"; del.className = "link danger"; del.textContent = "Удалить";
    del.addEventListener("click", function () {
      if (!del.dataset.sure) { del.dataset.sure = "1"; del.textContent = "Точно удалить?"; return; }
      remove(rec.id).then(function () { say("Удалён: " + rec.name); return render(); }, function () { say("Не удалось удалить файл. Попробуй ещё раз.", true); });
    });
    row.appendChild(openA); row.appendChild(save); row.appendChild(del);
    el.appendChild(thumb); el.appendChild(meta); el.appendChild(row);
    return el;
  }

  function render() {
    return all().then(function (list) {
      urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
      grid.textContent = "";
      list.sort(function (a, b) { return b.added - a.added; });
      $("count").textContent = String(list.length).padStart(2, "0");
      if (!list.length) {
        var e = document.createElement("div"); e.className = "empty-box"; e.style.gridColumn = "1 / -1";
        e.textContent = "Пока пусто. Первый файл появится здесь.";
        grid.appendChild(e);
      } else list.forEach(function (r) { grid.appendChild(card(r)); });
      usage(list);
    });
  }
  function usage(list) {
    var total = list.reduce(function (s, r) { return s + r.size; }, 0), el = $("usage");
    el.textContent = "Занято: " + size(total);
    if (db && navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then(function (e) { if (e.quota) el.textContent = "Занято: " + size(total) + " · браузер даёт до " + size(e.quota); }, function () {});
    }
  }

  function add(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (f) { return f && f.size >= 0 && f.name; });
    if (!files.length) return;
    say("Сохраняю " + plural(files.length) + "…");
    var failed = [];
    files.reduce(function (chain, f) {
      return chain.then(function () {
        return put({ name: f.name, type: f.type, size: f.size, added: Date.now(), blob: f }).catch(function () { failed.push(f.name); });
      });
    }, Promise.resolve()).then(render).then(function () {
      if (failed.length) say("Не сохранились: " + failed.join(", ") + ". Скорее всего, в браузере не хватило места — удали что-нибудь и попробуй снова.", true);
      else say("Добавлено: " + plural(files.length) + ".");
    });
  }

  input.addEventListener("change", function () { add(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("over"); }); });
  ["dragleave", "drop"].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove("over"); }); });
  drop.addEventListener("drop", function (e) { add(e.dataTransfer && e.dataTransfer.files); });
  window.addEventListener("dragover", function (e) { e.preventDefault(); });
  window.addEventListener("drop", function (e) { e.preventDefault(); });
  document.addEventListener("paste", function (e) { if (e.clipboardData && e.clipboardData.files.length) add(e.clipboardData.files); });

  open().then(function () {
    if (!db) $("where").textContent = "Браузер не дал доступ к хранилищу, поэтому файлы останутся только до закрытия страницы.";
    return render();
  });
})();
