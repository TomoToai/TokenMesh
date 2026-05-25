# OpenRouter 产品功能思维导图

## OpenRouter.ai

### 统一 API 网关
#### Chat Completions API
- 端点: POST /api/v1/chat/completions
- OpenAI SDK 完全兼容
- 支持参数
  - model / messages / temperature / top_p
  - max_tokens / stop / seed
  - stream（流式/非流式）
  - tools / tool_choice（函数调用）
  - response_format（结构化输出）
  - models（模型回退列表）
  - provider（供应商路由偏好）
  - transforms（消息转换）

#### Embeddings API
- 端点: POST /api/v1/embeddings
- 多供应商嵌入模型
- 文本/Token 数组输入

#### 图像生成 API
- text-to-image / image-to-image
- image_config 参数
  - strength（偏离度）
  - rgb_colors（调色板）
  - background_rgb_color（背景色）
- 输出: PNG / SVG / GIF

#### 音频 API
- 语音合成 TTS
  - POST /api/v1/audio/speech
  - 多语言 / 多音色
- 语音识别 ASR
  - POST /api/v1/audio/transcriptions
  - 噪声环境支持

#### 视频生成 API
- text-to-video
- image-to-video
- reference-to-video
- 多分辨率(480p/720p)
- 多宽高比(1:1/16:9/9:16等)
- 按秒计费

#### Rerank API
- 文档重排序
- RAG 场景优化

#### Responses API (Alpha)
- POST /api/v1/responses
- OpenAI Responses API 兼容

#### 查询生成详情
- GET /api/v1/generation
- 成本/缓存/token 用量

#### 模型列表
- GET /api/v1/models（全局）
- GET /api/v1/models/user（用户级）

### 模型路由引擎
#### 自动路由器 Auto Router
- 特殊模型 ID: openrouter/auto
- 基于提示自动选择模型
- 由 NotDiamond 驱动

#### 模型回退 Model Fallbacks
- models 参数指定回退列表
- 主模型失败自动尝试下一个
- 所有错误类型触发回退
  - 上下文长度超限
  - 内容审核
  - 限流
  - 宕机
- 仅按最终成功模型计费

#### 供应商路由 Provider Routing
- provider 对象参数
  - order: 供应商优先级列表
  - allow_fallbacks: 是否允许回退
  - require_parameters: 仅支持全部参数的供应商
  - data_collection: allow/deny
  - zdr: 零数据保留
  - enforce_distillable_text: 文本蒸馏
  - only: 仅允许的供应商
  - ignore: 忽略的供应商
  - quantizations: 量化级别过滤
  - sort: 排序策略
  - preferred_min_throughput: 最小吞吐量
  - preferred_max_latency: 最大延迟
  - max_price: 最大价格

- 默认负载均衡
  - 1. 优先近30秒无故障供应商
  - 2. 价格反平方加权选择
  - 3. 其余作为回退

- 排序模式
  - sort: price（最低价）
  - sort: throughput（最高吞吐）
  - sort: latency（最低延迟）
  - sort: {by, partition}（高级排序）

- 快捷后缀
  - :nitro → sort: throughput
  - :floor → sort: price

- 性能阈值
  - 百分位: p50/p75/p90/p99
  - 滚动5分钟窗口
  - 不满足阈值降级为回退

#### Auto Exacto
- 智能路由
- 自动选择最优模型和供应商

### 缓存系统
#### 提示缓存 Prompt Caching
- 供应商级缓存
  - OpenAI: 自动(≥1024 tokens), 读取0.25x-0.5x
  - Anthropic: 需cache_control断点, 写入1.25x/读取0.1x
  - Google Gemini: 需cache_control断点, 读取0.25x
  - DeepSeek: 自动, 读取0.1x
  - Grok: 自动, 读取0.25x
  - Groq: 自动
- cache_control 断点
  - {type: "ephemeral"}
  - system/user 消息中设置
- 路由器尽力保持同一供应商

#### 响应缓存 Response Caching (Beta)
- 平台级缓存
- 缓存命中零计费
- 启用方式
  - 请求头 X-OpenRouter-Cache: true
  - Preset cache_enabled: true
- 缓存键
  - API Key + Model + Endpoint + Stream + Body SHA-256
- TTL: 1-86400秒(默认300)
- 支持端点
  - Chat Completions
  - Responses
  - Messages
  - Embeddings
- 限制
  - ZDR账户不可用
  - 并发不合并
- 缓存清除
  - X-OpenRouter-Cache-Clear: true

### 核心功能特性
#### 结构化输出 Structured Outputs
- response_format: json_schema
- strict: true 严格模式
- 流式结构化输出
- Response Healing 插件
- 支持模型
  - OpenAI GPT-4o+
  - Google Gemini
  - Anthropic Sonnet 4.5+
  - 开源模型

#### 工具调用 Tool Calling
- OpenAI Function Calling 兼容
- 三步流程
  - 1. 推理请求(带tools)
  - 2. 工具执行(客户端)
  - 3. 结果反馈
- Interleaved Thinking 交错思考
- 并行工具调用
- tool_choice 配置
- 自动路由到支持工具的供应商

#### 服务端工具 Server Tools
- Web Search
- Web Fetch
- 多搜索引擎可选
- 任何工具调用模型可用

#### 消息转换 Message Transforms
- 自动格式转换
- 跨模型兼容性

#### 零完成保险 Zero Completion Insurance
- 自动启用
- 零完成token + 空finish_reason → 不收费
- error finish_reason → 不收费
- 平台承担供应商prompt处理费

#### 零数据保留 ZDR
- 账户级/请求级启用
- provider.zdr: true
- 仅路由到ZDR端点

#### Presets 预设配置
- LLM配置与代码分离
- 可管理
  - 供应商路由
  - 模型选择
  - 系统提示
  - 生成参数
- 三种使用方式
  - model: "@preset/slug"
  - preset: "name" 字段
  - model: "x@preset/name" 组合
- 版本历史
- 请求参数浅合并

#### 护栏 Guardrails
- 工作区级配置
- 继承账户策略
- 可添加更严格规则

#### App 归属 Attribution
- HTTP-Referer 请求头
- X-Title 请求头
- 应用出现在排行榜

#### 服务层级 Service Tiers
- 不同层级不同服务质量
- 免费层限制 / 付费层高可用

#### 主权 AI Sovereign AI
- 特定区域数据驻留
- 合规要求支持

#### 路由元数据 Router Metadata
- 响应包含路由决策信息
- 调试和理解路由行为

#### 输入输出日志 I/O Logging
- 可观测性集成
- 按工作区配置

#### Broadcast
- 批量广播请求到多模型
- 对比不同模型输出

#### 私有模型 Private Models
- 部署和路由到私有模型
- 企业客户专属

#### 插件系统 Plugins
- Response Healing（修复JSON）
- 自定义插件
- 按工作区配置

### BYOK 自带密钥
#### 核心功能
- 自带供应商API密钥
- 密钥安全加密存储
- 费用: 等价模型价格5%
- 前1M请求/月免费

#### 密钥优先级
- Prioritized 优先级区
  - 先于平台端点尝试
  - 支持"始终使用"开关
- Fallback 回退区
  - 平台端点后尝试

#### 密钥过滤器
- 模型过滤器（限制特定模型）
- API Key过滤器（限制平台Key）
- 成员过滤器（限制工作区成员）

#### 支持的供应商密钥
- OpenAI: API Key
- Anthropic: API Key
- Azure AI Foundry: api_key + resource_name + resource_type
- Azure OpenAI: model_slug + endpoint_url + api_key + model_id
- AWS Bedrock: API Key 或 AWS凭证
- Google Vertex AI: Service Account JSON + region

### 工作区 Workspaces
#### 核心概念
- 独立环境隔离
- Default 默认工作区
- 组织管理员创建/删除

#### 工作区级设置
- API Keys
- BYOK
- 路由配置
- Presets
- 插件
- 护栏
- 可观测性
- 成员

#### 账户级全局设置
- Activity & Logs
- Credits & Billing
- 组织管理
- Management API Keys
- Privacy
- Preferences

#### 权限
- 管理员: 跨工作区全部权限
- 成员: 所属工作区成员权限
- 所有成员自动加入Default工作区

### 数据策略与隐私
#### 供应商数据策略
- 是否训练(Train on Prompts)
- 数据保留期限(Data Retention)
- 服务条款链接

#### 用户控制
- 账户级: 允许/禁止路由到训练数据供应商
- 请求级: provider.data_collection: deny
- 付费/免费模型分别设置

#### EU 区域路由
- 企业客户专属
- eu.openrouter.ai 域名
- 数据不离开欧盟
- EU模型列表: /api/v1/models/user

### 认证与安全
#### 认证方式
- API Key (Bearer Token)
- Management API Key
- OAuth
- SSO/SAML (企业版)

#### API Key 管理
- 每工作区独立Key
- 额度上限和告警
- 环境分离(dev/staging/prod)
- 系统级Key(组织管理员)

#### 安全特性
- 密钥加密存储
- 请求级数据策略
- ZDR零数据保留
- EU区域路由
- 不使用用户数据训练
- 供应商数据保留透明

### 计费系统
#### 计费模型
- 按量付费
- 平台加收5.5%
- 不溢价(显示价=实付价)
- 零完成保险(空响应不收费)
- 回退不收费
- 流式不加价

#### 充值方式
- 信用卡/借记卡
- 加密货币
- 银行转账
- 企业发票/PO

#### 预算控制
- API Key级额度上限
- 自动充值
- 使用告警

#### Activity 日志
- 所有请求记录
- 工作区过滤
- 导出功能
- 显示: 模型/token/成本/缓存/供应商

### 定价方案
#### 免费版 Free
- 25+ 免费模型
- 4 免费供应商
- 50 请求/天
- 20 RPM
- 社区支持
- BYOK: 1M免费/月

#### 按量付费 Pay-as-you-go
- 400+ 模型
- 60+ 供应商
- 平台费5.5%
- 高全局限制
- 邮件支持
- BYOK: 5M免费/月

#### 企业版 Enterprise
- 400+ 模型
- 60+ 供应商
- 批量折扣
- 专用限制可选
- SSO/SAML
- 合同SLA
- Slack共享频道
- 发票/PO支付
- BYOK: 自定义定价

### 开发者工具
#### Client SDK
- TypeScript: @openrouter/sdk
- Python: openrouter
- Go: 待定
- OpenAI SDK兼容

#### Agent SDK
- 包名: @openrouter/agent
- 核心概念
  - callModel: 推理循环
  - tool(): 工具定义
  - 停止条件
    - stepCountIs()
    - maxCost()
    - hasToolCall()
- 特性
  - 多轮Agent循环
  - 自动工具执行
  - 对话状态管理
  - 流式输出
  - 动态参数
  - Human-in-the-Loop
- DevTools: 遥测可视化

#### 第三方SDK兼容
- LangChain
- LlamaIndex
- 框架集成文档

### 用户界面
#### 首页 Landing Page
- 核心数据(80T tokens/8M+用户/60+供应商/400+模型)
- 四大卖点
  - 统一API
  - 更高可用
  - 价格与性能
  - 自定义数据策略
- 精选模型(周趋势)
- 精选Apps
- 三步上手
- 最新公告

#### 模型市场 Models
- 分类筛选
  - 文本(356+)
  - 图像(29+)
  - 嵌入(25+)
  - 音频(5+)
  - 视频(14+)
  - 重排序(3+)
  - 语音(9+)
  - 转录(8+)
- 排序: 最新/价格/周使用量/上下文长度
- 模型卡片: 供应商/上下文/价格/趋势/描述
- 模型详情: 定价/参数/端点/数据策略/性能

#### Chat 页面
- 在线对话
- 模型分类
  - 旗舰模型
  - 最佳角色扮演
  - 最佳编程
  - 推理模型
- 内置测试用例

#### 排行榜 Rankings
- LLM排行榜(周使用量)
- 市场份额
- 分类排行
- 语言排行(自然语言/编程语言)
- 上下文长度排行
- 图像模型排行
- 音频模型排行
- Top Apps排行

#### Apps 展示
- 第三方应用展示
- 250K+应用
- 4.2M+全球用户

#### 定价页 Pricing
- 三层对比表
- FAQ区域

#### 文档中心
- Quickstart
- API Reference
- Client SDKs
- Agent SDK
- Cookbook
- Changelog

#### 设置页面
- API Keys管理
- Credits充值
- BYOK管理
- Privacy设置
- Presets管理
- Activity日志
- 工作区管理

### 企业功能
#### 组织管理
- 组织创建/管理
- 成员角色(管理员/成员)
- 工作区权限

#### 合规与安全
- SSO/SAML
- 合同SLA
- EU区域路由
- 数据策略强制执行
- 供应商数据浏览器
- 主权AI

#### 专属服务
- 专用速率限制
- 批量折扣
- 年度承诺
- 发票/PO
- Slack共享频道

### 供应商管理
#### 供应商接入
- 自主申请上架
- 审核流程
- 元数据标准化

#### 供应商监控
- 实时可用性
- 性能指标(延迟/吞吐/错误率)
- 百分位统计(p50/p75/p90/p99)
- 滚动5分钟窗口

#### 供应商数据策略
- 是否训练
- 数据保留期限
- 服务条款
