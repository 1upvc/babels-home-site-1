/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.org/docs/node-apis/
 */

const path = require('path')
const fs = require('fs')

// Add a `fields.slug` to every MDX article node.
exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions

  if (node.internal.type === `Mdx`) {
    let slug = node.frontmatter && node.frontmatter.slug

    if (!slug) {
      // Fall back to the source filename, stripping a leading YYYY-MM-DD- prefix.
      const fileNode = getNode(node.parent)
      const name = fileNode ? fileNode.name : node.id
      slug = name.replace(/^\d{4}-\d{2}-\d{2}-/, '')
    }

    createNodeField({ node, name: `slug`, value: slug })
  }
}

// Generate one page per article at /articles/{slug}.
exports.createPages = async ({ graphql, actions, reporter }) => {
  const { createPage } = actions

  const result = await graphql(`
    {
      allMdx(sort: { frontmatter: { date: DESC } }) {
        nodes {
          id
          fields {
            slug
          }
          internal {
            contentFilePath
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild('Error loading MDX articles', result.errors)
    return
  }

  const articleTemplate = path.resolve(`src/templates/article.js`)

  result.data.allMdx.nodes.forEach((node) => {
    createPage({
      path: `/articles/${node.fields.slug}`,
      // The MDX content-file path is appended so the compiled body renders as `children`.
      component: `${articleTemplate}?__contentFilePath=${node.internal.contentFilePath}`,
      context: { id: node.id },
    })
  })
}

// Emit a JSON Feed (jsonfeed.org) at /feed.json for programmatic consumers.
exports.onPostBuild = async ({ graphql, reporter }) => {
  const result = await graphql(`
    {
      site {
        siteMetadata {
          title
          description
          siteUrl
        }
      }
      allMdx(sort: { frontmatter: { date: DESC } }) {
        nodes {
          fields {
            slug
          }
          frontmatter {
            title
            date
            value
            tags
            sourceUrl
            sourceName
          }
        }
      }
    }
  `)

  if (result.errors) {
    reporter.panicOnBuild('Error building JSON feed', result.errors)
    return
  }

  const { site, allMdx } = result.data
  const siteUrl = site.siteMetadata.siteUrl

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: site.siteMetadata.title,
    home_page_url: `${siteUrl}/articles`,
    feed_url: `${siteUrl}/feed.json`,
    description: site.siteMetadata.description,
    items: allMdx.nodes.map((node) => {
      const url = `${siteUrl}/articles/${node.fields.slug}`
      return {
        id: url,
        url,
        title: node.frontmatter.title,
        summary: node.frontmatter.value,
        content_text: node.frontmatter.value,
        date_published: new Date(node.frontmatter.date).toISOString(),
        tags: node.frontmatter.tags || [],
        ...(node.frontmatter.sourceUrl
          ? { external_url: node.frontmatter.sourceUrl }
          : {}),
        ...(node.frontmatter.sourceName
          ? { author: { name: node.frontmatter.sourceName } }
          : {}),
      }
    }),
  }

  fs.writeFileSync(
    path.join('public', 'feed.json'),
    JSON.stringify(feed, null, 2)
  )
  reporter.info(`Wrote JSON feed with ${feed.items.length} items to /feed.json`)
}
