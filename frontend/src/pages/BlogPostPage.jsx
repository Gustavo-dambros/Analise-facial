import { useParams } from 'react-router-dom'
import { Seo, jsonLdBlogPosting } from '@/lib/seo'
export default function BlogPostPage() {
  const { slug } = useParams()
  const post = { title: `Post ${slug}`, description: 'Artigo do blog FaceMax', date: new Date().toISOString(), author: 'FaceMax', image: null }
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <Seo title={post.title} description={post.description} canonical={`/blog/${slug}`} type="article" jsonLd={jsonLdBlogPosting({ title: post.title, description: post.description, slug, datePublished: post.date, dateModified: post.date, authorName: post.author })} />
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="text-text-secondary mt-2">{post.description}</p>
      <a href={`/blog/${slug}.md`} className="text-brand-accent text-sm underline mt-4 inline-block">Ver versão Markdown para LLMs</a>
      <article className="prose prose-invert mt-8">Conteúdo…</article>
    </div>
  )
}
