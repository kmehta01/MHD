const SequenceStatusCard = ({ sequence }) => (
  <section className="ticket-sequence-card">
    <header><div><span>Sequence information</span><strong>{sequence.sequencePeriod || "—"}</strong></div><span className="ticket-status-pill">Active</span></header>
    <div className="ticket-sequence-metrics"><div><span>Current sequence</span><strong>{sequence.currentSequence ?? 0}</strong></div><div><span>Next expected</span><strong>{sequence.nextSequence ?? 1}</strong></div></div>
    <dl><div><dt>Last generated ticket</dt><dd>{sequence.lastGeneratedTicket || "No ticket generated in this period"}</dd></div><div><dt>Last generated</dt><dd>{sequence.lastGeneratedAt ? new Date(sequence.lastGeneratedAt).toLocaleString("en-BZ") : "—"}</dd></div></dl>
  </section>
);

export default SequenceStatusCard;
