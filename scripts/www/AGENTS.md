# AGENTS.md - 高考化学通

## 项目概览

**高考化学通**是一款专为高三学生设计的高考化学复习PWA应用，采用原生HTML/CSS/JS技术栈，无需构建步骤，可直接在浏览器中运行并支持离线使用。

### 核心功能
- **知识卡片翻转学习**：50张知识卡片，覆盖6大模块，正面概念/反面详解+关键词
- **模块刷题**：分模块做真题风格选择题，即时反馈+详细解析+难度标签
- **每日一练**：随机10道高频考点混合题
- **错题本**：自动收集、分类筛选、点击重做，连续答对2次自动移除（已掌握）
- **学习进度**：环形进度图+各模块掌握率可视化

### 技术栈
- HTML5 + CSS3 + Vanilla JavaScript (ES6+)
- Service Worker 实现PWA离线缓存
- localStorage 持久化学习数据
- Material Design 风格UI（teal青色主色调）

## 项目结构

```
.
├── index.html          # 主页面（单页应用）
├── manifest.json       # PWA配置
├── sw.js               # Service Worker
├── .coze               # 启动配置
├── styles/
│   └── main.css        # 全局样式（Material Design风格）
├── js/
│   ├── data.js         # 题库数据（100题+50张卡片，按模块分const存储）
│   └── app.js          # 应用核心逻辑
└── icons/
    └── icon-*.png      # PWA图标（72x72 ~ 512x512）
```

## 数据模型

### 6大知识模块
| 模块ID | 模块名称 | 题目数 | 卡片数 |
|--------|---------|-------|-------|
| concept | 化学基本概念与计量 | 17 | 9 |
| reaction | 化学反应原理 | 21 | 9 |
| element | 元素周期律与化合物 | 20 | 8 |
| organic | 有机化学基础 | 22 | 8 |
| experiment | 化学实验基础 | 21 | 8 |
| structure | 物质结构与性质 | 19 | 8 |

### 题目结构
```javascript
{
  q: "题目内容",
  options: ["A选项", "B选项", "C选项", "D选项"],
  answer: 0,          // 正确答案索引(0-3)
  explanation: "解析内容",
  module: "concept",  // 所属模块ID
  difficulty: 1,      // 难度等级: 1=基础, 2=中等, 3=较难
  id: "concept_01"    // 唯一标识: 模块ID_序号
}
```

### 知识卡片结构
```javascript
{
  concept: "概念名称",
  detail: "详细解释",
  keywords: ["关键词1", "关键词2"],
  module: "concept"   // 所属模块ID
}
```

### 本地存储键值（统一 chem_ 前缀）
- `chem_doneMap` - 已做题记录 {id: timestamp}
- `chem_correctMap` - 正确记录 {id: boolean}
- `chem_wrongList` - 错题列表 [{id, module, count}]，count=连续答对次数
- `chem_cardKnown` - 已掌握卡片 {concept: boolean}
- `chem_streak` - 连续学习天数
- `chem_lastDate` - 上次学习日期
- `chem_dailyDone` - 今日每日一练是否完成
- `chem_dailyCorrect` - 今日每日一练正确数

### 题库扩展设计
题库按模块拆分为独立const（QUESTIONS_CONCEPT等），最终合并到ALL_QUESTIONS数组。扩展时：
1. 在对应模块const中追加题目，ID按 `模块ID_序号` 递增
2. 或新增模块const并加入ALL_QUESTIONS的展开列表
3. 同时在CHEM_MODULES中注册新模块信息

## 代码规范

- 不使用任何前端框架，纯原生JS
- CSS变量定义在 `:root` 中，支持主题切换
- 事件处理使用 `onclick` 内联属性（简化架构）
- localStorage键统一加 `chem_` 前缀

## 构建与运行

本应用为静态网站，无需构建。

开发服务器：
```bash
npx server -l 5000
```

或使用 Coze CLI：
```bash
coze dev
```

## 注意事项

- 数据存储在浏览器 localStorage 中，清除浏览器数据会丢失进度
- Service Worker 首次访问时注册，之后支持离线使用
- 移动端适配使用 viewport-fit=cover 支持刘海屏
- 图标使用512x512主图缩放生成各尺寸
