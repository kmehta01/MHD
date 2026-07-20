import LoopSlider from "../components/LoopSlider";
import { Link } from "react-router-dom";

function Home() {
  return (
    <main>
      <section className="landing-hero">
        <div className="container hero-container">
          <div className="landing-hero__content">
            <p className="landing-hero__eyebrow">
              <span className="landing-hero__mark" aria-hidden="true"></span>
              Official Government Ministry
            </p>
            <h1>
              Empowering People.
              <br />
              Strengthening Families.
              <br />
              Advancing Equality in Belize.
            </h1>
            <p className="landing-hero__summary">
              Access social assistance, family support, child protection,
              community rehabilitation, gender-based violence support, economic
              empowerment and disability services across Belize.
            </p>
            <div className="landing-hero__actions">
              <a className="landing-hero__button" href="#service-navigator">
                Find Support
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
              <Link className="landing-hero__button" to="/submit-complaint">
                Apply for Services
                <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="key-departments" id="departments">
        <div className="container key-departments__container">
          <div className="key-departments__intro">
            <p className="section-label">Key Departments</p>
            <h2>Explore Ministry Services</h2>
            <p>
              Quick links to departments and service units listed in the website
              content layout.
            </p>
          </div>

          <LoopSlider
            className="department-slider"
            trackClassName="department-slider__viewport"
            dotsClassName="department-slider__dots"
            ariaLabel="Key department cards"
            dotsAriaLabel="Department slider pagination"
            sliderLabel="department"
          >
            <article className="department-card department-card--blue">
              <div className="department-card__icon">
                <i
                  className="fa-solid fa-hands-holding-child"
                  aria-hidden="true"
                ></i>
              </div>
              <h3>Family Support &amp; Gender Affairs</h3>
              <p>
                Family support, GBV response, disability support, elderly care
                and economic empowerment.
              </p>
              <a href="#departments">Read More</a>
            </article>

            <article className="department-card department-card--pink">
              <div className="department-card__icon">
                <i className="fa-solid fa-heart" aria-hidden="true"></i>
              </div>
              <h3>Department of Human Services</h3>
              <p>
                Child protection, foster care, adoption, parenting support and
                alternative care.
              </p>
              <a href="#departments">Read More</a>
            </article>

            <article className="department-card department-card--sky">
              <div className="department-card__icon">
                <i
                  className="fa-solid fa-people-arrows"
                  aria-hidden="true"
                ></i>
              </div>
              <h3>Community Rehabilitation</h3>
              <p>
                Counselling, youth development, court support and rehabilitation
                services.
              </p>
              <a href="#departments">Read More</a>
            </article>

            <article className="department-card department-card--green">
              <div className="department-card__icon">
                <i className="fa-solid fa-chart-line" aria-hidden="true"></i>
              </div>
              <h3>Policy &amp; Planning Unit</h3>
              <p>Planning, policy direction, data systems and coordination.</p>
              <a href="#departments">Read More</a>
            </article>
          </LoopSlider>
        </div>
      </section>

      <section className="service-navigator" id="service-navigator">
        <div className="container service-navigator__container">
          <div className="service-navigator__intro">
            <p className="section-label">Service Navigator</p>
            <h2>How can we help you today?</h2>
            <p>
              Answer a few quick questions and we&rsquo;ll guide you to the
              right support.
            </p>
          </div>

          <div className="service-navigator__group">
            <h3 className="service-navigator__group-heading">
              <span
                className="service-navigator__group-icon"
                aria-hidden="true"
              >
                <i className="fa-solid fa-route"></i>
              </span>
              <span>Quick Access Options</span>
            </h3>
          </div>

          <div className="service-navigator__grid">
            <a className="service-card service-card--blue" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-hand-holding-dollar"></i>
              </span>
              <h4 className="service-card__title">Food / financial help</h4>
              <span className="service-card__text">
                Public Assistance or BOOST
              </span>
            </a>

            <a className="service-card service-card--sky" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-house-chimney"></i>
              </span>
              <h4 className="service-card__title">Shelter or housing</h4>
              <span className="service-card__text">Good Samaritan Shelter</span>
            </a>

            <a className="service-card service-card--gold" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-shield-heart"></i>
              </span>
              <h4 className="service-card__title">Unsafe / protection</h4>
              <span className="service-card__text">GBV Services + Hotline</span>
            </a>

            <a className="service-card service-card--green" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-person-cane"></i>
              </span>
              <h4 className="service-card__title">Elderly support</h4>
              <span className="service-card__text">
                Golden Haven + Case Support
              </span>
            </a>

            <a className="service-card service-card--blue" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-wheelchair"></i>
              </span>
              <h4 className="service-card__title">Disability support</h4>
              <span className="service-card__text">
                Disability Support Services
              </span>
            </a>

            <a className="service-card service-card--gold" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-briefcase"></i>
              </span>
              <h4 className="service-card__title">Job or income</h4>
              <span className="service-card__text">Economic Empowerment</span>
            </a>

            <a className="service-card service-card--sky" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-child-reaching"></i>
              </span>
              <h4 className="service-card__title">Child protection</h4>
              <span className="service-card__text">DHS Child Protection</span>
            </a>

            <a className="service-card service-card--green" href="#">
              <span className="service-card__icon" aria-hidden="true">
                <i className="fa-solid fa-people-roof"></i>
              </span>
              <h4 className="service-card__title">Family support</h4>
              <span className="service-card__text">
                Family Support Services
              </span>
            </a>
          </div>
        </div>
      </section>

      <section className="vision-mission" id="vision-mission">
        <div className="container vision-mission__container">
          <div className="vision-mission__header">
            <p className="section-label">Our Vision &amp; Mission</p>
            <h2>Empowering People. Building the Future.</h2>
          </div>

          <div className="vision-mission__layout">
            <div className="vision-mission__content">
              <article className="vision-copy vision-copy--vision">
                <div className="vision-copy__heading">
                  <h3>Our Vision</h3>
                  <span
                    className="vision-copy__icon vision-copy__icon--vision"
                    aria-hidden="true"
                  >
                    <img src="/assets/images/icons/vision.png" alt="" />
                  </span>
                </div>
                <p>
                  <i
                    className="fa-solid fa-check-double"
                    aria-hidden="true"
                  ></i>
                  A resilient, inclusive, and equitable Belize where all
                  individuals can thrive with dignity and opportunity.
                </p>
              </article>

              <div className="vision-art vision-art--vision" aria-hidden="true">
                <img src="/assets/images/our-mission.png" alt="" />
              </div>

              <div
                className="vision-art vision-art--mission"
                aria-hidden="true"
              >
                <img src="/assets/images/our-vision.png" alt="" />
              </div>

              <article className="vision-copy vision-copy--mission">
                <div className="vision-copy__heading">
                  <h3>Our Mission</h3>
                  <span
                    className="vision-copy__icon vision-copy__icon--mission"
                    aria-hidden="true"
                  >
                    <img src="/assets/images/icons/mission.png" alt="" />
                  </span>
                </div>
                <p>
                  <i
                    className="fa-solid fa-check-double"
                    aria-hidden="true"
                  ></i>
                  To enhance the well-being of individuals, families, and
                  communities by providing comprehensive social assistance and
                  support services.
                </p>
              </article>
            </div>

            <div className="vision-mission__minister">
              <div className="minister-portrait">
                <div
                  className="minister-portrait__rings"
                  aria-hidden="true"
                ></div>
                <img src="/assets/images/minister-message.png" alt="Minister" />
              </div>
              <div className="minister-message">
                <span>From the Minister</span>
                <h3 className="minister-message__title">
                  A Message From Our Minister
                </h3>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="featured-services" id="featured-services">
        <div className="container featured-services__container">
          <div className="featured-services__intro">
            <p className="section-label">Featured Services</p>
            <h2>Support Services Available</h2>
          </div>

          <div className="featured-services__grid">
            <article className="featured-service-card">
              <div className="featured-service-card__media featured-service-card__media--family">
                <span className="featured-service-card__badge">
                  Most Requested
                </span>
                <img
                  src="/assets/images/services/Container-5.png"
                  alt="Family group representing family support services"
                />
              </div>
              <div className="featured-service-card__body">
                <h3>Family Support Services</h3>
                <p>
                  Family Support Services provide holistic, case-managed support
                  to individuals and families experiencing crisis,
                  vulnerability, or hardship. Services are delivered through
                  immediate, medium-term, and long-term interventions, ensuring
                  that individuals receive the right support at the right time,
                  whether for stabilization, recovery, or long-term resilience.
                </p>
                <a href="#">
                  Learn More
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>

            <article className="featured-service-card">
              <div className="featured-service-card__media featured-service-card__media--gbv">
                <img
                  src="/assets/images/services/Container-2.png"
                  alt="Two women speaking in a support session"
                />
              </div>
              <div className="featured-service-card__body">
                <h3>Gender and Gender-Based Violence Support Services</h3>
                <p>
                  We provide holistic, survivor-centered support to individuals
                  and families experiencing gender-based violence.
                </p>
                <a href="#">
                  Get Support
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>

            <article className="featured-service-card">
              <div className="featured-service-card__media featured-service-card__media--empowerment">
                <img
                  src="/assets/images/services/Container-3.png"
                  alt="Woman in a workshop for economic empowerment"
                />
              </div>
              <div className="featured-service-card__body">
                <h3>Economic Empowerment Services</h3>
                <p>
                  Economic Empowerment Services support individuals,
                  particularly women, vulnerable populations, and families, to
                  build sustainable livelihoods, financial independence, and
                  long-term resilience.
                </p>
                <a href="#">
                  View Programs
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="latest-updates" id="latest-updates">
        <div className="container latest-updates__container">
          <div className="latest-updates__intro">
            <p className="section-label">Latest Updates &amp; Impact</p>
            <h2>News, Announcements &amp; Community Engagement</h2>
            <p>
              Campaign launches, outreach events, international observances and
              service updates.
            </p>
          </div>

          <LoopSlider
            className="latest-updates__slider"
            trackClassName="latest-updates__track"
            dotsClassName="department-slider__dots latest-updates__dots"
            ariaLabel="Latest update cards"
            dotsAriaLabel="Latest updates slider pagination"
            sliderLabel="latest update"
          >
            <article
              className="latest-update-card"
              data-slider-card
              aria-label="Outreach Events: Upcoming community outreach and campaign launches."
            >
              <img
                src="/assets/images/hero-banner.png"
                alt="Ministry representatives at a community event"
              />
              <div className="latest-update-card__body">
                <div className="latest-update-card__meta">
                  <span>
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                    Admin
                  </span>
                  <span>March 15, 2025</span>
                </div>
                <h3>Outreach Events</h3>
                <a
                  href="#latest-updates"
                  aria-label="Read more about Outreach Events"
                >
                  Read More
                  <i
                    className="fa-solid fa-arrow-right"
                    aria-hidden="true"
                  ></i>
                </a>
              </div>
            </article>

            <article
              className="latest-update-card"
              data-slider-card
              aria-label="Awareness Campaigns: 16 Days of Activism, International Women's Day, Older Persons Month and Disability Awareness Month."
            >
              <img
                src="/assets/images/services/Container-3.png"
                alt="Programme participant during a support session"
              />
              <div className="latest-update-card__body">
                <div className="latest-update-card__meta">
                  <span>
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                    Admin
                  </span>
                  <span>March 15, 2025</span>
                </div>
                <h3>Awareness Campaigns</h3>
                <a
                  href="#latest-updates"
                  aria-label="Read more about Awareness Campaigns"
                >
                  Read More
                  <i
                    className="fa-solid fa-arrow-right"
                    aria-hidden="true"
                  ></i>
                </a>
              </div>
            </article>

            <article
              className="latest-update-card"
              data-slider-card
              aria-label="Data &amp; Impact: BOOST beneficiaries, GBV cases supported, public assistance and economic empowerment results."
            >
              <img
                src="/assets/images/services/Container-2.png"
                alt="Community support discussion"
              />
              <div className="latest-update-card__body">
                <div className="latest-update-card__meta">
                  <span>
                    <i className="fa-solid fa-user" aria-hidden="true"></i>
                    Admin
                  </span>
                  <span>March 15, 2025</span>
                </div>
                <h3>Data &amp; Impact</h3>
                <a
                  href="#latest-updates"
                  aria-label="Read more about Data &amp; Impact"
                >
                  Read More
                  <i
                    className="fa-solid fa-arrow-right"
                    aria-hidden="true"
                  ></i>
                </a>
              </div>
            </article>
          </LoopSlider>
        </div>
      </section>
    </main>
  );
}

export default Home;
