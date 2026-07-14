# 成长树 V2 改造计划（可独立执行 Brief）

> 本文档是「暑假积分银行 PWA · 成长树」功能的 **V2 增量改造方案**，自包含、可执行。
> 适用场景：换电脑后，把本文件直接发给 AI 说「执行成长树 V2 改造，按 `docs/growth-tree-v2-plan.md`」，
> 或自己照着改。执行前请先 Read 下列文件中标注的当前实现，确认与本文档一致（代码可能已演进）。

---

## 0. 如何使用本文档

- **背景**：V1 已交付并通过独立 QA 两轮验证（215 测试全绿）。参考文档：`docs/prd-growth-tree.md`、`docs/architecture-growth-tree.md`、`docs/growth-tree-class.mermaid`、`docs/growth-tree-sequence.mermaid`。
- **本次性质**：增量改造（非新项目），修改现有 `features/tree-garden/` 与少量核心/页面文件。
- **执行建议（快速模式）**：
  1. 主理人 `TeamCreate('software-gtree-v2')`
  2. 派 `software-engineer` 一次性改完（见第 6 节），做全局一致性审查 `IS_PASS`
  3. 派 `software-qa-engineer` 独立回归 + 补核心用例（见第 8 节验收清单）
- **预计改动文件**（≤10 个源文件）：`core/state.js`、`features/tree-garden/water.js`、`features/tree-garden/inventory.js`、`features/tree-garden/page.js`、`features/tree-garden/seed-shop.js`、`features/tree-garden/tree-svg.js`、`features/tree-garden/index.js`、`features/render.js`、`index.html`。

---

## 1. 用户反馈的 7 个问题（已逐条确认）

| # | 问题 | 用户原话要点 |
|---|------|------------|
| ① | **打卡的水要自己浇** | 打卡后不应自动进树，要用户手动「浇水」享受乐趣和树的动态；选浇哪棵 |
| ② | **每棵树独立成长** | 种了 2 棵树，想浇哪棵给哪棵；树到哪个状态独立，不能 2 棵树共用一个成长状态 |
| ③ | **连浇天数 ≠ 连续打卡天数** | 今天刚种就显示「连浇 5 天」，错误；连浇应基于实际浇水，不是全局打卡 |
| ④ | **买种子没扣总分** | 第一次买种子也没扣总分，第二次及以后更没扣 |
| ⑤ | **取消再打卡重复计水** | 取消以前打卡的任务再打上，积分变水（不该产生水）；老任务取消/重打只应动积分 |
| ⑥ | **蝴蝶运动范围太小** | 小蜜蜂（蝴蝶）活动范围太小 |
| ⑦ | **树的形态太简单** | 树长得像几何拼接，需要更丰富的层次与物种差异 |

---

## 2. 已锁定的 4 个决策（用户明确答复）

| # | 决策 |
|---|------|
| D1 | **待浇水池不设上限**（攒着慢慢浇） |
| D2 | **当天**打卡任务取消时，**收回对应待浇水**（精确扣回待浇水池；若已浇到树上则不倒回） |
| D3 | 浇水操作粒度：**点一次「浇水 +1」**，想多浇多点几次（选树后该树 +1） |
| D4 | 只给**当天**打卡任务产生水；**非当天**（过去日期补卡/重打）只动积分、**不产生水** |

---

## 3. 根因分析（现状代码定位，执行前请 Read 复核）

### 3.1 水自动进全局共享池 → 问题①②③
- `features/tree-garden/page.js:165-171`：`onTaskChecked(taskId, date)` 直接调 `grantEffortWater(taskId, date)` + `grantStreakWater()`，水直接进 `gt.totalWater`（全局共享）。
- `features/tree-garden/page.js:88`：`const streak = getStreak();` 把**全局连续打卡天数**当成「连浇天数」显示在统计条。
- `core/state.js:13-22`：`growthTree.totalWater` 是全局共享字段，两棵树永远同步进度。
- `core/state.js:20`：`activeTrees` 元素仅 `{id, species, grade, plantedSeason}`，**没有每棵独立的 `water` / 进度**。

### 3.2 买种子不扣总分 → 问题④
- `features/tree-garden/seed-shop.js:18-29`：`buySeed()` 逻辑本身正确（余额不足返回 false；`STATE.redemptions.unshift({cost, ...})`；`addInventoryItem` 进背包）。调用方 `openSeedShop`（line 56-83）在密码确认回调里 `buySeed` 成功后 `saveData()`（line 69）。
- **但用户报告第一次也没扣总分** → 疑似下列环节之一（需工程师先复现再修，不要猜）：
  1. child 模式下 `STATE.redemptions` 写入后，`saveData()` 未正确持久化到该 child 的快照（切换孩子时被 `hydrateStateFrom` 旧快照覆盖）。请 Read `core/data.js` 的 `saveData` 与 `features/render.js` 切换孩子的 hydrate 链路确认。
  2. 首页总分显示未刷新（但 `toggleTask` 有 `saveData` + `renderScore` 同步，概率低）。
  3. `calcTotalScore` 的 `redemptions` 扣减循环在 child 快照恢复后被旧值覆盖。
- **修复方向**：确保 `buySeed` 的 `redemptions` 改动随 `saveData()` 写回当前 child 快照；必要时在 `toggleChild`/hydrate 后验证 `redemptions` 唯一来源。先写最小复现（买种前后 `calcTotalScore` 与 `localStorage` 对比），再对症修。

### 3.3 取消/重打卡重复计水 → 问题⑤
- `features/render.js:557`：`onTaskChecked(tid, STATE.selDate)` 传入 `STATE.selDate`（可能是过去日期）。
- `features/tree-garden/page.js:165`：`onTaskChecked` **没有判断 `date` 是否是今天**，直接 `grantEffortWater(taskId, date)` → 看哪天勾、哪天就产水。
- `features/render.js:567-586`：取消勾选分支只处理补卡扣分回退，**没有调用任何「收回待浇水」逻辑**（V2 需新增）。

### 3.4 蝴蝶范围 → 问题⑥
- `index.html` 中 `butterfly-dance` 关键帧位移仅约 `±10px / ±8px`（约 line 965-971 一带），范围太小。

### 3.5 树形态 → 问题⑦
- `features/tree-garden/tree-svg.js`：`renderTreeStage(species, grade, stageIdx)` 当前为较基础的分层几何（树干 + 树冠块），物种差异与层次不足。

---

## 4. 目标数据模型（改 `core/state.js` 的 `freshState()`）

把共享的 `totalWater` / `seasonSeq` **下沉到每棵树**，并新增待浇水池与浇水连浇字段：

```js
growthTree: {
  firstPlantDate: null,   // 种下首棵当天；此前历史不计入浇水连浇
  pendingWater: 0,        // 🆕 待浇水池（不设上限，D1）；三源水先进这里
  lastDailyWaterDate: '', // 每日浇水礼去重（按真实日，全局 1/天）
  effortGranted: {},      // {'YYYY-MM-DD:taskId':true} 当天努力水去重
  claimedMilestones: [],  // [3,7,14,21,28,35,…] 坚持水已领（按浇水连浇计）
  waterStreakDays: 0,     // 🆕 连续浇水天数（实际浇水，非打卡，③）
  lastWaterStreakDate: '',// 🆕 上次浇水日期（用于连浇计算）
  activeTrees: [          // 每棵完全独立
    // { id, species, grade, plantedSeason, water:0, lastWaterDate:'', streakDays:0 }
  ],
  inventory: [],          // InventoryItem[] {id, species, grade:5|10, state:'seed'|'fruit'}
}
// 删除：totalWater（共享）、seasonSeq（改为每棵自带 plantedSeason）
```

**三源水新流向**（统一先进池）：
- 每日浇水礼 +1 → `pendingWater`
- 努力水（仅当天打卡）→ `pendingWater`
- 坚持水里程碑（基于浇水连浇）→ `pendingWater`
- 浇水动作（用户手动）：选树 → `tree.water += 1`；`pendingWater -= 1`；该树 `streakDays`、全局 `waterStreakDays`/`lastWaterStreakDate` 更新

**连浇天数规则（③）**：
- 全局 `waterStreakDays` 基于**实际浇水**：每次 `pourWater` 至少倒出 1 滴即推进——`lastWaterStreakDate == 昨天` → +1；`== 今天` → 不变；断档 → 重置为 1。`lastWaterStreakDate = 今天`。
- 统计条「🔥 连浇 N 天」显示 `gt.waterStreakDays`，**不再使用 `getStreak()`**。

---

## 5. 各问题具体改法（按文件，执行前先 Read 复核当前实现）

### ⑥ 蝴蝶运动范围 — `index.html`
- 找到 `butterfly-dance`（及左右两只蝴蝶各自的位移关键帧），将水平位移 `±10px` 扩大到 `±28~32px`，竖直飘浮加 `±10~14px`，时长略增（如 `3.2s`），让蝴蝶在树周围更大范围飞舞。

### ⑦ 树形态丰富 — `features/tree-garden/tree-svg.js`
- 重写 `renderTreeStage(species, grade, stageIdx)`，增强层次：
  - 多图层树叶（深浅渐变）、树干纹理/年轮感；
  - 四物种明确差异：松树（尖顶分层枝）、苹果树（圆冠 + 小果点）、樱花（飘瓣 + 粉冠）、橙子树（宽冠 + 橙点）；
  - 各阶段（seed→发芽→长叶→开花→繁茂）视觉递进明显；
  - 繁茂态加果实点缀（呼应收获）。

### ①④ 浇水引擎 — `features/tree-garden/water.js`
- `grantDailyWater(today)`：保留去重（`lastDailyWaterDate`）+ `pendingWater += 1`（原 `totalWater += 1` 改为进池）。
- `grantEffortWater(taskId, date)`：仅当 `date === getTodayStr()` 时 `effortGranted['today:taskId'] = true` 去重 + `pendingWater += 1`（非今天直接 return 0，落实 D4）。
- 新增 `revokeEffortWater(taskId, date)`（D2）：仅当 `date === 今天` 且 `effortGranted` 有该 key → `pendingWater = Math.max(0, pendingWater - 1)` 并删除该 key；已浇到树上的部分不回收。
- `grantStreakWater(streak?)`：参数改用 `gt.waterStreakDays`（默认 `getWaterStreak()`），里程碑判定与发放逻辑不变，发放进 `pendingWater`（原进 `totalWater`）。
- 新增 `getWaterStreak()`：从 `gt.lastWaterStreakDate` 起算实际浇水连续天数（替代 `getStreakSincePlant` 的打卡口径）。
- 新增 `pourWater(treeId)`：校验树存在 → `tree.water += 1`；`pendingWater -= 1`；更新该树 `streakDays` 与全局 `waterStreakDays`/`lastWaterStreakDate`（见第 4 节规则）；返回是否成功（pendingWater 不足或树不存在返回 false）。

### ② 每棵树独立 + 进度/收获 — `features/tree-garden/page.js` + `inventory.js`
- `page.js`：
  - `renderProgress` / `renderTreeCard` / `renderStage`：进度条、阶段、连浇改为**按单棵 `tree.water`** 计算（`scoreToTreeStage(tree.water, tree.grade)`），每棵树一张独立卡片与进度；
  - 统计条「💧 水」显示 `gt.pendingWater`（待浇水池），「🔥 连浇」显示 `gt.waterStreakDays`；
  - 底部「💧 浇水 +1」按钮：点击 → 若仅 1 棵树直接浇；若 ≥2 棵树弹轻量选择器选目标树 → 调 `pourWater(treeId)` → 触发动画 + 家长语音 + 重渲染。
- `inventory.js`：
  - `plantSeed` / `plantFruitAsSeed`：新树对象带 `water:0, lastWaterDate:'', streakDays:0`；
  - `harvestTree`：**单棵**判断（某棵 `tree.water` 达繁茂阈值才收那棵），收获后该棵重置（从 0 重新累计，不继承）。
- `index.js`：导出新增的 `pourWater`、`revokeEffortWater`、`getWaterStreak` 等（按实际命名）。

### ⑤ 打卡产水仅限当天 + 取消收回 — `features/render.js` + `page.js`
- `features/tree-garden/page.js`：
  - `onTaskChecked(taskId, date)`：**仅当 `date === getTodayStr()`** 才 `grantEffortWater` + `grantStreakWater` + `saveData`；非今天直接 return（落实 D4）。
  - 新增 `onTaskUnchecked(taskId, date)`：**仅当 `date === 今天`** 调 `revokeEffortWater(taskId, date)` + `saveData`（落实 D2）。
- `features/render.js`：
  - 取消勾选成功分支（约 line 567-586）追加：`try { onTaskUnchecked(tid, STATE.selDate); } catch(e){}`（放在 `saveData()` 之后，仅今天生效）。
  - `onTaskChecked` 调用保持不变（line 557），由 page.js 内部做"仅今天"判断。

### ④ 买种子扣总分 — `features/tree-garden/seed-shop.js` + `core/data.js`（先复现）
- 工程师先写最小复现：在当前 child 下买种前后对比 `calcTotalScore()` 与 `localStorage` 中该 child 快照的 `redemptions` 长度。
- 若确认是 child 快照未持久化：在 `saveData()` 写入路径确保 `redemptions` 随快照落盘；或在 `buySeed` 成功后显式写回 child 数据。修复后复测「买种后首页总分立即 -cost、刷新/切孩子后仍保留」。

---

## 6. 工程师执行顺序建议（依赖关系）

1. `core/state.js`：改 `freshState`（删除 `totalWater`/`seasonSeq`，新增 `pendingWater`/`waterStreakDays`/`lastWaterStreakDate`，每棵树带 `water/lastWaterDate/streakDays`）。
2. `features/tree-garden/water.js`：三源水进池 + 新增 `pourWater`/`revokeEffortWater`/`getWaterStreak` + `grantStreakWater` 改用浇水连浇。
3. `features/tree-garden/inventory.js`：新树带独立字段 + 单棵收获。
4. `features/tree-garden/page.js`：单棵渲染 + 浇水选树 + `onTaskChecked` 仅今天 + `onTaskUnchecked`。
5. `features/tree-garden/index.js`：导出新增函数。
6. `features/render.js`：取消分支接 `onTaskUnchecked`。
7. `features/tree-garden/seed-shop.js` + `core/data.js`：复现并修买种扣分（第 4 节 3.2）。
8. `features/tree-garden/tree-svg.js`：树形态（⑦）。
9. `index.html`：蝴蝶范围（⑥）。
10. 全局一致性审查 `IS_PASS`，跑 `node ./node_modules/vitest/vitest.mjs run` 全绿。

---

## 7. 工作流与角色分工（SOP 快速模式）

```
TeamCreate('software-gtree-v2')
  → software-engineer  ：按第 6 节一次性改完 7 问题 + 全局一致性审查 IS_PASS
  → software-qa-engineer：独立回归 + 补核心用例（见第 8 节）+ 智能路由判定
```
- 主理人（齐活林）只编排，不代写代码/测试。
- 团队创建只能由主理人执行（`TeamCreate`）。
- 若 QA 发现源码 Bug → 打回 `software-engineer` 修复；测试代码 Bug → QA 自修；全过 → 报告。

---

## 8. 验收清单（QA / 手动）

**核心逻辑（必须全绿）**
- [ ] 打卡（当天）→ 待浇水池 +1；非当天打卡 → 不产生水（D4）
- [ ] 当天取消打卡 → 待浇水池 -1（D2）；已浇到树上的不倒回
- [ ] 点「浇水 +1」选树 → 该树 `water +1`、水池 -1、连浇 +1；想多浇多点几次
- [ ] 两棵树进度/阶段完全独立（各算各的 `tree.water`）
- [ ] 连浇天数 = 实际浇水连续天数，今天刚种显示「连浇 1 天」（③），与全局打卡天数无关
- [ ] 买种子 → 总分立即 -cost，且切孩子/刷新后仍保留（④）
- [ ] 坚持水里程碑基于浇水连浇发放，进待浇水池

**视觉（手动）**
- [ ] 蝴蝶在树周围更大范围飞舞（⑥）
- [ ] 树形态层次丰富、四物种有差异（⑦）

**回归**
- [ ] `node ./node_modules/vitest/vitest.mjs run` 全量通过，无回归
- [ ] 既有 `tests/tree-garden.test.js`、`tests/tree-garden-qa.test.js` 中涉及 `totalWater` 的旧断言需随模型变更同步（改为 `pendingWater` / `tree.water`）

---

## 9. 已知风险 / 待明确

- **R1（买种扣分根因未定）**：第 3.2 节列出 3 个疑似点，需工程师先复现再修，禁止无依据改动。
- **R2（旧测试断言）**：`tests/tree-garden.test.js`、`tests/tree-garden-qa.test.js` 中凡断言 `gt.totalWater` 的，需随模型下沉改为 `gt.pendingWater` 或 `tree.water`，否则会失败。
- **R3（连浇口径）**：本文档采用「全局浇水连浇」口径；若希望每棵树独立计连浇，把 `waterStreakDays` 下沉到每棵 `streakDays` 即可（逻辑等价，仅展示对象不同）。

---

_生成日期：2026-07-10 · 由主理人齐活林（Qi）整理，供换电脑后独立执行。_
