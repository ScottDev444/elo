"use client";

import { ChevronLeft, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

type SectionProps = {
  title: string;
  children: React.ReactNode;
};

function Section({
  title,
  children,
}: SectionProps) {
  return (
    <section className="elo-legal-section">
      <h2>{title}</h2>
      <p>{children}</p>
    </section>
  );
}

export default function TermsPage() {
  const router = useRouter();

  return (
    <main className="elo-legal-page">
      <header className="elo-legal-topbar">
        <button
          type="button"
          className="elo-legal-back"
          onClick={() => router.back()}
        >
          <ChevronLeft size={22} />
          <span>Back</span>
        </button>

        <div className="elo-legal-brand">
          <strong>East Lothian Online</strong>
          <span>Your Community&apos;s Digital Home</span>
        </div>

        <div className="elo-legal-spacer" />
      </header>

      <article className="elo-legal-content">
        <div className="elo-legal-eyebrow">LEGAL</div>

        <h1>Terms of Use</h1>

        <div className="elo-legal-updated">
          Last updated: 25 September 2026
        </div>

        <p className="elo-legal-intro">
          These Terms govern your use of East Lothian Online (“ELO”), including the ELO website, apps and related services. By creating an account or using account features, you agree to these Terms. You can still browse the parts of ELO that are available without an account.
        </p>

        <Section title="1. What ELO is">
          ELO is a local digital noticeboard. It helps people discover local Pages, Places, events, deals, updates, alerts and other useful East Lothian information. ELO is not a social network and does not promise that every piece of local information will be available or error-free.
        </Section>

        <Section title="2. Your account">
          You are responsible for keeping your login details secure and for activity carried out through your account. Information you provide must be accurate enough for us to operate the account. You must not impersonate another person or organisation or use an account to mislead other users.
        </Section>

        <Section title="3. Pages and authority to post">
          Pages are intended for genuine local businesses, organisations and community groups. If you create, manage or post through a Page, you confirm that you have authority to represent that Page and to publish the information you submit. ELO may verify Pages before allowing them to publish.
        </Section>

        <Section title="4. Content rules">
          You must not upload or publish content that is illegal, threatening, abusive, discriminatory, sexually exploitative, deliberately deceptive, fraudulent, defamatory, invasive of privacy, infringing of intellectual property rights, spam, malicious, or otherwise likely to create a serious safety risk. You must not publish another person&apos;s private information without a lawful reason or appropriate permission.
        </Section>

        <Section title="5. Local relevance">
          ELO is built around useful local information. We may remove content that is substantially unrelated to the community served by ELO, is repetitive promotional spam, or is being used primarily to manipulate visibility rather than inform local users.
        </Section>

        <Section title="6. Moderation and reports">
          Users may report content. ELO may review, restrict, remove or decline content or Pages that breach these Terms, create safety or legal concerns, or undermine the usefulness of the service. Serious or repeated breaches may lead to posting restrictions, suspension or account deletion. Moderation decisions may be made by a human reviewer.
        </Section>

        <Section title="7. Your content and permission to display it">
          You keep ownership of content you own. By submitting content to ELO, you give ELO a non-exclusive permission to host, store, reproduce, format and display that content as needed to operate and promote the ELO service across the website, apps and other ELO channels. You confirm that you have the rights needed to grant that permission.
        </Section>

        <Section title="8. Accuracy of local information">
          Organisations are responsible for keeping the information they publish accurate and current. Opening hours, prices, offers, event details, availability and other third-party information can change. Users should verify important information directly with the relevant organisation where necessary.
        </Section>

        <Section title="9. Partnership">
          ELO may offer a paid Partnership that provides additional Page tools, visibility, analytics, posting formats or other benefits described at the time of purchase. Partnership does not guarantee a particular number of views, customers, sales or other commercial results.
        </Section>

        <Section title="10. Purchases and subscriptions">
          Partnership or other paid ELO services may be offered through the website, an app store or another payment provider. Billing, renewal, cancellation and refunds may also be subject to the rules and terms of the provider used to make the purchase. Prices and included features will be shown before purchase. Deleting an ELO account does not automatically cancel a subscription managed by an external provider, so any active subscription should be cancelled through that provider before account deletion where applicable.
        </Section>

        <Section title="11. Service availability">
          We aim to keep ELO reliable, but the website, apps or related services may occasionally be unavailable because of maintenance, provider outages, technical problems, safety actions or events beyond our reasonable control. We may change or discontinue features where reasonably necessary.
        </Section>

        <Section title="12. No resale or misuse">
          You must not scrape ELO at scale, attempt to bypass access controls, overload the service, probe for vulnerabilities, interfere with other users, automate abusive requests, or use ELO data to build an unauthorised competing database or surveillance profile.
        </Section>

        <Section title="13. Account deletion">
          You may initiate deletion from the ELO Account area through the website or supported apps. Deletion is permanent once completed and includes associated personal data and user-generated content except where limited retention is required by law. If you manage a Page, its associated content may also be removed as part of the deletion process.
        </Section>

        <Section title="14. Intellectual property">
          ELO&apos;s software, branding, interface and original materials remain the property of their respective owner or licensor. These Terms do not give you ownership of ELO&apos;s software, website, apps or branding.
        </Section>

        <Section title="15. Liability">
          Nothing in these Terms excludes liability that cannot legally be excluded. To the fullest extent permitted by law, ELO is not responsible for indirect or consequential loss, or for decisions made solely in reliance on third-party local information that has become inaccurate or incomplete.
        </Section>

        <Section title="16. Changes to these Terms">
          We may update these Terms when ELO changes or where legal, safety or operational requirements make an update necessary. Material changes will be made available through ELO, including on the website, or through another reasonable notice method.
        </Section>

        <Section title="17. Governing law">
          These Terms are governed by Scots law. The Scottish courts will have jurisdiction, subject to any mandatory consumer rights that give you the right to bring a claim elsewhere.
        </Section>

        <Section title="18. Contact">
          If you have a question about these Terms, moderation or your account, use Help &amp; Support or the contact options provided through ELO.
        </Section>

        <div className="elo-legal-note">
          <FileText size={20} />
          <p>
            The short version: keep ELO useful, local, accurate and safe.
          </p>
        </div>
      </article>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-legal-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #111111;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-legal-page *,
  .elo-legal-page *::before,
  .elo-legal-page *::after {
    box-sizing: border-box;
  }

  .elo-legal-page button {
    font: inherit;
  }

  .elo-legal-topbar {
    min-height: 68px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid #DDE3E0;
    background: #F4F5F4;
  }

  .elo-legal-back {
    width: 76px;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 1px;
    border: 0;
    background: transparent;
    padding: 0;
    color: #005744;
    cursor: pointer;
  }

  .elo-legal-back span {
    font-size: 13px;
    font-weight: 800;
  }

  .elo-legal-back:focus {
    outline: none;
  }

  .elo-legal-back:focus-visible {
    outline: 2px solid #A6B4AF;
    outline-offset: 2px;
    border-radius: 8px;
  }

  .elo-legal-brand {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .elo-legal-brand strong {
    color: #005744;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -.25px;
  }

  .elo-legal-brand span {
    margin-top: 2px;
    color: #47776B;
    font-size: 9px;
    font-weight: 700;
  }

  .elo-legal-spacer {
    width: 76px;
    flex: 0 0 76px;
  }

  .elo-legal-content {
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    padding: 28px 20px 130px;
  }

  .elo-legal-eyebrow {
    color: #008564;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: 1.3px;
  }

  .elo-legal-content > h1 {
    margin: 8px 0 0;
    color: #111111;
    font-size: 34px;
    line-height: 39px;
    font-weight: 900;
    letter-spacing: -1.1px;
  }

  .elo-legal-updated {
    margin-top: 8px;
    color: #7C8581;
    font-size: 12px;
    font-weight: 700;
  }

  .elo-legal-intro {
    margin: 22px 0 8px;
    color: #424B47;
    font-size: 15px;
    line-height: 23px;
    font-weight: 600;
  }

  .elo-legal-section {
    margin-top: 25px;
  }

  .elo-legal-section h2 {
    margin: 0 0 8px;
    color: #17211D;
    font-size: 17px;
    line-height: 22px;
    font-weight: 900;
    letter-spacing: -.25px;
  }

  .elo-legal-section p {
    margin: 0;
    color: #5E6863;
    font-size: 14px;
    line-height: 22px;
    font-weight: 500;
  }

  .elo-legal-note {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-top: 32px;
    border-radius: 18px;
    background: #E6F1ED;
    padding: 16px;
    color: #005744;
  }

  .elo-legal-note > svg {
    flex: 0 0 auto;
  }

  .elo-legal-note p {
    flex: 1;
    margin: 0;
    color: #315A50;
    font-size: 13px;
    line-height: 19px;
    font-weight: 700;
  }

  @media (max-width: 520px) {
    .elo-legal-content {
      padding-left: 16px;
      padding-right: 16px;
    }

    .elo-legal-content > h1 {
      font-size: 31px;
      line-height: 36px;
    }

    .elo-legal-brand strong {
      font-size: 14px;
    }

    .elo-legal-brand span {
      font-size: 8px;
    }
  }
`;