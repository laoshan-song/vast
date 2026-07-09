/* q2.js — content provenance with observed/inferred/unknown */
(async () => {
  const d = await MC2.load();
  const { name } = MC2;
  const inc = d.incidents;

  const META = {
    SwiftWren: { theme: "CFO 会议纪要", role: "CFO Emma Harbor", strength: "最强", col: "var(--ok)" },
    MellowOtter: { theme: "COO 战略方向文档", role: "COO Noah Mariner", strength: "强", col: "var(--ok)" },
    HiddenOrca: { theme: "未知（源在窗口外）", role: "首个可见转发者 Gabriel Sonar", strength: "弱", col: "var(--warn)" },
  };

  /* sidebar: strength ranking */
  document.getElementById("strength").innerHTML = ["SwiftWren", "MellowOtter", "HiddenOrca"].map((c, i) => {
    const m = META[c], has = inc[c].source_doc;
    return `<button><span class="idx">${i + 1}</span><span>
      <span class="t">${c} · 溯源${m.strength}</span>
      <span class="d">${has ? has.name : "源文档不在数据集"}</span></span></button>`;
  }).join("");

  /* A. provenance rows */
  const rows = ["SwiftWren", "MellowOtter", "HiddenOrca"].map(c => {
    const I = inc[c], m = META[c], src = I.source_doc, cf = I.create_file;
    const cell = (badge, title, sub, dashed) => `
      <div class="fbox" style="${dashed ? "border-style:dashed;opacity:.75" : ""}">
        <div class="k">${badge}</div>
        <div class="v" style="font-size:14px">${title}</div>
        <div class="s">${sub}</div></div>`;
    return `<div style="margin-bottom:18px">
      <div style="font-weight:700;margin-bottom:8px;font-size:15px">${c}
        <span class="badge" style="margin-left:8px">${m.theme}</span></div>
      <div class="flow">
        ${cell(src ? `<span class="tag-obs">① 源文档 · observed</span>` : `<span class="tag-unk">① 源文档 · unknown</span>`,
          src ? src.name : "创建于数据窗口前",
          src ? `read_by ${name(src.read_by)}<br>${src.when} · id ${src.id}` : "无 read/create 记录", !src)}
        <div class="farrow">→</div>
        ${cell(cf ? `<span class="tag-obs">② 打包 · observed</span>` : `<span class="tag-unk">② 打包 · unknown</span>`,
          `${c}.txt`,
          cf ? `${cf.size_hint.toLocaleString()} B · ${cf.word_count || "?"} words<br>by ${name(cf.by)} · ${cf.when}` : "无 create_file",
          !cf)}
        <div class="farrow">→</div>
        ${cell(`<span class="tag-obs">③ 外发 · observed</span>`, `saidit_post`,
          `content_source=${c}.txt<br>by John Agent · ${I.post ? I.post.when : ""} · id ${I.post ? I.post.id : ""}`, false)}
        <div class="farrow">→</div>
        ${cell(`<span class="tag-inf">④ 含义 · inferred</span>`, m.theme,
          `来自 ${m.role}<br>${src ? "职位+源文档名推断主题" : "主题不可还原"}`, false)}
      </div></div>`;
  }).join("");
  document.getElementById("prov").innerHTML = rows +
    `<div class="note"><b>读法：</b>SwiftWren / MellowOtter 有完整 ①→②→③ 可见事件链（绿色），源文档只被读过一次、
     且分别由 CFO / COO 的 Agent 读取，因此“内部机密外泄”是<b>可确认</b>的；只有具体主题是<b>推断</b>。
     HiddenOrca 的 ① 是灰色虚线——源在窗口外，属 <span class="tag-unk">unknown</span>。</div>`;

  /* B. gibberish explanation */
  document.getElementById("gibberish").innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
    <div class="card">
      <h3>为什么是乱码</h3>
      <div style="font-size:13.5px;line-height:1.7">
        源文档是 <code>.doc</code>（Word 二进制）。Agent 读取后<b>约 1 秒内</b>直接写成
        <code>.txt</code>（见 create_file 时间戳），<b>没有格式转换</b>。
        纯文本里保留了二进制/格式残余，于是在阅读器中呈现“乱码”。
        <b>这不是加密，是原始字节直出的副作用。</b>
      </div>
      <div class="note" style="margin-top:10px">含义：攻击目的是<b>把原始内部文件公开</b>，
        而不是写一篇通顺的爆料文——与“系统被诱导执行”而非“人类精心撰稿”一致。</div>
    </div>
    <div class="card">
      <h3>为什么板块“随机”</h3>
      <div style="font-size:13.5px;line-height:1.7">
        三帖都发在 <code>forum=general</code>。发帖动作由 <b>Agent 自动</b>完成，
        套用固定参数（general 论坛 + content_source 文件），并非人工按主题选板块，
        所以从人的视角看板块“毫无规律”。
      </div>
      <div class="note" style="margin-top:10px">题面把它初判为“agent 故障”；数据显示它其实是
        <b>被驱动的自动化行为</b>——机制正常，被利用了。</div>
    </div>
  </div>`;

  /* C. boundary table */
  const B = [
    ["read/create/saidit_post/delete 事件序列", "obs", "", ""],
    ["SwiftWren、MellowOtter 的源文档与打包过程", "obs", "", ""],
    ["三帖均由 John Agent 用 content_source 外发", "obs", "", ""],
    ["payload 由对应源文档派生", "", "inf", ""],
    ["内容主题=财务/运营/战略等公司机密", "", "inf", ""],
    ["HiddenOrca 与另两者同一机制", "", "inf", ""],
    [".txt / .doc 文件逐字正文", "", "", "unk"],
    ["具体泄露了哪些决策、数字", "", "", "unk"],
    ["HiddenOrca 的源文档与创建者", "", "", "unk"],
    ["动机是 whistleblowing 还是恶意破坏", "", "", "unk"],
  ];
  document.getElementById("boundary").innerHTML = `<table class="grid">
    <tr><th>命题</th><th style="text-align:center">observed</th>
      <th style="text-align:center">inferred</th><th style="text-align:center">unknown</th></tr>
    ${B.map(([t, o, i, u]) => `<tr><td>${t}</td>
      <td style="text-align:center">${o ? '<span class="badge obs">✓</span>' : ''}</td>
      <td style="text-align:center">${i ? '<span class="badge inf">✓</span>' : ''}</td>
      <td style="text-align:center">${u ? '<span class="badge unk">✓</span>' : ''}</td></tr>`).join("")}
  </table>`;
})();
