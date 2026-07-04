// Freshness window for the RSS feed: curated items older than this drop off.
// Keep in sync with gatsby-node.js FRESHNESS_DAYS and scripts MAX_AGE_DAYS.
const FRESH_CUTOFF = new Date(Date.now() - 14 * 864e5).toISOString()

module.exports = {
  siteMetadata: {
    title: "Babels",
    author: "Arjun G. Raman",
    siteUrl: "https://babels.dev",
    siteImage: "/assets/bg-austin.jpg",
    description: "AI Detection Engineering Solutions and News for Cyber Defense Practitioners"
  },
  plugins: [
    `gatsby-plugin-netlify`,
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/static/assets/`,
        name: `assets`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/articles/`,
        name: `articles`,
      },
    },
    `gatsby-plugin-mdx`,
    {
      resolve: `gatsby-plugin-sharp`,
      options: {
        defaults: {
          formats: [`auto`, `webp`],
          placeholder: `dominantColor`,
          quality: 80,
          breakpoints: [750, 1080, 1366, 1920],
          backgroundColor: `transparent`,
        },
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-image`,
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: 'Babels',
        short_name: 'Babels',
        start_url: '/',
        background_color: '#663399',
        theme_color: '#663399',
        display: 'minimal-ui',
        icon: 'static/assets/superpower-logo-x200.png', // This path is relative to the root of the site.
      },
    },
    {
      resolve: `gatsby-plugin-gdpr-cookies`,
      options: {
        googleAnalytics: {
          trackingId: 'UA-000000-2', // leave empty if you want to disable the tracker
          cookieName: 'gatsby-gdpr-google-analytics', // default
          anonymize: true, // default
          allowAdFeatures: false // default
        },
        googleTagManager: {
          trackingId: 'GTM-00000000', // leave empty if you want to disable the tracker
          cookieName: 'gatsby-gdpr-google-tagmanager', // default
          dataLayerName: 'dataLayer', // default
        },
        facebookPixel: {
          pixelId: 'YOUR_FACEBOOK_PIXEL_ID', // leave empty if you want to disable the tracker
          cookieName: 'gatsby-gdpr-facebook-pixel', // default
        },
        tikTokPixel: {
          pixelId: 'YOUR_TIKTOK_PIXEL_ID', // leave empty if you want to disable the tracker
          cookieName: 'gatsby-gdpr-tiktok-pixel', // default
        },
        hotjar: {
          hjid: '0000000',
          hjsv: '6',
          cookieName: 'gatsby-gdpr-hotjar', // default
        },
        // defines the environments where the tracking should be available  - default is ["production"]
        environments: ['production', 'development']
      },
    },
    'gatsby-plugin-sass',
    // Ships a self-unregistering service worker so browsers that cached an
    // earlier `gatsby-plugin-offline` SW actively uninstall it (otherwise the
    // stale app shell keeps intercepting navigation to newer routes).
    'gatsby-plugin-remove-serviceworker',
    `gatsby-plugin-sitemap`,
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        query: `
          {
            site {
              siteMetadata {
                title
                description
                siteUrl
              }
            }
          }
        `,
        feeds: [
          {
            serialize: ({ query: { site, allMdx } }) => {
              const cutoff = new Date(FRESH_CUTOFF)
              return allMdx.nodes
                // Curated items age out after the window; originals never expire.
                .filter(
                  (node) =>
                    node.frontmatter.type === 'original' ||
                    new Date(node.frontmatter.date) >= cutoff
                )
                .map((node) => {
                  const url = `${site.siteMetadata.siteUrl}/articles/${node.fields.slug}`
                  return {
                    title: node.frontmatter.title,
                    description: node.frontmatter.value,
                    date: node.frontmatter.date,
                    url,
                    guid: url,
                  }
                })
            },
            query: `
              {
                allMdx(
                  sort: { frontmatter: { date: DESC } }
                  filter: { frontmatter: { draft: { ne: true } } }
                ) {
                  nodes {
                    fields { slug }
                    frontmatter {
                      title
                      value
                      date
                      type
                    }
                  }
                }
              }
            `,
            output: `/rss.xml`,
            title: `Babels — Detection Engineering Articles`,
            site_url: `https://babels.dev`,
            feed_url: `https://babels.dev/rss.xml`,
          },
        ],
      },
    },
  ],
}
