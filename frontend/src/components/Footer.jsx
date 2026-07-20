import { Link } from 'react-router-dom'

function Footer() {
  const disabledLinkProps = {
    href: '#',
    'aria-disabled': 'true',
    onClick: (event) => event.preventDefault(),
  }
  const disabledGlowLinkProps = {
    ...disabledLinkProps,
    className: 'glow-link',
  }

  const handleNewsletterSubmit = (event) => {
    event.preventDefault()
  }

  return (
    <footer className="site-footer" id="contact">
      <div className="site-footer__main">
        <div className="container">
          <div className="site-footer__grid">
            <div className="site-footer__brand">
              <Link className="site-footer__logo-link" to="/">
                <img
                  className="site-footer__logo"
                  src="/assets/images/ministry-logo-footer-white.png"
                  alt="Ministry of Human Development, Family Support, and Gender Affairs"
                />
              </Link>

              <p className="site-footer__about">
                Committed to protecting vulnerable persons, strengthening families,
                promoting equality, and improving access to social services across
                Belize.
              </p>

              <form
                className="footer-newsletter"
                action="#"
                aria-label="Email subscription"
                onSubmit={handleNewsletterSubmit}
              >
                <label className="visually-hidden" htmlFor="footerEmail">
                  Email Address
                </label>
                <input id="footerEmail" type="email" placeholder="Email Address" />
                <button type="submit" aria-label="Submit email address">
                  <i className="fa-regular fa-paper-plane" aria-hidden="true"></i>
                </button>
              </form>
            </div>

            <nav className="site-footer__column" aria-labelledby="footerQuickLinks">
              <h2 className="site-footer__heading" id="footerQuickLinks">
                <i className="fa-solid fa-circle" aria-hidden="true"></i>
                Quick Links
              </h2>

              <ul className="site-footer__links">
                <li>
                  <Link className="glow-link" to="/about-us">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>About Us</span>
                  </Link>
                </li>
                <li>
                  <Link className="glow-link" to="/leadership">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Leadership</span>
                  </Link>
                </li>
                <li>
                  <Link className="glow-link" to="/departments">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Departments</span>
                  </Link>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Apply for Services</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Programs</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Resources</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>News &amp; Media</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Contact Us</span>
                  </a>
                </li>
              </ul>
            </nav>

            <nav className="site-footer__column" aria-labelledby="footerKeyServices">
              <h2 className="site-footer__heading" id="footerKeyServices">
                <i className="fa-solid fa-circle" aria-hidden="true"></i>
                Key Services
              </h2>

              <ul className="site-footer__links">
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Apply for Social Assistance</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Family Support Services</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Gender Services</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Economic Empowerment Program</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Disability Desk</span>
                  </a>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>Foster Care</span>
                  </a>
                </li>
              </ul>
            </nav>

            <section
              className="site-footer__column site-footer__contact"
              aria-labelledby="footerContactInfo"
            >
              <h2 className="site-footer__heading" id="footerContactInfo">
                <i className="fa-solid fa-circle" aria-hidden="true"></i>
                Contact Info
              </h2>

              <address>
                <div className="site-footer__contact-item">
                  <span>Address</span>
                  <p>
                    West Block, Independence Plaza
                    <br />
                    Belmopan, Belize
                  </p>
                </div>

                <div className="site-footer__contact-item">
                  <span>Tel</span>
                  <a className="glow-link" href="tel:+5018222161">
                    (501) 822-2161
                  </a>
                </div>

                <div className="site-footer__contact-item">
                  <span>Email</span>
                  <a
                    className="glow-link"
                    href="mailto:senior.secretary@humandev.gov.bz"
                  >
                    senior.secretary@humandev.gov.bz
                  </a>
                </div>
              </address>
            </section>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container">
          <div className="site-footer__bottom-inner">
            <p>&copy;2026 TMedia Business Solution Pvt. Ltd. All rights reserved</p>
            <ul>
              <li>
                <a {...disabledGlowLinkProps}>Privacy Policy</a>
              </li>
              <li>
                <a {...disabledGlowLinkProps}>Terms of Use</a>
              </li>
              <li>
                <a {...disabledGlowLinkProps}>Accessibility</a>
              </li>
              <li>
                <a {...disabledGlowLinkProps}>Sitemap</a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
