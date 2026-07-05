# 暑假成长积分银行 v3.0

> 用可视化的方式，拆解孩子的成长目标，让每一天都有看得见的进步。

---

## 功能一览

| 模块 | 功能 |
|------|------|
| **📅 日历 + 成长地图** | 7-8月完整月历，五大维度成长全景图 |
| **✅ 任务打卡** | 40+条任务，5个维度：学习力、运动力、自控力、探索力、实践力 |
| **🔊 语音朗读** | 完成打卡后自动朗读随机鼓励话（Web Speech API，中文女声） |
| **🎆 打卡反馈** | 随机鼓励话 + 烟花特效 + 语音朗读三位一体 |
| **📌 补卡系统** | 过去日期补卡：每月4次（前2次免费，第3次扣10分，第4次扣20分），积分计入总分 |
| **🌸 奖励兑换** | 4档奖励（10/30/60/100分），家长可自定义奖励内容 |
| **👦 宝贝个性化** | 名字、性别、5套配色主题（樱花粉/海洋蓝/森林绿/阳光橙/星夜紫） |
| **📚 成长作品** | 拍照、录视频、录音，关联打卡任务存入档案 |
| **📊 积分趋势图** | 本月每日积分趋势柱状图 |
| **📝 每周复盘** | 复盘最佳、困难、计划、家长话、需要支持 |
| **👨‍💼 家长中心** | 家长密码验证、任务管理、多孩子切换、数据备份与恢复 |
| **💾 PWA 支持** | 纯前端离线可用，localStorage + IndexedDB 持久化 |

---

## 技术栈

- **纯 HTML + CSS + JavaScript** — 无框架依赖，单文件 `bundle.js` 打包
- **PWA 应用** — `manifest.json` + `sw.js` Service Worker 缓存，支持离线使用
- **数据存储** — localStorage（结构化数据）+ IndexedDB（图片/视频/音频）
- **语音合成** — Web Speech API (`SpeechSynthesis`)
- **兼容协议** — `file://` 和 `http://` 均支持

---

## 体验地址

- **GitHub Pages**: https://ljctown-11.github.io/growth-bank/
- **Gitee Pages**: https://ljctown.gitee.io/growth-bank/

---

## 本地开发

```bash
cd I:\summer-growth-bank
npm install   # 安装依赖
```

直接用浏览器打开 `index.html` 即可，也可通过本地静态服务器启动：

```bash
npx serve .
```

访问 `http://localhost:3000` 查看。

### 重新打包

```bash
node bundle.js
```

将 `core/` 和 `features/` 下的所有 ES Module 文件合并为单文件 `bundle.js`。

---

## 目录结构

```
summer-growth-bank/
├── index.html          # 主页面入口
├── bundle.js           # 打包后的单文件（兼容 file://）
├── manifest.json       # PWA 清单文件
├── sw.js               # Service Worker 缓存策略
├── icon-512.png        # PWA 图标
├── core/               # 核心模块
│   ├── helpers.js      # 常量 + 公共工具（含 getTodayStr）
│   ├── state.js        # 全局状态管理（单源真相）
│   └── data.js         # 数据加载/保存/计算
└── features/           # 功能模块
    ├── render.js       # 所有渲染函数 + 打卡逻辑 + 语音朗读
    ├── makeup.js       # 补卡规则（动态日期判断）
    ├── media.js        # IndexedDB 媒体存储
    ├── password.js     # 密码验证（SHA-256 哈希 + PIN 键盘）
    └── parent-center.js # 家长中心（多孩子/备份/任务管理）
```

---

## 版本记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v3.0.5 | 2026-07-05 | 修复 6 个 Bug + 新增语音朗读鼓励话功能 |
| v3.0 | — | 模块化重构，ES Module 多文件架构 |
| v2.0 | — | PWA 支持 + 语音朗读 + 补卡系统 |
| v1.0 | — | 初版发布 |

---

## 开源协议

MIT License

---

> 创意来源：[杰西卡·魔女库伊拉（微信公众号）](https://mp.weixin.qq.com/s/rgny628l633XrJeZokrcZg)