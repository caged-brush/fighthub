import Image from "next/image";
import Brand, { earlyAccessEmail, supportEmail } from "./Brand";
import RoleExplorer from "./RoleExplorer";

const steps = [
  { name: "Post an opening", detail: "Scouts publish a fight slot with the weight class, event details, and application requirements." },
  { name: "Find and apply", detail: "Fighters apply to open slots. Coaches can endorse an application or submit an eligible fighter." },
  { name: "Review and book", detail: "Scouts review applicants, shortlist prospects, message fighters, and record bookings in the app." },
];

const questions = [
  ["What is Kavyx?", "Kavyx is a mobile app for combat sports discovery and fight opportunities. It gives fighters, coaches, and scouts tools to find each other and manage applications around open fight slots."],
  ["Where is Kavyx starting?", "Our initial focus is Canada, starting with fighters, gyms, and scouts in British Columbia."],
  ["How do I get early access?", "Email us with your role, city, and device. We’ll let you know which builds are available and how to join. iOS beta testing uses Apple TestFlight."],
  ["Does an application confirm a fight?", "Applying starts the review process. The scout can review, shortlist, or mark an application as booked in the app."],
];

export default function KavyxLanding() {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#roles">Who it’s for</a>
            <a href="#workflow">How it works</a>
            <a href="#faq">FAQ</a>
          </nav>
          <a className="header-cta" href="#early-access">Early access <span aria-hidden="true">→</span></a>
        </div>
      </header>
      <main id="main-content">
        <section className="hero" aria-labelledby="hero-heading">
          <div className="hero-media" aria-hidden="true">
            <Image src="/images/kavyx-training.webp" alt="" fill preload unoptimized sizes="100vw" />
          </div>
          <div className="wrap hero-inner">
            <div className="hero-copy">
              <p className="eyebrow hero-kicker">Combat sports discovery</p>
              <h1 id="hero-heading">Find talent.<br /><em>Fill fight slots.</em></h1>
              <p className="hero-description">Kavyx connects fighters, coaches, and scouts through searchable profiles, fight clips, and open fight opportunities.</p>
              <div className="actions">
                <a className="button primary" href="#early-access">Request early access <span aria-hidden="true">→</span></a>
                <a className="button outline" href="#roles">Explore Kavyx</a>
              </div>
            </div>
          </div>
        </section>

        <section className="wrap section role-section" id="roles" aria-labelledby="roles-heading">
          <div className="section-intro">
            <p className="eyebrow section-kicker">Who it’s for</p>
            <h2 id="roles-heading">Three roles.<br />One fight card.</h2>
          </div>
          <RoleExplorer />
        </section>

        <section className="workflow" id="workflow" aria-labelledby="workflow-heading">
          <div className="wrap section">
            <div className="section-intro">
              <p className="eyebrow section-kicker">How it works</p>
              <h2 id="workflow-heading">From open slot to booking.</h2>
            </div>
            <ol className="steps">
              {steps.map((step, index) => (
                <li key={step.name}><span className="step-number" aria-hidden="true">0{index + 1}</span><h3>{step.name}</h3><p>{step.detail}</p></li>
              ))}
            </ol>
          </div>
        </section>

        <section className="wrap section faq-section" id="faq" aria-labelledby="faq-heading">
          <div className="section-intro">
            <h2 id="faq-heading">Common questions.</h2>
          </div>
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}><summary>{question}</summary><p>{answer}</p></details>
            ))}
          </div>
        </section>

        <section className="wrap access-section" id="early-access" aria-labelledby="access-heading">
          <div className="access-card">
            <div>
              <p className="eyebrow">Kavyx mobile beta</p>
              <h2 id="access-heading">Get early access.</h2>
              <p>Email us with your role, city, and device to ask about testing.</p>
            </div>
            <a className="button primary" href={earlyAccessEmail()}>Email Kavyx <span aria-hidden="true">→</span></a>
          </div>
        </section>
      </main>
      <footer className="site-footer">
        <div className="wrap footer-inner">
          <Brand />
          <p>Built in British Columbia, Canada.</p>
          <a href={"mailto:" + supportEmail}>Contact support <span aria-hidden="true">→</span></a>
        </div>
      </footer>
    </>
  );
}
