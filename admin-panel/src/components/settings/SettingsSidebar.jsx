import Icon from "../Icon";

const SettingsSidebar = ({ activeSection, mobileOpen, onNavigate, onToggleMobile, search, sections, setSearch }) => (
  <aside className="settings-navigation" aria-label="General Settings sections">
    <button
      aria-expanded={mobileOpen}
      className="settings-navigation-mobile-trigger"
      onClick={onToggleMobile}
      type="button"
    >
      <span><Icon name="settings" size={17} /> Settings sections</span>
      <Icon name="chevronDown" size={17} />
    </button>
    <div className={`settings-navigation-panel${mobileOpen ? " is-open" : ""}`}>
      <label className="settings-search">
        <Icon name="search" size={16} />
        <input
          aria-label="Search settings"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search settings..."
          type="search"
          value={search}
        />
      </label>
      <nav>
        {sections.map((section) => (
          <button
            aria-current={activeSection === section.id ? "location" : undefined}
            className={activeSection === section.id ? "active" : ""}
            key={section.id}
            onClick={() => onNavigate(section.id)}
            type="button"
          >
            <Icon name={section.icon} size={16} />
            <span>{section.title}</span>
          </button>
        ))}
      </nav>
      {!sections.length ? <p className="settings-navigation-empty">No matching settings.</p> : null}
    </div>
  </aside>
);

export default SettingsSidebar;
