import LoopSlider from "../components/LoopSlider";

function About() {
  return (
    <main className="about-ministry-page">
      <section className="about-hero" aria-labelledby="aboutHeroTitle">
        <div className="container about-hero__container">
          <nav className="about-hero__breadcrumb" aria-label="Breadcrumb">
            <a href="/">
              Home
            </a>
            <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
            <span>About Us</span>
          </nav>
          <h1 id="aboutHeroTitle">About the Ministry</h1>
          <p className="landing-hero__summary">
            The Ministry of Human Development, Family Support & Gender Affairs
            works to protect vulnerable persons, strengthen families, promote
            equality, and improve access to social services across Belize.
          </p>
          <a className="landing-hero__button" href="#">
            Contact Us
            <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </section>

      <section
        className="about-department"
        aria-labelledby="aboutDepartmentTitle"
      >
        <div className="container about-department__container">
          <div className="about-department__content">
            <p className="section-label">Family Support &amp; Gender Affairs</p>
            <h2 id="aboutDepartmentTitle">Who We Are</h2>
            <p>
              The Family Support and Gender Affairs Department develops and
              coordinates holistic, inclusive services that support families in
              crisis, grounded in the philosophy of family preservation and
              empowerment.
            </p>
            <p>
              We work to promote gender equality, social justice, inclusion, and
              resilience, helping to transform lives and build stronger, more
              equitable communities.
            </p>
          </div>

          <figure className="about-department__figure">
            <img
              src="assets/images/services/Container-2.png"
              alt="Support worker speaking with a woman during a counselling session"
            />
            <figcaption>
              <span>
                <i
                  className="fa-solid fa-hands-holding-child"
                  aria-hidden="true"
                ></i>
              </span>
              Family preservation and empowerment guide every service.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="about-vision" aria-labelledby="aboutVisionTitle">
        <div className="container about-vision__container">
          <div className="about-vision__grid">
            <article className="about-vision__copy about-vision__copy--vision">
              <h2 id="aboutVisionTitle">
                Our Vision
                <img src="assets/images/icons/vision.png" alt="" />
              </h2>
              <p>
                A resilient, inclusive, and equitable Belize where all
                individuals can thrive with dignity and opportunity.
              </p>
            </article>

            <figure className="about-vision__image about-vision__image--vision">
              <img
                src="assets/images/our-mission.png"
                alt="Inclusive community portrait representing the Ministry vision"
              />
            </figure>

            <figure className="about-vision__image about-vision__image--mission">
              <img
                src="assets/images/our-vision.png"
                alt="People climbing together toward a shared goal"
              />
            </figure>

            <article className="about-vision__copy about-vision__copy--mission">
              <h2>
                Our Mission
                <img src="assets/images/icons/mission.png" alt="" />
              </h2>
              <p>
                To enhance the well-being of individuals, families, and
                communities by providing comprehensive social assistance and
                support services.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-values" aria-labelledby="aboutValuesTitle">
        <div className="container about-values__container">
          <h2 id="aboutValuesTitle">Core Values</h2>
          <div className="about-values__grid">
            <article>
              <i className="fa-solid fa-scale-balanced" aria-hidden="true"></i>
              <h3>Equity &amp; Inclusion</h3>
              <p>
                We ensure that all individuals, especially vulnerable
                populations, have fair access to opportunities and services.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
              <h3>Dignity &amp; Respect</h3>
              <p>
                We uphold the inherent worth of every individual in all
                interactions and interventions.
              </p>
            </article>
            <article>
              <i className="fa-regular fa-heart" aria-hidden="true"></i>
              <h3>Compassion &amp; Care</h3>
              <p>
                We provide services with empathy, understanding, and a
                commitment to improving lives.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-gavel" aria-hidden="true"></i>
              <h3>Accountability &amp; Integrity</h3>
              <p>
                We operate transparently and responsibly in delivering services
                to the public.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-rocket" aria-hidden="true"></i>
              <h3>Empowerment</h3>
              <p>
                We support individuals and families to build resilience,
                independence, and self-sufficiency.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-users" aria-hidden="true"></i>
              <h3>Collaboration</h3>
              <p>
                We work with partners, communities, and stakeholders to achieve
                meaningful and sustainable outcomes.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="about-strategy" aria-labelledby="aboutStrategyTitle">
        <div className="container about-strategy__container">
          <div className="about-strategy__content">
            <h2 id="aboutStrategyTitle">Our Strategic Approach</h2>
            <div className="about-strategy__list">
              <article>
                <span>
                  <i className="fa-solid fa-people-roof" aria-hidden="true"></i>
                </span>
                <div>
                  <h3>Family Preservation</h3>
                  <p>Strengthening families as the foundation of society</p>
                </div>
              </article>
              <article>
                <span>
                  <i
                    className="fa-solid fa-arrow-trend-up"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <h3>Empowerment</h3>
                  <p>
                    Supporting individuals to achieve independence and
                    resilience
                  </p>
                </div>
              </article>
              <article>
                <span>
                  <i
                    className="fa-solid fa-people-group"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <h3>Inclusion</h3>
                  <p>Ensuring no one is left behind</p>
                </div>
              </article>
              <article>
                <span>
                  <i
                    className="fa-solid fa-hand-holding-heart"
                    aria-hidden="true"
                  ></i>
                </span>
                <div>
                  <h3>Social Justice</h3>
                  <p>
                    Promoting fairness, equal opportunity, and equitable
                    distribution
                  </p>
                </div>
              </article>
            </div>
          </div>

          <figure className="about-strategy__figure">
            <img
              src="assets/images/hero-banner.png"
              alt="Ministry representative speaking at a public event"
            />
            <figcaption>
              "Putting people at the heart of everything we do."
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="about-rights" aria-labelledby="aboutRightsTitle">
        <div className="container about-rights__container">
          <div className="about-rights__intro">
            <p className="section-label">Rights-Based Practice</p>
            <h2 id="aboutRightsTitle">Our Human Rights Commitment</h2>
            <p>
              Our work is grounded in national and international human rights
              principles, ensuring that all individuals are treated with
              dignity, respect, and fairness.
            </p>
          </div>

          <div
            className="about-rights__grid"
            aria-label="Human rights commitments we promote"
          >
            <article>
              <span>
                <i
                  className="fa-solid fa-scale-balanced"
                  aria-hidden="true"
                ></i>
              </span>
              <h3>Equality and non-discrimination</h3>
            </article>
            <article>
              <span>
                <i className="fa-solid fa-people-group" aria-hidden="true"></i>
              </span>
              <h3>Participation and inclusion</h3>
            </article>
            <article>
              <span>
                <i
                  className="fa-solid fa-universal-access"
                  aria-hidden="true"
                ></i>
              </span>
              <h3>Accessibility</h3>
            </article>
            <article>
              <span>
                <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
              </span>
              <h3>Protection from violence and abuse</h3>
            </article>
            <article>
              <span>
                <i
                  className="fa-solid fa-hand-holding-heart"
                  aria-hidden="true"
                ></i>
              </span>
              <h3>Empowerment and autonomy</h3>
            </article>
          </div>
        </div>
      </section>

      <section className="about-services" aria-labelledby="aboutServicesTitle">
        <div className="container about-services__container">
          <p className="section-label">Support Across Belize</p>
          <h2 id="aboutServicesTitle">What We Do</h2>
          <p className="about-services__intro">
            The Department develops and coordinates comprehensive social
            protection and gender-responsive services to support individuals and
            families across Belize.
          </p>
          <h3 className="visually-hidden">People We Support</h3>
          <div className="about-services__grid">
            <article>
              <i className="fa-solid fa-people-roof" aria-hidden="true"></i>
              <h4>Families in Crisis</h4>
              <p>
                Support for families facing financial hardship, personal crisis,
                or urgent social needs.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
              <h4>Violence &amp; Abuse Response</h4>
              <p>
                Survivor-centered assistance for individuals experiencing
                violence, abuse, or unsafe situations.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-person-cane" aria-hidden="true"></i>
              <h4>Older Persons Care</h4>
              <p>
                Care, protection, and support for older persons who need
                assistance and stability.
              </p>
            </article>
            <article>
              <i
                className="fa-solid fa-universal-access"
                aria-hidden="true"
              ></i>
              <h4>Disability Inclusion</h4>
              <p>
                Inclusive support for persons with disabilities seeking access
                to services and community life.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-house-chimney" aria-hidden="true"></i>
              <h4>Homelessness Support</h4>
              <p>
                Assistance for individuals experiencing homelessness,
                displacement, or housing insecurity.
              </p>
            </article>
            <article>
              <i className="fa-solid fa-chart-line" aria-hidden="true"></i>
              <h4>Economic Independence</h4>
              <p>
                Support for women and men building resilience, livelihoods, and
                long-term independence.
              </p>
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
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
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
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
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
                  <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>
          </LoopSlider>
        </div>
      </section>
    </main>
  );
}

export default About;
