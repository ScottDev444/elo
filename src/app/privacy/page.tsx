"use client";

import { ChevronLeft, ShieldCheck } from "lucide-react";
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

export default function PrivacyPage() {
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

        <h1>Privacy Policy</h1>

        <div className="elo-legal-updated">
          Last updated: 25 September 2026
        </div>

        <p className="elo-legal-intro">
          East Lothian Online (“ELO”, “we”, “us” or “our”) is designed to help people find useful local information and to help local organisations maintain Pages, Places and posts. This policy explains what personal data we use, why we use it and the choices available to you when you use the ELO website, apps and related services.
        </p>

        <Section title="1. Who is responsible for your data">
          East Lothian Online is the controller of personal data processed through ELO. You can contact us through Help &amp; Support or the contact options provided on ELO for privacy questions, access requests or deletion requests.
        </Section>

        <Section title="2. Information you give us">
          We may process information you provide when creating or using an account, including your username, email address and authentication information. If you manage an ELO Page or Place, we also process the information, images, descriptions, contact details and posts you choose to submit. If you contact support, we process the contents of your message or ticket, replies and any screenshot or image you attach.
        </Section>

        <Section title="3. Information created when ELO is used">
          ELO may record limited technical and activity information needed to operate, secure and understand the service. This can include request logs, error information, searches, post views, clicks and similar service activity. ELO&apos;s product analytics are intended to be aggregate rather than a public profile of individual behaviour.
        </Section>

        <Section title="4. Location">
          ELO does not require you to provide your precise device location in order to browse East Lothian information. If a feature asks for location permission or access to location information, ELO will explain the purpose before requesting it where required.
        </Section>

        <Section title="5. Why we use personal data">
          We use personal data to create and secure accounts; provide saved items and account features; publish and manage Pages, Places and posts; provide support and moderation; operate Partnership features; prevent abuse and fraud; maintain reliability; understand aggregate use of ELO; and meet legal obligations.
        </Section>

        <Section title="6. Our lawful bases">
          Depending on the activity, we rely on performance of our contract with you, our legitimate interests in operating and protecting ELO, consent where a permission or optional communication requires it, and compliance with legal obligations. Where we rely on legitimate interests, we consider the impact on your rights and expect the processing to be proportionate to operating a local information service.
        </Section>

        <Section title="7. Public information">
          Information you deliberately publish through an approved Page, Place or post is intended to be visible to ELO users and may also be publicly accessible through ELO&apos;s website, apps or other public-facing services. Do not publish personal information that you do not want made public or that you do not have authority to publish.
        </Section>

        <Section title="8. Service providers">
          We use trusted service providers to operate ELO, including Supabase for database, authentication, storage and related backend services, as well as hosting, analytics, distribution and payment providers where relevant. Where purchases are made through Apple, Google or another payment provider, that provider may process payment information under its own terms and privacy practices. ELO receives the information needed to recognise purchase or subscription status rather than your full card details where the payment is handled by that provider.
        </Section>

        <Section title="9. International processing">
          Some service providers may process data outside the United Kingdom. Where this happens, we rely on the safeguards or lawful transfer mechanisms made available by those providers and applicable data protection law.
        </Section>

        <Section title="10. How long we keep information">
          We keep account and service data for as long as it is needed to provide ELO and for legitimate operational, security, dispute-resolution or legal purposes. When an account is deleted, associated personal data and user-generated content will be deleted or anonymised unless we are legally required to retain particular information. Technical logs and backups may remain for limited provider-controlled retention periods before expiry.
        </Section>

        <Section title="11. Account deletion">
          You can initiate deletion from your ELO Account area, including through the account deletion option available on the website or in supported apps. Manual deletion requests are normally completed within 7 days. Account deletion includes the ELO account and associated personal data and user-generated content, subject only to information we are legally required to retain. We will use the email address associated with your account to confirm completion where practical.
        </Section>

        <Section title="12. Your rights">
          Under UK data protection law, you may have rights to access personal data, correct inaccurate information, request deletion or restriction, object to certain processing, receive certain data in a portable form, and withdraw consent where processing is based on consent. You also have the right to complain to the UK Information Commissioner&apos;s Office.
        </Section>

        <Section title="13. Notifications and communications">
          Notifications and optional communications may be controlled through ELO settings, browser settings, device settings or the relevant platform settings, depending on how you use ELO. Optional permissions can be withdrawn at any time through the relevant settings.
        </Section>

        <Section title="14. Children">
          ELO is a general local information service. Accounts should not be used by a child to manage an organisation, enter a paid Partnership or publish on behalf of another person under any circumstances.
        </Section>

        <Section title="15. Security">
          We use technical and organisational measures intended to protect ELO data, including authenticated access and database access controls. No internet service can guarantee absolute security.
        </Section>

        <Section title="16. Changes to this policy">
          We may update this policy when ELO, our providers or legal requirements change. The current version will be available through ELO, including on the website, and the “Last updated” date will be changed when the policy is revised.
        </Section>

        <div className="elo-legal-note">
          <ShieldCheck size={20} />
          <p>
            Privacy questions? Use Help &amp; Support or the contact options provided through ELO.
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
