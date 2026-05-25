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
- ✅ 多轮对话历史管理（新建 / 切换 / 删除）
- ✅ SQLite 数据持久化
- ✅ 暗色主题 UI

## 技术栈

| 层 | 技术 |
|---|---|
| 全栈框架 | Next.js 14 (App Router) |
| 样式 | Tailwind CSS |
| 数据库 | SQLite (better-sqlite3) |
| 认证 | JWT (jose) + bcrypt (bcryptjs) |
| AI API | 火山方舟 Ark API (OpenAI 兼容格式) |
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
    │   │   └── db.ts               # SQLite 数据库
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
| GET | `/api/conversations` | 对话列表 |
| POST | `/api/conversations` | 创建对话 |
| GET | `/api/conversations/[id]` | 对话详情 + 消息 |
| DELETE | `/api/conversations/[id]` | 删除对话 |

## 路线图

### V1 — MVP（当前）
- 用户认证系统
- 豆包 Seed 2.0 对话
- 对话管理

### V2 — 增强功能
- 多模型支持（OpenAI / Claude / Gemini / DeepSeek）
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
