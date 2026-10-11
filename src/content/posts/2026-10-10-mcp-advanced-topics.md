---
title: 模型上下文协议：Anthropic 的高级主题
subtitle: Model Context Protocol — Advanced Topics · 传输层、握手与反向调用
date: 2026-10-10
platform: LinkedIn Learning
status: completed
tags: [MCP, Agent, 传输层]
track: agent
---

MCP 高级主题这门课，讲的是协议底下的"管道"怎么工作。之前配 MCP server 都是照着文档抄 JSON，这节课之后终于知道每一行配置背后发生了什么。

## 3 个关键收获

### 1. 传输层：stdio 管本地，Streamable HTTP 管远程

MCP 把"消息长什么样"（JSON-RPC）和"消息走哪条路"（传输层）分开了，两种路：

- **stdio**：Host（比如 Claude Desktop）把 server 当**子进程**拉起来，通过 stdin 发请求、stdout 收响应。还记得配 server 的那段 JSON 吗——`"command": "npx", "args": [...]` 就是在告诉 Host 用什么命令把进程拉起来。一个大坑：日志只能走 **stderr**，往 stdout 写日志会污染协议消息。
- **Streamable HTTP**：给远程 server 用的。客户端把 JSON-RPC 请求 POST 到**单个端点**（如 `/mcp`），简单请求直接回 JSON；长时间任务、进度通知就走 SSE 流，server 陆续推多条消息。

一句话：本地个人工具用 stdio，要给团队用、远程部署就换 Streamable HTTP。

### 2. 握手：客户端先打电话，服务器只负责回话

这节课最烧脑的是初始化流程，搞懂之后特别通透：

- 客户端 POST `initialize` 请求 → 服务器在**响应头**里返回 `Mcp-Session-Id`。服务器不需要"知道客户端地址"——HTTP 永远是客户端先建好连接，服务器只是在这条已建好的连接上回包，就像你打电话给客服，客服不需要知道你家地址。
- 接着客户端发 `initialized` 通知：这不是 TCP 三次握手（那个在底层早完成了），而是协议层的"开工确认"——"你的能力清单我收到了，版本协商 OK，可以开始干活了"。
- 流断了可以用 `Last-Event-ID` 重连继续；客户端在 NAT 后面也没关系，因为连接永远是客户端**向外**建的。

### 3. 协议是双向的：服务器也能反向调用客户端

MCP 不是纯 request/response。服务器可以向客户端发请求：

- **sampling**：server 请客户端的 LLM 生成一段文本（执行到一半需要模型做判断），human-in-the-loop，客户端可以看、可以改、可以拒绝；
- **roots**：server 问"你给我开放了哪些目录？"——安全边界由客户端定；
- **elicitation**：执行中途请用户填个结构化输入。

传输层上这些反向消息走客户端打开的 SSE 监听流。所以写 MCP **客户端**不只是发请求，还得实现被反向调用时的处理逻辑——Claude Desktop 里那些授权弹窗，背后就是这个机制。

## 1 个没懂、后来搞懂的

**"服务器怎么知道客户端的地址？"**

这是我一开始卡住的地方：总觉得服务器要"找到"客户端才能回 session ID。后来想通了——从来都是客户端先出手。SSE 也一样：不是服务器连客户端，而是客户端发个请求不挂断，服务器在这通"电话"里一直说话。客户端不需要公网地址，因为出站建连的回包防火墙是放行的，跟刷网页一个道理。

## 跟我的目标有什么关系

- 字节 2026 AI 岗 JD 里 MCP 是高频词，面试聊 Agent 落地时，传输层选型（本地 stdio vs 远程 Streamable HTTP）是个很好的故事线；
- 跟简历上 Agent 项目的 tool-calling 部分能对上：MCP 解决的是 N×M 集成重复劳动——"一个客户端复用所有 server"，这句话面试时可以直接用；
- 下一步：把 FastMCP 的 `@mcp.tool()` 亲手跑一遍，光听课不够。stdio 的本地 server 已经熟了，补一个远程 Streamable HTTP 版本。

## 代码 / 备忘

```python
# TODO: 手写一个最小的 Streamable HTTP server + client
# 对照：stdio 版本的本地 server 已经熟了，补远程版本
# 记得验证：Mcp-Session-Id 往返、Last-Event-ID 断线续传
```
