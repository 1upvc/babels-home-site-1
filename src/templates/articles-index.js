import React, { useMemo, useState } from 'react'
import { graphql, Link } from 'gatsby'
import Layout from '../components/layout'
import Subscribe from '../components/Subscribe'

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

const relOf = (node) =>
  Number.isFinite(node.frontmatter.relevance) ? node.frontmatter.relevance : 3

const byDateDesc = (a, b) =>
  new Date(b.frontmatter.date) - new Date(a.frontmatter.date)

// Build a sorted [value, count] facet list from a node accessor.
function facet(nodes, pick) {
  const counts = new Map()
  for (const n of nodes) {
    for (const v of pick(n)) {
      if (v) counts.set(v, (counts.get(v) || 0) + 1)
    }
  }
  return [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )
}

const ArticlesIndex = ({ data, pageContext }) => {
  // Drafts are visible in development for preview, hidden in the production build.
  const includeDrafts = process.env.NODE_ENV === 'development'
  // Freshness cutoff is baked at build time (epoch in dev) so SSR and client agree.
  const cutoff = new Date(pageContext.cutoff)
  const all = useMemo(
    () =>
      data.allMdx.nodes.filter((n) => {
        if (!includeDrafts && n.frontmatter.draft) return false
        // Curated items age out after the window; originals never expire.
        return (
          n.frontmatter.type === 'original' ||
          new Date(n.frontmatter.date) >= cutoff
        )
      }),
    [data, includeDrafts, pageContext.cutoff]
  )

  const topics = useMemo(() => facet(all, (n) => n.frontmatter.tags || []), [all])
  const sources = useMemo(
    () => facet(all, (n) => [n.frontmatter.sourceName]),
    [all]
  )

  const [selTopics, setSelTopics] = useState(() => new Set())
  const [selSources, setSelSources] = useState(() => new Set())
  const [sortMode, setSortMode] = useState('recent')

  const toggle = (setter) => (val) =>
    setter((prev) => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })

  const clearFilters = () => {
    setSelTopics(new Set())
    setSelSources(new Set())
  }

  const visible = useMemo(() => {
    const filtered = all.filter((n) => {
      const tags = n.frontmatter.tags || []
      const topicOk = selTopics.size === 0 || tags.some((t) => selTopics.has(t))
      const srcOk =
        selSources.size === 0 || selSources.has(n.frontmatter.sourceName)
      return topicOk && srcOk
    })
    const sorted = [...filtered]
    if (sortMode === 'oldest') sorted.sort((a, b) => -byDateDesc(a, b))
    else if (sortMode === 'relevance')
      sorted.sort((a, b) => relOf(b) - relOf(a) || byDateDesc(a, b))
    else sorted.sort(byDateDesc)
    return sorted
  }, [all, selTopics, selSources, sortMode])

  const anyFilter = selTopics.size > 0 || selSources.size > 0

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

        <div className="article-filters">
          {topics.length > 0 && (
            <div className="filter-group">
              <span className="filter-label">Topics</span>
              <div className="chip-row">
                {topics.map(([tag, count]) => (
                  <button
                    key={tag}
                    type="button"
                    className="chip"
                    aria-pressed={selTopics.has(tag)}
                    onClick={() => toggle(setSelTopics)(tag)}
                  >
                    {tag} <span className="chip-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {sources.length > 1 && (
            <div className="filter-group">
              <span className="filter-label">Sources</span>
              <div className="chip-row">
                {sources.map(([src, count]) => (
                  <button
                    key={src}
                    type="button"
                    className="chip"
                    aria-pressed={selSources.has(src)}
                    onClick={() => toggle(setSelSources)(src)}
                  >
                    {src} <span className="chip-count">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="filter-controls">
            <label className="filter-sort">
              <span className="filter-label">Sort</span>
              <select
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value)}
              >
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest</option>
                <option value="relevance">Relevance</option>
              </select>
            </label>

            <span className="filter-count">
              Showing {visible.length} of {all.length}
            </span>

            {anyFilter && (
              <button type="button" className="filter-clear" onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>

        <ul className="article-list">
          {visible.map((node) => {
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

        {visible.length === 0 && (
          <p className="articles-empty">No articles match those filters.</p>
        )}
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
          relevance
          draft
        }
      }
    }
  }
`

export default ArticlesIndex
