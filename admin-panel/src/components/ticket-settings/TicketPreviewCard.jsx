import { useState } from "react";
import Icon from "../Icon";

const TicketPreviewCard = ({ preview, previewing, settings }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!preview?.preview) return;
    await navigator.clipboard.writeText(preview.preview);
    setCopied(true); window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <section className="ticket-preview-card" aria-live="polite">
      <header><div><span>Live server preview</span><strong>{previewing ? "Validating…" : (preview?.preview || "Preview unavailable")}</strong></div><button aria-label="Copy preview ticket number" disabled={!preview?.preview} onClick={copy} type="button"><Icon name={copied ? "check" : "applications"} size={16} /> {copied ? "Copied" : "Copy"}</button></header>
      <dl><div><dt>Current format</dt><dd>{settings.ticketFormat}</dd></div><div><dt>Next ticket</dt><dd>{preview?.nextPreview || "—"}</dd></div><div><dt>Reset period</dt><dd>{preview?.sequencePeriod || "—"}</dd></div></dl>
      {preview?.warnings?.length ? <ul>{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul> : null}
    </section>
  );
};

export default TicketPreviewCard;
