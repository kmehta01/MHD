import Icon from "./Icon";

const ModulePlaceholder = ({ title, description, icon, actionLabel, itemName }) => (
  <div className="module-page">
    <div className="module-page-header">
      <div>
        <div className="module-breadcrumb">
          <span>Administration</span>
          <Icon name="chevronRight" size={13} />
          <strong>{title}</strong>
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <button className="button button-primary" type="button">
        <Icon name="plus" size={17} /> {actionLabel}
      </button>
    </div>

    <section className="module-toolbar panel">
      <label className="module-search">
        <Icon name="search" size={17} />
        <input placeholder={`Search ${title.toLowerCase()}...`} type="search" />
      </label>
      <div className="module-filters">
        <button type="button"><Icon name="refresh" size={16} /> Refresh</button>
        <button type="button"><Icon name="download" size={16} /> Export</button>
      </div>
    </section>

    <section className="panel module-empty-state">
      <div className="empty-state-icon">
        <Icon name={icon} size={29} />
      </div>
      <h2>No {itemName} to display yet</h2>
      <p>
        New {itemName} will appear here. Use the button below to add the first one or adjust your filters.
      </p>
      <button className="button button-primary" type="button">
        <Icon name="plus" size={17} /> {actionLabel}
      </button>
      <div className="empty-state-security">
        <Icon name="shieldCheck" size={15} />
        Changes are permission-controlled and recorded in Audit Logs.
      </div>
    </section>
  </div>
);

export default ModulePlaceholder;
