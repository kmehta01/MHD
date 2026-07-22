import { Link } from 'react-router-dom'

function Footer({ settings, t }) {
  const branding = settings?.organization || {};
  const footer = settings?.footer || {};
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
                {branding?.logo ? <img className="site-footer__logo" src={branding.logo} alt={branding.organizationName} /> : <strong>{branding.organizationShortName}</strong>}
              </Link>

              <p className="site-footer__about">{footer.footerText || branding.organizationName}</p>

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
                {t("quickLinks")}
              </h2>

              <ul className="site-footer__links">
                <li>
                  <Link className="glow-link" to="/about-us">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>{t("about")}</span>
                  </Link>
                </li>
                <li>
                  <Link className="glow-link" to="/leadership">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>{t("leadership")}</span>
                  </Link>
                </li>
                <li>
                  <Link className="glow-link" to="/departments">
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>{t("departments")}</span>
                  </Link>
                </li>
                <li>
                  <a {...disabledGlowLinkProps}>
                    <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                    <span>{t("apply")}</span>
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
                {t("keyServices")}
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
                {t("contactInfo")}
              </h2>

              <address>
                {branding.officeAddress || branding.country ? <div className="site-footer__contact-item">
                  <span>{t("address")}</span>
                  <p>{[branding.officeAddress, branding.country].filter(Boolean).join(", ")}</p>
                </div> : null}

                {footer.supportPhone || branding.officialPhone ? <div className="site-footer__contact-item">
                  <span>Tel</span>
                  <a className="glow-link" href={`tel:${(footer.supportPhone || branding.officialPhone).replace(/[^+\d]/g, "")}`}>{footer.supportPhone || branding.officialPhone}</a>
                </div> : null}

                {footer.supportEmail || branding.officialEmail ? <div className="site-footer__contact-item">
                  <span>{t("email")}</span>
                  <a className="glow-link" href={`mailto:${footer.supportEmail || branding.officialEmail}`}>{footer.supportEmail || branding.officialEmail}</a>
                </div> : null}
                {footer.helpdeskWorkingHours ? <div className="site-footer__contact-item"><span>{t("hours")}</span><p>{footer.helpdeskWorkingHours}</p></div> : null}
                {branding.websiteUrl ? <div className="site-footer__contact-item"><span>Website</span><a className="glow-link" href={branding.websiteUrl} rel="noreferrer" target="_blank">{branding.websiteUrl}</a></div> : null}
              </address>
            </section>
          </div>
        </div>
      </div>

      <div className="site-footer__bottom">
        <div className="container">
          <div className="site-footer__bottom-inner">
            <p>&copy; {footer.copyrightYear} {footer.footerText || branding.organizationName}</p>
            <ul>
              {footer.userGuideUrl ? <li><a className="glow-link" href={footer.userGuideUrl} rel="noreferrer" target="_blank">User guide</a></li> : null}
              <li>
                {footer.privacyPolicyUrl ? <a className="glow-link" href={footer.privacyPolicyUrl} rel="noreferrer" target="_blank">{t("privacyPolicy")}</a> : <Link className="glow-link" to="/privacy-policy">{t("privacyPolicy")}</Link>}
              </li>
              <li>
                {footer.termsConditionsUrl ? <a className="glow-link" href={footer.termsConditionsUrl} rel="noreferrer" target="_blank">{t("terms")}</a> : <Link className="glow-link" to="/terms-and-conditions">{t("terms")}</Link>}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer
