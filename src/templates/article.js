import React from 'react'
import { graphql, Link } from 'gatsby'
import Layout from '../components/layout'
import Subscribe from '../components/Subscribe'

const ArticleTemplate = ({ data, children }) => {
  const article = data.mdx
  const fm = article.frontmatter
  const isCurated = fm.type === 'curated'
  const displayDate = new Date(fm.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Layout>
      <article className="article">
        <p className="article-back">
          <Link to="/articles">&larr; All articles</Link>
        </p>

        <h1>{fm.title}</h1>

        <p className="article-meta">
          {isCurated ? 'Curated' : 'Original'} &middot; {displayDate}
          {fm.sourceName && <> &middot; {fm.sourceName}</>}
        </p>

        {fm.value && <p className="article-value"><strong>{fm.value}</strong></p>}

        {fm.tags && fm.tags.length > 0 && (
          <ul className="article-tags">
            {fm.tags.map((tag) => (
              <li key={tag}>#{tag}</li>
            ))}
          </ul>
        )}

        <div className="article-body">{children}</div>

        {isCurated && fm.sourceUrl && (
          <p className="article-source">
            <a href={fm.sourceUrl} target="_blank" rel="noopener noreferrer">
              Read the original at {fm.sourceName || 'the source'} &nbsp;&rarr;
            </a>
          </p>
        )}

        <hr />

        <Subscribe />
      </article>
    </Layout>
  )
}

export const Head = ({ data }) => {
  const fm = data.mdx.frontmatter
  const siteUrl = data.site.siteMetadata.siteUrl
  const canonical = `${siteUrl}/articles/${data.mdx.fields.slug}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: fm.title,
    description: fm.value,
    datePublished: fm.date,
    keywords: (fm.keywords || fm.tags || []).join(', '),
    author: { '@type': 'Person', name: fm.sourceName || 'Babels' },
    publisher: { '@type': 'Organization', name: 'Babels' },
    mainEntityOfPage: canonical,
    url: canonical,
  }

  return (
    <>
      <title>{fm.title} | Babels</title>
      <meta name="description" content={fm.value} />
      {fm.keywords && <meta name="keywords" content={fm.keywords.join(', ')} />}
      <link rel="canonical" href={canonical} />
      <meta property="og:type" content="article" />
      <meta property="og:title" content={fm.title} />
      <meta property="og:description" content={fm.value} />
      <meta property="og:url" content={canonical} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </>
  )
}

export const query = graphql`
  query ($id: String!) {
    site {
      siteMetadata {
        siteUrl
      }
    }
    mdx(id: { eq: $id }) {
      fields {
        slug
      }
      frontmatter {
        title
        date
        type
        sourceUrl
        sourceName
        tags
        keywords
        value
      }
    }
  }
`

export default ArticleTemplate
