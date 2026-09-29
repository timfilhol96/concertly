import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Privacy · Concertly" },
      {
        name: "description",
        content:
          "How Concertly handles your account, your concert history, and the data you share with friends.",
      },
      { property: "og:title", content: "Trust & Privacy · Concertly" },
      {
        property: "og:description",
        content:
          "How Concertly handles your account, your concert history, and the data you share with friends.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://concertly.lovable.app/trust" },
    ],
    links: [{ rel: "canonical", href: "https://concertly.lovable.app/trust" }],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Trust Center</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Trust &amp; Privacy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page is maintained by the Concertly team to answer common security and privacy
          questions about the app. It describes app-visible controls and current practices. It is
          not an independent certification or audit report.
        </p>
      </div>

      <Section title="Accounts &amp; authentication">
        <ul className="list-disc space-y-2 pl-5">
          <li>Sign in with email + password or Google.</li>
          <li>Sessions are managed by our backend provider; tokens are stored in your browser.</li>
          <li>You can sign out at any time from the account menu, which clears the local session.</li>
        </ul>
      </Section>

      <Section title="What we store">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your profile: display name, optional username, and (if you upload one) a profile picture.</li>
          <li>Concerts you log: artist, date, venue, city, country, rating, and any optional notes you enter.</li>
          <li>Friendships you create with other Concertly users.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Concertly does not request location, contacts, payment information, or other device-level data.
        </p>
      </Section>

      <Section title="Who can see your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <span className="font-semibold text-foreground">Your concert history is private by default.</span>{" "}
            Only you can read or modify it.
          </li>
          <li>
            <span className="font-semibold text-foreground">Accepted friends</span> can view each other's
            concert history (for the side-by-side stats comparison) and each other's profile picture. Either
            party can remove the friendship at any time, which revokes access.
          </li>
          <li>
            <span className="font-semibold text-foreground">Profile basics</span> (display name, username,
            avatar) are visible to other signed-in Concertly users so friends can find you. Your email
            address is never shown to other users.
          </li>
          <li>Pending friend requests are visible only to the two people involved.</li>
        </ul>
      </Section>

      <Section title="How access is enforced">
        <p>
          Concertly uses row-level access rules on the database: every read and write is checked against
          your signed-in identity before data is returned. Friend visibility is gated on a verified
          &ldquo;accepted&rdquo; friendship record between two users.
        </p>
      </Section>

      <Section title="Hosting &amp; platform">
        <p>
          Concertly is built and hosted on the Lovable platform, which provides the application runtime,
          managed database, authentication, and file storage used by this app. Traffic between your
          browser and Concertly is served over HTTPS.
        </p>
      </Section>

      <Section title="Data retention &amp; deletion">
        <p>
          You can delete individual concerts from <Link to="/shows" className="text-brand underline">My Shows</Link>{" "}
          and remove friendships from <Link to="/friends" className="text-brand underline">Friends</Link> at any time.
          Removing a friendship immediately revokes the other person's read access to your concert history.
        </p>
        <p className="mt-3 text-muted-foreground">
          To request full account deletion, contact us at the address below.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions, privacy requests, or security reports: reach the Concertly team via the contact channel
          shown on the homepage. Please describe the issue in enough detail for us to investigate.
        </p>
      </Section>

      <p className="mt-12 text-xs text-muted-foreground">
        Last reviewed: {new Date().toLocaleDateString("en", { year: "numeric", month: "long" })}.
        This page describes current app behaviour and may change as the product evolves.
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
