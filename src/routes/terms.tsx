import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · Concertly" },
      {
        name: "description",
        content:
          "Read the Concertly terms of service: the rules for using the concert tracking app, your account, your show data, and acceptable use.",
      },
      { property: "og:title", content: "Terms of Service · Concertly" },
      {
        property: "og:description",
        content:
          "Read the Concertly terms of service: the rules for using the concert tracking app, your account, your show data, and acceptable use.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://concertly.lovable.app/terms" },
    ],
    links: [{ rel: "canonical", href: "https://concertly.lovable.app/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Terms of <span className="gradient-text">Service</span>
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          By creating an account or using Concertly, you agree to these terms. Please also review our{" "}
          <Link to="/privacy" className="text-brand underline">Privacy Policy</Link>.
        </p>
      </div>

      <Section title="Your account">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must provide accurate sign-up information and keep your credentials secure.</li>
          <li>You are responsible for all activity that happens under your account.</li>
          <li>You may delete your account at any time by contacting us.</li>
        </ul>
      </Section>

      <Section title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Upload unlawful, hateful, harassing, or infringing content.</li>
          <li>Impersonate another person or misrepresent your affiliation.</li>
          <li>Attempt to break, probe, or overload the service, or bypass access controls.</li>
          <li>Scrape or bulk-export data belonging to other users.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          We may suspend or terminate accounts that violate these rules.
        </p>
      </Section>

      <Section title="Your content">
        <p>
          You retain ownership of the concerts, notes, photos, and videos you upload. You grant Concertly a
          limited license to host and display that content back to you and to accepted friends you share it
          with, solely to operate the service.
        </p>
        <p className="mt-3">
          Wrapped share links you generate are public by design: anyone with the link can view the recap.
        </p>
      </Section>

      <Section title="Third-party services">
        <p>
          Concertly integrates with third parties (e.g. Spotify, setlist.fm, Google). Your use of those
          integrations is also governed by their respective terms. We are not responsible for third-party
          service availability or content.
        </p>
      </Section>

      <Section title="Service &ldquo;as is&rdquo;">
        <p>
          Concertly is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis without warranties of any kind. To
          the extent permitted by law, we disclaim liability for indirect, incidental, or consequential
          damages arising from your use of the service.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update these terms as the product evolves. Continued use after changes means you accept the
          updated terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>Questions about these terms? Reach us through the contact channel on the homepage.</p>
      </Section>

      <p className="mt-12 text-xs text-muted-foreground">
        Last updated: {new Date().toLocaleDateString("en", { year: "numeric", month: "long" })}.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 rounded-2xl border border-hairline bg-card p-6">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
