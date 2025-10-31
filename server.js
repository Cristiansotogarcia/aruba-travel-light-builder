const express = require('express');
const path = require('path');
const { Prerenderer } = require('./src/lib/prerender');

const app = express();
const PORT = process.env.PORT || 3001;

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware to detect social media crawlers
function isSocialMediaCrawler(userAgent) {
  if (!userAgent) return false;
  const crawlers = [
    'facebookexternalhit',
    'facebookcatalog',
    'twitterbot',
    'linkedinbot',
    'whatsapp',
    'slackbot',
    'telegrambot',
    'discordbot',
    'skypeuripreview',
    'pinterest',
    'tiktok',
    'snapchat'
  ];
  const lowerUserAgent = userAgent.toLowerCase();
  return crawlers.some(crawler => lowerUserAgent.includes(crawler));
}

// Handle all routes
app.get('*', async (req, res) => {
  const userAgent = req.get('User-Agent');
  const isCrawler = isSocialMediaCrawler(userAgent);

  console.log(`Request: ${req.path}, User-Agent: ${userAgent}, Is Crawler: ${isCrawler}`);

  if (isCrawler && req.path.startsWith('/equipment/') && req.path !== '/equipment/') {
    try {
      // Extract product slug
      const slug = req.path.replace('/equipment/', '');
      console.log(`Fetching SEO data for product: ${slug}`);

      const seoData = await Prerenderer.getProductSEOData(slug);
      const html = Prerenderer.generatePrerenderedHTML(seoData, true);

      console.log(`Serving prerendered HTML for: ${req.path}`);
      res.send(html);
    } catch (error) {
      console.error('Prerendering error:', error);
      // Serve default HTML on error
      const html = Prerenderer.generatePrerenderedHTML(null, false);
      res.send(html);
    }
  } else {
    // Serve the normal React app
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📱 Social media crawler detection enabled`);
  console.log(`🔍 Crawlers will get prerendered HTML with product images`);
});
