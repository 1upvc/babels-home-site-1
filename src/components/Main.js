import React from 'react'
import PropTypes from 'prop-types'
import { Link } from 'gatsby'
import { StaticImage } from "gatsby-plugin-image"
import { RiTwitterFill } from "@react-icons/all-files/ri/RiTwitterFill"
import { RiGithubFill } from "@react-icons/all-files/ri/RiGithubFill"
import { RiYoutubeFill } from "@react-icons/all-files/ri/RiYoutubeFill"
import Subscribe from './Subscribe'

const Main = (props) => {
  const close = <div className="close" onClick={() => {props.onCloseArticle()}}></div>

  return (
      <div ref={props.setWrapperRef} id="main" style={props.timeout ? {display: 'flex'} : {display: 'none'}}>

        <article id="intro" className={`${props.article === 'intro' ? 'active' : ''} ${props.articleTimeout ? 'timeout' : ''}`} style={{display:'none'}}>
          <h2 className="major">About</h2>
          <p>
            Detection engineering is the practice of building, testing, and maintaining the rules and logic that power security alerts.
            Done well, it is the difference between signal and noise. With the onset of AI and GenAI, organizations and teams need better capabilities and sharper insight to adapt.
          </p>
          <p>
            Babels exists to make that practice more accessible. We build open-source tooling and share insights to help cyber defense practitioners raise the quality of their detections and their approaches. Whether it's model context protocol, large language models, agents, or a fully AI-powered SOC — we want to share good insight.
          </p>
          <p>
            Babels work spans three areas:
            <ul>
              <li><strong>Tooling</strong> — open-source detection engineering solutions of all types.</li>
              <li><strong>AI Integration</strong> — LLM-powered workflows for analysts and engineers who want to convert, validate, and deploy rules conversationally, either locally or through an agent via MCP.</li>
              <li><strong>Insight</strong> — curated news and thought pieces on detection engineering, at a frequency of your choosing. Available now via Articles.</li>
            </ul>
          </p>
          {close}
        </article>

        <article id="work" className={`${props.article === 'work' ? 'active' : ''} ${props.articleTimeout ? 'timeout' : ''}`} style={{display:'none'}}>
          <h2 className="major">GitHub</h2>
          <p>
            Babel is a detection engineering approach built on Elastic and SIGMA to help cyber defense practitioners. It comes in two open-source editions depending on your stack.
          </p>

          <h3>Babel — AI Edition</h3>
          <p>
            Babel AI integrates large language model (LLM) capabilities directly into the detection engineering workflow.
            It accelerates SIGMA rule development, threat triage, and log analysis by pairing Elastic with AI-assisted reasoning.
          </p>
          <p>
            An in-app panel is included, and Babel AI also ships an MCP server for analysts and engineers working inside an AI agent
            (such as Claude) who want that agent to do real SIGMA work — convert, validate, test, and deploy — against an Elastic stack,
            conversationally and agentically (the future is bright).
          </p>
          <p>
            Babel AI also supports local model integration, so you can plug in the latest releases from{' '}
            <a href="https://huggingface.co">Hugging Face</a> and <a href="https://ollama.com">Ollama</a> directly into your workflow.
          </p>
          <p>
            <a href="https://github.com/builtbyraman/babel_elastic_ai">View Babel AI on GitHub &rarr;</a>
          </p>

          <h3>Babel — Standard Edition</h3>
          <p>
            Babel Standard is a detection engineering pipeline built on Elastic with no AI dependencies.
            It provides a structured approach to ingesting, normalizing, and alerting on security telemetry —
            giving analysts full control over their detection stack using proven, auditable tooling.
          </p>
          <p>
            <a href="https://github.com/builtbyraman">View Babel on GitHub &rarr;</a>
          </p>

          <hr />

          <h3>Special Thanks</h3>
          <p>
            Babels integrates with several technologies to make meaningful solutions. Thank you to the following organizations and communities:
          </p>
          <ul>
            <li><a href="https://www.anthropic.com">Anthropic</a> — AI assisted coding with Claude; safety research and integration and models powering Babel AI</li>
            <li><a href="https://securityonionsolutions.com">Security Onion</a> — threat hunting and network visibility platform</li>
            <li><a href="https://github.com/nsacyber/GRASSMARLIN">GrassMarlin</a> — passive network mapping for ICS/SCADA environments</li>
            <li><a href="https://www.elastic.co">Elastic</a> — the search and observability engine at the core of Babel</li>
            <li><a href="https://sigmahq.io">SIGMA HQ</a> — the open standard for detection rules</li>
            <li><a href="https://ollama.com">Ollama</a> — local LLM runtime for running models on-device</li>
            <li><a href="https://huggingface.co">Hugging Face</a> — open-source models and datasets powering AI research</li>
            <li><a href="https://unsplash.com/@stellarmond">Carlos Delgado</a> — background photography, via Unsplash</li>
          </ul>
          {close}
        </article>

        <article id="about" className={`${props.article === 'about' ? 'active' : ''} ${props.articleTimeout ? 'timeout' : ''}`} style={{display:'none'}}>
          <h2 className="major">Articles</h2>
          <p>
            Curated news and original thought pieces on detection engineering — short summaries that grab the key words and value statement from each author. Delivered at a frequency of your choosing.
          </p>
          <Subscribe heading={null} />
          <p>
            <Link to="/articles">Browse all articles &rarr;</Link>
          </p>
          {close}
        </article>

        <article id="contact" className={`${props.article === 'contact' ? 'active' : ''} ${props.articleTimeout ? 'timeout' : ''}`} style={{display:'none'}}>
          <h2 className="major">Contact</h2>
          <form
            className="contact-form"
            action="/thanks"
            name="contact"
            method="POST"
            data-netlify="true"
            data-netlify-honeypot="bot-field"
          >
            <input type="hidden" name="form-name" value="contact" />
            <div className="field half first">
              <label htmlFor="name">Name</label>
              <input type="text" name="name" id="name" />
            </div>
            <div className="field half">
              <label htmlFor="email">Email</label>
              <input type="text" name="email" id="email" />
            </div>
            <div className="field">
              <label htmlFor="message">Message</label>
              <textarea name="message" id="message" rows="4"></textarea>
            </div>
            <ul className="actions">
              <li><input type="submit" value="Send Message" className="special" /></li>
              <li><input type="reset" value="Reset" /></li>
            </ul>
          </form>
          <ul className="icons">
            <li>
              <a href="#" className="icon" aria-label="X (Twitter)">
                <RiTwitterFill alt='X (Twitter)'
                  style={{
                    fontSize: "2rem",
                    color: "gray",
                  }}
                />
                <span className="label">X</span>
              </a>
            </li>
<li>
              <a href="#" className="icon" aria-label="GitHub">
                <RiGithubFill alt='GitHub'
                  style={{
                    fontSize: "2em",
                    color: "gray",
                  }}
                />
                <span className="label">GitHub</span>
              </a>
            </li>
            <li>
              <a href="#" className="icon" aria-label="YouTube">
                <RiYoutubeFill alt='YouTube'
                  style={{
                    fontSize: "2em",
                    color: "gray",
                  }}
                />
                <span className="label">YouTube</span>
              </a>
            </li>
          </ul>
          {close}
        </article>

      </div>
  )
}

Main.propTypes = {
  route: PropTypes.object,
  article: PropTypes.string,
  articleTimeout: PropTypes.bool,
  onCloseArticle: PropTypes.func,
  timeout: PropTypes.bool,
  setWrapperRef: PropTypes.func.isRequired,
}

export default Main
