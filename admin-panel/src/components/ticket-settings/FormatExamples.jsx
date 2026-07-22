const FormatExamples = ({ disabled, examples = [], onApply }) => (
  <section className="ticket-examples">
    <div><strong>Format examples</strong><small>Samples use the current ticket date, configured sequence rules, and active master codes.</small></div>
    <div className="ticket-example-grid">
      {examples.map((item) => (
        <button disabled={disabled || !item.sample} key={item.key} onClick={() => onApply(item)} type="button">
          <strong>{item.name}</strong>
          <code>{item.format}</code>
          <span>{item.sample || "Sample unavailable"}</span>
          {item.warning ? <small>{item.warning}</small> : null}
        </button>
      ))}
      {!examples.length ? <p>Format examples are unavailable until the server preview is ready.</p> : null}
    </div>
  </section>
);

export default FormatExamples;
