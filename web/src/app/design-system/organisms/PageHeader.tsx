import type { ReactNode } from "react";
import { Button } from "@/app/design-system/atoms/Button";
import { Illustration } from "@/app/design-system/atoms/Illustration";
import type { IllustrationName } from "@/app/design-system/atoms/art";
import { Heading, Muted } from "@/app/design-system/atoms/Text";
import "./organisms.css";

/** Title of a page, with a way back, its actions, and (on wide screens) an illustration that says what the page is for. */
export function PageHeader({
  title,
  lead,
  back,
  actions,
  art,
}: {
  title: string;
  lead?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
  art?: IllustrationName;
}) {
  return (
    <header className={`ds-pagehead${art ? " ds-pagehead--art" : ""}`}>
      <div className="ds-pagehead__main">
        {back && <Button to={back.to} variant="ghost" size="sm" icon="chevronLeft" aria-label={back.label} />}
        <div>
          <Heading level={1}>{title}</Heading>
          {lead && <Muted>{lead}</Muted>}
        </div>
      </div>
      {actions && <div className="ds-pagehead__actions">{actions}</div>}
      {art && <Illustration name={art} height={104} className="ds-pagehead__art" />}
    </header>
  );
}
