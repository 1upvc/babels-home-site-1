import React from 'react'
import { graphql, Link } from 'gatsby'
import Layout from '../components/layout'
import Subscribe from '../components/Subscribe'

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const ArticlesPage = ({ data }) => {
  const articles = data.allMdx.nodes

  return (
    <Layout>
      <div className="articles-page">
        <p className="article-back">
          <Link to="/">&larr; Home</Link>
        </p>

        <h1>Articles</h1>
        <p className="articles-intro">
          Curated news and original thought pieces on detection engineering —
          short summaries that grab the key words and value from each author.
        </p>

        <Subscribe />

        <ul className="article-list">
          {articles.map((node) => {
            const fm = node.frontmatter
            return (
              <li key={node.id} className="article-card">
                <div className="article-card-meta">
                  <span className={`badge badge-${fm.type}`}>
                    {fm.type === 'curated' ? 'Curated' : 'Original'}
                  </span>
                  <span className="article-card-date">{formatDate(fm.date)}</span>
                </div>

                <h2>
                  <Link to={`/articles/${node.fields.slug}`}>{fm.title}</Link>
                </h2>

                {fm.sourceName && (
                  <p className="article-card-source">{fm.sourceName}</p>
                )}

                {fm.value && <p className="article-card-value">{fm.value}</p>}

                {fm.tags && fm.tags.length > 0 && (
                  <ul className="article-tags">
                    {fm.tags.map((tag) => (
                      <li key={tag}>#{tag}</li>
                    ))}
                  </ul>
                )}

                <p className="article-card-links">
                  <Link to={`/articles/${node.fields.slug}`}>Read summary</Link>
                  {fm.type === 'curated' && fm.sourceUrl && (
                    <>
                      {' '}&middot;{' '}
                      <a href={fm.sourceUrl} target="_blank" rel="noopener noreferrer">
                        Read original &nbsp;&rarr;
                      </a>
                    </>
                  )}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </Layout>
  )
}

export const Head = () => (
  <>
    <title>Articles | Babels</title>
    <meta
      name="description"
      content="Curated news and original thought pieces on detection engineering — short, high-signal summaries for cyber defense practitioners."
    />
    <link rel="alternate" type="application/rss+xml" title="Babels Articles" href="/rss.xml" />
    <link rel="alternate" type="application/feed+json" title="Babels Articles" href="/feed.json" />
  </>
)

export const query = graphql`
  {
    allMdx(sort: { frontmatter: { date: DESC } }) {
      nodes {
        id
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
          value
        }
      }
    }
  }
`

export default ArticlesPage
