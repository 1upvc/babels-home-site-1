import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { Link } from 'gatsby'

// Buttondown username — change this to your Buttondown handle.
// Dashboard → Settings → the "username" in your embeddable form URL.
const BUTTONDOWN_USERNAME = 'babels'
// Use the canonical buttondown.com host directly: buttondown.email 302-redirects
// to buttondown.com, and a cross-host redirect trips the CSP connect-src (so the
// fetch would reject and show a false error even though the subscribe succeeds).
const ACTION_URL = `https://buttondown.com/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`

const Subscribe = ({ heading, blurb }) => {
  // idle | submitting | success | error
  const [status, setStatus] = useState('idle')

  const onSubmit = (e) => {
    e.preventDefault()
    const email = e.target.email.value.trim()
    if (!email) return
    setStatus('submitting')

    // no-cors: the embed endpoint doesn't send CORS headers, so the response is
    // opaque. The POST still reaches Buttondown (subscriber added, confirmation
    // email sent), so we optimistically show success and only treat a network
    // failure as an error. CSP connect-src already allows buttondown.email.
    fetch(ACTION_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({ email, embed: '1' }),
    })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'))
  }

  if (status === 'success') {
    return (
      <div className="subscribe" aria-live="polite">
        {heading && <h3>{heading}</h3>}
        <p className="subscribe-success">
          Thanks for subscribing! Check your inbox to confirm — then keep reading.
        </p>
        <p>
          <Link to="/articles">Browse articles &rarr;</Link>
        </p>
      </div>
    )
  }

  return (
    <div className="subscribe">
      {heading && <h3>{heading}</h3>}
      {blurb && <p>{blurb}</p>}
      <form
        className="subscribe-form"
        action={ACTION_URL}
        method="post"
        onSubmit={onSubmit}
      >
        <div className="field">
          <label className="sr-only" htmlFor="bd-email">Email address</label>
          <input
            type="email"
            name="email"
            id="bd-email"
            placeholder="you@company.com"
            required
          />
        </div>
        <input type="hidden" value="1" name="embed" />
        <ul className="actions">
          <li>
            <input
              type="submit"
              value={status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
              className="special"
              disabled={status === 'submitting'}
            />
          </li>
        </ul>
        {status === 'error' && (
          <p className="subscribe-error" aria-live="polite">
            Something went wrong — please try again.
          </p>
        )}
      </form>
    </div>
  )
}

Subscribe.propTypes = {
  heading: PropTypes.string,
  blurb: PropTypes.string,
}

Subscribe.defaultProps = {
  heading: 'Subscribe',
  blurb: 'Short, high-signal articles and news summarized — at a frequency of your choosing. One click to subscribe.',
}

export default Subscribe
