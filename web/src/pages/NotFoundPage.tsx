import { Link } from "react-router-dom";
import { Hanko } from "../components/ui/Hanko";

export function NotFoundPage() {
  return (
    <main className="section" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="wrap" style={{ display: "grid", gap: 16, justifyItems: "start" }}>
        <Hanko size={44} />
        <h1 style={{ fontSize: "var(--step-3)" }}>Halaman ini tidak ada di gulungan.</h1>
        <p style={{ color: "var(--ink-soft)" }}>Alamatnya mungkin salah ketik, atau halamannya sudah dipindah.</p>
        <Link className="btn btn--solid" to="/">
          Kembali ke beranda
        </Link>
      </div>
    </main>
  );
}
