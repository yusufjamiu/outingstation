import { Helmet } from 'react-helmet';

export default function SEO({ 
  title = 'OutingStation - Discover Amazing Events & Places in Nigeria',
  description = 'Find and book the best events, webinars, and campus activities across Nigeria. Connect with organizers and never miss an event.',
  image = 'https://outingstation.com/og-image.jpg',
  url = 'https://outingstation.com',
  type = 'website',
  keywords = 'events Nigeria, Lagos events, campus events, webinars, event booking, Nigeria activities'
}) {
  const siteName = 'OutingStation';
  const twitterHandle = '@outingstation';
  const instagramHandle = '@outingstation';
  const linkedinUrl = 'https://linkedin.com/company/outingstation';
  
  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{title}</title>
      <meta name="title" content={title} />
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content={siteName} />
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={title} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
      <meta property="twitter:creator" content={twitterHandle} />
      <meta property="twitter:site" content={twitterHandle} />
      
      {/* Instagram (via Open Graph) */}
      <meta property="instagram:creator" content={instagramHandle} />
      
      {/* LinkedIn */}
      <meta property="linkedin:owner" content={linkedinUrl} />
      
      {/* Additional Tags */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="OutingStation" />
      <meta name="geo.region" content="NG" />
      <meta name="geo.placename" content="Nigeria" />
      <link rel="canonical" href={url} />
      
      {/* App Links */}
      <meta property="al:ios:app_name" content="OutingStation" />
      <meta property="al:android:app_name" content="OutingStation" />
    </Helmet>
  );
}