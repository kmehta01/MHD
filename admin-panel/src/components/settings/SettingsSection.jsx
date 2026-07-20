import Icon from "../Icon";

const SettingsSection = ({ children, description, icon, id, title }) => (
  <section aria-labelledby={`${id}-title`} className="general-settings-section" id={`settings-${id}`}>
    <header className="general-settings-section-header">
      <span><Icon name={icon} size={20} /></span>
      <div>
        <h2 id={`${id}-title`}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
    <div className="general-settings-section-body">{children}</div>
  </section>
);

export default SettingsSection;
