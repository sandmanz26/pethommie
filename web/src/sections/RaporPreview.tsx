import { useLocale } from "../i18n/LocaleProvider";
import { Hanko } from "../components/ui/Hanko";
import "./sections.css";

/** Rapor Anabul shown as it arrives in the owner's WhatsApp. */
export function RaporPreview() {
  const rapor = useLocale().t.report;
  const s = rapor.sample;
  return (
    <section className="section section--flush-top" id="report">
      <div className="wrap rapor">
        <div className="phone" aria-label={rapor.phoneAriaLabel}>
          <div className="chat">
            <div className="chat__top">
              <Hanko />
              <div>
                <b>{s.hotel}</b>
                <small>{s.subtitle}</small>
              </div>
            </div>
            <div className="bubble">
              <img className="bubble__pic" src={s.image} alt={s.imageAlt} loading="lazy" />
              <b>{s.heading}</b>
              <ul>
                {s.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <span className="bubble__time">{s.sentAt} ✓✓</span>
            </div>
            <div className="bubble bubble--reply">
              {s.reply}
              <span className="bubble__time">{s.replyAt}</span>
            </div>
          </div>
        </div>
        <div className="rapor__copy">
          <span className="eyebrow">{rapor.eyebrow}</span>
          <h2>{rapor.title}</h2>
          <p>{rapor.body}</p>
          <ul className="ticks">
            {rapor.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
