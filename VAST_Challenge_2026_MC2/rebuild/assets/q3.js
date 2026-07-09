/* q3.js — baseline vs anomaly, prior occurrences, single intervention */
(async () => {
  const d = await MC2.load();
  const { add, showTip, hideTip, name } = MC2;
  const inc = d.incidents;

  /* steps */
  const steps = [["A 基线对比", "正常 vs 异常", "p-base"],
    ["B 先例对比", "第三次不是第一次", "p-prior"],
    ["C 单点干预", "SaidIt 边界", "p-fix"]];
  document.getElementById("steps").innerHTML = steps.map(([t, dd, id], i) =>
    `<button data-id="${id}"><span class="idx">${i + 1}</span><span><span class="t">${t}</span>
     <span class="d">${dd}</span></span></button>`).join("");
  document.querySelectorAll("#steps button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#steps button").forEach(x => x.classList.remove("active"));
    b.classList.add("active");
    document.getElementById(b.dataset.id).scrollIntoView({ behavior: "smooth", block: "start" });
  }));

  /* A. baseline small-multiples */
  const bl = d.saidit_baseline, ck = d.saidit_check, vir = d.virus;
  function ratioBar(title, parts, note) {
    const total = parts.reduce((s, p) => s + p[1], 0);
    let acc = 0;
    const seg = parts.map(([lab, v, col]) => {
      const w = (v / total) * 100; const s = `<div style="width:${w}%;background:${col};
        height:100%;min-width:${v ? 3 : 0}px" title="${lab}: ${v}"></div>`; acc += w; return s;
    }).join("");
    return `<div class="card">
      <h3>${title}</h3>
      <div style="display:flex;height:30px;border-radius:6px;overflow:hidden;border:1px solid var(--border)">${seg}</div>
      <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;font-size:12px">
        ${parts.map(([lab, v, col]) => `<span class="pill"><span class="dot" style="background:${col}"></span>${lab} · <b style="color:var(--text)">${v.toLocaleString()}</b></span>`).join("")}
      </div>
      <div class="note" style="margin-top:10px">${note}</div></div>`;
  }
  document.getElementById("baseline").innerHTML =
    `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:14px">
      ${ratioBar("① 谁在发帖", [["人 person", bl.by_person, "#3fb950"], ["Agent", bl.by_agent, "#e5484d"]],
        `108 条 saidit_post，只有 <b style="color:var(--anom)">${bl.by_agent}</b> 条由 Agent 发起——全是异常帖。`)}
      ${ratioBar("② post_check 的去向", [["检查后未发帖(转发)", ck.checks_not_posting, "#e3b341"], ["检查后真的发帖", ck.checks_leading_to_post, "#e5484d"]],
        `全系统 ${ck.total_checks} 次 saidit_post_check，只有 <b style="color:var(--anom)">${ck.checks_leading_to_post}</b> 次真的发帖，且全部是 John Agent。发帖是极罕见终点。`)}
      ${ratioBar("③ content_source 使用", [["普通 content 主题", bl.with_content_topic, "#3fb950"], ["content_source 文件", bl.with_content_source, "#e5484d"]],
        `<b style="color:var(--anom)">${bl.with_content_source}</b> 条使用文件源，即三条异常帖。此字段是天然异常探针。`)}
    </div>
    <div class="note" style="margin-top:14px"><b>关于 Virus 噪声（澄清）：</b>数据里另有
      <b>${vir.count.toLocaleString()}</b> 条 <code>virus:true</code> 事件（<code>task=virus</code>+随机农业文件），
      但它们与 codename 文件、SaidIt <b>零交集</b>（touch=${vir.touch_codename_files}/${vir.touch_saidit}），
      且窗口（${vir.window_local[0].slice(5, 16)}→${vir.window_local[1].slice(5, 16)}）只与 1/3 帖重叠。
      属独立背景噪声，<b>不作为“协同烟幕”的证据</b>。</div>`;

  /* B. timeline of 3 incidents */
  (() => {
    const svg = document.getElementById("timeline");
    svg.innerHTML = "";
    const order = ["HiddenOrca", "MellowOtter", "SwiftWren"];
    const posts = order.map(c => ({ c, t: inc[c].post.when, first: inc[c].first_hop_when,
      hops: inc[c].hop_count, col: c === "SwiftWren" ? "#e5484d" : c === "MellowOtter" ? "#a371f7" : "#58a6ff" }));
    const toTs = s => Date.parse(s.replace(" ", "T") + "Z");
    const allT = posts.flatMap(p => [toTs(p.first), toTs(p.t)]);
    const min = Math.min(...allT), max = Math.max(...allT);
    const W = Math.max(760, Math.floor(svg.parentElement.clientWidth || 1160));
    svg.setAttribute("viewBox", `0 0 ${W} 230`);
    const ml = 40, mr = 90, y0 = 60, rowH = 46;
    const x = t => ml + ((t - min) / (max - min)) * (W - ml - mr);
    // axis days
    add(svg, "line", { x1: ml, y1: y0 - 26, x2: W - mr, y2: y0 - 26, stroke: "#22303f" });
    for (let day = 9; day <= 17; day++) {
      const t = Date.parse(`2046-05-${String(day).padStart(2, "0")}T00:00:00Z`);
      if (t < min || t > max) continue;
      add(svg, "line", { x1: x(t), y1: y0 - 30, x2: x(t), y2: y0 + rowH * 3, stroke: "#151d28" });
      add(svg, "text", { x: x(t), y: y0 - 34, "text-anchor": "middle", "font-size": 10.5, fill: "#63748a" }, `05-${day}`);
    }
    posts.forEach((p, i) => {
      const y = y0 + i * rowH;
      // propagation span bar
      add(svg, "rect", { x: x(toTs(p.first)), y: y - 6, width: Math.max(2, x(toTs(p.t)) - x(toTs(p.first))),
        height: 12, rx: 6, fill: p.col, opacity: .25 });
      // post marker
      const c = add(svg, "circle", { cx: x(toTs(p.t)), cy: y, r: 7, fill: p.col, stroke: "#0a0e13", "stroke-width": 2 });
      c.addEventListener("mousemove", e => showTip(
        `<div class="tt-h">${p.c} 发帖</div><div class="tt-r">${p.t}</div>
         <div class="tt-r">${p.hops} hops · origin ${name(inc[p.c].origin)}</div>`, e));
      c.addEventListener("mouseleave", hideTip);
      add(svg, "circle", { cx: x(toTs(p.first)), cy: y, r: 3.5, fill: p.col });
      // place label left of marker if marker is in the right 25% (avoid clipping)
      const mx = x(toTs(p.t));
      const rightSide = mx > ml + 0.72 * (W - ml - mr);
      add(svg, "text", { x: rightSide ? mx - 12 : mx + 12, y: y + 4, "font-size": 12.5,
        "font-weight": 700, fill: p.col, "text-anchor": rightSide ? "end" : "start" },
        `${p.c} · ${p.hops} hops`);
    });
    add(svg, "text", { x: ml, y: y0 + rowH * 3 + 6, "font-size": 11.5, fill: "#63748a" },
      "○ 起始跳 → ● 发帖时刻；条带长度 = 传播时长。规模递增：39 → 10 → 186 跳。");
  })();

  /* prior table */
  const cols = ["HiddenOrca", "MellowOtter", "SwiftWren"];
  const rowsData = [
    ["发帖时间 (本地 UTC-7)", c => inc[c].post.when],
    ["内容源", c => `${c}.txt`],
    ["源头", c => name(inc[c].origin)],
    ["传播跳数", c => inc[c].hop_count],
    ["涉及 Agent", c => inc[c].distinct_agent_count],
    ["涉及部门", c => inc[c].departments_touched.length],
    ["到达 John 次数", c => inc[c].john_arrival_count],
    ["源文档可见", c => inc[c].source_doc ? "✓" : "✗（窗口外）"],
    ["发帖终端", () => "John Agent"],
    ["清理行为", () => "delete 指令+原文"],
  ];
  document.getElementById("priortable").innerHTML = `<table class="grid">
    <tr><th>指标</th>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
    ${rowsData.map(([lab, fn]) => `<tr><td>${lab}</td>${cols.map(c =>
      `<td class="num">${fn(c)}</td>`).join("")}</tr>`).join("")}
  </table>
  <div class="note" style="margin-top:12px"><b>共同机制（三者一致）：</b>
  <code>instruction relay → John Agent → content_source post → cleanup</code>。
  三次成功、源头各异、跨越一周 → 漏洞是<b>结构性</b>的，必然可复发。</div>`;

  /* C. gate + alternatives */
  document.getElementById("gate").innerHTML = `
  <div class="flow">
    <div class="fbox agent"><div class="k">Agent 发起</div><div class="v">saidit_post 请求</div>
      <div class="s">Agent/person:*</div></div>
    <div class="farrow">→</div>
    <div class="fbox" style="border-color:var(--warn)"><div class="k">★ 干预点：SaidIt 边界</div>
      <div class="v">details 含 content_source？</div>
      <div class="s">是 → 阻断 / 转人工审批 / 高优告警</div></div>
    <div class="farrow">→</div>
    <div class="fbox post"><div class="k">否则</div><div class="v">正常发帖放行</div>
      <div class="s">105 条人工 content 帖不受影响</div></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:16px">
    <div class="stat anom"><div class="n">3/3</div><div class="l">覆盖已知异常帖</div></div>
    <div class="stat ok"><div class="n">0</div><div class="l">对 105 条正常帖的误报</div></div>
    <div class="stat info"><div class="n">1</div><div class="l">改动点（题面：最多一处）</div></div>
    <div class="stat warn"><div class="n">边界</div><div class="l">最靠近“外部危害”发生处</div></div>
  </div>`;

  const alts = [
    ["★ SaidIt 边界 content_source 门控", "全部 3 帖必经此动作；字段只在异常帖出现", "对 105 条正常帖零误报；最小改动", "recommended"],
    ["阻断所有 queue_subordinate_task", "能断 relay", "误伤 17,038 条正常子任务（含 1,450 access_email）", "bad"],
    ["检测 *_further_instructions.md", "针对 relay 载荷", "改文件名即可绕过；签名式易失效", "bad"],
    ["只禁 John 的发帖权", "覆盖当前 3 帖", "可改道其他有发帖权的 Agent；脆弱", "bad"],
    ["禁止发帖后 delete_file", "有利取证", "内容已外发，无法阻止泄露本身", "weak"],
  ];
  document.getElementById("alts").innerHTML = `<table class="grid">
    <tr><th>候选干预点</th><th>覆盖</th><th>代价 / 问题</th><th>判定</th></tr>
    ${alts.map(([a, cov, cost, v]) => `<tr>
      <td style="${v === 'recommended' ? 'color:var(--ok);font-weight:700' : ''}">${a}</td>
      <td>${cov}</td><td>${cost}</td>
      <td>${v === 'recommended' ? '<span class="badge obs">推荐</span>'
        : v === 'weak' ? '<span class="badge inf">仅取证</span>'
        : '<span class="badge" style="color:var(--anom);border-color:rgba(229,72,77,.4)">排除</span>'}</td>
    </tr>`).join("")}
  </table>
  <div class="note" style="margin-top:12px">推荐点锚定在<b>不可逆的公开发布动作</b>上，而非可删可改的内部文件或庞大的正常通信，
    因此覆盖最全、误伤最小、最难绕过。</div>`;
})();
