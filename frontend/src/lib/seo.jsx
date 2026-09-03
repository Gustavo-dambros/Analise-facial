import { Helmet } from 'react-helmet-async'

const CANONICAL = 'https://facemax.pro'

export function Seo({ title, description, canonical, type='website', image, noindex=false, jsonLd }) {
  const url = canonical ? `${CANONICAL}${canonical}` : CANONICAL
  const metaTitle = title ? `${title} — FaceMax` : 'FaceMax — Elite da Estética'
  const desc = description || 'A melhor IA brasileira de avaliação facial. Simetria, terços faciais e visagismo por especialistas reais.'
  const ogImg = image || `${CANONICAL}/og-image?title=${encodeURIComponent(title||'FaceMax')}`
  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={desc} />
        <link rel="canonical" href={url} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={desc} />
        <meta property="og:type" content={type} />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImg} />
        <meta property="og:site_name" content="FaceMax" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={desc} />
        <meta name="twitter:image" content={ogImg} />
        {noindex && <meta name="robots" content="noindex, nofollow" />}
      </Helmet>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
    </>
  )
}

export const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FaceMax",
  "url": CANONICAL,
  "logo": `${CANONICAL}/logo.png`,
  "sameAs": ["https://instagram.com/facemax","https://linkedin.com/company/facemax"],
  "contactPoint": { "@type": "ContactPoint", "email": "suporte@facemax.pro", "contactType": "customer support", "availableLanguage": ["pt-BR"] }
}

export const jsonLdSoftwareApp = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FaceMax",
  "applicationCategory": "LifestyleApplication",
  "operatingSystem": "Web",
  "offers": [
    { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "BRL" },
    { "@type": "Offer", "name": "Pro", "price": "29.90", "priceCurrency": "BRL" }
  ],
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "ratingCount": "1247" }
}

export function jsonLdFAQ(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": items.map(q => ({ "@type": "Question", "name": q.q, "acceptedAnswer": { "@type": "Answer", "text": q.a } }))
  }
}

export function jsonLdBlogPosting({ title, description, slug, datePublished, dateModified, authorName, image }) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "image": image || `${CANONICAL}/og-image?title=${encodeURIComponent(title)}`,
    "author": { "@type": "Person", "name": authorName || "FaceMax" },
    "publisher": jsonLdOrganization,
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "mainEntityOfPage": `${CANONICAL}/blog/${slug}`,
    "url": `${CANONICAL}/blog/${slug}`
  }
}
