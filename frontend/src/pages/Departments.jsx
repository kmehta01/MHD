import ServiceUnitTabs from "../components/ServiceUnitTabs";

function Departments() {
  return (
    <main class="departments-page">
      <section class="departments-hero" aria-labelledby="departmentsHeroTitle">
        <div class="container departments-hero__container">
          <nav class="departments-hero__breadcrumb" aria-label="Breadcrumb">
            <a href="/">
              Home
            </a>
            <i class="fa-solid fa-chevron-right" aria-hidden="true"></i>
            <span>Departments</span>
          </nav>
          <h1 id="departmentsHeroTitle">Departments</h1>
          <p>
            Explore the departments and service units of the Ministry of Human
            Development, Family Support &amp; Gender Affairs. Each department
            works to protect vulnerable persons, support families, promote
            inclusion, and improve access to social services across Belize.
          </p>
          <div class="departments-hero__actions">
            <a
              class="departments-button departments-button--primary"
              href="#departmentServiceUnits"
            >
              Find a Service
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
            <a
              class="departments-button departments-button--secondary"
              href="#departmentContacts"
            >
              Contact a Department
            </a>
          </div>
        </div>
      </section>

      <section
        class="departments-overview"
        aria-labelledby="departmentsOverviewTitle"
      >
        <div class="container departments-container">
          <div class="departments-section-heading">
            <p class="section-label">Ministry Departments</p>
            <h2 id="departmentsOverviewTitle">
              Serving People and Families Across Belize
            </h2>
            <p>
              The Ministry delivers its mandate through specialized departments
              and units that provide social protection, family support, child
              protection, rehabilitation, policy coordination, and institutional
              oversight services.
            </p>
          </div>

          <div class="main-department-grid">
            <article class="main-department-card main-department-card--green">
              <span class="main-department-card__icon">
                <i
                  class="fa-solid fa-hands-holding-child"
                  aria-hidden="true"
                ></i>
              </span>
              <h3>Family Support &amp; Gender Affairs Department</h3>
              <p>
                Provides inclusive, rights-based, and people-centered support
                for individuals and families facing crisis, vulnerability,
                violence, hardship, disability, homelessness, or economic
                challenges.
              </p>
              <h4>Key Service Areas</h4>
              <ul>
                <li>Family Support Services</li>
                <li>Public Assistance</li>
                <li>BOOST Program</li>
                <li>Gender &amp; GBV Support Services</li>
                <li>Economic Empowerment</li>
                <li>Disability Support Services</li>
                <li>Elderly Support Services</li>
                <li>Homeless &amp; Displaced Persons Support</li>
                <li>Golden Haven Rest Home</li>
                <li>Good Samaritan Homeless Shelter</li>
              </ul>
              <a class="departments-card-link" href="#">
                View Department
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </article>

            <article class="main-department-card main-department-card--blue">
              <span class="main-department-card__icon">
                <i class="fa-solid fa-child-reaching" aria-hidden="true"></i>
              </span>
              <h3>Department of Human Services</h3>
              <p>
                Supports child protection, child placement, foster care,
                adoption, parenting empowerment, alternative care, and
                anti-trafficking services for children, families, and vulnerable
                young persons.
              </p>
              <h4>Key Service Areas</h4>
              <ul>
                <li>Child Protection Services</li>
                <li>Child Placement &amp; Specialized Services</li>
                <li>Community &amp; Parent Empowerment Program</li>
                <li>Alternative Care &amp; Anti-Trafficking in Persons</li>
                <li>Foster Care</li>
                <li>Adoption</li>
                <li>Child Care Centers</li>
              </ul>
              <a class="departments-card-link" href="#">
                View Department
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </article>

            <article class="main-department-card main-department-card--purple">
              <span class="main-department-card__icon">
                <i class="fa-solid fa-handshake-angle" aria-hidden="true"></i>
              </span>
              <h3>Community Rehabilitation Department</h3>
              <p>
                Provides community-based rehabilitation, counselling, youth
                development, court support, criminal records services, and
                support for young persons and families involved in
                rehabilitation pathways.
              </p>
              <h4>Key Service Areas</h4>
              <ul>
                <li>Community Counselling Centre</li>
                <li>Court &amp; Case Management</li>
                <li>The HUB Resource Center</li>
                <li>Criminal Records</li>
                <li>New Beginnings Youth Development Center</li>
                <li>Youth Challenge Programme</li>
                <li>Conscious Youth Development</li>
              </ul>
              <a class="departments-card-link" href="#">
                View Department
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </article>

            <article class="main-department-card main-department-card--gold">
              <span class="main-department-card__icon">
                <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
              </span>
              <h3>Policy &amp; Planning Unit</h3>
              <p>
                Supports policy direction, strategic planning, coordination,
                reporting, data systems, research, monitoring, and service
                delivery improvement across the Ministry.
              </p>
              <h4>Key Service Areas</h4>
              <ul>
                <li>Policy Development</li>
                <li>Strategic Planning</li>
                <li>Data &amp; Reporting</li>
                <li>Monitoring &amp; Evaluation</li>
                <li>Institutional Coordination</li>
                <li>Service Improvement</li>
              </ul>
              <a class="departments-card-link" href="#">
                View Unit{" "}
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </article>

            <article class="main-department-card main-department-card--teal">
              <span class="main-department-card__icon">
                <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
              </span>
              <h3>Inspector of Social Services Institutions</h3>
              <p>
                Supports inspection, monitoring, standards, and oversight of
                social service institutions to help ensure safe, accountable,
                and quality service delivery.
              </p>
              <h4>Key Service Areas</h4>
              <ul>
                <li>Institutional Inspection</li>
                <li>Standards Monitoring</li>
                <li>Service Compliance</li>
                <li>Quality Assurance</li>
                <li>Reporting &amp; Follow-up</li>
              </ul>
              <a class="departments-card-link" href="#">
                View Unit{" "}
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </a>
            </article>
          </div>
        </div>
      </section>

      <section
        class="service-units"
        id="departmentServiceUnits"
        aria-labelledby="departmentServiceUnitsTitle"
      >
        <div class="container departments-container">
          <div class="departments-section-heading">
            <p class="section-label">Department Service Units</p>
            <h2 id="departmentServiceUnitsTitle">
              Find the Right Department or Service Unit
            </h2>
            <p>
              Use the categories below to quickly identify which department or
              service unit may be most relevant to your need.
            </p>
          </div>

          <ServiceUnitTabs />

          <div
            class="service-unit-tabs"
            role="tablist"
            aria-label="Department service categories"
          >
            <button
              class="service-unit-tab service-unit-tab--active"
              type="button"
              data-service-group="family-support"
              aria-pressed="true"
            >
              Family Support &amp; Gender Affairs
            </button>
            <button
              class="service-unit-tab"
              type="button"
              data-service-group="human-services"
              aria-pressed="false"
            >
              Human Services
            </button>
            <button
              class="service-unit-tab"
              type="button"
              data-service-group="community-rehabilitation"
              aria-pressed="false"
            >
              Community Rehabilitation
            </button>
          </div>

          <div
            class="service-unit-group is-active"
            data-service-group="family-support"
          >
            <h3>Family Support &amp; Gender Affairs</h3>
            <div class="service-unit-grid">
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i
                    class="fa-solid fa-hand-holding-heart"
                    aria-hidden="true"
                  ></i>
                </span>
                <h4>
                  Family Support Services
                  <p>
                    Holistic, case-managed support for individuals and families
                    experiencing crisis, vulnerability, or hardship.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i
                    class="fa-solid fa-hand-holding-dollar"
                    aria-hidden="true"
                  ></i>
                </span>
                <h4>
                  Public Assistance
                  <p>
                    Financial and material support for individuals and families
                    who are unable to meet basic needs.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-coins" aria-hidden="true"></i>
                </span>
                <h4>
                  BOOST Program
                  <p>
                    Conditional cash transfer support for vulnerable households,
                    children, pregnant women, older persons, and persons with
                    disabilities.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
                </span>
                <h4>
                  Gender &amp; GBV Support Services
                  <p>
                    Survivor-centered support, safety planning, referrals,
                    advocacy, shelter support, and case management.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
                </span>
                <h4>
                  Economic Empowerment
                  <p>
                    Skills training, job readiness, entrepreneurship support,
                    financial literacy, and pathways to self-sufficiency.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-wheelchair" aria-hidden="true"></i>
                </span>
                <h4>
                  Disability Support Services
                  <p>
                    Support for persons with disabilities to access
                    opportunities, services, assistive devices, and inclusive
                    community participation.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i
                    class="fa-solid fa-hand-holding-heart"
                    aria-hidden="true"
                  ></i>
                </span>
                <h4>
                  Elderly Support Services
                  <p>
                    Support and protection for older persons, including case
                    management, residential care referrals, and intervention in
                    cases of abuse, neglect, or abandonment.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-house-chimney" aria-hidden="true"></i>
                </span>
                <h4>
                  Golden Haven Rest Home
                  <p>
                    Residential care for older persons who require daily living
                    support and do not have adequate care systems.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-home" aria-hidden="true"></i>
                </span>
                <h4>
                  Good Samaritan Homeless Shelter
                  <p>
                    Temporary accommodation and support services for individuals
                    experiencing homelessness or displacement.
                  </p>
                </h4>
              </article>
            </div>
          </div>

          <div class="service-unit-group" data-service-group="human-services">
            <h3>Department of Human Services</h3>
            <div class="service-unit-grid">
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-child" aria-hidden="true"></i>
                </span>
                <h4>
                  Child Protection Services
                  <p>
                    Receives and investigates reports of child abuse, neglect,
                    abandonment, trafficking, and exploitation.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-users" aria-hidden="true"></i>
                </span>
                <h4>
                  Child Placement &amp; Specialized Services
                  <p>
                    Identifies safe alternative placement for children who
                    cannot remain with their biological parents or legal
                    guardians.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i
                    class="fa-solid fa-hand-holding-heart"
                    aria-hidden="true"
                  ></i>
                </span>
                <h4>
                  Foster Care
                  <p>
                    Temporary family-based care for children in need of
                    protection.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i
                    class="fa-solid fa-hand-holding-heart"
                    aria-hidden="true"
                  ></i>
                </span>
                <h4>
                  Adoption
                  <p>
                    Permanent legal family placement for children in the care
                    and custody of the Department.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-users" aria-hidden="true"></i>
                </span>
                <h4>
                  Community &amp; Parent Empowerment Program
                  <p>
                    Parenting education, community mobilization, and early
                    childhood support through programs such as parenting
                    workshops and the Roving Caregivers Programme.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-handshake-angle" aria-hidden="true"></i>
                </span>
                <h4>
                  Alternative Care &amp; Anti-Trafficking in Persons
                  <p>
                    Institutional care, group home support, independent living
                    arrangements, and support for victims of trafficking.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-school" aria-hidden="true"></i>
                </span>
                <h4>
                  Child Care Centers
                  <p>
                    Care and support services for children within
                    Ministry-supported facilities.
                  </p>
                </h4>
              </article>
            </div>
          </div>

          <div
            class="service-unit-group"
            data-service-group="community-rehabilitation"
          >
            <h3>Community Rehabilitation Department</h3>
            <div class="service-unit-grid">
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-comments" aria-hidden="true"></i>
                </span>
                <h4>
                  Community Counselling Centre
                  <p>
                    Mental health, psychosocial, and counselling support for
                    individuals, youth, and families.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-gavel" aria-hidden="true"></i>
                </span>
                <h4>
                  Court &amp; Case Management
                  <p>
                    Support for cases requiring court-related intervention,
                    social support, case tracking, and rehabilitation planning.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-circle-info" aria-hidden="true"></i>
                </span>
                <h4>
                  The HUB Resource Center
                  <p>
                    A service access and resource point supporting
                    rehabilitation, youth development, and community-based
                    intervention.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-file-lines" aria-hidden="true"></i>
                </span>
                <h4>
                  Criminal Records
                  <p>
                    Support services related to criminal records processing and
                    related administrative needs.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-person-running" aria-hidden="true"></i>
                </span>
                <h4>
                  New Beginnings Youth Development Center
                  <p>
                    Residential and developmental support for young persons
                    requiring structured rehabilitation and care.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-flag-checkered" aria-hidden="true"></i>
                </span>
                <h4>
                  Youth Challenge Programme
                  <p>
                    Youth life skills, discipline, development, and
                    rehabilitation-focused programming.
                  </p>
                </h4>
              </article>
              <article class="service-unit">
                <span class="service-unit__icon">
                  <i class="fa-solid fa-seedling" aria-hidden="true"></i>
                </span>
                <h4>
                  Conscious Youth Development
                  <p>Community empowerment and youth development support.</p>
                </h4>
              </article>
            </div>
          </div>

          <div class="service-unit-cta">
            <a
              class="departments-button departments-button--primary"
              href="#departmentContacts"
            >
              View All Departments &amp; Units
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
          </div>
        </div>
      </section>

      <section
        class="facilities-centres"
        aria-labelledby="facilitiesCentresTitle"
      >
        <div class="container departments-container">
          <div class="departments-section-heading">
            <p class="section-label">Facilities &amp; Centres</p>
            <h2 id="facilitiesCentresTitle">
              Residential, Rehabilitation and Support Facilities
            </h2>
            <p>
              The Ministry also supports facilities and centres that provide
              residential care, counselling, youth development, and protection
              services.
            </p>
          </div>

          <div class="facility-grid">
            <article class="facility-card">
              <img
                class="facility-card__image"
                src="assets/images/golden-haven.png"
                alt="Golden Haven Rest Home"
              />
              <div class="facility-card__content">
                <h3>Golden Haven Rest Home</h3>
                <address>
                  Mile 16, George Price Highway, Hattieville, Belize District
                </address>
                <p>
                  <span>Telephone:</span>
                  <a href="tel:+5012056079">(501) 205-6079</a>
                </p>
              </div>
            </article>
            <article class="facility-card">
              <img
                class="facility-card__image"
                src="assets/images/homeless-shelter.png"
                alt="Good Samaritan Homeless Shelter"
              />
              <div class="facility-card__content">
                <h3>Good Samaritan Homeless Shelter</h3>
                <p>
                  Temporary shelter and reintegration support for homeless and
                  displaced persons.
                </p>
              </div>
            </article>
            <article class="facility-card">
              <img
                class="facility-card__image"
                src="assets/images/counselling-centre.png"
                alt="Belize Community Counselling Centre"
              />
              <div class="facility-card__content">
                <h3>Belize Community Counselling Centre</h3>
                <address>
                  The Hub, Chetumal Boulevard, Belize City, Belize
                </address>
                <p>
                  <span>Telephone:</span>
                  <a href="tel:+5012231406">(501) 223-1406</a>
                </p>
                <p>
                  <span>Email:</span>
                  <a href="mailto:recept.bcccc.crd@humandev.gov.bz">
                    recept.bcccc.crd@humandev.gov.bz
                  </a>
                </p>
              </div>
            </article>
            <article class="facility-card">
              <img
                class="facility-card__image"
                src="assets/images/child-care-centre.png"
                alt="Dorothy Menzies Child Care Centre"
              />
              <div class="facility-card__content">
                <h3>Dorothy Menzies Child Care Centre</h3>
                <address>
                  Corner St. Thomas and 19th Street, Belize City, Belize
                </address>
                <p>
                  <span>Telephone:</span>
                  <a href="tel:+5012035225">(501) 203-5225</a>
                </p>
                <p>
                  <span>Email:</span>
                  <a href="mailto:fostermother.dmccc@humandev.gov.bz">
                    fostermother.dmccc@humandev.gov.bz
                  </a>
                </p>
              </div>
            </article>
            <article class="facility-card">
              <img
                class="facility-card__image"
                src="assets/images/youth-development-center.png"
                alt="New Beginnings Youth Development Center"
              />
              <div class="facility-card__content">
                <h3>New Beginnings Youth Development Center</h3>
                <address>
                  21 1/2 Miles, George Price Highway, Rockville, Belize
                  District, Belize
                </address>
                <p>
                  <span>Telephone:</span>
                  <a href="tel:+5012458577">(501) 245-8577</a>
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section
        class="department-contacts"
        id="departmentContacts"
        aria-labelledby="departmentContactsTitle"
      >
        <div class="container departments-container">
          <div class="departments-section-heading">
            <p class="section-label">Contact Departments</p>
            <h2 id="departmentContactsTitle">Main Department Contacts</h2>
          </div>

          <div class="department-contact-grid">
            <article class="department-contact-card">
              <span class="department-contact-card__icon">
                <i class="fa-solid fa-building" aria-hidden="true"></i>
              </span>
              <h3>Ministry of Human Development Headquarters</h3>
              <address>
                West Block, Independence Plaza, Belmopan, Belize
              </address>
              <p>
                <span>Telephone:</span>{" "}
                <a href="tel:+5018222161">(501) 822-2161</a>
              </p>
              <p>
                <span>Email:</span>
                <a href="mailto:senior.secretary@humandev.gov.bz">
                  senior.secretary@humandev.gov.bz
                </a>
              </p>
            </article>
            <article class="department-contact-card">
              <span class="department-contact-card__icon">
                <i class="fa-solid fa-people-group" aria-hidden="true"></i>
              </span>
              <h3>Community Rehabilitation Department</h3>
              <address>
                The Hub, Chetumal Boulevard, Belize City, Belize
              </address>
              <p>
                <span>Telephone:</span> (501) 223-2716 / 4003 / 3992
              </p>
              <p>
                <span>Email:</span>
                <a href="mailto:secretary.crd@humandev.gov.bz">
                  secretary.crd@humandev.gov.bz
                </a>
              </p>
            </article>
            <article class="department-contact-card">
              <span class="department-contact-card__icon">
                <i class="fa-solid fa-hands-helping" aria-hidden="true"></i>
              </span>
              <h3>Department of Human Services</h3>
              <address>40 Regent Street, Belize City, Belize</address>
              <p>
                <span>Telephone:</span> (501) 227-7451 / 2057
              </p>
              <p>
                <span>Email:</span>
                <a href="mailto:secretary.hsd@humandev.gov.bz">
                  secretary.hsd@humandev.gov.bz
                </a>
              </p>
            </article>
            <article class="department-contact-card">
              <span class="department-contact-card__icon">
                <i class="fa-solid fa-heart" aria-hidden="true"></i>
              </span>
              <h3>Family Support &amp; Gender Affairs Department</h3>
              <address>#26 Albert Street, Belize City, Belize</address>
              <p>
                <span>Telephone:</span> (501) 227-7397 / 3888
              </p>
              <p>
                <span>Email:</span>
                <a href="mailto:secretary.wfsd@humandev.gov.bz">
                  secretary.wfsd@humandev.gov.bz
                </a>
              </p>
            </article>
            <article class="department-contact-card">
              <span class="department-contact-card__icon">
                <i class="fa-solid fa-chart-line" aria-hidden="true"></i>
              </span>
              <h3>Policy and Planning Unit</h3>
              <address>
                West Block, Independence Plaza, Belmopan, Belize
              </address>
              <p>
                <span>Email:</span>
                <a href="mailto:secretary.ppu@humandev.gov.bz">
                  secretary.ppu@humandev.gov.bz
                </a>
              </p>
            </article>
          </div>

          <a class="department-office-link" href="#">
            View All Office Locations
            <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </a>
        </div>
      </section>

      <section
        class="departments-help-cta"
        aria-labelledby="departmentsHelpTitle"
      >
        <div class="container departments-help-cta__container">
          <div>
            <h2 id="departmentsHelpTitle">
              Not Sure Which Department You Need?
            </h2>
            <p>
              Use the Service Navigator to answer a few quick questions and find
              the right support, department, or service pathway.
            </p>
          </div>
          <div class="departments-help-cta__actions">
            <a
              class="departments-button departments-button--primary"
              data-site-path="/#service-navigator"
              href="#"
            >
              Use Service Navigator
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </a>
            <a
              class="departments-button departments-button--secondary"
              href="#"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Departments;
