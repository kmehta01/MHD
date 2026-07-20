import LoopSlider from "../components/LoopSlider";

function Leadership() {
  return (
    <main class="leadership-page">
      <section class="leadership-hero" aria-labelledby="leadershipHeroTitle">
        <div class="container leadership-hero__container">
          <nav class="leadership-hero__breadcrumb" aria-label="Breadcrumb">
            <a href="/">
              Home
            </a>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            <span>Leadership</span>
          </nav>
          <h1 id="leadershipHeroTitle">Leadership</h1>
          <p>
            Meet the leaders guiding our vision to empower people, strengthen
            families, and advance equality in Belize.
          </p>
        </div>
      </section>

      <section
        class="executive-leadership"
        aria-labelledby="executiveLeadershipTitle"
      >
        <div class="container leadership-section-container">
          <div class="leadership-section-heading">
            <p class="section-label">Executive Leadership</p>
            <h2 id="executiveLeadershipTitle">Our Executive Leadership Team</h2>
            <p>
              Our executive leaders provide strategic direction and ensure the
              Ministry delivers effective, people-centered services across
              Belize.
            </p>
          </div>

          <div class="executive-leadership__grid">
            <article class="executive-card">
              <div class="executive-card__photo executive-card__photo--minister">
                <img
                  src="assets/images/hon-thea-garcia-ramirez.png"
                  alt="Hon. Thea Garcia-Ramirez, Minister"
                />
              </div>
              <div class="executive-card__content">
                <h3 class="executive-card__name">Hon. Thea Garcia-Ramirez</h3>
                <p class="executive-card__role">Minister</p>
                <p class="executive-card__ministry">
                  Ministry of Human Development, Family Support &amp; Gender
                  Affairs
                </p>
                <p class="executive-card__text">
                  Leading the Ministry's mandate to protect vulnerable persons,
                  strengthen families, promote equality, and improve access to
                  social services across Belize.
                </p>
                <a class="leadership-link" href="#">
                  Read Profile
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>

            <article class="executive-card">
              <div class="executive-card__photo executive-card__photo--ceo">
                <img
                  src="assets/images/ms-adele-catzim-sanchez.png"
                  alt="Ms. Adele Catzim Sanchez, Chief Executive Officer"
                />
              </div>
              <div class="executive-card__content">
                <h3 class="executive-card__name">Ms. Adele Catzim Sanchez</h3>
                <p class="executive-card__role">Chief Executive Officer</p>
                <p class="executive-card__ministry">
                  Ministry of Human Development, Family Support &amp; Gender
                  Affairs
                </p>
                <p class="executive-card__text">
                  Providing leadership for the overall management, coordination,
                  and delivery of services and programs throughout the Ministry.
                </p>
                <a class="leadership-link" href="#">
                  Read Profile
                  <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
                </a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        class="department-leadership"
        aria-labelledby="departmentLeadershipTitle"
      >
        <div class="container leadership-section-container">
          <div class="leadership-section-heading">
            <p class="section-label">Directors &amp; Department Leadership</p>
            <h2 id="departmentLeadershipTitle">Our Department Directors</h2>
            <p>
              Our directors lead the departments and units that deliver critical
              services to individuals, families, and communities across Belize.
            </p>
          </div>

          <div class="director-grid">
            <article class="director-card director-card--green">
              <span class="director-card__icon">
                <i class="fa-solid fa-people-roof" aria-hidden="true"></i>
              </span>
              <h3>Family Support &amp; Gender Affairs Department</h3>
              <div class="director-card__meta">
                <span>Director</span>
                <strong>To be confirmed</strong>
              </div>
              <p>
                Leads family support, gender services, public assistance, GBV
                support, disability support, elderly care, shelter services, and
                economic empowerment programs.
              </p>
            </article>

            <article class="director-card director-card--blue">
              <span class="director-card__icon">
                <i class="fa-solid fa-child-reaching" aria-hidden="true"></i>
              </span>
              <h3>Department of Human Services</h3>
              <div class="director-card__meta">
                <span>Director</span>
                <strong>To be confirmed</strong>
              </div>
              <p>
                Leads child protection, child placement, foster care, adoption,
                parenting support, alternative care, and anti-trafficking
                services.
              </p>
            </article>

            <article class="director-card director-card--purple">
              <span class="director-card__icon">
                <i class="fa-solid fa-handshake-angle" aria-hidden="true"></i>
              </span>
              <h3>Community Rehabilitation Department</h3>
              <div class="director-card__meta">
                <span>Director</span>
                <strong>To be confirmed</strong>
              </div>
              <p>
                Leads community counselling, court and case management, youth
                development, criminal records, rehabilitation, and youth support
                services.
              </p>
            </article>

            <article class="director-card director-card--gold">
              <span class="director-card__icon">
                <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
              </span>
              <h3>Policy &amp; Planning Unit</h3>
              <div class="director-card__meta">
                <span>Director / Unit Lead</span>
                <strong>To be confirmed</strong>
              </div>
              <p>
                Supports policy direction, planning, coordination, reporting,
                data systems, and institutional service delivery improvement.
              </p>
            </article>

            <article class="director-card director-card--teal">
              <span class="director-card__icon">
                <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
              </span>
              <h3>Inspector of Social Services Institutions</h3>
              <div class="director-card__meta">
                <span>Inspector / Unit Lead</span>
                <strong>To be confirmed</strong>
              </div>
              <p>
                Supports oversight, inspection, standards, and monitoring of
                social service institutions.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        class="leadership-commitment"
        aria-labelledby="leadershipCommitmentTitle"
      >
        <div class="container leadership-commitment__container">
          <div class="leadership-commitment__content">
            <p class="section-label">Our Leadership Commitment</p>
            <h2 id="leadershipCommitmentTitle">Committed to Serving Belize</h2>
            <p>
              Our leadership team is dedicated to transparency, accountability,
              and service excellence. Together, we work to build a more
              inclusive, equitable, and resilient Belize for all.
            </p>
          </div>
          <figure class="leadership-commitment__visual">
            <img
              src="assets/images/leadership-commitment.png"
              alt="Illustration of a Belizean family representing inclusive and resilient communities"
            />
          </figure>
        </div>
      </section>

      <section class="leadership-cta" aria-labelledby="leadershipCtaTitle">
        <div class="container leadership-cta__container">
          <div>
            <h2 id="leadershipCtaTitle">Need to Contact the Ministry?</h2>
            <p>
              For official inquiries, service information, or department
              contacts, please reach out to the Ministry headquarters or visit
              the Contact Us page.
            </p>
          </div>
          <a class="leadership-cta__button" href="#">
            View Contact Information
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
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

export default Leadership;
