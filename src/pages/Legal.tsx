import { AppShell } from "@/components/layout/AppShell";

const Legal = ({ kind }: { kind: "terms" | "privacy" }) => (
  <AppShell hideTabBar>
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl md:text-4xl">{kind === "terms" ? "Terms of Service" : "Privacy Policy"}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Placeholder copy. Replace with your final {kind} document before launch.
      </p>
      <article className="prose prose-sm mt-6 max-w-none">
        <p>
          ONLY/COACH connects independent coaches with paying mentees. By using the
          platform you agree to be bound by these {kind === "terms" ? "terms" : "privacy practices"}.
          A full version of this document will be published before public launch.
        </p>
      </article>
    </div>
  </AppShell>
);

export default Legal;
