const TicketPreview = ({ settings }) => {
  const year = new Date().getFullYear();
  const sequence = String(settings.startingSequenceNumber || 1).padStart(6, "0");
  const period = settings.sequenceReset === "Monthly"
    ? `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}`
    : settings.sequenceReset === "Yearly" ? year : "";
  const ticket = [settings.ticketPrefix || "GRM", period, sequence].filter(Boolean).join("-");

  return (
    <div className="ticket-number-preview" aria-live="polite">
      <span>Live ticket preview</span>
      <strong>{settings.autoGenerateTicketNumber ? ticket : "Manual ticket entry"}</strong>
      <small>Preview uses the current year and configured starting sequence.</small>
    </div>
  );
};

export default TicketPreview;
