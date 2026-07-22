import { Link } from "react-router-dom";

const termsSections = [
  {
    id: "acceptance-of-terms",
    title: "Acceptance of Terms",
    paragraphs: [
      "By accessing or using the Grievance Redress Management Portal, referred to as the \"GRM Portal,\" you agree to these Terms and Conditions and the GRM Privacy Policy.",
      "Do not use the Portal where you do not agree with these Terms.",
    ],
  },
  {
    id: "purpose-of-the-portal",
    title: "Purpose of the Portal",
    intro: "The GRM Portal allows citizens and authorised representatives to:",
    items: ["Submit grievances;", "Receive a unique ticket number;", "Upload supporting documents;", "Track grievance status; and", "Receive updates from authorised government departments."],
    after: [
      "The Portal also allows authorised officials to review, assign, investigate, update, escalate, and resolve grievances.",
      "The Portal does not replace emergency services, courts, police reporting, statutory appeals, or other legally required procedures.",
    ],
  },
  {
    id: "user-responsibilities",
    title: "User Responsibilities",
    intro: "When using the Portal, you agree to:",
    items: [
      "Provide information that is accurate and complete to the best of your knowledge;", "Submit grievances in good faith;",
      "Provide only relevant supporting information;", "Protect your ticket number, password, and verification details;",
      "Use the Portal only for lawful purposes; and", "Respect the privacy and rights of other persons.",
    ],
    secondIntro: "You must not:",
    secondItems: [
      "Submit knowingly false or misleading information;", "Impersonate another person;", "Upload malicious, unlawful, or unrelated files;",
      "Attempt to access another person's grievance;", "Interfere with the security or operation of the Portal;",
      "Submit abusive, threatening, discriminatory, or harassing content; or", "Use the Portal for fraud, advertising, or unauthorised commercial purposes.",
    ],
  },
  {
    id: "submitting-a-grievance",
    title: "Submitting a Grievance",
    intro: "Users may be required to provide:",
    items: ["Name and contact details;", "Location;", "Relevant department;", "Grievance category;", "Description of the issue;", "Names or roles of persons involved;", "Supporting evidence; and", "The requested action or resolution."],
    after: [
      "Failure to provide sufficient information may delay the grievance or prevent it from being investigated.",
      "A ticket number confirms that the grievance has been registered. It does not confirm that the allegations are proven or that the requested outcome will be granted.",
    ],
  },
  {
    id: "anonymous-grievances",
    title: "Anonymous Grievances",
    paragraphs: ["Anonymous grievances may be accepted where permitted."],
    intro: "However, anonymous submissions may limit our ability to:",
    items: ["Verify the information;", "Request additional details;", "Provide status updates;", "Investigate the matter fully; or", "Communicate the outcome."],
  },
  {
    id: "grievance-review-and-assignment",
    title: "Grievance Review and Assignment",
    intro: "A grievance may be:",
    items: ["Reviewed for completeness;", "Assigned to the relevant department or location;", "Returned for additional information;", "Redirected to another authority;", "Combined with a duplicate grievance;", "Escalated;", "Rejected where it falls outside the GRM scope; or", "Closed where sufficient information is not available."],
    after: ["The responsible department may update the grievance status, request documents, record actions, and communicate the outcome."],
  },
  {
    id: "response-timelines",
    title: "Response Timelines",
    paragraphs: ["Any response time, target date, priority, or due date displayed on the Portal is an administrative target unless legally stated otherwise."],
    intro: "Processing may take longer where:",
    items: ["Additional information is required;", "Multiple departments are involved;", "The matter is complex;", "External investigation is necessary;", "The grievance concerns safeguarding or legal issues; or", "Technical or operational problems occur."],
    after: ["Submission of a grievance does not guarantee a particular decision, payment, disciplinary action, approval, compensation, or resolution date."],
  },
  {
    id: "emergency-matters",
    title: "Emergency Matters",
    paragraphs: ["The GRM Portal is not an emergency-response service.", "Where a person is in immediate danger or requires urgent police, medical, fire, child-protection, or emergency assistance, contact the appropriate emergency authority directly."],
    warning: true,
  },
  {
    id: "supporting-documents",
    title: "Supporting Documents",
    paragraphs: ["Users may upload relevant documents, photographs, screenshots, audio, or video."],
    intro: "Users must not upload:",
    items: ["Malicious files;", "Fabricated or altered evidence;", "Unlawfully obtained material;", "Irrelevant confidential information;", "Copyright-infringing material; or", "Content that may endanger another person."],
    after: ["The Ministry may remove or restrict files that create security, privacy, legal, or technical risks."],
  },
  {
    id: "privacy-and-confidentiality",
    title: "Privacy and Confidentiality",
    paragraphs: ["Information submitted through the Portal will be handled according to the GRM Privacy Policy and applicable laws of Belize.", "Information may be shared with authorised departments, government officials, investigators, safeguarding authorities, courts, or service providers where necessary to process the grievance or comply with the law.", "Complete confidentiality cannot be guaranteed where disclosure is required to investigate the grievance, protect a person, provide procedural fairness, or meet legal obligations."],
  },
  {
    id: "portal-availability",
    title: "Portal Availability",
    paragraphs: ["The Ministry aims to keep the Portal accessible but does not guarantee continuous or error-free availability.", "The Portal may be temporarily unavailable due to maintenance, technical failures, cybersecurity incidents, power outages, emergencies, or circumstances beyond reasonable control.", "Users should use another authorised grievance channel where the Portal is unavailable."],
  },
  {
    id: "authorised-government-users",
    title: "Authorised Government Users",
    intro: "Government officials must:",
    items: ["Use the Portal only for official duties;", "Access only information relevant to their assigned role;", "Protect login credentials and confidential information;", "Record accurate and professional updates; and", "Follow applicable government security and data-protection requirements."],
    after: ["Unauthorised access or misuse may result in account suspension, disciplinary action, investigation, or legal consequences."],
  },
  {
    id: "limitation-of-responsibility",
    title: "Limitation of Responsibility",
    intro: "To the extent permitted by law, the Ministry is not responsible for losses caused by:",
    items: ["Temporary Portal unavailability;", "Incorrect information submitted by a user;", "A user sharing their password or ticket details;", "Third-party internet or communication failures;", "Delayed notifications; or", "Failure to comply with separate court, appeal, application, or legal deadlines."],
    after: ["Nothing in these Terms limits any responsibility or right that cannot legally be excluded under the laws of Belize."],
  },
  {
    id: "changes-to-these-terms",
    title: "Changes to These Terms",
    paragraphs: ["These Terms may be updated when Portal functions, government procedures, security requirements, or applicable laws change.", "The revised Terms will be published on the Portal with an updated date."],
  },
  {
    id: "governing-law",
    title: "Governing Law",
    paragraphs: ["These Terms and use of the GRM Portal are governed by the laws of Belize."],
  },
];

function TermsConditions() {
  return (
    <main className="privacy-page terms-page">
      <section className="privacy-hero terms-hero" aria-labelledby="termsTitle">
        <div className="privacy-hero__orb privacy-hero__orb--one" aria-hidden="true" />
        <div className="privacy-hero__orb privacy-hero__orb--two" aria-hidden="true" />
        <div className="container privacy-hero__container">
          <nav className="privacy-breadcrumb" aria-label="Breadcrumb">
            <Link to="/">Home</Link><i className="fa-solid fa-chevron-right" aria-hidden="true" /><span>Terms and Conditions</span>
          </nav>
          <div className="privacy-hero__content">
            <span className="privacy-hero__icon terms-hero__icon" aria-hidden="true"><i className="fa-solid fa-file-signature" /></span>
            <div>
              <p className="section-label">Portal terms of use</p>
              <h1 id="termsTitle">Terms and Conditions</h1>
              <p>Grievance Redress Management Portal<br />Ministry of Human Development, Family Support and Gender Affairs, Government of Belize</p>
            </div>
          </div>
        </div>
      </section>

      <div className="container privacy-layout">
        <aside className="privacy-nav" aria-label="Terms and conditions contents">
          <p>On this page</p>
          <ol>
            {termsSections.map((section, index) => <li key={section.id}><a href={`#${section.id}`}>{index + 1}. {section.title}</a></li>)}
            <li><a href="#contact-us">16. Contact Us</a></li>
          </ol>
        </aside>
        <article className="privacy-content">
          {termsSections.map((section, index) => (
            <section id={section.id} className={`privacy-section${section.warning ? " terms-warning" : ""}`} key={section.id}>
              <header><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></header>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.intro ? <p>{section.intro}</p> : null}
              {section.items ? <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              {section.secondIntro ? <p className="terms-subheading">{section.secondIntro}</p> : null}
              {section.secondItems ? <ul>{section.secondItems.map((item) => <li key={item}>{item}</li>)}</ul> : null}
              {section.after?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </section>
          ))}
          <section id="contact-us" className="privacy-section privacy-contact">
            <header><span>16</span><h2>Contact Us</h2></header>
            <p>For questions about these Terms and Conditions, contact:</p>
            <address>
              <span className="privacy-contact__icon" aria-hidden="true"><i className="fa-solid fa-building-columns" /></span>
              <div>
                <strong>GRM Administration</strong>
                <p>Ministry of Human Development, Family Support and Gender Affairs<br />Government of Belize</p>
                <dl><div><dt>Email</dt><dd><a href="mailto:senior.secretary@humandev.gov.bz">senior.secretary@humandev.gov.bz</a></dd></div><div><dt>Telephone</dt><dd><a href="tel:+5018222246">+501-822-2246</a></dd></div><div><dt>Address</dt><dd>Ministry of Human Development Headquarters West Block, Independence Plaza, Belmopan, Belize</dd></div></dl>
              </div>
            </address>
          </section>
          <p className="privacy-acknowledgement"><i className="fa-solid fa-check" aria-hidden="true" />By submitting a grievance or continuing to use the Portal, you confirm that you have read and accepted these Terms and Conditions.</p>
        </article>
      </div>
    </main>
  );
}

export default TermsConditions;
