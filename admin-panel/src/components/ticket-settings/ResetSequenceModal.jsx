import { useState } from "react";
import Icon from "../Icon";

const ResetSequenceModal = ({ onClose, onReset, open, saving, sequence, settings }) => {
  const [confirmation, setConfirmation] = useState("");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState(settings?.startingSequence || 1);
  const [error, setError] = useState("");
  if (!open) return null;
  const submit = async () => {
    const result = await onReset({ confirmation, newStartingSequence: Number(start), reason });
    if (!result.ok) return setError(result.message);
    setConfirmation(""); setReason(""); setError(""); onClose(result);
  };
  return <div className="modal-backdrop settings-modal-backdrop" onMouseDown={() => !saving && onClose()}><section aria-labelledby="ticket-reset-title" aria-modal="true" className="settings-reset-modal ticket-reset-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog"><header><div><p className="profile-eyebrow">Audited action</p><h2 id="ticket-reset-title">Reset ticket sequence</h2></div><button aria-label="Close" className="settings-modal-close" onClick={() => onClose()} type="button"><Icon name="close" size={19} /></button></header><div className="ticket-reset-summary"><span>Current <strong>{sequence?.currentSequence ?? 0}</strong></span><span>Period <strong>{sequence?.sequencePeriod || "—"}</strong></span><span>Last ticket <strong>{sequence?.lastGeneratedTicket || "—"}</strong></span></div><p>Existing grievances keep their ticket numbers. The server will reject a reset if its next number already exists.</p><label><span>New starting sequence</span><input min="1" onChange={(event) => setStart(event.target.value)} type="number" value={start} /></label><label><span>Type <strong>RESET TICKET SEQUENCE</strong></span><input autoComplete="off" onChange={(event) => setConfirmation(event.target.value)} value={confirmation} /></label><label><span>Reason</span><textarea maxLength="500" onChange={(event) => setReason(event.target.value)} rows="3" value={reason} /></label>{error ? <div className="settings-inline-error">{error}</div> : null}<div className="settings-modal-actions"><button className="button button-secondary" onClick={() => onClose()} type="button">Cancel</button><button className="button button-danger" disabled={saving || confirmation !== "RESET TICKET SEQUENCE" || reason.trim().length < 5} onClick={submit} type="button">{saving ? "Resetting…" : "Reset Sequence"}</button></div></section></div>;
};

export default ResetSequenceModal;
