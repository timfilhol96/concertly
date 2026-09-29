import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy · Concertly" },
      {
        name: "description",
        content:
          "How Concertly collects, uses, stores, and shares your account and concert data.",
      },
      { property: "og:title", content: "Privacy Policy · Concertly" },
      {
        property: "og:description",
        content:
          "How Concertly collects, uses, stores, and shares your account and concert data.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://concertly.lovable.app/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://concertly.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-10">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Legal</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This policy describes what Concertly stores about you, how it is used, and the choices you
          have. For a broader overview of security controls, see the{" "}
          <Link to="/trust" className="text-brand underline">Trust &amp; Privacy</Link> page.
        </p>
      </div>

      <Section title="Data we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>Account: email address and (optional) Google account identifier used to sign in.</li>
          <li>Profile: display name, optional username, optional avatar image.</li>
          <li>Concerts you log: artist, date, venue, city, country, setlist, rating, ticket price, notes, and any photos/videos you upload.</li>
          <li>Friendships you create with other Concertly users.</li>
          <li>Optional Spotify connection tokens, stored only if you connect Spotify to create playlists.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          We do not collect location, contacts, payment information, or device-level data.
        </p>
      </Section>

      <Section title="How we use your data">
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide the core product: your dashboard, insights, Wrapped, and friend comparisons.</li>
          <li>Enable social features you opt into (friend requests, Wrapped share links).</li>
          <li>Fetch artist metadata and setlists from third-party sources (Spotify, setlist.fm) on your behalf.</li>
        </ul>
        <p className="mt-3 text-muted-foreground">
          Concertly does not sell your data and does not use it for advertising.
        </p>
      </Section>

      <Section title="Sharing & visibility">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your concert history is private by default. Only you can read or modify it.</li>
          <li>Accepted friends can view each other's concert history and profile picture.</li>
          <li>Profile basics (display name, username, avatar) are visible to other signed-in users so friends can find you. Your email is never shown to other users.</li>
          <li>
            Wrapped share links (<code>/w?id=…</code>) are <strong>public by design</strong>: anyone with the
            link can view that Wrapped snapshot without signing in. Only generate a link if you're comfortable
            with the recap being publicly viewable.
          </li>
        </ul>
      </Section>

      <Section title="Third-party services">
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Lovable Cloud</strong>: application hosting, database, authentication, file storage.</li>
          <li><strong>Google</strong>: optional single sign-on.</li>
          <li><strong>Spotify</strong>: optional playlist creation from setlists (only if you connect).</li>
          <li><strong>setlist.fm</strong>: read-only lookups of publicly-available setlists.</li>
        </ul>
      </Section>

      <Section title="Retention & deletion">
        <p>
          You can delete individual concerts from{" "}
          <Link to="/shows" className="text-brand underline">My Shows</Link>, remove friendships from{" "}
          <Link to="/friends" className="text-brand underline">Friends</Link>, and disconnect Spotify from{" "}
          <Link to="/profile" className="text-brand underline">your profile</Link> at any time. To request
          full account deletion, contact us via the channel on the homepage.
        </p>
      </Section>

      <Section title="Your rights">
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, export, or delete personal
          data we hold about you. Contact us to exercise any of these rights.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          We may update this policy as the product evolves. Material changes will be surfaced in the app.
        </p>
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
