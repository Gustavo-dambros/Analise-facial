export function OptimizedImage({ src, alt, width, height, className, priority=false }) {
  // WebP/AVIF via <picture> + srcset stub — assume /assets has .webp variants or CDN handles accept header
  const webp = src.replace(/\.(png|jpg|jpeg)$/, '.webp')
  const avif = src.replace(/\.(png|jpg|jpeg)$/, '.avif')
  return (
    <picture>
      <source srcSet={avif} type="image/avif" />
      <source srcSet={webp} type="image/webp" />
      <img src={src} alt={alt} width={width} height={height} loading={priority ? 'eager' : 'lazy'} decoding="async" className={className} style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }} />
    </picture>
  )
}
