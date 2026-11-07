import type { LucideIcon } from "lucide-react";
import { Hourglass } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";

/** Placeholder for modules that aren't live yet. */
export function ComingSoon({ title, description, icon = Hourglass }: { title: string; description: string; icon?: LucideIcon }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        icon={icon}
        title="Coming soon"
        description={description}
        action={<LinkButton href="/dashboard" variant="secondary">Back to dashboard</LinkButton>}
      />
    </>
  );
}
