import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Icon from "../components/Icon";
import API from "../services/api";

const emptyCatalog = { code: "", name: "", isActive: true };
const emptyHoliday = { date: "", name: "", isActive: true };
const emptyRule = { name: "", matchType: "category", matchValue: "", departmentId: "", officerId: "", priority: 100, isActive: true };
const emptyStatus = { key: "", name: "", reportingGroup: "open", notificationEvent: "status_change", isFinal: false, isActive: true, sortOrder: 100 };
const emptyPriority = { key: "", name: "", isHighPriority: false, isActive: true, sortOrder: 100 };

const RuntimeConfiguration = () => {
  const { module, setting } = useParams();
  const mode = setting || module || "runtime";
  const [data, setData] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [catalogForm, setCatalogForm] = useState(emptyCatalog);
  const [holidayForm, setHolidayForm] = useState(emptyHoliday);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [statusForm, setStatusForm] = useState(emptyStatus);
  const [priorityForm, setPriorityForm] = useState(emptyPriority);
  const [preview, setPreview] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const requests = [API.get("/configuration")];
    if (mode === "notification-templates") requests.push(API.get("/notifications/templates/all"));
    const responses = await Promise.all(requests);
    setData(responses[0].data.data);
    if (responses[1]) setTemplates(responses[1].data.data || []);
  }, [mode]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      load().catch((error) => { if (active) setMessage(error.response?.data?.message || "Failed to load configuration"); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load]);

  const execute = async (operation, success) => {
    try { setBusy(true); setMessage(""); await operation(); await load(); setMessage(success); }
    catch (error) { setMessage(error.response?.data?.message || "Configuration update failed"); }
    finally { setBusy(false); }
  };

  const catalogName = mode === "complaint-categories" ? "categories" : mode === "departments" ? "departments" : "locations";
  const catalogRows = data?.[catalogName] || [];
  const saveCatalog = (event) => {
    event.preventDefault();
    const endpoint = `/configuration/catalogs/${catalogName}${catalogForm.id ? `/${catalogForm.id}` : ""}`;
    execute(() => catalogForm.id ? API.put(endpoint, catalogForm) : API.post(endpoint, catalogForm), "Catalog saved.");
    setCatalogForm(emptyCatalog);
  };
  const saveHoliday = (event) => {
    event.preventDefault();
    const endpoint = `/configuration/holidays${holidayForm.id ? `/${holidayForm.id}` : ""}`;
    execute(() => holidayForm.id ? API.put(endpoint, holidayForm) : API.post(endpoint, holidayForm), "Holiday saved.");
    setHolidayForm(emptyHoliday);
  };
  const saveRule = (event) => {
    event.preventDefault();
    const endpoint = `/configuration/routing-rules${ruleForm.id ? `/${ruleForm.id}` : ""}`;
    execute(() => ruleForm.id ? API.put(endpoint, ruleForm) : API.post(endpoint, ruleForm), "Routing rule saved.");
    setRuleForm(emptyRule);
  };
  const saveTemplate = (template) => execute(
    () => API.put(`/notifications/templates/${template.id}`, {
      eventType: template.event_type, channel: template.channel, name: template.name,
      subjectTemplate: template.subject_template, bodyTemplate: template.body_template,
      isActive: Boolean(template.is_active),
    }),
    "Notification template saved.",
  );
  const saveWorkflowItem = (type, form, reset) => {
    const endpoint = `/configuration/${type}${form.id ? `/${form.id}` : ""}`;
    execute(() => form.id ? API.put(endpoint, form) : API.post(endpoint, form), "Workflow master data saved.");
    reset();
  };
  const saveMapping = (categoryId, departmentIds) => execute(
    () => API.put(`/configuration/categories/${categoryId}/departments`, { departmentIds }), "Category mapping saved.",
  );

  if (!data) return <div className="panel module-loading">Loading runtime configuration…</div>;

  const catalogMode = ["complaint-categories", "locations", "departments"].includes(mode);
  const ruleMatchOptions = ruleForm.matchType === "category" ? data.categories
    : ruleForm.matchType === "location" ? data.locations
      : ruleForm.matchType === "department" ? data.routingRules.map(() => null).filter(Boolean).concat([]) : [];
  const departmentMatchOptions = data.departments;
  const matchOptions = ruleForm.matchType === "department" ? departmentMatchOptions : ruleMatchOptions;

  return (
    <div className="runtime-config-page">
      <div className="module-page-header"><div><p className="profile-eyebrow">Runtime policy data</p><h1>{mode.split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ")}</h1><p>Changes are consumed by grievance runtime services without embedding business defaults in code.</p></div></div>
      {message ? <div className="grievance-error" role="status">{message}</div> : null}

      {catalogMode ? <>
        <form className="panel runtime-config-form" onSubmit={saveCatalog}>
          <input maxLength="40" onChange={(event) => setCatalogForm((current) => ({ ...current, code: event.target.value }))} placeholder="Code" required value={catalogForm.code} />
          <input maxLength="160" onChange={(event) => setCatalogForm((current) => ({ ...current, name: event.target.value }))} placeholder="Display name" required value={catalogForm.name} />
          <label><input checked={catalogForm.isActive} onChange={(event) => setCatalogForm((current) => ({ ...current, isActive: event.target.checked }))} type="checkbox" /> Active</label>
          <button className="button button-primary" disabled={busy} type="submit">Save</button>
        </form>
        <section className="panel runtime-config-list"><h2>Configured items</h2>{catalogRows.map((item) => <div className="runtime-config-row" key={item.id}><span><strong>{item.name}</strong><small>{item.code} · {item.is_active ? "Active" : "Inactive"}</small></span><div><button onClick={() => setCatalogForm({ id: item.id, code: item.code, name: item.name, isActive: Boolean(item.is_active) })} type="button">Edit</button>{item.is_active ? <button onClick={() => execute(() => API.delete(`/configuration/catalogs/${catalogName}/${item.id}`), "Catalog item deactivated.")} type="button">Deactivate</button> : null}</div></div>)}</section>
      </> : null}

      {mode === "assignment-rules" || mode === "department-mapping" ? <>
        {mode === "department-mapping" ? <section className="panel runtime-config-list"><h2>Department-category mappings</h2>{data.categories.map((category) => { const current = data.categoryMappings.find((item) => item.categoryId === category.id)?.departmentIds || []; return <div className="notification-template-editor" key={category.id}><strong>{category.name}</strong>{data.departments.filter((item) => item.is_active).map((department) => <label key={department.id}><input checked={current.map(String).includes(String(department.id))} onChange={(event) => saveMapping(category.id, event.target.checked ? [...current, department.id] : current.filter((id) => String(id) !== String(department.id)))} type="checkbox" /> {department.name}</label>)}</div>; })}</section> : null}
        <form className="panel runtime-config-form routing" onSubmit={saveRule}>
          <input onChange={(event) => setRuleForm((current) => ({ ...current, name: event.target.value }))} placeholder="Rule name" required value={ruleForm.name} />
          <select onChange={(event) => setRuleForm((current) => ({ ...current, matchType: event.target.value, matchValue: "" }))} value={ruleForm.matchType}><option value="category">Category</option><option value="department">Submitted department</option><option value="location">Location</option><option value="fallback">Fallback</option></select>
          {ruleForm.matchType !== "fallback" ? <select onChange={(event) => setRuleForm((current) => ({ ...current, matchValue: event.target.value }))} required value={ruleForm.matchValue}><option value="">Select match value</option>{matchOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select> : null}
          <select onChange={(event) => setRuleForm((current) => ({ ...current, departmentId: event.target.value, officerId: "" }))} required value={ruleForm.departmentId}><option value="">Destination department</option>{departmentMatchOptions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <select onChange={(event) => setRuleForm((current) => ({ ...current, officerId: event.target.value }))} value={ruleForm.officerId}><option value="">No specific officer</option>{data.officers.filter((item) => String(item.department_id) === String(ruleForm.departmentId)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input min="1" onChange={(event) => setRuleForm((current) => ({ ...current, priority: event.target.value }))} required type="number" value={ruleForm.priority} />
          <button className="button button-primary" disabled={busy} type="submit">Save rule</button>
        </form>
        <section className="panel runtime-config-list"><h2>Routing rules</h2>{data.routingRules.map((item) => <div className="runtime-config-row" key={item.id}><span><strong>{item.name}</strong><small>{item.match_type}: {item.match_value || "fallback"} → {item.destination_department_name}</small></span><div><button onClick={() => setRuleForm({ id: item.id, name: item.name, matchType: item.match_type, matchValue: item.match_value || "", departmentId: String(item.destination_department_id), officerId: String(item.assigned_officer_id || ""), priority: item.rule_priority, isActive: Boolean(item.is_active) })} type="button">Edit</button>{item.is_active ? <button onClick={() => execute(() => API.delete(`/configuration/routing-rules/${item.id}`), "Routing rule deactivated.")} type="button">Deactivate</button> : null}</div></div>)}</section>
      </> : null}

      {mode === "due-date-rules" ? <>
        <form className="panel runtime-config-form" onSubmit={saveHoliday}><input onChange={(event) => setHolidayForm((current) => ({ ...current, date: event.target.value }))} required type="date" value={holidayForm.date} /><input onChange={(event) => setHolidayForm((current) => ({ ...current, name: event.target.value }))} placeholder="Holiday name" required value={holidayForm.name} /><button className="button button-primary" disabled={busy} type="submit">Save holiday</button></form>
        <section className="panel runtime-config-list"><h2>Public holidays</h2>{data.holidays.map((item) => <div className="runtime-config-row" key={item.id}><span><strong>{item.name}</strong><small>{String(item.holiday_date).slice(0, 10)}</small></span><button onClick={() => execute(() => API.delete(`/configuration/holidays/${item.id}`), "Holiday deactivated.")} type="button">Deactivate</button></div>)}</section>
        <section className="panel runtime-config-list"><h2>Existing grievance recalculation</h2><p>Preview policy effects before applying them to existing open grievances.</p><button className="button button-secondary" onClick={() => execute(async () => { const response = await API.get("/complaints/due-date-recalculation/preview"); setPreview(response.data.data); }, "Preview loaded.")} type="button">Preview recalculation</button>{preview.length ? <><p>{preview.length} open grievances evaluated.</p><button className="button button-primary" onClick={() => execute(() => API.post("/complaints/due-date-recalculation/apply", { confirmation: "RECALCULATE OPEN GRIEVANCE DUE DATES", complaintIds: preview.map((item) => item.id) }), "Due dates recalculated.")} type="button">Apply previewed changes</button></> : null}</section>
      </> : null}

      {mode === "notification-templates" ? <section className="panel runtime-config-list"><h2>Notification templates</h2>{templates.map((template, index) => <div className="notification-template-editor" key={template.id}><input onChange={(event) => setTemplates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} value={template.name} /><input disabled={template.channel !== "email"} onChange={(event) => setTemplates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, subject_template: event.target.value } : item))} placeholder="Email subject" value={template.subject_template || ""} /><textarea onChange={(event) => setTemplates((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, body_template: event.target.value } : item))} value={template.body_template} /><button className="button button-secondary" disabled={busy} onClick={() => saveTemplate(template)} type="button"><Icon name="check" size={15} /> Save</button></div>)}</section> : null}

      {mode === "status" ? <>
        <form className="panel runtime-config-form" onSubmit={(event) => { event.preventDefault(); saveWorkflowItem("statuses", statusForm, () => setStatusForm(emptyStatus)); }}>
          <input disabled={Boolean(statusForm.id)} onChange={(event) => setStatusForm((item) => ({ ...item, key: event.target.value }))} placeholder="Immutable key" required value={statusForm.key} />
          <input onChange={(event) => setStatusForm((item) => ({ ...item, name: event.target.value }))} placeholder="Display name" required value={statusForm.name} />
          <select onChange={(event) => setStatusForm((item) => ({ ...item, reportingGroup: event.target.value }))} value={statusForm.reportingGroup}>{["open", "resolved", "closed", "rejected", "duplicate", "other"].map((value) => <option key={value}>{value}</option>)}</select>
          <select onChange={(event) => setStatusForm((item) => ({ ...item, notificationEvent: event.target.value }))} value={statusForm.notificationEvent}>{["status_change", "resolution", "closure", "returned"].map((value) => <option key={value}>{value}</option>)}</select>
          <input min="0" onChange={(event) => setStatusForm((item) => ({ ...item, sortOrder: Number(event.target.value) }))} type="number" value={statusForm.sortOrder} />
          <label><input checked={statusForm.isFinal} onChange={(event) => setStatusForm((item) => ({ ...item, isFinal: event.target.checked }))} type="checkbox" /> Final state</label>
          <label><input checked={statusForm.isActive} onChange={(event) => setStatusForm((item) => ({ ...item, isActive: event.target.checked }))} type="checkbox" /> Active</label>
          <button className="button button-primary" disabled={busy}>Save status</button>
        </form>
        <section className="panel runtime-config-list"><h2>Workflow statuses</h2>{data.workflow.statuses.map((item) => <div className="runtime-config-row" key={item.id}><span><strong>{item.name}</strong><small>{item.status_key} · {item.reporting_group} · order {item.sort_order} · {item.is_active ? "Active" : "Inactive"}</small></span><button onClick={() => setStatusForm({ id: item.id, key: item.status_key, name: item.name, reportingGroup: item.reporting_group, notificationEvent: item.notification_event, isFinal: Boolean(item.is_final), isActive: Boolean(item.is_active), sortOrder: item.sort_order })} type="button">Edit</button></div>)}</section>
        <section className="panel runtime-config-list"><h2>Transitions</h2>{data.workflow.transitions.map((item) => <div className="runtime-config-row" key={item.id}><span>{item.from_status} → {item.to_status}</span><button onClick={() => execute(() => API.put("/configuration/transitions", { fromStatusId: item.from_status_id, toStatusId: item.to_status_id, isActive: !item.is_active }), "Transition updated.")} type="button">{item.is_active ? "Disable" : "Enable"}</button></div>)}</section>
      </> : null}
      {mode === "priority" ? <>
        <form className="panel runtime-config-form" onSubmit={(event) => { event.preventDefault(); saveWorkflowItem("priorities", priorityForm, () => setPriorityForm(emptyPriority)); }}>
          <input disabled={Boolean(priorityForm.id)} onChange={(event) => setPriorityForm((item) => ({ ...item, key: event.target.value }))} placeholder="Immutable key" required value={priorityForm.key} />
          <input onChange={(event) => setPriorityForm((item) => ({ ...item, name: event.target.value }))} placeholder="Display name" required value={priorityForm.name} />
          <input min="0" onChange={(event) => setPriorityForm((item) => ({ ...item, sortOrder: Number(event.target.value) }))} type="number" value={priorityForm.sortOrder} />
          <label><input checked={priorityForm.isHighPriority} onChange={(event) => setPriorityForm((item) => ({ ...item, isHighPriority: event.target.checked }))} type="checkbox" /> High priority</label>
          <label><input checked={priorityForm.isActive} onChange={(event) => setPriorityForm((item) => ({ ...item, isActive: event.target.checked }))} type="checkbox" /> Active</label>
          <button className="button button-primary" disabled={busy}>Save priority</button>
        </form>
        <section className="panel runtime-config-list"><h2>Priorities</h2>{data.workflow.priorities.map((item) => <div className="runtime-config-row" key={item.id}><span><strong>{item.name}</strong><small>{item.priority_key} · order {item.sort_order} · {item.is_high_priority ? "High priority" : "Standard"} · {item.is_active ? "Active" : "Inactive"}</small></span><button onClick={() => setPriorityForm({ id: item.id, key: item.priority_key, name: item.name, isHighPriority: Boolean(item.is_high_priority), isActive: Boolean(item.is_active), sortOrder: item.sort_order })} type="button">Edit</button></div>)}</section>
      </> : null}
    </div>
  );
};

export default RuntimeConfiguration;
