import { brand, nav } from "../../content/landing";
import { Button } from "../ui/Button";
import { Hanko } from "../ui/Hanko";
import "./layout.css";

export function TopBar() {
  return (
    <header className="topbar">
      <a className="topbar__brand" href="#top">
        <Hanko />
        {brand.name}
      </a>
      <nav className="topbar__nav" aria-label="Utama">
        {nav.map((item) => (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ))}
      </nav>
      <Button href="#gabung">Coba gratis</Button>
    </header>
  );
}
