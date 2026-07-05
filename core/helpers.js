// core/helpers.js — 常量 + 工具函数

export const CATEGORIES = [
  {id:"learning", title:"学习力", color:"#4c88b8", icon:"📖"},
  {id:"physical", title:"运动力", color:"#2f947f", icon:"🏃"},
  {id:"discipline", title:"自控力", color:"#e7ac2c", icon:"⏰"},
  {id:"exploration", title:"探索力", color:"#7e57c2", icon:"🔍"},
  {id:"practice", title:"实践力", color:"#ef8f72", icon:"🛠️"},
];

export const TASKS = [
  {id:"study-task",title:"完成今日学习任务",pts:1,cat:"学习力"},
  {id:"read-20",title:"阅读20分钟",pts:1,cat:"学习力"},
  {id:"diary",title:"写日记",pts:2,cat:"学习力"},
  {id:"handwriting",title:"练字20分钟",pts:1,cat:"学习力"},
  {id:"poem",title:"背诵一首古诗",pts:1,cat:"学习力"},
  {id:"words",title:"背诵10个英语单词",pts:1,cat:"学习力"},
  {id:"mistakes",title:"错题订正复盘",pts:2,cat:"学习力"},
  {id:"math-practice",title:"口算/计算练习15分钟",pts:1,cat:"学习力"},
  {id:"sport-30",title:"运动30分钟",pts:1,cat:"运动力"},
  {id:"outside-2h",title:"户外活动2小时",pts:2,cat:"运动力"},
  {id:"jump-rope",title:"跳绳100个",pts:1,cat:"运动力"},
  {id:"swim",title:"游泳/戏水30分钟",pts:2,cat:"运动力"},
  {id:"cycling",title:"骑行20分钟",pts:1,cat:"运动力"},
  {id:"ball-game",title:"球类运动（篮球/足球/羽毛球等）",pts:2,cat:"运动力"},
  {id:"stretch",title:"拉伸放松10分钟",pts:1,cat:"运动力"},
  {id:"screen",title:"屏幕时间不超过2小时",pts:2,cat:"自控力"},
  {id:"pack",title:"自己准备出行物品",pts:1,cat:"自控力"},
  {id:"weekly-review-task",title:"每周复盘",pts:2,cat:"自控力"},
  {id:"homework-time",title:"自己安排作业时间",pts:1,cat:"自控力"},
  {id:"initiative",title:"主动安排并完成一件事",pts:3,cat:"自控力"},
  {id:"early-sleep",title:"早睡（9点30分前）",pts:1,cat:"自控力"},
  {id:"alarm",title:"自己定闹钟并按时起床",pts:1,cat:"自控力"},
  {id:"organize-bag",title:"整理书包/文具",pts:1,cat:"自控力"},
  {id:"less-snack",title:"减少零食摄入",pts:1,cat:"自控力"},
  {id:"look-far",title:"望远2次，每次20秒",pts:1,cat:"自控力"},
  {id:"interest-work",title:"完成一件兴趣作品",pts:2,cat:"探索力"},
  {id:"explore",title:"参加一次探索活动",pts:2,cat:"探索力"},
  {id:"emotion",title:"情绪好好表达",pts:1,cat:"探索力"},
  {id:"talk",title:"亲子沟通一次",pts:1,cat:"探索力"},
  {id:"observe-nature",title:"观察自然（植物/昆虫/天气）",pts:1,cat:"探索力"},
  {id:"mini-experiment",title:"做一个小实验",pts:2,cat:"探索力"},
  {id:"learn-song",title:"学唱一首新歌",pts:1,cat:"探索力"},
  {id:"visit-museum",title:"参观博物馆/展览",pts:3,cat:"探索力"},
  {id:"observation-diary",title:"写一篇观察日记",pts:2,cat:"探索力"},
  {id:"chore",title:"帮父母做一次家务",pts:2,cat:"实践力"},
  {id:"room",title:"整理自己房间",pts:1,cat:"实践力"},
  {id:"cook",title:"做一道菜",pts:3,cat:"实践力"},
  {id:"volunteer",title:"做一次志愿者",pts:2,cat:"实践力"},
  {id:"party",title:"组织一场朋友聚会",pts:2,cat:"实践力"},
  {id:"wash-dishes",title:"洗碗",pts:1,cat:"实践力"},
  {id:"water-plants",title:"浇花/照顾植物",pts:1,cat:"实践力"},
  {id:"pet-care",title:"照顾宠物（喂食/遛弯）",pts:1,cat:"实践力"},
  {id:"grocery",title:"帮家长买菜/购物",pts:2,cat:"实践力"},
  {id:"trash-sort",title:"垃圾分类",pts:1,cat:"实践力"}
];
// TASKS is a mutable reference - modifications by modules will be visible everywhere

export const REWARDS = [
  {cost:10,title:"10分小奖励",items:["选择一次家庭电影","点播一次睡前故事","选择一次晚餐菜单","多一次亲子游戏时间"]},
  {cost:30,title:"30分中奖励",items:["买一本喜欢的书","一次朋友聚会","一次亲子外出","一个手工或科学材料包"]},
  {cost:60,title:"60分大奖励",items:["一次短途旅行","一次主题体验活动","实现一个孩子期待的小愿望"]},
  {cost:100,title:"100分终极大奖励",items:["一次远途旅行"]}
];
export const DEFAULT_REWARD_ITEMS = {
  10: ["选择一次家庭电影","点播一次睡前故事","选择一次晚餐菜单","多一次亲子游戏时间"],
  30: ["买一本喜欢的书","一次朋友聚会","一次亲子外出","一个手工或科学材料包"],
  60: ["一次短途旅行","一次主题体验活动","实现一个孩子期待的小愿望"],
  100: ["一次远途旅行"]
};

export const ENCOURAGES = [
  "今天的努力，会在明天开花 🌱","每一小步，都在走向更大的自己",
  "你比昨天又进步了一点点 ✨","坚持的你，正在闪闪发光",
  "成长不是一天的事，但你今天做到了","小小的坚持，就是大大的力量",
  "今天的你，给自己加了一颗星 ⭐","暑假的每一天，你都在悄悄成长",
  "你的努力，已经被成长银行存起来了","做得很棒！继续保持哦",
  "又收获了一枚成长金币 🪙","今天的汗水，会变成明天的笑容",
  "你很了不起，因为你没有放弃","一步一个脚印，走着走着就远了",
  "看见自己的进步，就是最好的奖励","这个世界上，又多了一个努力的小孩",
  "每完成一件事，你就变厉害了一点点","你的认真，值得一朵小红花 🌸",
  "慢慢来，你已经在路上了","今天的付出，都悄悄存进了未来的你"
];

export const CAT_INTRO = {
  "学习力":"把学习拆成看得见的小动作，今天从一项开始也很好。",
  "运动力":"身体动起来，暑假的能量才会越来越满。",
  "自控力":"把屏幕、时间和计划交还给孩子练习掌舵。",
  "探索力":"保留好奇、表达感受，也记录一次新的尝试。",
  "实践力":"在真实生活里做一件事，成长会更有手感。"
};

// ===== helpers =====

export function localDateStr(d){
  // 使用本地时区格式化日期
  const pad=(n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
}

export function fmtDisplay(d){
  const pad=(n)=>String(n).padStart(2,'0');
  const weekdays=['周日','周一','周二','周三','周四','周五','周六'];
  return `${d.getFullYear()}年${pad(d.getMonth()+1)}月${pad(d.getDate())}日 ${weekdays[d.getDay()]}`;
}

export function esc(s){
  const d=document.createElement("div");d.textContent=s;return d.innerHTML;
}

export function getMonthKey(dateStr){
  return dateStr.slice(0,7); // "2026-07"
}

// 动态获取今天日期字符串（本地时区）
export function getTodayStr(){
  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
}