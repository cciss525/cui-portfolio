const focusData = {
  model: {
    kicker: "当前重点",
    title: "工业三维模型处理",
    body:
      "使用 UG、CAD、SolidWorks、Blender 进行模型整理、精简、材质、渲染与场景处理，服务自动化产线和设备级数字孪生展示。",
    points: ["模型轻量化与结构整理", "材质、渲染、动画与场景搭建", "glTF / GLB 三维交付链路理解"],
  },
  frontend: {
    kicker: "可视化表达",
    title: "Vue 与工业数据看板",
    body:
      "使用 HTML、CSS、JavaScript、Vue 开发工业数据看板和项目展示页面，把设备状态、产线数据和关键指标转化成清晰界面。",
    points: ["工业看板页面设计与实现", "设备状态、报警、产能等数据展示", "面向交付现场的可读性优化"],
  },
  delivery: {
    kicker: "项目落地",
    title: "现场实施与客户沟通",
    body:
      "参与从需求收集、模型处理、现场部署、系统联调到培训售后的完整链路，多次承担现场实施负责人角色。",
    points: ["PLC 信号地址配置与联调支持", "机器人通讯测试和问题排查", "培训文档、使用说明和客户沟通"],
  },
};

const canvas = document.querySelector("#twinCanvas");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let width = 0;
let height = 0;
let frame = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function drawRoundedRect(x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255,255,255,0.055)";
  ctx.lineWidth = 1;
  const grid = 52;
  for (let x = 0; x < width; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function drawLineScene() {
  const baseY = height * 0.58;
  const originX = width * 0.52;
  const unit = Math.max(42, Math.min(width, height) * 0.075);
  const speed = reduceMotion.matches ? 0 : frame * 0.018;

  ctx.save();
  ctx.translate(originX, baseY);
  ctx.transform(1, 0.28, -0.5, 1, 0, 0);

  ctx.fillStyle = "rgba(255,255,255,0.055)";
  drawRoundedRect(-unit * 4.8, -unit * 0.55, unit * 8.8, unit * 1.1, 12);
  ctx.fill();

  ctx.strokeStyle = "rgba(159,203,255,0.42)";
  ctx.lineWidth = 2;
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(i * unit, -unit * 0.52);
    ctx.lineTo(i * unit + unit * 0.5, unit * 0.52);
    ctx.stroke();
  }

  const stations = [
    [-3.4, -1.05, 1.15, 1.15, "#2f8f6a"],
    [-1.1, -1.35, 1.4, 1.45, "#0071e3"],
    [1.35, -1.1, 1.2, 1.2, "#b7791f"],
  ];

  stations.forEach(([x, y, w, h, color], index) => {
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    drawRoundedRect(x * unit, y * unit, w * unit, h * unit, 10);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.85;
    drawRoundedRect((x + 0.18) * unit, (y + 0.16) * unit, w * unit * 0.42, h * unit * 0.16, 5);
    ctx.fill();
    ctx.globalAlpha = 1;

    const pulse = (Math.sin(speed * 2 + index) + 1) / 2;
    ctx.strokeStyle = `rgba(159,203,255,${0.18 + pulse * 0.32})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc((x + w / 2) * unit, (y + h / 2) * unit, unit * (0.78 + pulse * 0.18), 0, Math.PI * 2);
    ctx.stroke();
  });

  for (let i = 0; i < 8; i += 1) {
    const offset = ((speed + i * 0.8) % 6.4) - 3.2;
    ctx.fillStyle = i % 2 === 0 ? "rgba(0,113,227,0.84)" : "rgba(47,143,106,0.84)";
    drawRoundedRect(offset * unit, -unit * 0.15, unit * 0.42, unit * 0.3, 6);
    ctx.fill();
  }

  ctx.restore();
}

function drawLabels() {
  const labels = [
    ["PLC SIGNAL", 0.74, 0.28, "#9fcbff"],
    ["GLB MODEL", 0.68, 0.7, "#76d7ad"],
    ["MQTT DATA", 0.86, 0.5, "#f0c777"],
  ];

  labels.forEach(([text, xRatio, yRatio, color], index) => {
    const x = width * xRatio;
    const y = height * yRatio + Math.sin(frame * 0.02 + index) * 8;
    ctx.fillStyle = "rgba(255,255,255,0.09)";
    drawRoundedRect(x - 54, y - 18, 108, 36, 8);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.font = "700 12px -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  });
}

function renderCanvas() {
  ctx.clearRect(0, 0, width, height);
  drawGrid();
  drawLineScene();
  drawLabels();
  frame += 1;
  requestAnimationFrame(renderCanvas);
}

function setFocus(name) {
  const data = focusData[name];
  const card = document.querySelector("#focusCard");
  if (!data || !card) return;

  document.querySelectorAll(".focus-tab").forEach((button) => {
    const active = button.dataset.focus === name;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  card.innerHTML = `
    <p class="focus-kicker">${data.kicker}</p>
    <h3>${data.title}</h3>
    <p>${data.body}</p>
    <ul>${data.points.map((point) => `<li>${point}</li>`).join("")}</ul>
  `;
}

function filterProjects(filter) {
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === filter);
  });

  document.querySelectorAll(".project-card").forEach((card) => {
    const tags = card.dataset.tags || "";
    card.classList.toggle("is-hidden", filter !== "all" && !tags.includes(filter));
  });
}

function updateScrollProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll <= 0 ? 0 : (window.scrollY / maxScroll) * 100;
  document.querySelector(".scroll-progress").style.width = `${progress}%`;
}

function updateActiveNav() {
  const sections = [...document.querySelectorAll("section[id]")];
  const current = sections
    .filter((section) => section.getBoundingClientRect().top < 180)
    .pop();

  document.querySelectorAll(".site-nav a").forEach((link) => {
    link.classList.toggle("is-active", current && link.getAttribute("href") === `#${current.id}`);
  });
}

function initReveal() {
  const targets = document.querySelectorAll(
    ".section-heading, .outlook-heading, .outlook-stage, .outlook-vision, .dashboard-shell, .focus-layout, .project-card, .skill-card, .life-card, .collaboration-strip, .contact-section"
  );
  targets.forEach((target) => target.classList.add("reveal"));

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14 }
  );

  targets.forEach((target) => observer.observe(target));
}

document.querySelectorAll(".focus-tab").forEach((button) => {
  button.addEventListener("click", () => setFocus(button.dataset.focus));
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => filterProjects(button.dataset.filter));
});

window.addEventListener("resize", resizeCanvas);
window.addEventListener("scroll", () => {
  updateScrollProgress();
  updateActiveNav();
});

resizeCanvas();
renderCanvas();
initReveal();
updateScrollProgress();
updateActiveNav();
