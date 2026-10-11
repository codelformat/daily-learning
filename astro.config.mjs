import { defineConfig } from 'astro/config';
import rss from '@astrojs/rss';

// ---------------------------------------------------------------------------
// 部署前改这里：
//   site: 你的 GitHub Pages 地址（用户名换成你自己的）
//   base: 仓库名；如果是 <用户名>.github.io 这种用户主页仓库，改成 '/'
// ---------------------------------------------------------------------------
export default defineConfig({
  site: 'https://codelformat.github.io',
  base: '/daily-learning',
});
