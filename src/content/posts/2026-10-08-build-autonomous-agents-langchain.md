---
title: 用 LangChain 与 Hugging Face 构建自主代理
subtitle: "Build with AI: Autonomous Agents with LangChain and Hugging Face"
date: 2026-10-08
platform: LinkedIn Learning
course: "Build with AI: Autonomous Agents with LangChain and Hugging Face"
courseUrl: https://www.linkedin.com/learning/build-with-ai-autonomous-agents-with-langchain-and-hugging-face
status: completed
tags: [Agent, LangChain]
track: agent
keypoints:
  - Agent 与 chatbot 的分野：会推理、会规划、能在动态工作流中行动——靠工具调用跨过"只会说"的边界
  - 能力栈逐层叠加：prompt 设计 → 多步思考 → 记忆 → 工具/API，每层一个动手项目
  - 环境栈：Python venv + LangChain + Hugging Face Hub token（Transformers pipeline，本地 CPU 可跑）
  - 从"知道 Agent"到"搭出 Agent"：面试官问的永远是"你做过什么"，不是"你学过什么"
  - 与 MCP 课互补：这门讲"Agent 怎么转起来"，MCP 讲"Agent 怎么接外部世界"
---

<!-- 配图路径含站点 base（/daily-learning），若更换 base 需同步修改图片路径 -->

> **课程**：[Build with AI: Autonomous Agents with LangChain and Hugging Face](https://www.linkedin.com/learning/build-with-ai-autonomous-agents-with-langchain-and-hugging-face)（LinkedIn Learning，Walter Shields，1h 20m，Intermediate，2025-12-19 发布）
> **模块结构**：环境搭建 → 理解 AI Agent → 构建第一个 Agent → 扩展工作流与可靠性 → 真实项目

Agent 赛道的第一门实操课：用 LangChain + Hugging Face 搭自主代理。在纸上谈过很多 Agent 概念之后，终于亲手把 loop 跑起来的一课。

## TL;DR

课程从零搭环境开始，按"**能力栈**"逐层加码：先用 prompt 设计做出第一个 agent，再给同一个 agent 叠加多步思考、短期记忆、工具调用，最后做一个真实场景的 mini 项目（study buddy）。核心论点很朴素：agent 之所以是 agent，不在于模型多强，而在于它能**规划、能记住、能调用外部工具**——chatbot 只会说，agent 能做事。

| 章节 | 内容 | 动手项目 |
|---|---|---|
| Introduction | 最终效果演示 + 环境搭建 | — |
| 1. Understand AI Agents | agent 的定义与能力 | — |
| 2. Build Your First Agent | 第一个 prompt-based agent | Joke teller agent |
| 3. Expand Workflows and Reliability | 多步思考 / 记忆 / 工具 | 计算器 + 网页搜索 |
| 4. Real-World Project | 真实场景落地 | Mini study buddy |

## 1. 开场：先看成品，再搭环境

Introduction 两件事：先看**最终成品的演示**（一个完整 agent 的样子），再把环境搭好。环境搭建课是完整的一步式实操：

| 步骤 | 内容 |
|---|---|
| 运行时 | Python 3.13，`venv` 虚拟环境，VS Code |
| 依赖 | `langchain`、`langchain-huggingface`、`transformers`、`duckduckgo-search`、`python-dotenv`、`beautifulsoup4` |
| 模型接入 | Hugging Face 账号 → Access Token（勾选 "Make calls to Inference Providers"）→ 存进 `.env` 的 `HF_TOKEN` |
| 验证 | `import langchain, transformers` 打印 Setup successful |

两个值得记住的工程习惯：**token 只进 `.env`，不进脚本**；全部跑在**本地 CPU** 上——不需要 GPU 也能学 agent。

## 2. 理解 AI Agent：和 chatbot 差在哪

第 1 章回答定义问题。课程给的定位：**agent 是 chatbot 的下一步**——不只生成回答，还能**推理（reasoning）、规划（planning）、在动态工作流中行动（acting）**。

"动态工作流"是关键词：任务不是预设的死流水线，agent 根据上一步的结果决定下一步做什么——这正是它与普通自动化脚本的区别。

| | Chatbot | Agent |
|---|---|---|
| 交互 | 一问一答 | 多步推进，目标导向 |
| 能力边界 | 模型本身的知识 | 模型 + 工具 + 记忆 |
| 失败模式 | 答错 | 答错 + 走错步骤 + 调错工具 |

这个分野直接对应后面的课程结构：第 2 章给"会说"，第 3 章给"会想、记得、能做"。

## 3. 第一个 Agent：prompt 即行为

<figure>
  <img src="/daily-learning/images/build-autonomous-agents-langchain/agent-stack.svg" alt="Agent 能力栈：四层叠加">
  <figcaption>图 1 · Agent 能力栈：每加一层，agent 就从"会聊天"往"会做事"走一步</figcaption>
</figure>

第一个 agent 是一台"文本助手"：通过 Transformers pipeline 接上 Hugging Face 模型，本地生成回答。pipeline 封装了"加载模型 → 分词 → 推理 → 解码"的完整链路，几行代码就能让模型在本地跑起来——这是课程刻意选的入口：**先跑通，再谈优化**。

紧接着的 **Joke teller** 项目演示了一个重要事实——**换一套系统提示词，同一个模型就换了"性格"**：prompt 设计塑造的是 agent 的行为边界，而不只是措辞。

这是课程对"agent"概念的第一次落地：agent = 模型 + 精心设计的提示 + 明确的任务目标。

prompt 设计的要点（从这两个项目里能提炼的）：

| 维度 | 做什么 |
|---|---|
| 角色 | 给 agent 一个身份与语气 |
| 规则 | 明确什么该做、什么不该做 |
| 格式 | 输出的结构（列表？一段？） |
| 示例 | 用 few-shot 示范想要的样子 |

## 4. 多步思考：把一个任务拆成一段段提示

单次 prompt 的 agent 只能"想一步"。**Multistep thinking** 一课把任务拆成阶段：先摘要一个想法 → 再生成标题 → 最后建议 hashtags。做法是把**多段提示协同**起来（`agent_multistep.py`），让 agent 按阶段推理，而不是一次性输出。

这正是后来一切 agent 框架里 "planning loop" 的最小形态：**把复杂问题降维成若干个简单问题，串行求解**。

## 5. 记忆：让 agent 不再失忆

<figure>
  <img src="/daily-learning/images/build-autonomous-agents-langchain/agent-loop.svg" alt="自主代理循环：理解-规划-行动-观察">
  <figcaption>图 2 · 自主代理循环：观察结果写回记忆，驱动下一轮规划</figcaption>
</figure>

**Memory and context** 一课给 agent 加了短期记忆：记住对话中零散的事实，并在后续追问里引用。记忆的作用不是"存储"，而是**让下一轮推理有上下文**——没有它，多步思考和工具调用都会断在"它忘了上一步"上。

课程覆盖的是**短期记忆**（当前对话内有效）。更一般的划分是：

| 类型 | 生命周期 | 典型用途 |
|---|---|---|
| 短期记忆 | 单次会话 | 追问、引用前文 |
| 长期记忆 | 跨会话 | 用户偏好、历史摘要 |

本课只到短期为止——长期记忆是进阶课的话题。

## 6. 工具与 API：从"会说"到"会做"

工具调用是 agent 的质变点。课程给 agent 配了两件基础工具：

| 工具 | 解决的问题 |
|---|---|
| 安全计算器 | 模型不擅长算术，交给确定性代码 |
| 分层网页搜索 | DuckDuckGo 搜索 + BeautifulSoup 抽取正文，让回答有事实来源 |

为什么重要：当用户问"58×13 是多少"或"日本首都"，agent 不是在猜，而是在**调用专业系统**。工具让 agent 变得有用、准确、可验证——这也是它与普通 chatbot 的分水岭。

工具设计的原则（从这两个工具能提炼的）：

| 原则 | 说明 |
|---|---|
| 确定性优先 | 能算的别猜——算术交给计算器 |
| 来源可查 | 搜索结果要能回到原始页面 |
| 边界清晰 | 每个工具只做一件事，描述清楚什么时候用 |

课程把可靠性（reliability）放进同一章讲：工具提供**确定性**，记忆提供**连续性**，两者都是 agent 可信赖的前提——这与第 3 章标题 "Expand Workflows and Reliability" 对应。

课程描述里还提到**护栏（guardrails）**的思路：性能优化与行为约束要同步做——agent 越能干，跑偏的代价越大。

## 7. 真实项目：Mini study buddy

压轴是一个 11 分钟的 mini 项目：**one-pager coach**——一个"学习伙伴"式 agent，演示如何把前面四层能力（prompt + 多步 + 记忆 + 工具）组装成一个可定制的产品雏形。课程的总目标是做出一个**可为自己项目定制的 research assistant agent**。

项目设计的妙处：场景足够小（一页纸的辅导），但四层能力一个不少——**小项目练全栈**，比大项目更适合入门。

## 8. 章节 → 能力 → 面试叙事

| 章节 | 你拿到的能力 | 面试怎么聊 |
|---|---|---|
| 环境搭建 | 独立搭 agent 环境 | "能说清楚依赖、token 管理、本地运行" |
| 第一个 agent | prompt 工程 | "用提示词控制 agent 人格与边界" |
| 多步思考 | planning loop | "把复杂任务拆成阶段，串行求解" |
| 记忆 | 上下文管理 | "短期记忆让追问不丢失上下文" |
| 工具调用 | tool use | "计算交给代码，事实交给搜索" |
| 真实项目 | 组装能力 | "四层能力组装成一个可用原型" |

## 9. 课程边界（按大纲）

诚实标注这门课**不**覆盖的部分：按目录，它不涉及 LangGraph 等编排框架、不讲生产部署、不做 RAG——定位是"第一个 agent 从 0 到 1"。更深的内容在进阶课里（见下一步）。

## 10. 为什么这门课重要

- 从"知道 Agent"到"搭出 Agent"，这是求职叙事里最关键的一跃——面试官问的永远是"你做过什么"，不是"你学过什么"；
- LangChain 是 Agent 岗的通用语言，哪怕以后换框架，这套心智模型（tool / memory / planning loop）都复用；
- 跟 MCP 的课是互补的：这门讲"Agent 怎么转起来"，MCP 讲"Agent 怎么接外部世界"。

## 11. 下一步

- 在学中的《Building Agentic AI Systems for Developers》（9%）是这条线的进阶版；
- 简历上的 Agent 项目里，把这门课学到的 planning loop 讲清楚——能 defend 的细节才是加分项；
- 动手复刻：按课程路径在本机跑一遍 joke teller → multistep → study buddy，留可运行的代码当作品。

## 12. 课程信息

- **讲师**：Walter Shields（tech educator）
- **规模**：1h 20m，Intermediate；含 1 个练习文件（Ex_Files_Build_Agents_LangChain.zip）
- **技能标签**：Hugging Face Products、AI Agents、LangChain、AI
- **课程主页**：https://www.linkedin.com/learning/build-with-ai-autonomous-agents-with-langchain-and-hugging-face
- **学习建议**：跟着视频敲代码而不是只看——每个项目都依赖前一个项目的环境，分步走最省力

---

*注：本文为课程公开内容的学习整理；概念讲解用自己的话重写，配图为原创重绘。*
