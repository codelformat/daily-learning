# 每天一门课 📚

Harry 的公开学习笔记：每天刷一门课（LinkedIn Learning 为主），学完 20 分钟内写完笔记并 push。

方向：**AI Agent / MCP / 区块链** —— 为 AI × Web3 的求职路攒弹药。

博客用 [Astro](https://astro.build) 构建，部署在 GitHub Pages。

## 日常 workflow（每天 3 步）

1. **复制模板**：`cp template.md src/content/posts/2026-10-12-xxx.md`
2. **写 20 分钟**：按模板填——3 个关键收获、1 个搞懂的点、跟求职目标的关系。最低标准 5 条 bullet，不许打磨。
3. **push**：
   ```bash
   git add -A && git commit -m "post: 课程名" && git push
   ```
   GitHub Actions 会自动构建并发布。

frontmatter 字段说明：

```yaml
---
title: 课程中文名            # 必填
subtitle: English Title      # 选填
date: 2026-10-12             # 必填，上课日期
platform: LinkedIn Learning  # 选填
status: completed            # completed（已完成）/ in-progress（学习中）
progress: 68                 # 在学中才填，0-100
tags: [MCP, Agent]           # 标签，用于筛选
track: agent                 # agent（Agent/MCP 赛道）/ blockchain（区块链赛道）
---
```

## 本地开发

```bash
npm install
npm run dev     # http://localhost:4321
npm run build   # 构建到 dist/
```

## 首次发布到 GitHub（只做一次）

```bash
git remote add origin git@github.com/<你的用户名>/daily-learning.git
git push -u origin main
```

然后去仓库 **Settings → Pages → Build and deployment → Source** 选择 **GitHub Actions**。
发布后访问：`https://<你的用户名>.github.io/daily-learning/`

> 记得把 `astro.config.mjs` 里的 `site` 和 `base` 换成你自己的用户名和仓库名。

## License

MIT
