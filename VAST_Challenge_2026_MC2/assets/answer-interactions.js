(function () {
  const steps = window.ANSWER_STEPS || [];
  if (!steps.length) return;

  const list = document.querySelector("[data-step-list]");
  const copy = document.querySelector("[data-step-copy]");
  const prev = document.querySelector("[data-step-prev]");
  const next = document.querySelector("[data-step-next]");
  const svg = document.querySelector(".board svg");
  let current = 0;

  function clearSpotlights() {
    document.querySelectorAll(".spotlight-ring").forEach(el => el.remove());
  }

  function boxFor(elements) {
    const boxes = elements.map(el => el.getBBox()).filter(Boolean);
    if (!boxes.length) return null;
    const minX = Math.min(...boxes.map(b => b.x));
    const minY = Math.min(...boxes.map(b => b.y));
    const maxX = Math.max(...boxes.map(b => b.x + b.width));
    const maxY = Math.max(...boxes.map(b => b.y + b.height));
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  function addSpotlight(elements) {
    if (!svg) return;
    const box = boxFor(elements);
    if (!box) return;
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    ring.setAttribute("class", "spotlight-ring");
    ring.setAttribute("x", String(box.x - 14));
    ring.setAttribute("y", String(box.y - 14));
    ring.setAttribute("width", String(box.width + 28));
    ring.setAttribute("height", String(box.height + 28));
    ring.setAttribute("rx", "12");
    svg.appendChild(ring);
  }

  function renderList() {
    if (!list) return;
    list.innerHTML = steps.map((step, index) => `
      <button type="button" data-step-index="${index}">
        <span class="step-num">${index + 1}</span>
        <span>${step.title}</span>
      </button>
    `).join("");
    list.querySelectorAll("[data-step-index]").forEach(btn => {
      btn.addEventListener("click", () => setStep(Number(btn.dataset.stepIndex)));
    });
  }

  function setStep(index) {
    current = (index + steps.length) % steps.length;
    const step = steps[current];
    document.querySelectorAll("[data-step]").forEach(el => {
      el.classList.add("dimmed");
      el.classList.remove("highlighted");
    });
    const selected = step.targets.flatMap(target =>
      Array.from(document.querySelectorAll(`[data-step~="${target}"]`))
    );
    selected.forEach(el => {
      el.classList.remove("dimmed");
      el.classList.add("highlighted");
    });
    clearSpotlights();
    addSpotlight(selected);
    if (copy) copy.innerHTML = `<b>${step.title}</b>${step.copy}`;
    if (list) {
      list.querySelectorAll("button").forEach((btn, i) => {
        btn.classList.toggle("active", i === current);
      });
    }
  }

  prev && prev.addEventListener("click", () => setStep(current - 1));
  next && next.addEventListener("click", () => setStep(current + 1));
  document.addEventListener("keydown", ev => {
    if (ev.key === "ArrowRight") setStep(current + 1);
    if (ev.key === "ArrowLeft") setStep(current - 1);
  });

  renderList();
  setStep(0);
})();
