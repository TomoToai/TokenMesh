# TokenMesh — Web3 原生的大模型聚合平台

> One API for Any Model. 统一接口访问全球大模型，用 Crypto 支付，用算力换 Token。

## 🌟 为什么选择 TokenMesh？

TokenMesh 不仅仅是一个大模型聚合网关——我们是 **Web3 原生** 的 AI 基础设施。

| 特色 | 说明 |
|------|------|
| 🔗 **Web3 加密支付** | 支持加密货币直接充值，无需信用卡，全球无障碍接入。ETH、USDT、USDC 等主流币种一键支付，链上透明可验证。 |
| ⚡ **算力换 Token** | 贡献你的闲置 GPU 算力，自动折算为平台 Token 余额。让你的显卡为你赚 AI 额度，真正实现去中心化的算力共享经济。 |
| 🤖 **统一 API** | 一个 OpenAI 兼容接口，访问 400+ 大模型。改一行 baseURL 即可迁移，零学习成本。 |
| 💰 **更低价格** | 智能路由到最低价端点，比直连供应商更便宜。 |
| 🛡️ **更高可用** | 分布式基础设施 + 自动故障转移，零完成保险（空回复不收费）。 |

### 与 OpenRouter 的对比

| 特性 | OpenRouter | TokenMesh |
|------|-----------|-----------|
| 统一 OpenAI 兼容 API | ✅ | ✅ |
| 多模型聚合 | ✅ | ✅ |
| 智能路由 | ✅ | ✅ |
| **Web3 加密支付** | ❌ 仅信用卡/法币 | ✅ ETH/USDT/USDC |
| **算力换 Token** | ❌ | ✅ 贡献 GPU 赚额度 |
| 去中心化算力网络 | ❌ | ✅ 规划中 |

## 当前功能 (V1 MVP)

- ✅ 用户注册 / 登录 / 退出（JWT + bcrypt 加密）
- ✅ Chat 对话页面（流式输出，打字效果）
- ✅ 豆包 Seed 2.0 Pro 模型对接（火山方舟 Ark API）
- ✅ 模型选择器（支持 1-3 个模型使用同一 Prompt 做并行评测）
- ✅ 模型评测结果展示（耗时、计费输入 Tokens、输出 Tokens、总 Tokens）
- ✅ Reasoning / Answer 折叠展示，便于对比长推理结果
- ✅ 本地文件上传（文本 / PDF / 图片）
- ✅ PDF 文本抽取并作为本轮对话上下文
- ✅ 图片上传并按多模态消息传给模型
- ✅ 多轮对话历史管理（新建 / 切换 / 删除）
- ✅ SQLite 数据持久化
- ✅ 模型调用错误中文化提示 + 方舟网络超时轻量重试
- ✅ 暗色主题 UI

> 当前文件上传是 MVP 方案：文件内容仅用于本轮 Chat 上下文，暂不做对象存储、长期文件管理和复杂文档解析流水线。

## Chat 模型评测能力

Chat 页面顶部提供模型选择器，当前支持从火山方舟模型中选择 1-3 个模型，用同一个处理后的 Prompt 并行调用并对比输出。

当前内置模型：

| TokenMesh 模型 ID | 方舟模型 ID | 说明 |
|-------------------|-------------|------|
| `tokenmesh-doubao-seed-2-0-pro-260215` | `doubao-seed-2-0-pro-260215` | 豆包 Seed 2.0 Pro |
| `tokenmesh-doubao-seed-2-0-lite-260428` | `doubao-seed-2-0-lite-260428` | 豆包 Seed 2.0 lite |
| `tokenmesh-deepseek-v4-flash` | `deepseek-v4-flash` | DeepSeek V4 Flash |

评测结果会按模型分卡片展示：

- 调用耗时
- 计费输入 Tokens
- 输出 Tokens
- 总 Tokens
- Reasoning（默认折叠）
- Answer（默认折叠）

说明：计费输入 Tokens 来自模型服务返回的 `usage.prompt_tokens`。即使 TokenMesh 给多个模型传入同一份处理后的 Prompt，不同模型由于 tokenizer、厂商内部模板和计费口径差异，返回的输入 Tokens 也可能不同。

## 技术栈

| 层 | 技术 |
|---|---|
| 全栈框架 | Next.js 16 (App Router / Turbopack) |
| 样式 | Tailwind CSS |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT (jose) + bcrypt (bcryptjs) |
| AI API | 火山方舟 Ark API (OpenAI 兼容格式) |
| 文件解析 | pdf-parse / 浏览器 File API |
| Web3 支付 | 智能合约 + Wallet Connect（规划中） |
| 算力共享 | 分布式算力调度引擎（规划中） |

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/TomoToai/TokenMesh.git
cd TokenMesh/app
npm install
```

### 2. 配置环境变量

复制并编辑 `.env.local`：

```bash
cp .env.example .env.local
```

填入你的火山方舟 API Key：

```env
ARK_API_KEY=你的API-Key
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
ARK_MODEL_ID=doubao-seed-2-0-pro-260215
JWT_SECRET=your-jwt-secret
```

> 获取 API Key：访问 [火山方舟控制台](https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey) 创建

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

如本机 3000 端口已被占用，也可以指定端口：

```bash
npm run dev -- -p 3001
```

## Chat 文件上传能力

当前 Chat 输入框支持上传最多 3 个文件，单文件上限 8MB：

| 类型 | 支持格式 | 处理方式 |
|------|----------|----------|
| 文本 | `.txt` / `.md` / `.csv` / `.json` / `.xml` | 前端上传到 `/api/files/extract`，后端抽取文本后作为上下文 |
| PDF | `.pdf` | 后端使用 `pdf-parse` 抽取文本，清理控制字符后注入本轮 prompt |
| 图片 | `.png` / `.jpg` / `.jpeg` / `.webp` | 前端转为 data URL，作为多模态消息传给 Ark Chat Completions |

注意：

- 聊天记录中只保存“已附加文件”的摘要，不保存完整文件内容，避免消息列表被大段文本撑爆。
- PDF 和文本内容会按字符数截断，MVP 先保证简单可用。
- 图片理解效果取决于当前配置的方舟模型是否支持多模态图片输入。
- 生产环境后续应迁移到火山引擎 TOS 做对象存储，并增加文件扫描、权限校验和异步解析任务。

## 项目结构

```
TokenMesh/
├── PRD.md                          # 产品需求文档
├── OpenRouter_MindMap.md           # 功能思维导图 (Markmap)
├── OpenRouter_MindMap_Mermaid.md   # 功能思维导图 (Mermaid)
└── app/                            # Next.js 应用
    ├── src/
    │   ├── lib/
    │   │   ├── auth.ts             # JWT 认证
    │   │   ├── db.ts               # SQLite 数据库
    │   │   └── models.ts           # 模型配置与模型 ID 规范化
    │   └── app/
    │       ├── page.tsx            # 首页
    │       ├── login/page.tsx      # 登录页
    │       ├── register/page.tsx   # 注册页
    │       ├── chat/page.tsx       # Chat 对话页
    │       └── api/
    │           ├── auth/           # 认证 API
    │           │   ├── register/   # 注册
    │           │   ├── login/      # 登录
    │           │   ├── logout/     # 退出
    │           │   └── me/         # 获取当前用户
    │           ├── chat/           # 豆包 Seed 2.0 流式代理
    │           ├── files/extract/  # 文件文本抽取 API
    │           └── conversations/  # 对话管理
    └── .env.local                  # 环境变量（不入库）
```

## API 端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/auth/register` | 用户注册 |
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 退出登录 |
| GET | `/api/auth/me` | 获取当前用户 |
| POST | `/api/chat` | AI 对话（流式 SSE） |
| POST | `/api/files/extract` | 文件文本抽取（文本 / PDF） |
| GET | `/api/conversations` | 对话列表 |
| POST | `/api/conversations` | 创建对话 |
| GET | `/api/conversations/[id]` | 对话详情 + 消息 |
| DELETE | `/api/conversations/[id]` | 删除对话 |

## 本地验证

```bash
cd app
npm run lint
npm run build
```

## 路线图

### V1 — MVP（当前）
- 用户认证系统
- 豆包 Seed 2.0 对话
- 多模型选择器与并行评测
- 模型耗时 / Tokens / Reasoning / Answer 展示
- 对话管理
- Chat 文件上传（文本 / PDF / 图片）

### V2 — 增强功能
- 多模型支持（OpenAI / Claude / Gemini / DeepSeek）
- 联网搜索（Web Search）
- 国内支付闭环（10 元固定充值商品）
- 模型市场页面
- 智能路由（价格负载均衡 + 模型回退）
- 供应商路由（排序、过滤、性能阈值）
- BYOK 自带密钥
- Presets 预设配置
- 提示缓存 + 响应缓存
- 结构化输出
- 工具调用 (Tool Calling)
- 排行榜

### V3 — 多模态 & Agent
- 图像生成 API
- 音频 API（TTS + ASR）
- 视频生成 API
- Embeddings API
- Rerank API
- Agent SDK
- Client SDK（TypeScript / Python）

### V4 — Web3 原生 🚀
- 🔗 **加密支付集成**
  - ETH / USDT / USDC 充值
  - Wallet Connect 钱包连接
  - 链上支付验证 + 自动到账
  - 支付透明，链上可查
- ⚡ **算力换 Token**
  - GPU 算力贡献注册
  - 算力基准测试 + 实时监控
  - 算力自动折算为平台 Token 余额
  - 去中心化算力调度引擎
  - 算力提供者激励分配
- 🏛️ **DAO 治理**
  - Token 持有者投票决策
  - 平台费率社区治理
  - 新模型上线社区提案

### V5 — 企业级
- 工作区 (Workspaces)
- 组织管理 + SSO/SAML
- EU 区域路由
- ZDR 零数据保留
- 护栏 (Guardrails)
- 插件系统
- 可观测性集成
- 供应商数据浏览器

### V6 — 生态 & 优化
- Apps 展示 + 排行榜
- Auto Router / Auto Exacto
- 私有模型
- 主权 AI
- 供应商自助上架

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT
