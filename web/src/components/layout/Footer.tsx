import { footer } from "../../content/landing";
import "./layout.css";

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer__inner">
        <span>{footer.left}</span>
        <span>{footer.right}</span>
      </div>
    </footer>
  );
}
