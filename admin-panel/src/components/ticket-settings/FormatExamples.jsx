const examples = [
  { name: "Standard", format: "{PREFIX}-{YEAR}-{SEQUENCE}", sample: "GRM-2026-000145", toggles: { includeYear: true } },
  { name: "Monthly", format: "{PREFIX}-{YEAR}{MONTH}-{SEQUENCE}", sample: "GRM-202607-000145", toggles: { includeYear: true, includeMonth: true } },
  { name: "Department-Based", format: "{PREFIX}-{DEPARTMENT}-{YEAR}-{SEQUENCE}", sample: "GRM-HLT-2026-000145", toggles: { includeYear: true, includeDepartmentCode: true } },
  { name: "Location-Based", format: "{PREFIX}-{LOCATION}-{YEAR}-{SEQUENCE}", sample: "GRM-BZ-2026-000145", toggles: { includeYear: true, includeLocationCode: true } },
  { name: "Department and Location", format: "{PREFIX}-{LOCATION}-{DEPARTMENT}-{YEAR}-{SEQUENCE}", sample: "GRM-BZ-HLT-2026-000145", toggles: { includeYear: true, includeLocationCode: true, includeDepartmentCode: true } },
];

const FormatExamples = ({ disabled, onApply }) => (
  <section className="ticket-examples"><div><strong>Format examples</strong><small>Apply a tested starting point, then customize it.</small></div><div className="ticket-example-grid">{examples.map((item) => <button disabled={disabled} key={item.name} onClick={() => onApply(item)} type="button"><strong>{item.name}</strong><code>{item.format}</code><span>{item.sample}</span></button>)}</div></section>
);

export default FormatExamples;
