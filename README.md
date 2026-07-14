# 暑假成长积分银行 v3.2.00

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
| **🌳 成长树** | 独立待浇水池三源产水（每日/努力/坚持），5/10 分种分阶段成长，浇水·收获·铲除全流程，蝴蝶在树框内随机飞舞 |
| **💾 PWA 支持** | 纯前端离线可用，localStorage + IndexedDB 持久化 |

---

## 技术栈

- **纯 HTML + CSS + JavaScript** — 无框架依赖，ES Module 多文件架构（入口 `main.js` + `core/` + `features/`）
- **PWA 应用** — `manifest.json` + `sw.js` Service Worker 缓存，支持离线使用
- **数据存储** — localStorage（结构化数据）+ IndexedDB（图片/视频/音频）
- **语音合成** — Web Speech API (`SpeechSynthesis`)
- **运行环境** — 需通过 HTTP 服务器访问；直接用 `file://` 双击打开会因 ES Module 的 CORS 限制导致脚本加载失败

---

## 体验地址

- **GitHub Pages**: https://ljctown-11.github.io/growth-bank/

---

## 本地开发

```bash
cd I:\summer-growth-bank
npm install   # 安装依赖（vitest 等）
```

需通过本地静态服务器启动（**不要用 `file://` 直接双击打开**，ES Module 会因 CORS 限制加载失败）：

```bash
node serve.js        # 推荐：启动后访问 http://localhost:3000
# 或
npx serve .
python -m http.server 8080
```

访问 `http://localhost:3000` 查看。

---

## 目录结构

```
summer-growth-bank/
├── index.html              # 主页面入口（ES Module 加载 main.js）
├── main.js                 # ESM 入口：注册 Service Worker + 启动渲染
├── manifest.json           # PWA 清单
├── sw.js                   # Service Worker 缓存策略（CACHE_NAME 随版本升级）
├── icon-512.png            # PWA 图标
├── serve.js                # 本地静态服务器（node serve.js → localhost:3000）
├── vitest.config.js        # 单元测试配置
├── qa_browser_test.mjs     # 浏览器端 QA 自动化脚本
├── core/                   # 核心模块
│   ├── helpers.js          # 常量 + 公共工具（含 getTodayStr）
│   ├── state.js            # 全局状态管理（单源真相）
│   └── data.js             # 数据加载/保存/计算
├── features/               # 功能模块
│   ├── render.js           # 渲染 + 打卡逻辑 + 语音朗读
│   ├── makeup.js           # 补卡规则
│   ├── media.js            # IndexedDB 媒体存储
│   ├── password.js         # 家长密码（SHA-256 + PIN 键盘）
│   ├── toast-center.js     # 全局 Toast 提示
│   ├── parent-center.js    # 家长中心（多孩子/备份/任务管理）
│   ├── growth-tree.js      # 旧成长树阶段定义（已弃用，迁移至 tree-garden）
│   ├── ideas.js / mood.js / runtime.js / voice-encourage.js / mascot.js
│   └── tree-garden/        # 成长树独立页（water / inventory / tree-canvas / tree-sprite / page / fx / seed-shop / index）
├── assets/                 # 图片资源（含 tree-sprites/ 各物种 stage 0–4 精灵图、浇水壶 PNG）
├── tests/                  # Vitest 单元测试 + QA
├── docs/                   # 架构 / PRD / 时序图（mermaid）
├── scripts/                # 构建/数据 Python 脚本
└── die code/               # 已废弃代码、历史 QA 脚本、预览/验收页（tree-preview.html、start-preview.bat）、generated-images（AI 出图）与无用素材归档，均不参与运行
```

---

## 版本记录

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| v3.2.00 | 2026-07-13 | 成长树蝴蝶随机漫游；临时隐藏「我的成就」徽章墙；版本号机制升级 |
| v3.1.06 | 2026-07-07 | 八点混合增强 + 补卡返还/日历高亮等累积修复 |
| v3.0.5 | 2026-07-05 | 修复 6 个 Bug + 新增语音朗读鼓励话功能 |
| v3.0 | — | 模块化重构，ES Module 多文件架构 |
| v2.0 | — | PWA 支持 + 语音朗读 + 补卡系统 |
| v1.0 | — | 初版发布 |

---

## 开源协议

MIT License

---

> 创意来源：[杰西卡·魔女库伊拉（微信公众号）](https://mp.weixin.qq.com/s/rgny628l633XrJeZokrcZg)
