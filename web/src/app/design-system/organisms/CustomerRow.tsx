import { Link } from "react-router-dom";
import type { Customer } from "@/app/domain/customers";
import { formatDate, formatRupiah } from "@/app/domain/logic";
import { formatWhatsapp } from "@/shared/lib/phone";
import { Avatar } from "@/app/design-system/atoms/Avatar";
import { Badge } from "@/app/design-system/atoms/Badge";
import { Icon } from "@/app/design-system/atoms/Icon";
import { useAppT } from "@/app/i18n/useAppT";
import "./organisms.css";

/** One owner in the customer list: who, their pets, how often they come, and whether they owe. */
export function CustomerRow({ customer }: { customer: Customer }) {
  const { t, locale } = useAppT();
  const c = t.customersPage;
  const { owner, pets } = customer;
  return (
    <Link to={`/app/customers/${owner.id}`} className="ds-petrow ds-customer">
      <Avatar name={owner.name} species={pets[0]?.species ?? "other"} />
      <div className="ds-petrow__main">
        <b>{owner.name}</b>
        <span>
          {pets.length ? pets.map((p) => p.name).join(", ") : c.pets(0)} · {c.stays(customer.stays)}
        </span>
        <span>
          {owner.whatsapp ? formatWhatsapp(owner.whatsapp) : c.noWhatsapp}
          {customer.lastCheckOut && ` · ${c.lastStay} ${formatDate(customer.lastCheckOut, locale, { day: "numeric", month: "short" })}`}
        </span>
      </div>
      {customer.owed > 0 ? <Badge tone="warn">{`${c.owes} ${formatRupiah(customer.owed, locale)}`}</Badge> : <span />}
      <Icon name="chevronRight" className="ds-petrow__chev" />
    </Link>
  );
}
