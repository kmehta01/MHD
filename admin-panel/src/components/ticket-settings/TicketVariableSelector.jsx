const variables = ["{PREFIX}", "{YEAR}", "{YEAR_SHORT}", "{MONTH}", "{DAY}", "{DEPARTMENT}", "{LOCATION}", "{CATEGORY}", "{SEQUENCE}"];

const TicketVariableSelector = ({ disabled, onSelect }) => (
  <div className="ticket-variable-panel" aria-label="Available ticket variables">
    <div><strong>Available variables</strong><small>Select a variable to add it to the format.</small></div>
    <div className="ticket-variable-chips">
      {variables.map((variable) => <button disabled={disabled} key={variable} onClick={() => onSelect(variable)} type="button">{variable}</button>)}
    </div>
  </div>
);

export default TicketVariableSelector;
