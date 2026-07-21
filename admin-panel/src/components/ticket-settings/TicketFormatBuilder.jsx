import { useRef } from "react";
import TicketVariableSelector from "./TicketVariableSelector";

const TicketFormatBuilder = ({ disabled, error, onChange, value }) => {
  const inputRef = useRef(null);
  const insertVariable = (variable) => {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${variable}${value.slice(end)}`);
    window.setTimeout(() => { input?.focus(); input?.setSelectionRange(start + variable.length, start + variable.length); }, 0);
  };
  return (
    <div className="ticket-format-builder">
      <label htmlFor="ticket-format"><span>Ticket Format <b>*</b></span><input aria-invalid={Boolean(error)} disabled={disabled} id="ticket-format" maxLength={255} onChange={(event) => onChange(event.target.value)} ref={inputRef} value={value} /></label>
      <small>Every format must include <code>{"{SEQUENCE}"}</code>. Ticket numbers are generated only by the server.</small>
      {error ? <span className="settings-field-error">{error}</span> : null}
      <TicketVariableSelector disabled={disabled} onSelect={insertVariable} />
    </div>
  );
};

export default TicketFormatBuilder;
