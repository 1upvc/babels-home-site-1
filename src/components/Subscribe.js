import React from 'react'
import PropTypes from 'prop-types'

// Buttondown username — change this to your Buttondown handle.
// Dashboard → Settings → the "username" in your embeddable form URL.
const BUTTONDOWN_USERNAME = 'babels'

const Subscribe = ({ heading, blurb }) => (
  <div className="subscribe">
    {heading && <h3>{heading}</h3>}
    {blurb && <p>{blurb}</p>}
    <form
      className="subscribe-form"
      action={`https://buttondown.email/api/emails/embed-subscribe/${BUTTONDOWN_USERNAME}`}
      method="post"
      target="_blank"
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
        <li><input type="submit" value="Subscribe" className="special" /></li>
      </ul>
    </form>
  </div>
)

Subscribe.propTypes = {
  heading: PropTypes.string,
  blurb: PropTypes.string,
}

Subscribe.defaultProps = {
  heading: 'Subscribe',
  blurb: 'Short, high-signal articles and news summarized — at a frequency of your choosing. One click to subscribe.',
}

export default Subscribe
