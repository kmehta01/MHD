import { Link, NavLink } from "react-router-dom";

const socialIconClasses = {
  facebook_f: "fa-facebook-f",
  x_twitter: "fa-x-twitter",
  instagram: "fa-instagram",
  youtube: "fa-youtube",
};

function Header({ branding, language, onLanguageChange, settings, socialLinks = [], t }) {
  const navClass = ({ isActive }) => `nav-link${isActive ? " active" : ""}`;
  const splitNavClass = ({ isActive }) =>
    `nav-link main-navbar__split-link${isActive ? " active" : ""}`;

  const disabledLinkProps = {
    href: "#",
    "aria-disabled": "true",
    onClick: (event) => event.preventDefault(),
  };

  return (
    <header className="site-header">
      <div className="header-topbar">
        <div className="container site-header__container">
          <div className="header-topbar__inner">
            <div
              className="header-topbar__emergency"
              aria-label="Emergency and social services contacts"
            >
              {branding?.officialPhone ? <a
                className="header-topbar__hotline"
                href={`tel:${branding.officialPhone.replace(/[^+\d]/g, "")}`}
                aria-label="24/7 emergency and social services hotline"
              >
                <span className="header-topbar__phone">
                  <i className="fa-solid fa-phone" aria-hidden="true"></i>
                </span>
                <span className="header-topbar__copy">
                  <span className="header-topbar__title">
                    {branding.officialPhoneLabel}
                  </span>
                  <span className="header-topbar__subtitle">{branding.officialPhone}</span>
                </span>
              </a> : null}
            </div>

            {settings?.grievanceSubmission?.allowPublicSubmission ? <Link
              className="header-topbar__quick-link header-topbar__complaint-link"
              to="/submit-complaint"
              aria-label="Submit complaint ticket"
            >
              <i className="fa-regular fa-pen-to-square" aria-hidden="true"></i>
              <span>{t("grievanceSubmission")}</span>
            </Link> : null}

            <label className="header-language-selector">
              <span>{t("language")}</span>
              <select aria-label={t("language")} onChange={(event) => onLanguageChange(event.target.value)} value={language}>
                <option value="English">{t("english")}</option>
                <option value="Spanish">{t("spanish")}</option>
              </select>
            </label>

            {socialLinks.length ? <ul
              className="header-topbar__social"
              aria-label="Social media links"
            >
              {socialLinks.map((link) => <li key={link.platformKey}>
                <a aria-label={link.label} href={link.url} rel="noreferrer noopener" target="_blank">
                  <i className={`fa-brands ${socialIconClasses[link.iconKey]}`} aria-hidden="true"></i>
                </a>
              </li>)}
            </ul> : null}
          </div>
        </div>
      </div>

      <nav
        className="navbar navbar-expand-xl main-navbar"
        aria-label="Primary navigation"
      >
        <div className="container site-header__container">
          <Link className="navbar-brand main-navbar__brand" to="/">
            {branding?.logo ? <img src={branding.logo} alt={branding.organizationName} /> : <strong>{branding.organizationShortName}</strong>}
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#mainNavigation"
            aria-controls="mainNavigation"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="mainNavigation">
            <ul className="navbar-nav main-navbar__nav ms-auto">
              <li className="nav-item">
                <NavLink className={navClass} to="/" end>
                  {t("home")}
                </NavLink>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <NavLink className={splitNavClass} to="/about-us">
                  {t("about")}
                </NavLink>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <NavLink className={splitNavClass} to="/leadership">
                  {t("leadership")}
                </NavLink>
              </li>

              <li className="nav-item dropdown main-navbar__mega-item main-navbar__split-item">
                <NavLink className={splitNavClass} to="/departments">
                  {t("departments")}
                </NavLink>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Departments menu"
                ></button>

                <div className="dropdown-menu main-navbar__mega-menu">
                  <div className="main-navbar__mega-grid">
                    <div className="main-navbar__mega-column">
                      <a
                        className="main-navbar__mega-heading"
                        {...disabledLinkProps}
                      >
                        Family Support &amp; Gender Affairs
                      </a>
                      <a {...disabledLinkProps}>Family Support Services</a>
                      <a {...disabledLinkProps}>Gender Services</a>
                      <a {...disabledLinkProps}>Economic Empowerment Program</a>
                      <a {...disabledLinkProps}>Disability Desk</a>
                      <a {...disabledLinkProps}>Golden Haven Rest Home</a>
                      <a {...disabledLinkProps}>
                        Good Samaritan Homeless Shelter
                      </a>
                    </div>

                    <div className="main-navbar__mega-column">
                      <a
                        className="main-navbar__mega-heading"
                        {...disabledLinkProps}
                      >
                        Community Rehabilitation Department
                      </a>
                      <a {...disabledLinkProps}>Community Counselling Center</a>
                      <a {...disabledLinkProps}>Court &amp; Case Management</a>
                      <a {...disabledLinkProps}>The HUB Resource Center</a>
                      <a {...disabledLinkProps}>Criminal Records</a>
                      <a {...disabledLinkProps}>
                        New Beginnings Youth Development Center
                      </a>
                    </div>

                    <div className="main-navbar__mega-column">
                      <a
                        className="main-navbar__mega-heading"
                        {...disabledLinkProps}
                      >
                        Human Services Department
                      </a>
                      <a {...disabledLinkProps}>
                        Child Placement &amp; Specialized Services
                      </a>
                      <a {...disabledLinkProps}>Child Protection Services</a>
                      <a {...disabledLinkProps}>
                        Community &amp; Parent Empowerment Program
                      </a>
                      <a {...disabledLinkProps}>
                        Alternative Care &amp; Anti-Trafficking in Persons
                        (ATIPS)
                      </a>
                      <a {...disabledLinkProps}>Child Care Centers</a>
                    </div>

                    <div className="main-navbar__mega-column">
                      <a
                        className="main-navbar__mega-heading"
                        {...disabledLinkProps}
                      >
                        Policy &amp; Planning Unit
                      </a>
                    </div>

                    <div className="main-navbar__mega-column">
                      <a
                        className="main-navbar__mega-heading"
                        {...disabledLinkProps}
                      >
                        Inspector of Social Services Institutions
                      </a>
                    </div>
                  </div>
                </div>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <NavLink
                  className={splitNavClass}
                  to="/submit-complaint"
                >
                  {t("apply")}
                </NavLink>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Apply for Services menu"
                ></button>
                <ul className="dropdown-menu">
                  <li>
                    <Link className="dropdown-item" to="/submit-complaint">
                      {t("submitTicket")}
                    </Link>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Apply for Social Assistance
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Report Family Issues
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Community Rehabilitation Intake
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Day Care
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Residential Care
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Foster Care
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <a
                  className="nav-link main-navbar__split-link"
                  {...disabledLinkProps}
                >
                  Programs
                </a>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Programs menu"
                ></button>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Gender-Based Violence Support Services and Gender
                      Mainstreaming
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Family Support Services
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Economic Empowerment
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Disability Desk
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <a
                  className="nav-link main-navbar__split-link"
                  {...disabledLinkProps}
                >
                  Affiliate Organizations
                </a>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Affiliate Organizations menu"
                ></button>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      National Council on Ageing
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      National Women's Commission
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      National Commission for Families &amp; Children
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Anti-Trafficking in Persons Council
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <a
                  className="nav-link main-navbar__split-link"
                  {...disabledLinkProps}
                >
                  Resources
                </a>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Resources menu"
                ></button>
                <ul className="dropdown-menu">
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Annual Reports
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Policies
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Statistics
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown main-navbar__split-item">
                <a
                  className="nav-link main-navbar__split-link"
                  {...disabledLinkProps}
                >
                  News &amp; Media
                </a>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open News & Media menu"
                ></button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Gallery
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Blog
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Facebook
                    </a>
                  </li>
                </ul>
              </li>

              <li className="nav-item dropdown main-navbar__contact-item main-navbar__split-item">
                <a
                  className="nav-link main-navbar__split-link"
                  {...disabledLinkProps}
                >
                  Contact Us
                </a>
                <button
                  className="nav-link dropdown-toggle main-navbar__split-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  aria-label="Open Contact Us menu"
                ></button>
                <ul className="dropdown-menu dropdown-menu-end main-navbar__contact-menu">
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Ministry Headquarters
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Main Department Contacts
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Rehabilitation
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      District Offices
                    </a>
                  </li>
                  <li>
                    <a className="dropdown-item" {...disabledLinkProps}>
                      Contact Form
                    </a>
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;
