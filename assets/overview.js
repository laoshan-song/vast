/* overview.js — system baseline + official Q map */
(async () => {
  const d = await MC2.load();
  const { add, showTip, hideTip } = MC2;

  /* ---- key stats ---- */
  const ks = [
    ["3", "文件源异常帖 content_source", "anom"],
    ["105", "正常人工 SaidIt 帖", "ok"],
    ["71→3", "post_check 中真正发帖", "warn"],
    ["235", "read_file 型 relay 跳（=39+10+186）", "info"],
    ["18", "SwiftWren 链涉及 Agent", "purple"],
    ["5", "SwiftWren 到达 John 次数", "anom"],
  ];
  document.getElementById("keystats").innerHTML = ks.map(([n, l, c]) =>
    `<div class="stat ${c}"><div class="n">${n}</div><div class="l">${l}</div></div>`).join("");

  /* ---- official Q map ---- */
  const inc = d.incidents;
  document.getElementById("qmap").innerHTML = `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
    <div class="card" style="border-top:3px solid var(--info)">
      <h2>Q1 · 如何产生</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:.2em 0 10px">people + system interactions</p>
      <div style="font-size:13.5px;line-height:1.6">
        内部文档 → <code>&lt;code&gt;.txt</code> payload → <code>queue_subordinate_task</code> 盲转发
        → John Agent → <code>saidit_post(content_source)</code> → <code>delete×2</code>。
        SwiftWren 走了 <b>${inc.SwiftWren.hop_count} 跳 / ${inc.SwiftWren.distinct_agent_count} 人</b>。
      </div>
      <a class="pill" href="q1.html" style="margin-top:12px">看链路 + 系统图 →</a>
    </div>
    <div class="card" style="border-top:3px solid var(--ok)">
      <h2>Q2 · 帖子含义</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:.2em 0 10px">content provenance, not identity</p>
      <div style="font-size:13.5px;line-height:1.6">
        帖子是<b>内部机密文件被外部化</b>。SwiftWren←CFO <code>meeting_notes.doc</code>；
        MellowOtter←COO <code>strategic_directions.doc</code>；HiddenOrca 源在数据窗口外。
        <span class="badge inf">inferred</span> 主题，<span class="badge unk">unknown</span> 逐字正文。
      </div>
      <a class="pill" href="q2.html" style="margin-top:12px">看来源链 →</a>
    </div>
    <div class="card" style="border-top:3px solid var(--anom)">
      <h2>Q3 · 会否复发</h2>
      <p style="color:var(--muted);font-size:13.5px;margin:.2em 0 10px">prior issues + one intervention</p>
      <div style="font-size:13.5px;line-height:1.6">
        <b>已重复 3 次</b>（HiddenOrca→MellowOtter→SwiftWren），机制相同、规模递增。
        最佳单点干预：在 SaidIt 边界拦截 Agent 发起的 <code>content_source</code> 发帖
        —— <b>3/3</b> 覆盖、<b>0/105</b> 误报。
      </div>
      <a class="pill" href="q3.html" style="margin-top:12px">看基线 + 干预 →</a>
    </div>
  </div>`;

  /* ---- event type bar chart ---- */
  (() => {
    const svg = document.getElementById("typebars");
    const W = 1180, H = 470, ml = 190, mr = 90, mt = 10, mb = 20;
    const ents = Object.entries(d.event_type_counts);
    const max = ents[0][1];
    const bh = (H - mt - mb) / ents.length;
    const x = v => ml + (v / max) * (W - ml - mr);
    const POST = new Set(["saidit_post", "saidit_post_check", "post_saidit", "flex_post", "post_flex"]);
    ents.forEach(([k, v], i) => {
      const y = mt + i * bh;
      const isPost = POST.has(k);
      const isAnom = k === "saidit_post";
      const col = isAnom ? "var(--anom)" : isPost ? "var(--warn)" : "var(--info)";
      add(svg, "text", { x: ml - 10, y: y + bh / 2 + 4, "text-anchor": "end",
        "font-size": 12, fill: isPost ? "#e6edf3" : "#93a1b0", "font-weight": isPost ? 700 : 400 }, k);
      const r = add(svg, "rect", { x: ml, y: y + 2, width: Math.max(1, x(v) - ml), height: bh - 5,
        rx: 3, fill: col, opacity: isPost ? .95 : .55 });
      add(svg, "text", { x: x(v) + 8, y: y + bh / 2 + 4, "font-size": 11.5,
        fill: "#93a1b0", "font-family": "var(--mono)" }, v.toLocaleString());
      r.addEventListener("mousemove", e => showTip(
        `<div class="tt-h">${k}</div><div class="tt-r">${v.toLocaleString()} events${isAnom ? " · 含 3 条异常帖" : ""}</div>`, e));
      r.addEventListener("mouseleave", hideTip);
    });
    // legend
    const lg = add(svg, "g", {});
    [["异常 saidit_post", "var(--anom)"], ["其他发帖/检查", "var(--warn)"], ["常规运营动作", "var(--info)"]]
      .forEach(([t, c], i) => {
        add(lg, "rect", { x: W - mr - 150, y: mt + 6 + i * 20, width: 11, height: 11, rx: 2, fill: c, opacity: .8 });
        add(lg, "text", { x: W - mr - 134, y: mt + 16 + i * 20, "font-size": 11.5, fill: "#93a1b0" }, t);
      });
  })();

  /* ---- signature bars: person vs agent, content vs content_source ---- */
  (() => {
    const svg = document.getElementById("sigbars");
    const b = d.saidit_baseline;
    const W = 1180, mt = 30, gap = 40, colW = 520, ml = 40;
    const rows = [
      { title: "发帖者：谁按下发布", a: ["人 person", b.by_person, "var(--ok)"], z: ["Agent", b.by_agent, "var(--anom)"] },
      { title: "正文来源：主题字符串 vs 文件", a: ["content（主题）", b.with_content_topic, "var(--ok)"], z: ["content_source（文件）", b.with_content_source, "var(--anom)"] },
    ];
    const total = b.total;
    rows.forEach((row, i) => {
      const gy = mt + i * 110;
      add(svg, "text", { x: ml, y: gy, "font-size": 13, "font-weight": 700, fill: "#e6edf3" }, row.title);
      const bx = ml, by = gy + 16, bw = W - ml - 300, bh = 34;
      const wA = (row.a[1] / total) * bw;
      add(svg, "rect", { x: bx, y: by, width: wA, height: bh, rx: 4, fill: row.a[2], opacity: .8 });
      add(svg, "rect", { x: bx + wA, y: by, width: Math.max(3, (row.z[1] / total) * bw), height: bh, rx: 4, fill: row.z[2] });
      add(svg, "text", { x: bx + 10, y: by + bh / 2 + 4, "font-size": 12.5, fill: "#061018", "font-weight": 700 },
        `${row.a[0]} · ${row.a[1]}`);
      add(svg, "text", { x: bx + bw + 14, y: by + bh / 2 + 4, "font-size": 13, fill: row.z[2], "font-weight": 800 },
        `${row.z[0]} · ${row.z[1]}`);
    });
    add(svg, "text", { x: ml, y: mt + 2 * 110 + 6, "font-size": 12, fill: "#63748a" },
      "108 条 saidit_post 中，只有 3 条同时是「Agent 发起」且「content_source 文件」——即三条异常泄露帖。");
  })();
})();
