# TokenMesh — 大模型聚合平台 PRD

> 版本：v1.0 | 日期：2026-05-20 | 完全对标 OpenRouter.ai

---

## 一、产品概述

### 1.1 产品定位

TokenMesh 是一个**大模型聚合网关平台**，通过统一的 OpenAI 兼容 API 接口，为开发者提供对全球 400+ 大模型的访问能力，覆盖文本生成、图像生成、语音合成、视频生成、嵌入、重排序等多模态能力。

### 1.2 核心价值主张

| 价值维度 | 描述 |
|---------|------|
| **统一接口** | 一个 API 兼容 OpenAI SDK，访问所有主流模型 |
| **更低价格** | 聚合多供应商，智能路由到最低价端点 |
| **更高可用** | 分布式基础设施，自动故障转移，零完成保险 |
| **数据安全** | 细粒度数据策略，ZDR 零数据保留，EU 区域路由 |
| **灵活计费** | 按量付费，无最低消费，BYOK 自带密钥 |

### 1.3 目标用户

- **独立开发者 / Indie Hackers**：快速接入多模型，低成本试错
- **AI 原生创业公司**：统一 API 降低集成复杂度，弹性扩展
- **企业客户**：数据合规、SSO/SAML、合同 SLA、区域路由
- **AI Agent 开发者**：Agent SDK、Tool Calling、多轮对话支持

### 1.4 核心指标（对标 OpenRouter）

| 指标 | 目标值 |
|------|--------|
| 月处理 Token 数 | 80T+ |
| 全球用户数 | 8M+ |
| 接入供应商数 | 60+ |
| 可用模型数 | 400+ |
| 平台费率 | 5.5%（按量付费） |

---

## 二、功能架构总览

```
┌─────────────────────────────────────────────────────────────┐
│                      TokenMesh Platform                      │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   用户界面    │   API 网关    │   管理后台    │   开发者工具    │
├──────────────┼──────────────┼──────────────┼────────────────┤
│ · 首页/LP    │ · Chat API   │ · 模型管理    │ · Client SDK   │
│ · 模型市场    │ · Embeddings │ · 供应商管理  │ · Agent SDK    │
│ · Chat 页面  │ · Images API │ · 路由配置    │ · Cookbook     │
│ · 排行榜     │ · Audio API  │ · 计费管理    │ · API Ref      │
│ · Apps 展示  │ · Video API  │ · 安全策略    │ · Changelog    │
│ · 定价页     │ · Rerank API │ · 运维监控    │                │
│ · 文档中心    │ · Speech API │ · 用户管理    │                │
└──────────────┴──────────────┴──────────────┴────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   路由 & 调度引擎   │
                    ├───────────────────┤
                    │ · 智能负载均衡      │
                    │ · 模型回退          │
                    │ · 供应商选择        │
                    │ · 提示缓存          │
                    │ · 响应缓存          │
                    │ · 数据策略路由      │
                    └─────────┬─────────┘
                              │
        ┌─────────┬───────────┼───────────┬─────────┐
        │         │           │           │         │
   ┌────┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐
   │OpenAI  │ │Anthropic│ │Google │ │DeepSeek│ │ 60+   │
   │        │ │        │ │       │ │       │ │更多   │
   └────────┘ └────────┘ └───────┘ └───────┘ └───────┘
```

---

## 三、功能模块详细设计

### 3.1 统一 API 网关

#### 3.1.1 Chat Completions API

- **端点**：`POST /api/v1/chat/completions`
- **完全兼容 OpenAI SDK**：只需修改 `baseURL` 和 `apiKey` 即可迁移
- **支持参数**：
  - `model`：模型 ID（如 `openai/gpt-5.5`、`anthropic/claude-opus-4.7`）
  - `messages`：消息数组（支持 system/user/assistant/tool 角色）
  - `temperature`、`top_p`、`max_tokens`、`stop`、`seed` 等标准参数
  - `stream`：流式/非流式响应
  - `tools` / `tool_choice`：函数调用
  - `response_format`：结构化输出
  - `models`：模型回退列表
  - `provider`：供应商路由偏好
  - `transforms`：消息转换配置

#### 3.1.2 Embeddings API

- **端点**：`POST /api/v1/embeddings`
- 支持多供应商嵌入模型（OpenAI、Cohere、BAAI 等）
- 输入文本或 token 数组，返回向量表示

#### 3.1.3 图像生成 API

- **端点**：通过 Chat Completions API 调用图像模型
- 支持 text-to-image 和 image-to-image
- 支持 `image_config` 参数：`strength`、`rgb_colors`、`background_rgb_color`
- 输出格式：PNG、SVG、GIF

#### 3.1.4 音频 API

- **语音合成（TTS）**：文本转语音，多语言、多音色
- **语音识别（ASR/Transcription）**：语音转文本，支持噪声环境
- **端点**：`POST /api/v1/audio/speech`、`POST /api/v1/audio/transcriptions`

#### 3.1.5 视频生成 API

- 支持 text-to-video、image-to-video、reference-to-video
- 多分辨率（480p/720p）、多宽高比（1:1, 16:9, 9:16 等）
- 按秒计费

#### 3.1.6 Rerank API

- 文档重排序，用于 RAG 场景
- 输入查询 + 文档列表，返回排序结果

#### 3.1.7 Responses API（Alpha）

- **端点**：`POST /api/v1/responses`
- 兼容 OpenAI Responses API 格式

#### 3.1.8 查询生成详情 API

- **端点**：`GET /api/v1/generation`
- 查询单次生成的成本、缓存命中、token 用量等

#### 3.1.9 模型列表 API

- **端点**：`GET /api/v1/models`
- 返回所有可用模型及其元数据
- **用户级模型列表**：`GET /api/v1/models/user`（考虑 BYOK、权限等）

---

### 3.2 模型路由引擎

#### 3.2.1 自动路由器（Auto Router）

- 特殊模型 ID：`tokenmesh/auto`
- 基于提示内容自动选择最合适的模型
- 由智能路由模型驱动（对标 NotDiamond）

#### 3.2.2 模型回退（Model Fallbacks）

- 通过 `models` 参数指定回退模型列表
- 主模型失败时自动尝试下一个
- 支持所有错误类型触发回退：上下文长度、内容审核、限流、宕机
- 仅按最终成功的模型计费

#### 3.2.3 供应商路由（Provider Routing）

**路由参数（`provider` 对象）**：

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `order` | string[] | - | 供应商优先级列表 |
| `allow_fallbacks` | boolean | true | 是否允许回退到其他供应商 |
| `require_parameters` | boolean | false | 仅路由到支持所有请求参数的供应商 |
| `data_collection` | "allow"/"deny" | "allow" | 是否允许路由到可能存储数据的供应商 |
| `zdr` | boolean | - | 仅路由到零数据保留端点 |
| `enforce_distillable_text` | boolean | - | 仅路由到允许文本蒸馏的模型 |
| `only` | string[] | - | 仅允许的供应商列表 |
| `ignore` | string[] | - | 要忽略的供应商列表 |
| `quantizations` | string[] | - | 量化级别过滤（int4/int8/fp8/fp16 等） |
| `sort` | string/object | - | 排序策略：price/throughput/latency |
| `preferred_min_throughput` | number/object | - | 首选最小吞吐量（tokens/sec） |
| `preferred_max_latency` | number/object | - | 首选最大延迟（秒） |
| `max_price` | object | - | 最大价格限制 |

**默认负载均衡策略**：
1. 优先选择近 30 秒内无重大故障的供应商
2. 在稳定供应商中，按价格反平方加权选择
3. 其余供应商作为回退

**排序模式**：
- `sort: "price"` — 优先最低价
- `sort: "throughput"` — 优先最高吞吐量
- `sort: "latency"` — 优先最低延迟
- `sort: { by: "price", partition: "none" }` — 跨模型全局排序

**快捷方式**：
- `:nitro` 后缀 → 等同于 `sort: "throughput"`
- `:floor` 后缀 → 等同于 `sort: "price"`

**性能阈值**：
- 支持百分位设置（p50/p75/p90/p99）
- 滚动 5 分钟窗口统计
- 不满足阈值的端点降级为回退，而非排除

#### 3.2.4 Auto Exacto

- 智能路由功能，根据请求特征自动选择最优模型和供应商
- 优化成本和性能的平衡

---

### 3.3 提示缓存（Prompt Caching）

#### 3.3.1 供应商级提示缓存

| 供应商 | 缓存写入 | 缓存读取 | 配置方式 |
|--------|---------|---------|---------|
| OpenAI | 免费 | 0.25x-0.5x 输入价 | 自动（≥1024 tokens） |
| Anthropic | 1.25x 输入价 | 0.1x 输入价 | 需 `cache_control` 断点 |
| Google Gemini | 输入价 + 5min 存储 | 0.25x 输入价 | 需 `cache_control` 断点 |
| DeepSeek | 等同输入价 | 0.1x 输入价 | 自动 |
| Grok | 免费 | 0.25x 输入价 | 自动 |
| Groq | 免费 | 按供应商定价 | 自动 |

#### 3.3.2 缓存控制

- 通过 `cache_control: { type: "ephemeral" }` 设置断点
- 支持 system 消息和 user 消息中的缓存断点
- 路由器尽力保持路由到同一供应商以利用热缓存

#### 3.3.3 缓存使用查看

- Activity 页面详情
- `/api/v1/generation` API
- 请求中 `usage: { include: true }` 获取缓存 token 数

---

### 3.4 响应缓存（Response Caching）

- **功能**：对完全相同的 API 请求缓存响应，缓存命中时零计费
- **启用方式**：
  - 请求头 `X-TokenMesh-Cache: true`
  - Preset 配置 `cache_enabled: true`
- **缓存键**：API Key + Model + Endpoint + Stream Mode + Request Body SHA-256
- **TTL**：默认 300 秒，范围 1-86400 秒
- **支持端点**：Chat Completions / Responses / Messages / Embeddings
- **限制**：ZDR 账户不可用；并发相同请求不会合并
- **缓存清除**：`X-TokenMesh-Cache-Clear: true`

---

### 3.5 结构化输出（Structured Outputs）

- 通过 `response_format: { type: "json_schema", json_schema: {...} }` 指定 JSON Schema
- 支持 `strict: true` 严格模式
- 支持流式结构化输出
- 支持 Response Healing 插件修复不完美 JSON
- 模型支持：OpenAI GPT-4o+、Google Gemini、Anthropic Sonnet 4.5+、开源模型

---

### 3.6 工具调用（Tool Calling）

- 完全兼容 OpenAI Function Calling 格式
- 三步流程：推理请求 → 工具执行 → 结果反馈
- 支持 Interleaved Thinking（交错思考）
- 支持并行工具调用
- 支持 `tool_choice` 配置
- 自动路由到支持工具调用的供应商

#### 3.6.1 服务端工具（Server Tools）

- 平台内置的 Web Search 和 Web Fetch 工具
- 任何支持工具调用的模型都可使用
- 多搜索引擎和抓取引擎可选

---

### 3.7 消息转换（Message Transforms）

- 自动将消息格式转换为模型所需的格式
- 处理不同模型的消息格式差异
- 确保跨模型兼容性

---

### 3.8 零完成保险（Zero Completion Insurance）

- 自动对所有账户启用
- 当响应满足以下任一条件时不收费：
  - 零完成 token 且 finish_reason 为空/null
  - finish_reason 为 error
- 即使供应商收取了 prompt 处理费，平台也承担

---

### 3.9 零数据保留（ZDR）

- 账户级或请求级启用
- 限制路由到仅 ZDR 端点
- 通过 `provider.zdr: true` 在请求中强制执行

---

### 3.10 BYOK（自带密钥）

#### 3.10.1 核心功能

- 用户可自带供应商 API 密钥
- 密钥安全加密存储
- 费用：OpenRouter 等价模型价格的 5%，从平台余额扣除
- 每月前 1M BYOK 请求免费

#### 3.10.2 密钥优先级

- **优先级区（Prioritized）**：先于平台端点尝试
- **回退区（Fallback）**：平台端点尝试后才使用
- 支持"始终使用此供应商"开关，阻止回退到平台端点

#### 3.10.3 密钥过滤器

- **模型过滤器**：限制密钥仅用于特定模型
- **API Key 过滤器**：限制哪些平台 API Key 可使用此 BYOK 密钥
- **成员过滤器**：限制哪些工作区成员可使用

#### 3.10.4 支持的供应商密钥类型

| 供应商 | 密钥格式 |
|--------|---------|
| OpenAI | API Key 字符串 |
| Anthropic | API Key 字符串 |
| Azure AI Foundry | `{ api_key, resource_name, resource_type }` |
| Azure OpenAI | `{ model_slug, endpoint_url, api_key, model_id }` |
| AWS Bedrock | API Key 或 `{ accessKeyId, secretAccessKey, region }` |
| Google Vertex AI | Service Account JSON + region |

---

### 3.11 工作区（Workspaces）

- 组织项目、团队和 Agent 到独立环境
- 每个工作区独立设置：API Keys、BYOK、路由、Presets、插件、护栏、可观测性、成员
- 账户级全局设置：Activity & Logs、Credits & Billing、组织管理、隐私策略
- 组织管理员跨工作区拥有管理员权限
- 支持管理 API 程序化管理

---

### 3.12 Presets（预设配置）

- 将 LLM 配置与代码分离
- 可管理：供应商路由、模型选择、系统提示、生成参数
- 三种使用方式：
  1. `model: "@preset/preset-slug"`
  2. `preset: "preset-name"` 字段
  3. `model: "openai/gpt-4@preset/preset-name"` 组合
- 版本历史，API 始终使用最新版本
- 请求参数与 Preset 浅合并

---

### 3.13 护栏（Guardrails）

- 工作区级护栏配置
- 控制 API Key 和成员活动
- 继承账户级策略，可添加更严格规则

---

### 3.14 数据策略路由

- 每个供应商有独立的数据处理策略（是否训练、数据保留）
- 账户级设置：是否允许路由到可能训练用户数据的供应商
- 请求级设置：`provider.data_collection: "deny"`
- 企业 EU 区域路由：`eu.tokenmesh.ai` 域名，数据不离开欧盟

---

### 3.15 App 归属（App Attribution）

- 通过 `HTTP-Referer` 和 `X-Title` 请求头标识应用
- 应用出现在平台排行榜上
- 展示使用量和排名

---

### 3.16 服务层级（Service Tiers）

- 不同层级提供不同服务质量
- 免费层有限制，付费层高可用

---

### 3.17 主权 AI（Sovereign AI）

- 支持特定区域的数据驻留
- 满足合规要求

---

### 3.18 路由元数据（Router Metadata）

- 响应中包含路由决策信息
- 帮助调试和理解路由行为

---

### 3.19 输入输出日志（Input & Output Logging）

- 可观测性集成
- 连接不同可观测性平台
- 按工作区配置

---

### 3.20 Broadcast

- 批量广播请求到多个模型
- 对比不同模型输出

---

### 3.21 私有模型（Private Models）

- 支持部署和路由到私有模型
- 企业客户专属

---

### 3.22 插件系统（Plugins）

- Response Healing：修复不完美 JSON
- 其他自定义插件
- 按工作区配置

---

## 四、用户界面设计

### 4.1 首页（Landing Page）

- 核心数据展示：月 Token 数、全球用户数、供应商数、模型数
- 四大核心卖点：统一 API、更高可用、价格与性能、自定义数据策略
- 精选模型展示（周趋势）
- 精选 Apps 展示
- 三步上手流程：注册 → 购买额度 → 获取 API Key
- 最新公告

### 4.2 模型市场（Models Page）

- 模型分类筛选：
  - 文本（356+）
  - 图像（29+）
  - 嵌入（25+）
  - 音频（5+）
  - 视频（14+）
  - 重排序（3+）
  - 语音（9+）
  - 转录（8+）
- 排序选项：最新、价格低→高、价格高→低、周使用量、上下文长度
- 每个模型卡片展示：
  - 供应商和模型名
  - 上下文长度
  - 输入/输出价格
  - 周使用量和趋势
  - 模型描述
- 模型详情页：
  - 完整描述
  - 定价详情
  - 支持的参数
  - 供应商端点列表
  - 数据策略信息
  - 性能指标

### 4.3 Chat 页面

- 在线对话界面
- 模型分类选择：
  - 旗舰模型
  - 最佳角色扮演模型
  - 最佳编程模型
  - 推理模型
- 内置测试用例（Car Wash Test、9.9 vs 9.11、Strawberry Test 等）
- 无需 API Key 即可体验

### 4.4 排行榜（Rankings Page）

- **LLM 排行榜**：按周使用量排名
- **市场份额**：各供应商/模型使用占比
- **分类排行**：按任务类型分类
- **语言排行**：自然语言和编程语言
- **上下文长度排行**
- **图像模型排行**
- **音频模型排行**
- **Top Apps 排行**：按使用量排名的第三方应用

### 4.5 Apps 展示页

- 展示使用平台 API 的第三方应用
- 每个应用展示：名称、描述、图标、使用量
- 250K+ 应用，4.2M+ 全球用户

### 4.6 定价页（Pricing Page）

- 三层定价对比表：

| 特性 | 免费版 | 按量付费 | 企业版 |
|------|--------|---------|--------|
| 平台费 | N/A | 5.5% | 批量折扣 |
| 模型数 | 25+ 免费模型 | 400+ | 400+ |
| 供应商数 | 4 免费供应商 | 60+ | 60+ |
| Chat & API | ✅ | ✅ | ✅ |
| Activity 日志 | ✅ | ✅ | ✅ |
| 自动路由 | ✅ | ✅ | ✅ |
| 预算控制 | ✅ | ✅ | ✅ |
| 提示缓存 | ✅ | ✅ | ✅ |
| 管理 API Key | ❌ | ✅ | ✅ |
| 管理控制 | ❌ | ❌ | ✅ |
| 数据策略路由 | ❌ | ✅ | ✅ |
| 策略强制执行 | ❌ | ❌ | ✅ |
| 供应商数据浏览器 | ❌ | ❌ | ✅ |
| SSO/SAML | ❌ | ❌ | ✅ |
| 合同 SLA | ❌ | ❌ | ✅ |
| 支付方式 | 信用卡/加密货币 | 信用卡/加密货币/银行转账 | 发票/PO |
| BYOK 限制 | 1M 免费/月，之后 5% | 5M 免费/月，自定义定价 | 自定义 |
| 速率限制 | 50 请求/天 | 高全局限制 | 可选专用限制 |
| 支持 | 社区 | 邮件 | SLA + Slack 频道 |

- FAQ 区域：计费、使用、路由、隐私、模型、可靠性

### 4.7 文档中心

- **Quickstart**：快速开始指南
- **API Reference**：完整 API 文档
- **Client SDKs**：TypeScript / Python / Go SDK
- **Agent SDK**：Agent 开发工具包
- **Cookbook**：示例代码集
- **Changelog**：更新日志

### 4.8 设置页面

- **API Keys 管理**：创建、删除、设置额度上限
- **Credits 充值**：手动/自动充值
- **BYOK 管理**：供应商密钥配置
- **Privacy 设置**：数据策略偏好
- **Presets 管理**：创建和编辑预设
- **Activity 日志**：请求历史、过滤、导出
- **工作区管理**：创建、切换、配置

---

## 五、开发者工具

### 5.1 Client SDK

| 语言 | 包名 | 功能 |
|------|------|------|
| TypeScript | `@openrouter/sdk` | 完整类型安全的 API 客户端 |
| Python | `openrouter` | Python SDK |
| Go | 待定 | Go SDK |

- 完全兼容 OpenAI SDK，只需修改 `baseURL`
- 支持流式和非流式请求

### 5.2 Agent SDK

- **包名**：`@openrouter/agent`
- **核心概念**：
  - `callModel`：主入口，运行推理循环
  - `tool()`：定义工具（名称、描述、Zod Schema、执行函数）
  - 停止条件：`stepCountIs()`、`maxCost()`、`hasToolCall()`
- **特性**：
  - 多轮 Agent 循环
  - 自动工具执行
  - 对话状态管理
  - 流式输出
  - 动态参数（每轮可更换模型/温度/工具）
  - Human-in-the-Loop 工具类型
- **DevTools**：遥测捕获和可视化

### 5.3 第三方 SDK 兼容

- 支持 LangChain、LlamaIndex 等框架
- 详细的框架集成文档

---

## 六、认证与安全

### 6.1 认证方式

| 方式 | 说明 |
|------|------|
| API Key | 标准 Bearer Token 认证 |
| Management API Key | 管理操作专用，跨工作区 |
| OAuth | 第三方 OAuth 登录 |
| SSO/SAML | 企业级单点登录 |

### 6.2 API Key 管理

- 每个工作区独立 API Key
- 可设置额度上限和告警
- 可按环境（dev/staging/prod）分离
- 系统级 Key（组织管理员创建，非个人所有）

### 6.3 安全特性

- 密钥安全加密存储
- 请求级数据策略控制
- ZDR 零数据保留
- EU 区域路由
- 不使用用户数据训练
- 供应商数据保留透明度

---

## 七、计费系统

### 7.1 计费模型

- **按量付费**：按模型定价的 token 计费，平台加收 5.5%
- **不溢价**：模型目录中显示的价格即为用户实付价格
- **零完成保险**：空响应不收费
- **回退不收费**：仅最终成功的模型计费
- **流式不加价**：流式和非流式同价

### 7.2 充值方式

- 信用卡/借记卡
- 加密货币
- 银行转账
- 企业发票/PO

### 7.3 预算控制

- API Key 级别额度上限
- 自动充值
- 使用告警

### 7.4 Activity 日志

- 所有请求记录
- 可按工作区过滤
- 支持导出
- 显示：模型、token 用量、成本、缓存命中、供应商响应

---

## 八、企业功能

### 8.1 组织管理

- 组织创建和管理
- 成员角色：管理员 / 成员
- 工作区权限管理

### 8.2 合规与安全

- SSO/SAML 单点登录
- 合同 SLA
- EU 区域路由
- 数据策略强制执行
- 供应商数据浏览器
- 主权 AI 支持

### 8.3 专属服务

- 专用速率限制
- 批量折扣
- 年度承诺
- 发票/PO 支付
- Slack 共享频道支持

---

## 九、模型供应商管理

### 9.1 供应商接入

- 供应商自主申请上架模型
- 供应商审核流程
- 模型元数据标准化

### 9.2 供应商监控

- 实时可用性监控
- 性能指标追踪（延迟、吞吐量、错误率）
- 百分位统计（p50/p75/p90/p99）
- 滚动 5 分钟窗口

### 9.3 供应商数据策略

| 策略维度 | 说明 |
|---------|------|
| 是否训练 | 供应商是否可能使用 prompt 数据训练 |
| 数据保留 | 供应商的数据保留期限 |
| 服务条款 | 链接到供应商服务条款 |

---

## 十、技术架构要求

### 10.1 API 网关

- 边缘部署，最小化用户与推理之间的延迟
- OpenAI 兼容 API
- 请求验证和转换
- 速率限制
- 负载均衡

### 10.2 路由引擎

- 实时供应商健康检查
- 智能负载均衡（价格反平方加权）
- 模型回退链
- 供应商排序和过滤
- 性能百分位计算

### 10.3 缓存层

- 提示缓存（供应商级）
- 响应缓存（平台级）
- 缓存键生成（SHA-256）
- TTL 管理

### 10.4 计费引擎

- 实时 token 计数
- 精确到请求的计费
- 零完成保险
- 缓存折扣计算

### 10.5 可观测性

- 请求追踪
- 性能监控
- 错误追踪
- 外部可观测性集成

---

## 十一、页面路由设计

| 路径 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | 产品介绍、核心数据、精选模型 |
| `/models` | 模型市场 | 所有模型浏览、筛选、排序 |
| `/models/:id` | 模型详情 | 单模型详情、定价、参数 |
| `/chat` | Chat 页面 | 在线对话体验 |
| `/rankings` | 排行榜 | 模型/应用排名 |
| `/apps` | Apps 展示 | 第三方应用展示 |
| `/pricing` | 定价页 | 三层定价对比 |
| `/docs` | 文档中心 | API 文档、指南 |
| `/docs/quickstart` | 快速开始 | 入门指南 |
| `/docs/api-reference` | API 参考 | 完整 API 文档 |
| `/docs/agent-sdk` | Agent SDK | Agent 开发文档 |
| `/docs/client-sdks` | Client SDK | SDK 文档 |
| `/docs/cookbook` | Cookbook | 示例代码 |
| `/docs/changelog` | 更新日志 | 版本更新 |
| `/settings/keys` | API Key 管理 | 密钥创建和管理 |
| `/settings/credits` | 额度充值 | 充值和账单 |
| `/settings/privacy` | 隐私设置 | 数据策略偏好 |
| `/settings/presets` | Presets 管理 | 预设配置 |
| `/activity` | Activity 日志 | 请求历史 |
| `/workspaces/:id/byok` | BYOK 管理 | 供应商密钥配置 |
| `/sign-up` | 注册 | 用户注册 |
| `/enterprise` | 企业版 | 企业功能介绍 |
| `/announcements` | 公告 | 平台公告 |
| `/status` | 系统状态 | 实时可用性 |

---

## 十二、API 端点汇总

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/v1/chat/completions` | Chat 补全 |
| POST | `/api/v1/responses` | Responses API（Alpha） |
| POST | `/api/v1/embeddings` | 嵌入生成 |
| POST | `/api/v1/audio/speech` | 语音合成 |
| POST | `/api/v1/audio/transcriptions` | 语音识别 |
| GET | `/api/v1/generation` | 查询生成详情 |
| GET | `/api/v1/models` | 模型列表 |
| GET | `/api/v1/models/user` | 用户级模型列表 |

---

## 十三、分期实施计划

### Phase 1 — MVP（核心网关）

1. Chat Completions API（OpenAI 兼容）
2. 模型市场页面
3. 基础路由（价格负载均衡 + 模型回退）
4. 用户注册 / API Key 管理
5. 按量付费计费
6. Activity 日志
7. 基础文档

### Phase 2 — 增强功能

1. Embeddings API
2. 提示缓存
3. 供应商路由（排序、过滤、性能阈值）
4. BYOK 支持
5. Presets
6. Chat 页面
7. 排行榜
8. 结构化输出
9. 工具调用
10. 响应缓存

### Phase 3 — 多模态 & Agent

1. 图像生成 API
2. 音频 API（TTS + ASR）
3. 视频生成 API
4. Rerank API
5. Agent SDK
6. Client SDK（TypeScript / Python）
7. 服务端工具（Web Search / Fetch）
8. 消息转换

### Phase 4 — 企业级

1. 工作区
2. 组织管理
3. SSO/SAML
4. EU 区域路由
5. ZDR
6. 护栏
7. 插件系统
8. 可观测性集成
9. 管理 API Key
10. 供应商数据浏览器

### Phase 5 — 生态 & 优化

1. Apps 展示
2. App 归属和排行榜
3. Auto Router
4. Auto Exacto
5. 私有模型
6. 主权 AI
7. Broadcast
8. Cookbook
9. 供应商自助上架

---

## 十四、竞品对比

| 特性 | TokenMesh（目标） | OpenRouter | 其他聚合平台 |
|------|-------------------|------------|-------------|
| OpenAI 兼容 API | ✅ | ✅ | 部分支持 |
| 模型数量 | 400+ | 400+ | 50-200 |
| 多模态支持 | 文本/图像/音频/视频/嵌入/重排序 | ✅ | 通常仅文本 |
| 智能路由 | ✅ | ✅ | 基础回退 |
| BYOK | ✅ | ✅ | 少数支持 |
| 提示缓存 | ✅ | ✅ | 少数支持 |
| 响应缓存 | ✅ | ✅（Beta） | ❌ |
| 结构化输出 | ✅ | ✅ | 少数支持 |
| Agent SDK | ✅ | ✅ | ❌ |
| 工作区 | ✅ | ✅ | ❌ |
| EU 区域路由 | ✅ | ✅ | ❌ |
| 零完成保险 | ✅ | ✅ | ❌ |
| 排行榜 | ✅ | ✅ | ❌ |

---

## 十五、成功指标

| 指标 | Phase 1 目标 | Phase 3 目标 | Phase 5 目标 |
|------|-------------|-------------|-------------|
| 注册用户 | 1K | 50K | 500K |
| 月活跃开发者 | 500 | 20K | 200K |
| 月 Token 处理量 | 1T | 20T | 80T |
| 可用模型数 | 50+ | 200+ | 400+ |
| 接入供应商数 | 10+ | 30+ | 60+ |
| API 可用性 | 99.5% | 99.9% | 99.99% |
| P90 延迟（网关开销） | <200ms | <100ms | <50ms |
