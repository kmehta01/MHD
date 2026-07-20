const SettingToggle = ({ checked, disabled, help, id, label, onChange }) => (
  <div className={`setting-toggle-row${disabled ? " is-disabled" : ""}`}>
    <div>
      <label htmlFor={id}>{label}</label>
      {help ? <small>{help}</small> : null}
    </div>
    <button
      aria-checked={checked}
      aria-label={label}
      className={`setting-toggle${checked ? " is-on" : ""}`}
      disabled={disabled}
      id={id}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span />
    </button>
  </div>
);

export default SettingToggle;
