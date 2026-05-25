# TokenMesh — 大模型聚合平台

> One API for Any Model. 统一接口访问全球大模型。

## 项目简介

TokenMesh 是一个对标 [OpenRouter.ai](https://openrouter.ai/) 的大模型聚合网关平台，通过统一的 OpenAI 兼容 API 接口，为开发者提供对全球大模型的访问能力，覆盖文本生成、图像生成、语音合成、视频生成、嵌入、重排序等多模态能力。

当前为 **V1 MVP 版本**，已实现核心对话功能。

## 当前功能 (V1)

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

### V4 — 企业级
- 工作区 (Workspaces)
- 组织管理 + SSO/SAML
- EU 区域路由
- ZDR 零数据保留
- 护栏 (Guardrails)
- 插件系统
- 可观测性集成
- 供应商数据浏览器

### V5 — 生态 & 优化
- Apps 展示 + 排行榜
- Auto Router / Auto Exacto
- 私有模型
- 主权 AI
- 供应商自助上架

## 贡献

欢迎提交 Issue 和 Pull Request！

## License

MIT
