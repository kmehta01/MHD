import { Link } from "react-router-dom";

const policySections = [
  {
    id: "introduction",
    number: "01",
    title: "Introduction",
    content: (
      <>
        <p>
          The Ministry of Human Development, Family Support and Gender Affairs
          operates the Grievance Redress Management Portal, referred to as the
          “GRM Portal.”
        </p>
        <p>
          This Privacy Policy explains how personal information is collected,
          used, stored, shared, and protected when citizens, representatives,
          government officials, and authorised users access or use the Portal.
        </p>
        <p>
          We process personal information in accordance with the applicable laws
          of Belize, including the Data Protection Act, 2021.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    number: "02",
    title: "Information We Collect",
    intro: "When a grievance is submitted, we may collect:",
    items: [
      "Name, phone number, email address, address, gender, and identification details;",
      "Grievance category, department, location, description, priority, and requested resolution;",
      "Supporting documents, photographs, audio, video, or other evidence;",
      "Information about representatives, witnesses, officials, or other persons involved;",
      "Communication history and grievance-status updates;",
      "Account, login, IP address, device, browser, and security-log information; and",
      "Sensitive information where relevant, including health, family, welfare, disability, safeguarding, or child-protection information.",
    ],
    note: "Users should provide only information that is relevant and necessary for the grievance.",
  },
  {
    id: "how-we-use-information",
    number: "03",
    title: "How We Use Information",
    intro: "Personal information may be used to:",
    items: [
      "Register the grievance and generate a ticket number;",
      "Verify the complainant’s details;",
      "Review, classify, and assign the grievance;",
      "Contact the complainant for additional information;",
      "Investigate, process, escalate, resolve, and close the grievance;",
      "Send acknowledgement and status notifications;",
      "Protect children, vulnerable persons, or individuals at risk;",
      "Monitor response timelines and departmental performance;",
      "Maintain official records and audit trails;",
      "Prevent fraud, misuse, and unauthorised access;",
      "Improve government services; and",
      "Comply with legal, regulatory, safeguarding, and reporting obligations.",
    ],
  },
  {
    id: "sharing-of-information",
    number: "04",
    title: "Sharing of Information",
    intro: "Information may be shared only where reasonably necessary with:",
    items: [
      "The ministry, department, unit, or official responsible for the grievance;",
      "GRM managers, intake officers, administrators, and authorised government users;",
      "Other Government of Belize authorities;",
      "Child-protection, health, emergency, police, regulatory, or safeguarding authorities;",
      "Courts, auditors, investigators, or legal authorities where required; and",
      "Approved hosting, communication, technical-support, or cybersecurity providers.",
    ],
    note: "We do not sell or rent personal information for advertising or commercial purposes.",
  },
  {
    id: "confidentiality-and-security",
    number: "05",
    title: "Confidentiality and Security",
    content: (
      <>
        <p>
          Grievance information may contain confidential or sensitive details.
          Access is limited according to official roles and responsibilities.
        </p>
        <p>We use reasonable security measures, including:</p>
      </>
    ),
    items: [
      "Role-based access controls;",
      "Password and authentication controls;",
      "Encryption and secure data transmission;",
      "Audit logs and activity monitoring;",
      "System backups;",
      "Restricted administrative access; and",
      "Security and incident-response procedures.",
    ],
    after: (
      <>
        <p>No online system is completely secure, and absolute security cannot be guaranteed.</p>
        <p>Users must protect their passwords, ticket numbers, one-time codes, and verification information.</p>
      </>
    ),
  },
  {
    id: "data-retention",
    number: "06",
    title: "Data Retention",
    intro: "Information will be retained only for as long as necessary to:",
    items: [
      "Process and resolve the grievance;",
      "Meet government record-retention requirements;",
      "Support investigations, audits, reporting, or legal claims;",
      "Protect individuals; and",
      "Comply with applicable laws.",
    ],
    note: "Information that is no longer required may be securely deleted, destroyed, archived, or anonymised.",
  },
  {
    id: "your-rights",
    number: "07",
    title: "Your Rights",
    intro: "Subject to the laws of Belize, individuals may request:",
    items: [
      "Access to their personal information;",
      "Correction of inaccurate or incomplete information;",
      "Restriction or objection to certain processing;",
      "Deletion where legally permitted;",
      "Information about how their data is being used; and",
      "Review of certain automated decisions.",
    ],
    note: "Some requests may be refused where information must be retained for legal, safeguarding, public-interest, investigation, or official record-keeping purposes.",
  },
  {
    id: "children-and-vulnerable-persons",
    number: "08",
    title: "Children and Vulnerable Persons",
    content: (
      <>
        <p>Information concerning children and vulnerable persons will be handled with additional confidentiality and care.</p>
        <p>Where a grievance indicates immediate danger, abuse, neglect, exploitation, violence, or another serious risk, relevant information may be shared with the appropriate authority.</p>
      </>
    ),
  },
  {
    id: "cookies-and-technical-data",
    number: "09",
    title: "Cookies and Technical Data",
    intro: "The Portal may use essential cookies and technical logs to:",
    items: [
      "Maintain secure sessions;",
      "Authenticate users;",
      "Protect the Portal against misuse;",
      "Monitor system performance; and",
      "Remember selected settings.",
    ],
    note: "Disabling essential cookies may prevent some Portal functions from working correctly.",
  },
  {
    id: "changes-to-this-policy",
    number: "10",
    title: "Changes to This Policy",
    content: (
      <>
        <p>This Privacy Policy may be updated when the Portal, legal requirements, security measures, or government procedures change.</p>
        <p>The revised version will be published on the Portal with an updated date.</p>
      </>
    ),
  },
];

function PrivacyPolicy() {
  return (
    <main className="privacy-page">
      <section className="privacy-hero" aria-labelledby="privacyTitle">
        <div className="privacy-hero__orb privacy-hero__orb--one" aria-hidden="true" />
        <div className="privacy-hero__orb privacy-hero__orb--two" aria-hidden="true" />
        <div className="container privacy-hero__container">
          <nav className="privacy-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link>
            <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            <span>Privacy Policy</span>
          </nav>
          <div className="privacy-hero__content">
            <span className="privacy-hero__icon" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </span>
            <div>
              <p className="section-label">Your privacy matters</p>
              <h1 id="privacyTitle">Privacy Policy</h1>
              <p>
                Grievance Redress Management Portal<br />
                Ministry of Human Development, Family Support and Gender Affairs,
                Government of Belize
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="container privacy-layout">
        <aside className="privacy-nav" aria-label="Privacy policy contents">
          <p>On this page</p>
          <ol>
            {policySections.map((section) => (
              <li key={section.id}><a href={`#${section.id}`}>{section.title}</a></li>
            ))}
            <li><a href="#contact-us">Contact Us</a></li>
          </ol>
        </aside>

        <article className="privacy-content">
          {policySections.map((section) => (
            <section id={section.id} className="privacy-section" key={section.id}>
              <header>
                <span>{section.number}</span>
                <h2>{section.title}</h2>
              </header>
              {section.content}
              {section.intro ? <p>{section.intro}</p> : null}
              {section.items ? (
                <ul>
                  {section.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : null}
              {section.after}
              {section.note ? <p className="privacy-note"><i className="fa-solid fa-circle-info" aria-hidden="true" />{section.note}</p> : null}
            </section>
          ))}

          <section id="contact-us" className="privacy-section privacy-contact">
            <header><span>11</span><h2>Contact Us</h2></header>
            <p>For privacy questions or requests, contact:</p>
            <address>
              <span className="privacy-contact__icon" aria-hidden="true"><i className="fa-solid fa-building-shield" /></span>
              <div>
                <strong>Data Privacy Officer</strong>
                <p>Ministry of Human Development, Family Support and Gender Affairs<br />Government of Belize</p>
                <dl>
                  <div><dt>Email</dt><dd><a href="mailto:senior.secretary@humandev.gov.bz">senior.secretary@humandev.gov.bz</a></dd></div>
                  <div><dt>Telephone</dt><dd><a href="tel:+5018222246">+501-822-2246</a></dd></div>
                  <div><dt>Address</dt><dd>Ministry of Human Development Headquarters West Block, Independence Plaza, Belmopan, Belize</dd></div>
                </dl>
              </div>
            </address>
          </section>

          <p className="privacy-acknowledgement">
            <i className="fa-solid fa-check" aria-hidden="true" />
            By using the GRM Portal, you acknowledge that you have read and understood this Privacy Policy.
          </p>
        </article>
      </div>
    </main>
  );
}

export default PrivacyPolicy;
