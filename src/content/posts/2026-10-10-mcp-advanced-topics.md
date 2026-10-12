---
title: 模型上下文协议：高级主题
subtitle: "Model Context Protocol: Advanced topics · 传输层、握手与反向调用"
date: 2026-10-10
platform: Claude Academy
course: "Model Context Protocol: Advanced topics"
courseUrl: https://academy.claude.com/courses/model-context-protocol-advanced-topics
status: completed
tags: [MCP, Agent, 传输层]
track: agent
keypoints:
  - 消息模型：JSON-RPC 上分「请求-响应」（带 id，成对）与「通知」（单向，不要求回包）；MCP 是双向协议
  - 三大高级特性：sampling（把模型调用委托给客户端）、日志/进度通知、roots（文件系统边界）
  - 传输层：stdio 管本地（Host 把 server 当子进程拉起，日志只能走 stderr）；Streamable HTTP 管远程（单端点 + SSE 流）
  - 握手：客户端先发 initialize，服务器在响应头返回 Mcp-Session-Id；initialized 通知是协议层的"开工确认"
  - 协议是双向的：服务器可反向调用客户端——sampling、roots、elicitation
---

<!-- 配图路径含站点 base（/daily-learning），若更换 base 需同步修改图片路径 -->

> **课程**：[Model Context Protocol: Advanced topics](https://academy.claude.com/courses/model-context-protocol-advanced-topics)（Claude Academy，11 课 + 1 测验，约 1.5 小时）
> **模块结构**：Core MCP features（sampling / 通知 / roots，各配 walkthrough）→ Transports and communication（JSON 消息类型 / STDIO / StreamableHTTP / 状态）→ Assessment and next steps

MCP 高级主题这门课，讲的是协议底下的"管道"怎么工作。之前配 MCP server 都是照着文档抄 JSON，这节课之后终于知道每一行配置背后发生了什么。

## TL;DR

课程按「**特性 → 管道**」两条线组织。特性线讲服务器如何更聪明地借力客户端：**sampling** 把模型调用反向委托给客户端（成本和密钥都在客户端一侧）、**日志与进度通知**让长任务可见、**roots** 划定服务器可触达的文件边界。管道线讲消息如何在两端流动：JSON-RPC 消息分**请求-响应**（带 `id`，成对出现）与**通知**（单向），传输层分 **stdio**（本地子进程）与 **Streamable HTTP**（远程，单端点 + SSE 双连接）。整个协议是**双向的**——服务器也能主动向客户端发请求。

| 模块 | 内容 | 一句话 |
|---|---|---|
| Core MCP features | Sampling、Log & progress notifications、Roots（各配代码 walkthrough） | 服务器的高级能力 |
| Transports and communication | JSON message types、STDIO、StreamableHTTP、State | 消息怎么走 |
| Assessment | 概念测验 + Wrapping up | 检验与收束 |

课程的组织方式值得学：每个特性都是「概念页 + walkthrough」一对——概念页讲为什么，walkthrough 用示例项目逐步走代码（文件浏览器 + 高亮对应行），从发起请求到处理返回值一步步对齐。

## 1. 消息模型：请求带 id，通知不带

<figure>
  <img src="/daily-learning/images/mcp-advanced-topics/message-types.svg" alt="MCP 消息模型：请求-响应对与单向通知">
  <figcaption>图 1 · MCP 消息模型：请求-响应靠 id 配对；通知单向发出，不要求回包</figcaption>
</figure>

所有 MCP 通信都是 JSON 消息，分两大类：

| 类型 | 结构 | 例子 |
|---|---|---|
| 请求 → 响应 | 成对，`id` 字段配对 | Initialize、Call Tool、List Prompts、Read Resource |
| 通知 | 单向，无 `id`，fire-and-forget | Progress、Logging Message、Tool List Changed、Resource Updated |

区分小技巧（课程在 walkthrough 里反复练的）：**看有没有 `id`**。有 `id` 的必须回包，无 `id` 的发了就算。权威清单在官方 MCP 规范仓库（GitHub），它独立于各语言 SDK——SDK 只是规范的实现。

规范还按**发送方**组织消息：客户端消息（客户端发的请求与通知）和服务器消息（服务器发的请求与通知）。这个分类在选传输层时特别重要——有些传输方式对"哪个方向能发什么消息"有限制。

关键定性：**MCP 是双向协议**，客户端和服务器都可以主动发起通信。这一点直接决定了后面传输层的设计——有些传输方式（如 HTTP）天生不利于"服务器主动"，整门课后半段都在绕开这个限制。

## 2. Sampling：把模型调用委托给客户端

服务器经常需要在工具执行中途"问一句模型"（比如概括一段抓回来的文本）。但公共服务器不该自己揣着 API key——否则每个用户的 token 账单都算在服务器头上。**sampling** 的解法：服务器把 prompt 发给客户端，请客户端用自己的模型连接生成文本，再把结果传回来。

| 角色 | 做什么 |
|---|---|
| 服务器 | 工具函数里调 `create_message()`（FastMCP 中经 `Context` 对象），传入消息列表、`max_tokens`、`system_prompt` |
| 客户端 | 注册 sampling 回调；把 MCP 消息格式转换成自家 SDK 的格式（如 Anthropic SDK），调模型，返回 `CreateMessageResult` |

流程：服务器完成本职工作（如抓取 Wikipedia）→ 构造 prompt → 发 sampling 请求 → 客户端调模型 → 返回文本 → 服务器把文本用于后续流程（直接返回、继续工作、或再采样一次）。

为什么值得用（课程给的适用场景）：

- **成本转移**：token 费用由客户端承担，公共服务器零成本；
- **免密钥**：服务器不需要任何模型 API 凭证；
- **复杂度转移**：模型集成在客户端一侧，服务器只专注自己的领域逻辑。

两个实现细节（walkthrough 里踩过的坑）：

- 服务器传来的消息是 MCP 格式，**不保证兼容你的 LLM SDK**——客户端回调里要写一小段转换逻辑；
- 客户端的回调必须**注册进 ClientSession** 才会生效。

注意：客户端返回前可以**审查、修改甚至拒绝**——这是 human-in-the-loop 的天然位置。

## 3. 日志与进度通知：长任务不再是黑盒

工具一跑就十几秒，用户盯着空气不知道是卡死还是在跑——这是 UX 问题。课程给两件工具：

| 机制 | 用途 | 特点 |
|---|---|---|
| 日志通知（Logging Message） | 系统事件、调试信息 | 类似 console 输出，按级别分类 |
| 进度通知（Progress） | 长任务的百分比推进 | 带进度 token，可关联到具体请求 |

实现上，FastMCP 的工具函数会**自动收到最后一个参数 `Context`**，它提供日志与进度上报方法；客户端预先注册回调来展示更新。两边都要写：服务器报，客户端收。课程配了一个 walkthrough，一步步给"慢工具"加上进度条和日志。

什么时候发哪种：系统事件（"开始处理""连接超时"）走日志；可量化的推进（"已处理 40/100 条"）走进度。

## 4. Roots：文件系统的安全边界

Roots 回答一个问题：**服务器被允许碰哪些文件和目录？** 它不只是权限开关，还兼做**文件发现**——客户端把开放目录告诉服务器，服务器据此提供资源。

- 只开放 Desktop，服务器就碰不到 Documents / Downloads——边界由**客户端**划定；
- 重要细节（课程强调的坑）：**边界最终由服务器自己强制执行**。SDK 不会替你拦住越权访问，工具代码必须自己校验路径是否在 roots 内（walkthrough 里的练习就是"读文件前先检查它在不在 roots 里"）。

## 5. 传输层：stdio 管本地

MCP 把"消息长什么样"（JSON-RPC）和"消息走哪条路"（传输层）分开。本地走 **stdio**：

- Host（比如 Claude Desktop）把 server 当**子进程**拉起来，stdin 发请求、stdout 收响应。还记得配 server 的那段 JSON 吗——`"command": "npx", "args": [...]` 就是在告诉 Host 用什么命令把进程拉起来。
- 一个大坑：**日志只能走 stderr**，往 stdout 写日志会污染协议消息。
- 局限（课程在 STDIO 一课讲透的）：stdio server 只在一台机器上工作——它就活在宿主的进程里，没有远程部署一说。

一句话：本地个人工具用 stdio，要给团队用、远程部署就换 Streamable HTTP。

## 6. 传输层：Streamable HTTP 管远程

远程传输的核心矛盾：MCP 需要服务器→客户端方向的消息（sampling、通知、日志），而 HTTP 是客户端先请求才有响应。Streamable HTTP 的解法是**用 SSE 绕开限制**：

- 客户端把 JSON-RPC 请求 POST 到**单个端点**（如 `/mcp`），简单请求直接回 JSON；
- 初始化后，客户端再发一个 GET 请求建立**主 SSE 连接**（长连不关）——服务器主动的请求（sampling / roots / elicitation）走这条；
- 每次工具调用会再开一条**工具专用 SSE 连接**，工具结果和日志消息走它，结果一发出就自动关闭；
- 配置开关 `stateless_http` 和 `json_response` 设为 `True` 会**打破这套 SSE 机制**——换来水平扩展能力，代价是丢掉服务器→客户端的功能。选型时这就是那道权衡题。

<figure>
  <img src="/daily-learning/images/mcp-advanced-topics/streamable-http.svg" alt="Streamable HTTP 双连接模型">
  <figcaption>图 2 · Streamable HTTP：单端点接收请求，两条 SSE 连接承担服务器→客户端方向</figcaption>
</figure>

## 7. 握手与状态：客户端先打电话

这节课最烧脑的是初始化流程，搞懂之后特别通透：

- 客户端 POST `initialize` 请求 → 服务器在**响应头**里返回 `Mcp-Session-Id`。服务器不需要"知道客户端地址"——HTTP 永远是客户端先建好连接，服务器只是在这条已建好的连接上回包，就像你打电话给客服，客服不需要知道你家地址。
- 接着客户端发 `initialized` 通知：这不是 TCP 三次握手（那个在底层早完成了），而是协议层的"开工确认"——"你的能力清单我收到了，版本协商 OK，可以开始干活了"。
- 流断了可以用 `Last-Event-ID` 重连继续；客户端在 NAT 后面也没关系，因为连接永远是客户端**向外**建的。

**"服务器怎么知道客户端的地址？"** 这是一开始卡住的地方：总觉得服务器要"找到"客户端才能回 session ID。后来想通了——从来都是客户端先出手。SSE 也一样：不是服务器连客户端，而是客户端发个请求不挂断，服务器在这通"电话"里一直说话。客户端不需要公网地址，因为出站建连的回包防火墙是放行的，跟刷网页一个道理。

**State 一课**把上面的权衡形式化：有状态（stateful）服务器记住 session，功能完整但难以水平扩展；无状态（stateless）服务器每条请求自包含，负载均衡友好，但要放弃依赖会话的反向功能。

## 8. 协议是双向的：服务器也能反向调用客户端

MCP 不是纯 request/response。服务器可以向客户端发请求：

- **sampling**：server 请客户端的 LLM 生成一段文本（执行到一半需要模型做判断），human-in-the-loop，客户端可以看、可以改、可以拒绝；
- **roots**：server 问"你给我开放了哪些目录？"——安全边界由客户端定；
- **elicitation**：执行中途请用户填个结构化输入（*注：规范层的另一个反向原语，不在本课大纲内，此处为规范知识补充*）。

传输层上这些反向消息走客户端打开的 SSE 监听流。所以写 MCP **客户端**不只是发请求，还得实现被反向调用时的处理逻辑——Claude Desktop 里那些授权弹窗，背后就是这个机制。

## 9. 传输选型速查

| 场景 | 传输 | 理由 |
|---|---|---|
| 本地个人工具 | stdio | 宿主拉子进程，零网络配置 |
| 团队/远程部署 | Streamable HTTP（有状态） | 功能完整：sampling、通知、反向调用 |
| 高并发网关 | Streamable HTTP（`stateless_http`） | 可水平扩展，但放弃服务器→客户端功能 |

## 10. 跟我的目标有什么关系

- 字节 2026 AI 岗 JD 里 MCP 是高频词，面试聊 Agent 落地时，传输层选型（本地 stdio vs 远程 Streamable HTTP）是个很好的故事线；
- 跟简历上 Agent 项目的 tool-calling 部分能对上：MCP 解决的是 N×M 集成重复劳动——"一个客户端复用所有 server"，这句话面试时可以直接用；
- 下一步：把 FastMCP 的 `@mcp.tool()` 亲手跑一遍，光听课不够。stdio 的本地 server 已经熟了，补一个远程 Streamable HTTP 版本。

## 11. 代码 / 备忘

```python
# TODO: 手写一个最小的 Streamable HTTP server + client
# 对照：stdio 版本的本地 server 已经熟了，补远程版本
# 记得验证：Mcp-Session-Id 往返、Last-Event-ID 断线续传
# sampling 双侧：服务器 ctx.session.create_message() ↔ 客户端 sampling callback
# roots：工具里先校验路径在 roots 内，再读文件
```

## 12. 课程信息

- **结构**：11 课 + 1 测验，约 1.5 小时；每个核心特性（sampling / 通知 / roots）都配代码 walkthrough，概念页 + 逐步代码对照
- **模块**：Core MCP features → Transports and communication → Assessment and next steps
- **课程主页**：https://academy.claude.com/courses/model-context-protocol-advanced-topics

---

*注：本文为课程公开内容的学习整理；概念讲解用自己的话重写，配图为原创重绘。*
