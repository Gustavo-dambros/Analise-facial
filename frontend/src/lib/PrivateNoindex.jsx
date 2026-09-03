import { Helmet } from 'react-helmet-async'
export function PrivateNoindex() {
  return <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
}
