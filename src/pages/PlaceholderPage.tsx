import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Construction } from "lucide-react";

interface PlaceholderProps {
  title: string;
  description: string;
  children?: ReactNode;
}

/**
 * Used for app sections that aren't built yet, so the responsive shell,
 * routing, and tab bar can be validated end-to-end before the real
 * features land in later rounds.
 */
export const PlaceholderPage = ({ title, description }: PlaceholderProps) => (
  <AppShell>
    <div className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 md:py-16">
      <div className="brutal-card p-8 md:p-12">
        <div className="brutal-tag mb-6">
          <Construction className="h-3 w-3" /> Coming next
        </div>
        <h1 className="font-display text-3xl md:text-5xl">{title}</h1>
        <p className="mt-4 max-w-lg text-muted-foreground">{description}</p>
      </div>
    </div>
  </AppShell>
);

export default PlaceholderPage;
