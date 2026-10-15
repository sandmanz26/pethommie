// Site-wide CSS. Imported once from main.tsx, before any component, so that component styles
// (loaded later, from their own folders) can override these page rules. Keep this order:
// tokens, then page rules, then shared button styles.
import "./tokens.css";
import "./site.css";
import "@/site/components/ui/ui.css";
