import { useEffect } from 'react'
export function useCanonicalAndTrailingSlash() {
  useEffect(() => {
    const { pathname, search, host } = window.location
    // Trailing slash -> without (301-like client redirect)
    if (pathname.length > 1 && pathname.endsWith('/')) {
      const next = pathname.slice(0, -1) + search
      window.history.replaceState(null, '', next)
    }
    // www -> apex
    if (host === 'www.facemax.pro') {
      window.location.replace(`https://facemax.pro${pathname}${search}`)
    }
  }, [])
}
