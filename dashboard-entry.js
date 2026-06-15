import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as echarts from "echarts";

const canvas = document.querySelector("#factoryTwinCanvas");
const dashboard = document.querySelector(".dashboard-shell");
const DATA_REFRESH_MS = 2600;
const HISTORY_POINTS = 8;

window.__dashboardBooted = {
  loaded: true,
  hasCanvas: !!canvas,
  hasDashboard: !!dashboard,
  hasEchartsInit: typeof echarts.init === "function",
};

try {
  if (canvas && dashboard) {
    initDashboard();
    window.__dashboardBooted.initialized = true;
  }
} catch (error) {
  window.__dashboardBooted.error = {
    name: error.name,
    message: error.message,
    stack: String(error.stack).slice(0, 800),
  };
  throw error;
}

function initDashboard() {
  const devices = [
    { id: "cnc-a", name: "CNC 加工中心 A", type: "机加工", color: 0x0071e3, x: -5.4, z: -1.8 },
    { id: "cnc-b", name: "CNC 加工中心 B", type: "机加工", color: 0x0071e3, x: -3.4, z: -1.8 },
    { id: "injector", name: "注塑单元", type: "成型", color: 0x35d08f, x: -1.1, z: -1.8 },
    { id: "diecast", name: "压铸单元", type: "成型", color: 0xf0b84f, x: 1.3, z: -1.8 },
    { id: "assembly", name: "装配工位 A", type: "装配", color: 0x9fcbff, x: 3.5, z: -1.8 },
    { id: "pack", name: "PACK 检测工位", type: "检测", color: 0x9b7bff, x: 5.5, z: -1.8 },
  ];

  const charts = createCharts();
  const sceneState = createFactoryScene(canvas, devices);
  let selectedIndex = 4;
  let history = createHistory();

  // Reserved integration point:
  // Replace this simulated updater with WebSocket / MQTT / REST data later.
  // Example payload shape: { deviceId, status, output, oee, alarms, cycleTime, energy, load }
  function updateFromRealtimeSource() {
    const selected = devices[selectedIndex];
    const snapshot = createMockSnapshot(devices, selected, history);
    history = snapshot.history;
    updateHeader();
    updateDeviceInfo(selected, snapshot);
    updateCharts(charts, snapshot);
    sceneState.updateDeviceStates(snapshot.deviceStates, selected.id);
    window.__dashboardBooted.selectedDeviceId = selected.id;
    window.__dashboardBooted.selectedDeviceName = selected.name;
    window.__dashboardBooted.latestHistory = snapshot.history;
    selectedIndex = (selectedIndex + 1) % devices.length;
  }

  updateFromRealtimeSource();
  window.setInterval(updateFromRealtimeSource, DATA_REFRESH_MS);
  window.addEventListener("resize", () => {
    sceneState.resize();
    Object.values(charts).forEach((chart) => chart.resize());
  });
}

function createCharts() {
  return {
    status: echarts.init(document.querySelector("#statusChart")),
    output: echarts.init(document.querySelector("#outputChart")),
    alarm: echarts.init(document.querySelector("#alarmChart")),
    cycle: echarts.init(document.querySelector("#cycleChart")),
    energy: echarts.init(document.querySelector("#energyChart")),
  };
}

function createFactoryScene(canvas, devices) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x070b11, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(7, 7.5, 8.4);
  camera.lookAt(0, 0, 0);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.42, -0.3);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableRotate = true;
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.zoomSpeed = 0.9;
  controls.panSpeed = 0.75;
  controls.rotateSpeed = 0.72;
  controls.screenSpacePanning = true;
  controls.minDistance = 4.6;
  controls.maxDistance = 17;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN,
  };
  controls.update();
  canvas.style.cursor = "grab";

  scene.add(new THREE.AmbientLight(0xffffff, 0.82));

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
  keyLight.position.set(5, 8, 4);
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0x0071e3, 1.9, 18);
  fillLight.position.set(-5, 4, 3);
  scene.add(fillLight);

  const root = new THREE.Group();
  root.rotation.y = -0.45;
  scene.add(root);

  const selectable = [];

  createFactoryShell(root);
  createProductionLine(root);
  createDevices(root, devices, selectable);
  createDataLinks(root);

  function resize() {
    const rect = canvas.getBoundingClientRect();
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / Math.max(rect.height, 1);
    camera.updateProjectionMatrix();
  }

  function animate(time) {
    root.position.y = Math.sin(time * 0.0008) * 0.035;
    selectable.forEach((mesh, index) => {
      const stateLight = mesh.userData.statusLight;
      if (stateLight) {
        stateLight.material.opacity = 0.52 + Math.sin(time * 0.003 + index) * 0.18;
      }
    });
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  canvas.addEventListener("contextmenu", (event) => event.preventDefault());
  resize();
  animate(0);

  return {
    resize,
    updateDeviceStates(deviceStates, selectedId) {
      selectable.forEach((mesh) => {
        const device = mesh.userData.device;
        const state = deviceStates[device.id];
        const selected = device.id === selectedId;
        mesh.material.color.setHex(state.color);
        mesh.material.emissive.setHex(selected ? state.color : 0x000000);
        mesh.material.emissiveIntensity = selected ? 0.22 : 0.02;
        mesh.scale.y = selected ? 1.18 : 1;
        mesh.userData.statusLight.material.color.setHex(state.color);
      });
    },
  };
}

function createFactoryShell(root) {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a2230, roughness: 0.72, metalness: 0.18 });
  const floor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 6), floorMat);
  floor.position.y = -0.08;
  root.add(floor);

  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x243044,
    roughness: 0.8,
    transparent: true,
    opacity: 0.28,
  });
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 2.2, 0.1), wallMat);
  backWall.position.set(0, 1.02, -3);
  root.add(backWall);

  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 6), wallMat);
  leftWall.position.set(-7, 1.02, 0);
  root.add(leftWall);

  const grid = new THREE.GridHelper(14, 14, 0x9fcbff, 0x223043);
  grid.position.y = 0.02;
  root.add(grid);
}

function createProductionLine(root) {
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x111821, roughness: 0.62, metalness: 0.34 });
  const belt = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.16, 0.72), beltMat);
  belt.position.set(0, 0.22, 0.55);
  root.add(belt);

  const railMat = new THREE.MeshStandardMaterial({ color: 0x53657d, roughness: 0.48, metalness: 0.5 });
  [-0.48, 0.48].forEach((z) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.08, 0.06), railMat);
    rail.position.set(0, 0.38, 0.55 + z);
    root.add(rail);
  });

  const productMat = new THREE.MeshStandardMaterial({
    color: 0x0071e3,
    emissive: 0x003366,
    emissiveIntensity: 0.22,
  });
  for (let i = 0; i < 8; i += 1) {
    const product = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.36), productMat);
    product.position.set(-5.4 + i * 1.55, 0.55, 0.55);
    root.add(product);
  }
}

function createDevices(root, devices, selectable) {
  devices.forEach((device) => {
    const group = new THREE.Group();
    group.position.set(device.x, 0, device.z);

    const mat = new THREE.MeshStandardMaterial({
      color: device.color,
      roughness: 0.46,
      metalness: 0.24,
      emissive: 0x000000,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.05, 1), mat);
    body.position.y = 0.62;
    body.userData.device = device;
    selectable.push(body);

    const top = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.14, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22 })
    );
    top.position.y = 1.22;

    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 18, 18),
      new THREE.MeshBasicMaterial({ color: device.color, transparent: true, opacity: 0.72 })
    );
    light.position.set(0.48, 1.26, 0.34);
    body.userData.statusLight = light;

    group.add(body, top, light);
    root.add(group);
  });
}

function createDataLinks(root) {
  const material = new THREE.LineBasicMaterial({ color: 0x9fcbff, transparent: true, opacity: 0.26 });
  for (let x = -6; x <= 6; x += 1.5) {
    const points = [new THREE.Vector3(x, 1.42, -1.2), new THREE.Vector3(x, 1.42, 0.55)];
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }
}

function createHistory() {
  const now = Date.now();
  return {
    time: Array.from({ length: HISTORY_POINTS }, (_, index) => {
      return formatTrendTime(new Date(now - (HISTORY_POINTS - index - 1) * DATA_REFRESH_MS));
    }),
    output: Array.from({ length: HISTORY_POINTS }, () => randomInt(70, 110)),
    energy: Array.from({ length: HISTORY_POINTS }, () => randomInt(52, 88)),
    load: Array.from({ length: HISTORY_POINTS }, () => randomInt(58, 92)),
  };
}

function createMockSnapshot(devices, selected, history) {
  const stateColors = {
    running: 0x35d08f,
    idle: 0xf0b84f,
    alarm: 0xff5c7c,
  };

  const states = devices.reduce((acc, device, index) => {
    const roll = Math.random() + index * 0.02;
    const status = roll > 0.9 ? "alarm" : roll > 0.74 ? "idle" : "running";
    acc[device.id] = {
      status,
      color: stateColors[status],
      output: randomInt(64, 122),
      cycle: randomFloat(8.5, 17.8),
      load: randomInt(56, 96),
      energy: randomInt(42, 95),
    };
    return acc;
  }, {});

  const selectedState = states[selected.id];
  const nextHistory = {
    time: [...history.time.slice(1), formatTrendTime()],
    output: [...history.output.slice(1), selectedState.output],
    energy: [...history.energy.slice(1), selectedState.energy],
    load: [...history.load.slice(1), selectedState.load],
  };

  return {
    selected,
    selectedState,
    deviceStates: states,
    statusCounts: countStatuses(states),
    oee: randomInt(78, 93),
    availability: randomInt(86, 96),
    quality: randomInt(94, 99),
    alarms: randomInt(2, 12),
    cycleData: devices.map((device) => ({
      name: device.name.replace(/ .*/, ""),
      value: states[device.id].cycle,
    })),
    history: nextHistory,
  };
}

function countStatuses(states) {
  return Object.values(states).reduce(
    (acc, state) => {
      acc[state.status] += 1;
      return acc;
    },
    { running: 0, idle: 0, alarm: 0 }
  );
}

function updateHeader() {
  const target = document.querySelector("#dashboardTime");
  if (target) {
    target.textContent = new Date().toLocaleString("zh-CN", { hour12: false });
  }
}

function updateDeviceInfo(selected, snapshot) {
  const info = document.querySelector("#deviceInfo");
  const stateLabel = { running: "运行中", idle: "待机", alarm: "报警" }[snapshot.selectedState.status];
  info.innerHTML = `
    <span>当前设备</span>
    <strong>${selected.name}</strong>
    <p>${selected.type} · ${stateLabel} · 负载 ${snapshot.selectedState.load}% · 节拍 ${snapshot.selectedState.cycle.toFixed(1)} 秒 / 件</p>
  `;
}

function updateCharts(charts, snapshot) {
  document.querySelector("#statusTotal").textContent = `${Object.values(snapshot.statusCounts).reduce((a, b) => a + b, 0)} 台`;
  document.querySelector("#alarmTotal").textContent = `${snapshot.alarms} 条`;
  document.querySelector("#oeeValue").textContent = `${snapshot.oee}%`;
  document.querySelector("#availabilityValue").textContent = `${snapshot.availability}%`;
  document.querySelector("#qualityValue").textContent = `${snapshot.quality}%`;
  document.querySelector("#oeeBar").style.width = `${snapshot.oee}%`;

  charts.status.setOption({
    tooltip: { trigger: "item" },
    legend: {
      orient: "vertical",
      right: 4,
      top: "middle",
      itemWidth: 9,
      itemHeight: 9,
      itemGap: 8,
      icon: "circle",
      textStyle: { color: "rgba(255,255,255,0.68)", fontSize: 11, width: 44, overflow: "truncate" },
      data: ["运行", "待机", "报警"],
    },
    series: [
      {
        type: "pie",
        radius: ["34%", "55%"],
        center: ["39%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: snapshot.statusCounts.running, name: "运行", itemStyle: { color: "#35d08f" } },
          { value: snapshot.statusCounts.idle, name: "待机", itemStyle: { color: "#f0b84f" } },
          { value: snapshot.statusCounts.alarm, name: "报警", itemStyle: { color: "#ff5c7c" } },
        ],
      },
    ],
  });

  charts.output.setOption(lineOption(snapshot.history.time, snapshot.history.output, "#9fcbff", "产量"));
  charts.alarm.setOption(barOption(["机械", "电气", "节拍", "质量"], [randomInt(1, 6), randomInt(1, 7), randomInt(0, 5), randomInt(0, 4)], "#ff5c7c"));
  charts.cycle.setOption(
    barOption(
      snapshot.cycleData.map((item) => item.name),
      snapshot.cycleData.map((item) => item.value),
      "#35d08f"
    )
  );
  charts.energy.setOption({
    grid: { left: 34, right: 12, top: 24, bottom: 28 },
    xAxis: axis("category", snapshot.history.time),
    yAxis: axis("value"),
    series: [
      { name: "能耗", type: "line", smooth: true, data: snapshot.history.energy, symbol: "none", lineStyle: { color: "#f0b84f", width: 3 } },
      { name: "负载", type: "line", smooth: true, data: snapshot.history.load, symbol: "none", lineStyle: { color: "#0071e3", width: 3 } },
    ],
  });
}

function lineOption(labels, data, color, name) {
  return {
    grid: { left: 34, right: 12, top: 24, bottom: 28 },
    xAxis: axis("category", labels),
    yAxis: axis("value"),
    series: [
      {
        name,
        type: "line",
        smooth: true,
        data,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color, width: 3 },
        itemStyle: { color },
        areaStyle: { color: "rgba(159,203,255,0.12)" },
      },
    ],
  };
}

function barOption(labels, data, color) {
  return {
    grid: { left: 34, right: 12, top: 24, bottom: 28 },
    xAxis: axis("category", labels),
    yAxis: axis("value"),
    series: [{ type: "bar", data, itemStyle: { color, borderRadius: [6, 6, 0, 0] } }],
  };
}

function axis(type, data) {
  return {
    type,
    data,
    splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
    axisLine: { lineStyle: { color: "rgba(255,255,255,0.14)" } },
    axisTick: { show: false },
    axisLabel: { color: "rgba(255,255,255,0.55)", hideOverlap: true },
  };
}

function formatTrendTime(date = new Date()) {
  return date.toLocaleTimeString("zh-CN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
