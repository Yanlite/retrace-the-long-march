# 重走长征路

以现实行走推动虚拟长征的交互地图。支持GPS计程、倍率调整、路线演示、历史事件与情境互动。

## 本地运行

需要 Node.js 22.13 或更新版本。

```sh
npm ci
npm run dev
```

访问终端显示的项目地址。

## 构建与部署

```sh
npm test
npm run check
npm run build
```

静态产物位于 out。GitHub Pages 通过仓库的 Actions 工作流发布；资源前缀配置在 vite.pages.config.ts 中。

## 数据与史料

历史参考链接位于 lib/history.mjs 与 lib/timeline.mjs。底图使用 Esri、OpenStreetMap/CARTO；河道参考 Natural Earth。赤水河为明确标记的视频参照示意河段。

路线与事件位置为学习体验示意，不作为精确历史测绘。GPS数据只用于浏览器内计程，累计进度保存在当前浏览器；手机定位需要HTTPS、位置权限并保持页面前台打开。
