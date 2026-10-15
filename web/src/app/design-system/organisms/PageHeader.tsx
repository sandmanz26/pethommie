import type { ReactNode } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import "./organisms.css";

export function PageHeader({ title, lead, back, actions }: { title: string; lead?: ReactNode; back?: { to: string; label: string }; actions?: ReactNode }) {
  return (
    <header className="ds-pagehead">
      <div className="ds-pagehead__main">
        {back && <Button to={back.to} variant="ghost" size="sm" icon="chevronLeft" aria-label={back.label} />}
        <div>
          <Heading level={1}>{title}</Heading>
          {lead && <Muted>{lead}</Muted>}
        </div>
      </div>
      {actions && <div className="ds-pagehead__actions">{actions}</div>}
    </header>
  );
}
