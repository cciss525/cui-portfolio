# 崔洪玮个人介绍网页

这是一个纯静态个人介绍网页，用于展示数字孪生、3D 可视化、工业模型处理和前端可视化开发能力。

## 文件说明

- `index.html`：页面结构与内容
- `styles.css`：页面样式与响应式布局
- `app.js`：首屏动效、项目筛选、滚动进度和导航高亮等交互
- `dashboard.bundle.js`：数字孪生可视化 Demo，包含 Three.js 工厂场景、ECharts 图表和模拟实时数据
- `dashboard.js`：未打包的 Demo 源码，便于阅读和后续改造
- `assets/portrait.png`：个人证件照
- `assets/resume.pdf`：可下载 PDF 简历

## 使用方式

直接双击 `index.html` 即可在浏览器打开。也可以把整个文件夹部署到 GitHub Pages、Gitee Pages 或任意静态服务器。

如果需要本地预览服务：

```bash
node server.cjs
```

## 数字孪生 Demo

Demo 区域使用简约几何体搭建工厂级 + 产线级场景，周边图表使用模拟数据实时刷新。后续替换真实模型时，可以在 `dashboard.js` 中把 `createFactoryScene` 内的几何体改为 GLB/GLTF 加载逻辑。

真实数据接入预留在 `dashboard.js` 的 `updateFromRealtimeSource` 函数中，可替换为 WebSocket、MQTT 网关、REST API 或其他数据源。

## 修改联系方式

当前邮箱为 `799324756@qq.com`。如需修改，打开 `index.html` 搜索邮箱地址并替换。

## 保密说明

页面内容已经按求职展示场景做了脱敏处理，不包含真实客户资料、公司系统界面、源代码、真实数据或项目内部资料。
