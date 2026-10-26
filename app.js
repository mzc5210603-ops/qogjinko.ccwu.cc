/* ═══ 暗房 · 图像工坊 —— 逻辑层 ═══ */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

window.addEventListener("error", (e) => { $("#errSink").textContent += "ERR:" + e.message + ";"; });

/* 状态轨时钟 */
function tick() {
  const n = new Date();
  $("#stClock").textContent = [n.getHours(), n.getMinutes(), n.getSeconds()].map((x) => String(x).padStart(2, "0")).join(":");
}
tick(); setInterval(tick, 1000);
const say = (m) => { $("#stMsg").textContent = m; };

/* ═══ 底片条切换 ═══ */
$("#stripTabs").addEventListener("click", (e) => {
  const li = e.target.closest("li");
  if (!li) return;
  $$("#stripTabs li").forEach((x) => x.classList.toggle("on", x === li));
  $$(".view").forEach((v) => (v.hidden = v.id !== "v-" + li.dataset.t));
});

/* ═══ 通用：文件区（点击 + 拖放） ═══ */
function fileZone(zoneId, inputId, cb) {
  const z = $("#" + zoneId), inp = $("#" + inputId);
  z.addEventListener("click", () => inp.click());
  inp.addEventListener("change", () => { if (inp.files[0]) cb(inp.files[0]); });
  ["dragover", "dragenter"].forEach((ev) => z.addEventListener(ev, (e) => { e.preventDefault(); z.classList.add("hot"); }));
  ["dragleave", "drop"].forEach((ev) => z.addEventListener(ev, (e) => { e.preventDefault(); z.classList.remove("hot"); }));
  z.addEventListener("drop", (e) => {
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) cb(f);
  });
}
function loadImg(file, cb) {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => cb(img, file);
  img.onerror = () => say("这片子读不出来 —— 换一张");
  img.src = url;
}
function fmtKB(b) { return b > 1048576 ? (b / 1048576).toFixed(2) + " MB" : (b / 1024).toFixed(1) + " KB"; }

/* ═══ 01 尺寸调整 ═══ */
const rz = { img: null, ratio: 1 };
fileZone("rzDrop", "rzFile", (f) => {
  loadImg(f, (img) => {
    rz.img = img;
    rz.ratio = img.naturalHeight / img.naturalWidth;
    const c = $("#rzCanvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    $("#rzW").value = img.naturalWidth;
    $("#rzH").value = img.naturalHeight;
    $("#rzPct").value = 100; $("#rzPctV").textContent = "100%";
    $("#rzInfo").textContent = "原片 " + img.naturalWidth + "×" + img.naturalHeight + " · " + fmtKB(f.size);
    say("底片已上盘：" + f.name);
  });
});
$("#rzPct").addEventListener("input", () => {
  if (!rz.img) return;
  const p = +$("#rzPct").value;
  $("#rzPctV").textContent = p + "%";
  $("#rzW").value = Math.max(1, Math.round(rz.img.naturalWidth * p / 100));
  $("#rzH").value = Math.max(1, Math.round(rz.img.naturalHeight * p / 100));
});
$("#rzW").addEventListener("input", () => {
  if (!rz.img || !$("#rzLock").checked) return;
  $("#rzH").value = Math.max(1, Math.round(+$("#rzW").value * rz.ratio));
});
$("#rzH").addEventListener("input", () => {
  if (!rz.img || !$("#rzLock").checked) return;
  $("#rzW").value = Math.max(1, Math.round(+$("#rzH").value / rz.ratio));
});
$("#rzApply").addEventListener("click", () => {
  if (!rz.img) { say("先放入底片"); return; }
  const w = Math.max(1, +$("#rzW").value || 1), h = Math.max(1, +$("#rzH").value || 1);
  const c = $("#rzCanvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(rz.img, 0, 0, w, h);
  $("#rzInfo").textContent = "显影 " + w + "×" + h + "（原 " + rz.img.naturalWidth + "×" + rz.img.naturalHeight + "）";
  say("缩放显影完成");
});
$("#rzSave").addEventListener("click", () => {
  dl($("#rzCanvas").toDataURL("image/png"), "darkroom-resize.png");
});

function dl(url, name) {
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  say("成片已出暗房：" + name);
}

/* ═══ 02 格式与压缩 ═══ */
const fm = { img: null, file: null };
fileZone("fmDrop", "fmFile", (f) => {
  fm.file = f;
  loadImg(f, (img) => {
    fm.img = img;
    const c = $("#fmCanvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    $("#fmInfo").textContent = "原片 " + fmtKB(f.size) + "（" + (f.type.split("/")[1] || "?").toUpperCase() + "）";
    say("底片已上盘：" + f.name);
  });
});
$("#fmQ").addEventListener("input", () => { $("#fmQV").textContent = $("#fmQ").value; });
$("#fmGo").addEventListener("click", () => {
  if (!fm.img) { say("先放入底片"); return; }
  const type = $("#fmType").value, q = +$("#fmQ").value / 100;
  const c = $("#fmCanvas");
  const tmp = document.createElement("canvas");
  tmp.width = c.width; tmp.height = c.height;
  const tctx = tmp.getContext("2d");
  if (type === "image/jpeg") { tctx.fillStyle = "#fff"; tctx.fillRect(0, 0, tmp.width, tmp.height); }
  tctx.drawImage(c, 0, 0);
  tmp.toBlob((blob) => {
    if (!blob) { say("浏览器不支持此格式"); return; }
    fm.blob = blob;
    const pct = ((1 - blob.size / fm.file.size) * 100).toFixed(1);
    $("#fmInfo").textContent = "原 " + fmtKB(fm.file.size) + " → 新 " + fmtKB(blob.size) +
      "（省 " + (pct > 0 ? pct : 0) + "%）· " + (type.split("/")[1]).toUpperCase() + " q" + $("#fmQ").value;
    say("转制完成");
  }, type, q);
});
$("#fmSave").addEventListener("click", () => {
  if (fm.blob) dl(URL.createObjectURL(fm.blob), "darkroom." + $("#fmType").value.split("/")[1]);
  else say("先点「转制底片」");
});

/* ═══ 03 滤镜 ═══ */
const ft = { img: null };
function ftRender() {
  if (!ft.img) return;
  const c = $("#ftCanvas");
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.filter = ($("#ftPreset").value + " brightness(" + $("#ftB").value + "%) contrast(" + $("#ftC").value + "%)")
    .replace(/^(?: )+/, "").trim() || "none";
  ctx.drawImage(ft.img, 0, 0, c.width, c.height);
  ctx.filter = "none";
  say("药水显影中 · " + ($("#ftPreset").selectedOptions[0].text));
}
fileZone("ftDrop", "ftFile", (f) => {
  loadImg(f, (img) => {
    ft.img = img;
    const c = $("#ftCanvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    ftRender();
    $("#ftInfo").textContent = "原片 " + img.naturalWidth + "×" + img.naturalHeight;
    say("底片已上盘：" + f.name);
  });
});
["#ftPreset", "#ftB", "#ftC"].forEach((id) => $(id).addEventListener("input", ftRender));
$("#ftSave").addEventListener("click", () => {
  if (!ft.img) { say("先放入底片"); return; }
  dl($("#ftCanvas").toDataURL("image/png"), "darkroom-filter.png");
});

/* ═══ 04 吸管取色 ═══ */
const pk = { img: null, cur: "#000000" };
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) {
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  const l = (mx + mn) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}
fileZone("pkDrop", "pkFile", (f) => {
  loadImg(f, (img) => {
    pk.img = img;
    const c = $("#pkCanvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    say("底片已上盘 —— 点击画布取色");
  });
});
$("#pkCanvas").addEventListener("click", (e) => {
  if (!pk.img) { say("先放入底片"); return; }
  const c = $("#pkCanvas");
  const r = c.getBoundingClientRect();
  const x = Math.round((e.clientX - r.left) / r.width * c.width);
  const y = Math.round((e.clientY - r.top) / r.height * c.height);
  const d = c.getContext("2d").getImageData(x, y, 1, 1).data;
  const hex = "#" + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
  pk.cur = hex;
  $("#pkSw").style.background = hex;
  const [h, s, l] = rgb2hsl(d[0], d[1], d[2]);
  $("#pkVal").innerHTML = "HEX <b style='color:#fff'>" + hex + "</b>　RGB " + d[0] + "," + d[1] + "," + d[2] +
    "　HSL " + h + "," + s + "%," + l + "%";
  say("取色 " + hex);
});
$("#pkAdd").addEventListener("click", () => {
  const li = document.createElement("li");
  li.innerHTML = "<i style='background:" + pk.cur + "'></i><b>" + pk.cur + "</b>";
  li.title = "点击复制 " + pk.cur;
  li.addEventListener("click", () => { copy(pk.cur); say("已复制 " + pk.cur); });
  $("#pkList").prepend(li);
  say("已收入色板 " + pk.cur);
});
$("#pkClear").addEventListener("click", () => { $("#pkList").innerHTML = ""; say("色板已清空"); });

function copy(text) {
  const ta = document.createElement("textarea");
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); } catch {}
  ta.remove();
}

/* ═══ 05 Base64 ═══ */
fileZone("b6Drop", "b6File", (f) => {
  const rd = new FileReader();
  rd.onload = () => {
    $("#b6Out").value = rd.result;
    $("#b6Info").textContent = fmtKB(f.size) + " → " + fmtKB(rd.result.length) + " 文本字符";
    say("Base64 显影完成");
  };
  rd.readAsDataURL(f);
});
$("#b6Copy").addEventListener("click", () => { copy($("#b6Out").value); say("已复制全文"); });
$("#b6Show").addEventListener("click", () => {
  const v = $("#b6In").value.trim();
  if (!v) { say("先粘贴 Base64 串"); return; }
  const img = $("#b6Img");
  img.onerror = () => say("这串显不出影 —— 检查格式");
  img.onload = () => say("显影成功 " + img.naturalWidth + "×" + img.naturalHeight);
  img.src = v.startsWith("data:") ? v : "data:image/png;base64," + v.replace(/\s/g, "");
});
