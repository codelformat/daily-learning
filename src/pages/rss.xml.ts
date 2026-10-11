import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: { site?: URL }) {
  const posts = (await getCollection('posts')).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: '每天一门课 · Harry 的学习笔记',
    description: '每天一门课，学完就记：AI Agent / MCP / 区块链。',
    site: context.site ?? 'https://codelformat.github.io',
    items: posts.map((p) => ({
      title: `${p.data.title}${p.data.subtitle ? ` — ${p.data.subtitle}` : ''}`,
      pubDate: p.data.date,
      link: `${base}/posts/${p.id.replace(/\.md$/, '')}/`,
    })),
  });
}
