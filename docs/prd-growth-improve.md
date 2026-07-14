# 暑假成长积分银行 · 增量 PRD（简单版）

> 版本：v1.0（增量）｜产品：暑假成长积分银行（纯前端 PWA）｜PM：许清楚
> 范围已锁定：本次只做以下 4 项新功能，**纯本地、无后端、无云同步**，不顺带修既有 Bug。
> 涉及功能编号沿用需求方命名：③ 温柔失败话术 + 心情打卡、⑥ 活动灵感库 + 手绘 SVG 吉祥物、⑤ 家长录音鼓励、② 成长树 MVP + 连续打卡 Streak + 维度徽章。

---

## 0. 落地约束（给架构师的前置条件）

- **技术栈不变**：纯 HTML+CSS+JS，ES Module 多文件，无框架；PWA（manifest+sw.js）；localStorage（结构化 STATE）+ IndexedDB（媒体 blob，复用 `features/media.js` 的 `saveMedia/getMedia/removeMedia`）。
- **多孩子隔离必须保持**：新增字段须随 child 快照持久化。`saveData()` 对当前 child 快照的解构为
  `const { children, childName, childGender, theme, activeChildId, parentPasswordHash, customRewards, ...childData } = STATE;`
  即**除这 6 个元信息字段外，挂在 `STATE` 上的任何顶层字段都会自动进入 child 快照**，随 `summerGrowthBankV2_child_<id>` 隔离。`daily[date]` 整体在 `STATE.daily` 内，天然隔离。
- **关键陷阱（务必处理）**：`hydrateStateFrom(obj)` 只回写 `freshState()` 里的 key。任何**新顶层字段若不加到 `freshState()` 默认值**，切孩子时会丢。→ 见 §5 与 §6。
- **现有 UI 闸门保持**：`toggleTask` 中 `if(!STATE.childName...) { showEncourageMsg("请先设置宝贝信息哦 👆"); return; }` 不动；新增功能在未设宝贝时一律禁用/隐藏。
- **测试底座**：Vitest 单测（QA 由严过关负责）。各功能「可单测点」见 §3 对应条目的「可单测点」与 §7 汇总。
- **交付**：不推送 GitHub/Gitee，仅走 CloudStudio 部署测试。

---

## 1. 产品目标

**一句话目标**：在不打扰孩子的前提下，用更温柔的反馈、更丰富的情感记录与更可见的成长可视化，让"每天打卡一点点"变得更有陪伴感、更想坚持。

**3 条成功指标（可观测）**：
1. **坚持度**：上线后周活跃孩子的「连续打卡天数（Streak）」中位数 ≥ 5 天；断卡后次日回流打卡率（断卡当天 0 打卡、次日 ≥1 打卡）较现状可观测提升。
2. **情感陪伴渗透率**：心情打卡日填写率 ≥ 40%；家长至少录制 1 条鼓励录音的孩子占比 ≥ 30%；孩子打卡成功时家长录音播放占比可统计。
3. **灵感库激活**：灵感库「设为今日任务」周人均触发 ≥ 1 次；成长树进入「开花/结果」阶段的孩子占比随暑假推进可观测上升。

---

## 2. 用户故事（含验收标准）

### 孩子视角
- **US-C1 心情打卡**：作为一个孩子，我每天打卡时能顺手选一个心情（😊😐😢）并写一句小心事，这样我的情绪也被看见。
  - 验收：在打卡视图可见 3 个心情按钮 + 可选文本框；选择后刷新/切日/切孩子再回来，该日心情与文字正确还原；未选则为空、不报错。
- **US-C2 温柔失败**：作为一个孩子，当我取消勾选、或某天没打卡、或断了连续打卡时，看到的不是空白或冷冰冰的提示，而是一句温柔的话（如"今天没关系的，明天我们一起再试一次🌱"）。
  - 验收：三种触发场景均出现温柔文案（非机器鼓励话、非空）；文案随机且不重复骚扰（同一会话同一场景不连续弹同一条）。
- **US-C3 家长的声音**：作为一个孩子，我每次打卡成功，除了机器女声，还能听到爸爸妈妈提前录好的鼓励。
  - 验收：家长已录且有权限时优先播家长录音；无录音/不支持时回退机器女声；播放不阻塞打卡动画（烟花照常）。
- **US-C4 看见成长树**：作为一个孩子，我能看到一棵随总分长大的小树和"🔥 连续 N 天"，让我觉得坚持有形状。
  - 验收：成长树分阶段（种子→发芽→幼苗→开花→结果）随 `calcTotalScore()` 实时变化；Streak 数字与日历/打卡一致；断卡归零。
- **US-C5 灵感与伙伴**：作为一个孩子，我在不知道做什么时能点开"今天可以做什么"，被一个小芽吉祥物陪着选一个活动当今日任务。
  - 验收：灵感库按 5 维度展示；"设为今日任务"后该活动出现在当日任务列表并可勾选得分；"仅参考"不改变任何状态。

### 家长视角
- **US-P1 录音鼓励**：作为一个家长，我能在"设置宝贝信息/家长中心"给当前孩子录 1 条或多条鼓励语音，且只作用于这个孩子。
  - 验收：录音需麦克风授权；拒绝/不支持时有降级提示并回退机器声；多条可播放/删除；切到另一个孩子看不到本条录音。
- **US-P2 情绪周报**：作为一个家长，我在每周复盘/成长报告里能看到孩子这一周的情绪趋势（😊多还是😢多）。
  - 验收：复盘页/报告含情绪趋势区块；数据来自 `daily[date].mood`，按周聚合；无数据日期留空不报错。
- **US-P3 徽章墙**：作为一个家长，我能看到 5 个维度的成就徽章，达成即点亮。
  - 验收：5 维度各 1 枚徽章，达到阈值点亮，未达置灰；阈值可配置（见 §6）。

---

## 3. 需求池（P0 / P1 / P2）

> 每条含：功能点 / 描述 / 验收标准 / 优先级 / 可单测点（Vitest 纯函数）。

### P0（必须做）

#### P0-1 心情打卡数据存储与 UI  【功能 ③】
- **功能点**：`daily[date].mood`（`'happy'|'neutral'|'sad'`）+ `daily[date].moodNote`（string）。
- **描述**：在打卡 Tab（`#mtab-checkin`，`checkinDateLabel` 下方）增加心情选择行：3 个表情按钮 + 1 个可选文本框；选择即写 `getDay(STATE.selDate).mood / moodNote` 并 `saveData()`。复用 `getDay()` 保证 day 对象存在。
- **验收标准**：① 3 表情可点选、可改选、可清空；② 文本框 ≤ 50 字（超出截断/禁用）；③ 写后 `saveData()` 并随 child 快照隔离；④ 未设宝贝时整行禁用。
- **可单测点**：`setMood(date, mood, note)`、`getMood(date)` 纯函数；`validateMoodInput(mood)` 返回合法枚举或 null；越界 note 长度截断。

#### P0-2 温柔失败话术（触发 + 文案层）  【功能 ③】
- **功能点**：新增纯函数 `pickGentleMessage(scenario, ctx)`，文案库 `GENTLE_MESSAGES`（按场景分组：zeroCheckin / uncheck / streakBroken）。
- **描述**：三触发点——
  - (a) **当日 0 打卡**：打开打卡 Tab 且为今天且 `countDayDone(today)===0` 时，在任务列表上方渲染温柔空状态卡（带吉祥物），非阻塞、不重复弹。
  - (b) **勾选后取消**：`toggleTask` 中 `!checked && day.tasks[tid].done` 分支，原无反馈，现追加 `showEncourageMsg(gentleMsg)` 或 toast（温柔向，如"没关系，今天还可以再勾上哦🌱"）。
  - (c) **连续断卡**：`getStreak()` 检测"上次连续打卡止于昨天之前/今天未打卡且昨天 0 打卡"，在打卡 Tab 打开或 App 启动（今天）时轻提示一次。
- **验收标准**：① 三场景均出现温柔文案而非空白/中性；② 文案从库中随机且不连续重复；③ 不破坏既有 `toggleTask` 的勾选/扣分/补卡逻辑；④ 仅本地、无网络。
- **可单测点**：`countDayDone(dateStr)`（遍历 `day.tasks` 统计 `done`）；`getStreak()`（见 P0-5）；`pickGentleMessage('uncheck', {streak})` 返回非空字符串且属于对应分组；随机不重复可用种子化测试。

#### P0-3 活动灵感库（静态数据 + 设为今日任务）  【功能 ⑥】
- **功能点**：静态数组 `IDEA_LIBRARY`（5 维度各 5–8 条），新增 `features/ideas.js`。
- **描述**：打卡 Tab 增加「💡 活动灵感」按钮 → 弹层按维度列出灵感；每条可「设为今日任务」或「仅参考」。
  - **设为今日任务**：在当前 `STATE.selDate` 的 `day.tasks[ideaId] = { done:false, pts:1, cat, title, fromIdea:true }`（`ideaId = 'idea_'+hash`），使其出现在 `renderTasks` 且可勾选得分（**需让 `renderTasks` 合并 `day.tasks` 中 `fromIdea` 项，并让 `toggleTask` 能处理非 `getActiveTasks()` 来源的 tid**，见 §6）。
  - **仅参考**：仅关闭弹层，不改状态。
- **验收标准**：① 5 维度齐全、每维 5–8 条；②「设为今日任务」后该条出现在当日任务且勾选可加分、计入 `calcTotalScore`；③ 跨日不串（只作用于所选 `selDate`）；④ 未设宝贝时按钮禁用。
- **可单测点**：`IDEA_LIBRARY` 结构完整性（5 key、每 key 5–8 条非空）；`addIdeaAsTask(date, idea)` 产出合法 `day.tasks[ideaId]` 且 `fromIdea===true`、`pts` 合法；重复添加幂等（同 id 不重复覆盖已 done）。

#### P0-4 手绘 SVG 吉祥物（视觉规范 + 放置位）  【功能 ⑥】
- **功能点**：新增 `features/mascot.js`，导出 `renderMascot(placement, opts)` 返回内联 SVG 字符串 + 必要 CSS 动画类。
- **描述**：角色"小芽"（详见 §4 吉祥物视觉规范）。固定放置位：① 成长树旁（常驻小向导）② 打卡成功鼓励弹层角落 ③ 空状态（无作品/0 打卡/未设宝贝）④ 鼓励弹层。微动画：摇摆、眨眼、成功时弹跳。
- **验收标准**：① 4 个放置位均出现且不遮挡主操作；② 动画用 CSS keyframes，性能轻量（不引发重排）；③ 配色契合 app 橙粉调性；④ 单文件可独立渲染（无外部依赖）。
- **可单测点**：`renderMascot('tree'|'success'|'empty'|'encourage', {mood})` 返回含 `<svg` 的字符串；不同 `placement` 命中不同 class/微动画；非法 placement 回退默认。

#### P0-5 连续打卡 Streak  【功能 ②】
- **功能点**：纯函数 `getStreak()`（基于 `STATE.daily` 中"有 ≥1 个 done 任务"的日期）。
- **描述**：从今天向前扫描连续有打卡的日期；**今天未打卡时从昨天起算**（避免早晨误显 0），遇首个无打卡日中断归零。顶部 `#topPoints` 旁展示「🔥 连续 N 天」徽标（`#streakBadge`）。
- **验收标准**：① 数字与日历实际打卡一致；② 断卡（中间缺一天）归零；③ 今天未打卡不立刻归零（仍计到昨天）；④ 随 child 隔离（读当前 `STATE.daily`）。
- **可单测点**：`getStreak()` 多 fixture（连续/中断/今天未打卡/空数据）断言天数；断卡返回 0。

#### P0-6 成长树 MVP（纯可视化）  【功能 ②】
- **功能点**：纯函数 `scoreToStage(total)` → `{ stage, idx, nextThreshold, pct }`；`features/growth-tree.js` 渲染 SVG/CSS 树。
- **描述**：阶段：种子(0)→发芽(20)→幼苗(50)→开花(100)→结果(200)（阈值见 §6，默认可调）。日历 Tab 成长地图下方新增「🌱 我的成长树」区块，随 `calcTotalScore()` 实时切换阶段并显示到下阶段进度。
- **验收标准**：① 5 阶段 SVG 清晰区分；② 总分变化时阶段与进度条同步；③ **无新交互/无新状态写入**（只读 `calcTotalScore`）；④ 无打卡时显示"种子"且文案鼓励。
- **可单测点**：`scoreToStage(0/19/20/49/50/99/100/199/200)` 边界断言正确阶段；`pct` 在 [0,1]。

#### P0-7 家长录音鼓励（录制 + 播放 + 隔离 + 降级）  【功能 ⑤】
- **功能点**：`STATE.parentEncouragements: Array<{id,label,createdAt}>`（仅元数据）；音频 blob 存 IndexedDB，key = `enc_<activeChildId>_<seq>`。
- **描述**：在「设置宝贝信息」弹层（`main.js` babyName 点击）与家长中心增加「🎙️ 家长录音鼓励」区：录制（MediaRecorder）、试听、删除、命名。孩子打卡成功时（`toggleTask` 成功分支，紧接 `triggerEncourageAndFirework()`）优先播家长录音（随机选一条），无录音/不支持则现有 `speakEncourage()` 机器女声。
- **验收标准**：① 需 `getUserMedia` 授权；拒绝/不支持时显示降级提示并仍可用机器声；② 多条可管理；③ 录音 key 含 `activeChildId` → 物理隔离，切孩不串；④ 播放不阻塞烟花/鼓励弹层；⑤ 未设宝贝时禁用录音入口。
- **可单测点**：`getEncouragementToPlay(list, childId)` 纯函数（有列表返回某 id、无则返回 null，体现"优先录音、无则 null 回退"）；`encStorageKey(childId, seq)` 命名含 childId；录制流程用 mock `MediaRecorder`/`getUserMedia` 测成功/拒绝/不支持三态。

#### P0-8 维度徽章墙  【功能 ②】
- **功能点**：纯函数 `computeDimensionScores(daily)` → `{学习力:score,...}`；`isBadgeUnlocked(cat, score, threshold)`。
- **描述**：5 维度各 1 枚徽章，累计维度积分 ≥ 阈值即点亮（默认阈值 30，见 §6）。日历 Tab 或成长档案新增「🏅 徽章墙」区块，5 槽位显示锁定/解锁态。
- **验收标准**：① 5 维度齐全；② 阈值达成点亮、未达置灰并显示进度；③ 数据来自 `daily`（随 child 隔离）；④ 无新状态写入（派生）。
- **可单测点**：`computeDimensionScores(fixtureDaily)` 各维度求和正确（仅计 `done`）；`isBadgeUnlocked` 边界（=阈值点亮、差 1 不亮）。

### P1（应该做）

#### P1-1 情绪趋势可视化（周报/复盘）  【功能 ③】
- **功能点**：复盘 Tab（`#asub-review`）与成长报告（`renderGrowthReport`）新增情绪趋势区块。
- **描述**：按周聚合 `daily[date].mood`，显示本周情绪分布（😊/😐/😢 计数或迷你条）；无数据日期留空。
- **验收标准**：① 周聚合正确；② 无 mood 数据不报错、不显示伪数据；③ 文案温和（"这周你大多数时候都很开心呀🌞"）。
- **可单测点**：`aggregateMoodByWeek(daily, weekKeyFn)` 返回各表情计数；空数据返回全 0。

#### P1-2 成长树/Streak/徽章进入 renderAll  【功能 ②】
- **功能点**：在 `renderAll()` 内调用 `renderGrowthTree()`、`renderStreak()`、`renderBadges()`；`renderPoints()` 内更新 `#streakBadge`。
- **描述**：保证切日/切孩/打卡后三要素实时刷新。
- **验收标准**：① 任一打卡动作后 Streak/树/徽章同步；② 切孩后全部按新 child 重算。
- **可单测点**：`renderStreak`/`renderGrowthTree`/`renderBadges` 在给定 STATE 下产出预期 DOM 文本（可用 jsdom）。

#### P1-3 灵感库"仅参考"轻提示  【功能 ⑥】
- **功能点**：点「仅参考」后 toast「已记下这个小灵感🌟」。
- **验收标准**：不改任何状态，仅提示。

### P2（锦上添花，可延后）

#### P2-1 吉祥物表情随场景变化  【功能 ⑥】
- 空状态=歪头温和；成功=星星眼；鼓励=微笑。由 `renderMascot(placement,{mood})` 的 `mood` 参数驱动。

#### P2-2 家长录音"指定场景播放"  【功能 ⑤】
- 家长可为"成功/断卡/生日"分别录；打卡成功默认播"成功"组，断卡时播"鼓励"组。需扩展 `parentEncouragements` 的 `scene` 字段（向后兼容：无 scene 视为通用）。

#### P2-3 成长树阶段达成庆祝  【功能 ②】
- 升阶段时弹吉祥物+轻烟花+话术"你的小树开花啦🌸"。

---

## 4. UI 设计稿（文字 + 结构描述）

> 现有 Tab 结构（已确认）：`#mainTabNav` → calendar / checkin / rewards / archive。新增内容均挂在现有容器内，**不新增主 Tab**。

### 4.1 打卡 Tab（#mtab-checkin）— 心情打卡 + 灵感入口 + 温柔空状态
```
[✓ 成长任务]
[📅 7月8日（周三）] [今天]
─────────────────────────────
[今天心情怎么样？]  😊 😢 😐   [______ 写一句小心事（可选，≤50字）__]
─────────────────────────────
[💡 活动灵感]   ← 新增按钮（右侧）
[补卡横幅区 #makeupBanner]
[#catTabs 分类]
[#taskGrid 任务列表]   ← 含 fromIdea 项
[温柔空状态卡]（仅今天 0 打卡时显示）
   🌱(吉祥物歪头)  "今天还没开始也没关系，选一个小任务试试看？🌱"
[#taskLocked 锁定态]
```
- 心情行在 `checkinDateLabel` 与 `catTabs` 之间插入；灵感按钮与 `catTabs` 同行右对齐。
- 温柔空状态卡：今天且 `countDayDone(today)===0` 时渲染，替代原空白，含吉祥物（placement=empty）。

### 4.2 日历 Tab（#mtab-calendar）— 成长树 + Streak + 徽章墙
```
[📅 暑假日历] [◀ 今天 ▶]
[#calGrid]
[图例] [selectedDateLabel]
[🗺 成长地图 #mapGrid]
[🌱 我的成长树]            ← 新增区块
   [SVG 树:种子/发芽/幼苗/开花/结果]  🌱(吉祥物·小向导，placement=tree)
   [进度条 → 距"开花"还差 40 分]
[🔥 连续打卡]  🔥 连续 7 天   ← 可与顶部 #streakBadge 二选一，建议两者都有
[🏅 徽章墙]               ← 新增区块
   [学习力✅][运动力🔒][自控力✅][探索力🔒][实践力✅]  （解锁高亮/未达置灰+进度）
[📈 本月积分趋势 #trendChart]
```

### 4.3 顶部栏（header）— Streak 徽标
```
[🐷 暑假成长积分银行]
[👧 宝贝] [🪙 123 成长分] [🔥 连续 7 天](#streakBadge) [👨‍💼 家长中心]
```
- `#streakBadge` 插入 `#topPoints` 同 pill 组内；`renderPoints()` 同步更新。

### 4.4 设置宝贝信息弹层（main.js）— 家长录音鼓励
```
[设置宝贝信息]
 名字 / 性别 / 配色主题（现有）
 ─────────────────────────
 [🎙️ 家长录音鼓励]        ← 新增区块
   [● 录制] [⏹ 停止]  (录制中显示时长)
   已录列表：
     🔊 加油语音 #1  [▶试听][🗑删除]  2026-07-08
     🔊 晚安语音 #2  [▶试听][🗑删除]
   (无麦克风权限时：⚠️ 无法录音，打卡仍会有机器鼓励声)
 [取消] [确认]
```
- 录音区仅对当前 `activeChildId` 生效；列表来自 `STATE.parentEncouragements`。

### 4.5 复盘 Tab（#asub-review）— 情绪趋势（P1）
```
[📝 每周复盘]
 [5 个复盘卡片 revBest/revHard/revNext/revParent/revSupport]（现有）
 [😊 本周心情]  😊×4  😐×2  😢×1   ← 新增情绪趋势条
 [#reviewTimeline]
 [保存复盘]
```

### 4.6 吉祥物视觉规范（必读，给前端/插画）
- **角色名**：小芽（Sprout）——一颗会发芽的小种子精灵。
- **配色**（契合 app 橙粉 `sakura #ff7043` / `mint`）：
  - 身体/种子：`#FFB74D`（暖橙）；嫩芽：`#A5D6A7`（嫩绿）；脸颊：`#FF8A65`（暖橘红，半透明）。
  - 描边：`#6D4C41`（暖棕）2px、`stroke-linecap/linejoin: round`、无尖角。
  - 背景：透明；置于浅色卡片上时自身带极淡投影。
- **形状**：大圆头（接近正圆）+ 头顶两片圆润小芽 + 点状眼睛 + 腮红；整体圆润、无锐角，传递"软萌安全"。
- **表情（由 `mood`/placement 驱动）**：
  - 默认/鼓励：弯弯笑眼（⌣ ⌣）+ 小嘴微笑。
  - 成功：眼睛变 ★ 星眼 + 张嘴笑。
  - 空状态：头微倾（rotate -8°）+ 温和眨眼 + 嘴平。
- **微动画（纯 CSS keyframes，挂在 class 上）**：
  - `mascot-sway`：左右轻摆 `rotate(-4deg)↔rotate(4deg)`，2.4s `ease-in-out infinite`（常驻/树旁）。
  - `mascot-blink`：眼睛 `scaleY(0.1)` 周期 4s（瞬时）。
  - `mascot-pop`：成功时 `scale(0.8)→1.08→1` 0.5s `ease-out`（打卡成功/鼓励弹层）。
- **放置位与尺寸**：树旁 64×64（sway）；空状态 80×80（歪头+blink）；成功/鼓励弹层 56×56（pop，角落不挡文字）；统一内联 SVG，单文件 `features/mascot.js` 输出，避免外链。

---

## 5. 数据模型变更

### 5.1 STATE 顶层新增（须在 `core/state.js` 的 `freshState()` 注册默认值）
| 字段 | 类型 | 默认值 | 存储位置 | 隔离 |
|---|---|---|---|---|
| `parentEncouragements` | `Array<{id:string, label:string, createdAt:string, scene?:string}>` | `[]` | child 快照（localStorage `summerGrowthBankV2_child_<id>`） | ✅ 随 child 快照自动隔离 |

> ⚠️ **必须加到 `freshState()`**：否则 `hydrateStateFrom()` 在切孩子时不回写该字段（见 §0 陷阱）。`saveData()` 解构已自动把它纳入 `childData`，无需改 `saveData`。

### 5.2 `daily[date]` 内新增（嵌套于 `STATE.daily`，随 child 快照隔离）
| 字段 | 类型 | 说明 |
|---|---|---|
| `mood` | `'happy' \| 'neutral' \| 'sad' \| undefined` | 当日心情；由 `getDay(date)` 保证 day 存在 |
| `moodNote` | `string` | 心情附言，≤50 字 |
| `tasks[ideaId]` | `{ done, pts, cat, title, fromIdea:true }` | 灵感库"设为今日任务"写入，复用现有 `day.tasks` 结构，不新增独立字段；自动计入 `calcDayScore/calcTotalScore` |

### 5.3 IndexedDB（复用 `features/media.js`，store `media`，keyPath `id`）
| key | value | 说明 |
|---|---|---|
| `enc_<activeChildId>_<seq>` | audio Blob | 家长录音；key 含 childId 实现物理隔离；blob 不入 localStorage/JSON 备份（与现有作品一致） |

### 5.4 派生数据（无存储，运行时计算）
- 成长树阶段：`scoreToStage(calcTotalScore())`
- Streak：`getStreak()`（读 `STATE.daily`）
- 维度徽章：`computeDimensionScores(STATE.daily)` + 阈值比较
- 情绪周报：`aggregateMoodByWeek(STATE.daily, getWeekKey)`

### 5.5 备份/恢复影响
- 现有 `openBackupModal` 导出 `STATE` JSON + 作品不导 IndexedDB；本次新增 `parentEncouragements` 会随 STATE 进 JSON，但**录音 blob 不在 JSON 内**（切设备后录音丢失，机器声兜底）。是否需把录音并入备份 → 见 §6。

---

## 6. 待确认问题（需用户/架构师拍板）

1. **成长树阈值**：默认 种子0 / 发芽20 / 幼苗50 / 开花100 / 结果200（基于现有积分量级，暑假总分常见 100–300）。是否采用？还是按"完成天数"分级？
2. **维度徽章阈值**：默认每维度累计积分 ≥ 30 点亮（单枚）。是否分金银铜多级？阈值取值是否按维度差异化（如运动力更易达标）？
3. **录音条数上限**：默认不限制（或单孩 ≤ 10 条防膨胀）？单条时长上限（建议 ≤ 30s）？是否要做 P2-2 的"场景分组(scene)"？
4. **灵感库文案是否可编辑**：本次默认**静态内置、家长不可改**；是否需要在"任务管理"里开放编辑/增删？（需求方原话"静态内置数组"，建议 P2 再议。）
5. **"设为今日任务"的实现归属**：采用本 PRD 方案——写入 `day.tasks[ideaId]`（当日有效、`fromIdea:true`），需 `renderTasks` 合并 `day.tasks` 中 `fromIdea` 项，并让 `toggleTask` 在 `getActiveTasks()` 找不到 tid 时回退查 `day.tasks[tid]`。**架构师确认此方案 vs 改为持久 `customTasks`**（后者会变成长期任务，不符"今日"语义）。
6. **温柔话术触发频率**：同一场景会话内是否去重（建议去重，避免骚扰）？"当日 0 打卡"提示在每次进打卡 Tab 都显示，还是每天首次？
7. **新顶层字段 `parentEncouragements` 必须进 `freshState()`**：请架构师在 `core/state.js` 落实，并回归「切孩子/删孩子/导入备份」三处是否仍正确（删孩子时是否一并 `removeMedia` 其录音 blob？建议是，但非阻塞）。
8. **录音是否在备份中包含**：当前备份不含 IndexedDB；是否扩展备份格式把录音 blob 一并导出（影响 `openBackupModal`/`import`）。
9. **Streak 今日未打卡口径**：采用"今天未打卡则从昨天起算、不立即归零"（早晨友好）。是否认可？还是严格要求"含今天、今天 0 即归零"？
10. **吉祥物 SVG 交付**：由前端按 §4.6 规范手绘内联 SVG；是否需要我先提供 1 个基础 SVG 草图文件供参考？

---

## 7. 可单测点汇总（Vitest，给 QA 严过关）

| 功能 | 纯函数/模块 | 测试要点 |
|---|---|---|
| ③ 心情 | `setMood / getMood / validateMoodInput` | 枚举合法、note 截断、隔离 |
| ③ 温柔话术 | `countDayDone / getStreak / pickGentleMessage` | 三场景返回非空且分组正确、随机不重复 |
| ③ 情绪周报(P1) | `aggregateMoodByWeek` | 周聚合计数、空数据全 0 |
| ⑥ 灵感库 | `IDEA_LIBRARY` 结构 / `addIdeaAsTask` | 5 维×5–8 条、幂等、pts 合法 |
| ⑥ 吉祥物 | `renderMascot(placement,{mood})` | 返回 `<svg`、placement→class、非法回退 |
| ⑤ 录音 | `encStorageKey / getEncouragementToPlay` + mock MediaRecorder | key 含 childId、优先录音无则 null、三态（成功/拒绝/不支持） |
| ② 成长树 | `scoreToStage / getStageProgress` | 边界阶段、pct∈[0,1] |
| ② Streak | `getStreak` | 连续/中断/今天未打卡/空 |
| ② 徽章 | `computeDimensionScores / isBadgeUnlocked` | 各维求和仅计 done、阈值边界 |

---

## 8. 涉及文件清单（给架构师的实现提示，非完整方案）

- `core/state.js`：① `freshState()` 增加 `parentEncouragements:[]`（**必须**）。
- `core/data.js`：可选新增 `getStreak()`、`computeDimensionScores()`、`scoreToStage()`（或放 `features/growth-tree.js`）。
- `features/mood.js`（新）：心情读写 + `GENTLE_MESSAGES` + `pickGentleMessage` + `countDayDone` + `aggregateMoodByWeek`。
- `features/ideas.js`（新）：`IDEA_LIBRARY` + `addIdeaAsTask` + 灵感弹层渲染。
- `features/mascot.js`（新）：`renderMascot` + CSS 动画类字符串（或写入 `index.html` 的 `<style>`）。
- `features/voice-encourage.js`（新）：录制/列表/播放/删除 + `getEncouragementToPlay`。
- `features/growth-tree.js`（新）：`scoreToStage` + `getStreak` + `computeDimensionScores` + `renderGrowthTree/renderStreak/renderBadges`。
- `features/render.js`：`renderTasks` 合并 `fromIdea` 项；`toggleTask` 成功分支播家长录音 + 取消分支加温柔话术；新增 `renderMascot` 放置调用；`renderAll` 调树/Streak/徽章；`renderPoints` 更新 `#streakBadge`。
- `main.js`：设置宝贝信息弹层加录音区；打卡 Tab 加心情行 + 灵感按钮 + 温柔空状态；`renderAll` 已在 boot 调用（新 render 自动生效）；`switchChildFromParentCenter` 无需改（新字段经 `freshState` 已隔离）。
- `index.html`：加 `#streakBadge`、`#moodRow`、`#ideaBtn`、`#growthTree`、`#badgeWall` 容器与对应 CSS/keyframes；`#asub-review` 加情绪趋势容器。
- **回归**：`saveData`/`hydrateStateFrom`/`loadData`/`openBackupModal`/`deleteChild` 在多孩子场景下对 `parentEncouragements` 与 `daily[date].mood` 的正确性。
