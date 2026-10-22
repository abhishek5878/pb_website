import rss from '@astrojs/rss';
import { getWriting, label } from '../lib/posts';
import { me } from '../data/me';

export async function GET(context) {
  const posts = await getWriting();
  return rss({
    title: me.name,
    description: me.interests,
    site: context.site,
    items: posts.map((p) => ({
      title: label(p),
      pubDate: p.date,
      description: p.excerpt,
      link: p.href,
    })),
  });
}
