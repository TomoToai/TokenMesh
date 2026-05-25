mindmap
  root((OpenRouter.ai))
    统一API网关
      Chat Completions API
        OpenAI SDK完全兼容
        stream流式非流式
        tools函数调用
        response_format结构化输出
        models模型回退
        provider供应商路由
      Embeddings API
        多供应商嵌入模型
      图像生成API
        text-to-image
        image-to-image
        PNG/SVG/GIF输出
      音频API
        TTS语音合成
        ASR语音识别
      视频生成API
        text-to-video
        image-to-video
        reference-to-video
      Rerank API
        文档重排序RAG
      Responses API Alpha
      查询生成详情API
      模型列表API
    模型路由引擎
      自动路由器Auto Router
        openrouter/auto
        NotDiamond驱动
      模型回退Model Fallbacks
        models参数回退列表
        仅成功模型计费
      供应商路由Provider Routing
        order供应商优先级
        allow_fallbacks回退控制
        require_parameters参数支持
        data_collection数据策略
        zdr零数据保留
        only/ignore供应商过滤
        quantizations量化过滤
        sort排序策略
          price最低价
          throughput最高吞吐
          latency最低延迟
        性能阈值
          p50/p75/p90/p99
          滚动5分钟窗口
        快捷后缀
          :nitro吞吐优先
          :floor价格优先
      Auto Exacto
        智能路由选择
      默认负载均衡
        价格反平方加权
        故障供应商降级
    缓存系统
      提示缓存Prompt Caching
        OpenAI自动缓存
        Anthropic cache_control断点
        Gemini cache_control断点
        DeepSeek自动缓存
        Grok自动缓存
      响应缓存Response Caching Beta
        缓存命中零计费
        X-OpenRouter-Cache头
        Preset cache_enabled
        TTL 1-86400秒
        缓存键SHA-256
    核心功能特性
      结构化输出Structured Outputs
        json_schema格式
        strict严格模式
        流式结构化输出
        Response Healing插件
      工具调用Tool Calling
        OpenAI Function Calling兼容
        三步流程推理执行反馈
        Interleaved Thinking交错思考
        并行工具调用
      服务端工具Server Tools
        Web Search
        Web Fetch
      消息转换Message Transforms
      零完成保险Zero Completion Insurance
        自动启用不收费
      零数据保留ZDR
        账户级请求级
      Presets预设配置
        LLM配置与代码分离
        三种使用方式
        版本历史
      护栏Guardrails
      App归属Attribution
      服务层级Service Tiers
      主权AISovereign AI
      路由元数据Router Metadata
      输入输出日志IO Logging
      Broadcast批量广播
      私有模型Private Models
      插件系统Plugins
    BYOK自带密钥
      核心功能
        自带供应商API密钥
        费用5%
        前1M请求免费
      密钥优先级
        Prioritized优先级区
        Fallback回退区
        始终使用开关
      密钥过滤器
        模型过滤器
        API Key过滤器
        成员过滤器
      支持供应商密钥
        OpenAI
        Anthropic
        Azure AI Foundry
        Azure OpenAI
        AWS Bedrock
        Google Vertex AI
    工作区Workspaces
      独立环境隔离
      工作区级设置
        API Keys
        BYOK
        路由配置
        Presets
        插件
        护栏
        可观测性
        成员
      账户级设置
        Activity和Logs
        Credits和Billing
        组织管理
        Privacy
      权限管理
        管理员跨工作区
        成员所属工作区
    数据策略与隐私
      供应商数据策略
        是否训练
        数据保留期限
        服务条款
      用户控制
        账户级设置
        请求级设置
      EU区域路由
        eu.openrouter.ai
        数据不离开欧盟
    认证与安全
      认证方式
        API Key
        Management API Key
        OAuth
        SSO/SAML
      API Key管理
        额度上限告警
        环境分离
        系统级Key
      安全特性
        密钥加密存储
        ZDR
        EU区域路由
    计费系统
      计费模型
        按量付费5.5%
        不溢价
        零完成保险
        回退不收费
      充值方式
        信用卡
        加密货币
        银行转账
        发票PO
      预算控制
        API Key额度上限
        自动充值
      Activity日志
    定价方案
      免费版Free
        25+免费模型
        50请求/天
      按量付费Pay-as-you-go
        400+模型
        5.5%平台费
      企业版Enterprise
        批量折扣
        SSO/SAML
        合同SLA
    开发者工具
      Client SDK
        TypeScript
        Python
        Go
      Agent SDK
        callModel推理循环
        tool工具定义
        停止条件
        Human-in-the-Loop
        DevTools遥测
      第三方兼容
        LangChain
        LlamaIndex
    用户界面
      首页Landing Page
      模型市场Models
      Chat页面
      排行榜Rankings
      Apps展示
      定价页Pricing
      文档中心
      设置页面
    企业功能
      组织管理
      合规与安全
      专属服务
    供应商管理
      供应商接入
      供应商监控
      供应商数据策略
