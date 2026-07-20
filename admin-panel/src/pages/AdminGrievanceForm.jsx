import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import Icon from "../components/Icon";
import API from "../services/api";

const today = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
};

const normalizeComplaintReference = (reference) => {
  const normalizedReference = String(reference || "")
    .trim()
    .toUpperCase();

  return /^[A-Z0-9]{1,8}-\d{4}-(?:0[1-9]|1[0-2])-\d{4,}$/.test(
    normalizedReference,
  )
    ? normalizedReference
    : "";
};

const buildTrackingUrl = (reference) => {
  const baseUrl =
    import.meta.env.VITE_PUBLIC_SITE_URL || "http://localhost:5173";
  const normalizedReference = normalizeComplaintReference(reference);
  const url = new URL("/submit-complaint", baseUrl);

  if (!normalizedReference || !["http:", "https:"].includes(url.protocol)) {
    throw new TypeError("Invalid grievance tracking URL");
  }

  url.searchParams.set("ref", normalizedReference);
  url.hash = "track-grievance";
  return url.toString();
};

const initialForm = (receivedBy = "") => ({
  assistance: [],
  assistance_other: "",
  submission_type: "named",
  comp_name: "",
  comp_phone: "",
  comp_address: "",
  comp_email: "",
  contact_pref: "",
  on_behalf: "",
  affected_name: "",
  relationship: "",
  permission: "",
  issue_type: [],
  issue_other: "",
  channel: ["in_person"],
  incident_date: "",
  incident_location: "",
  description: "",
  desired_outcome: "",
  tried_resolve: "",
  prev_attempts: "",
  has_documents: "",
  has_witnesses: "",
  witness_name: "",
  witness_phone: "",
  accommodation: [],
  accommodation_other: "",
  declaration_confirm: false,
  signature: "",
  declaration_date: today(),
  office_received_date: today(),
  office_received_by: receivedBy,
  office_initial_classification: "",
  office_assigned_to: "",
});

const assistanceOptions = [
  ["Spanish", "Spanish"],
  ["Maya", "Maya"],
  ["Garifuna", "Garifuna"],
  ["Assisted completion", "Assisted completion"],
  ["Large print", "Large print"],
];

const issueOptions = [
  ["social_welfare", "Social welfare or assistance"],
  ["child_protection", "Child protection services"],
  ["family_support", "Family support services"],
  ["gbv_response", "Gender-based violence response"],
  ["elderly_support", "Elderly support services"],
  ["disability_services", "Disability services"],
  ["staff_conduct", "Staff conduct or behaviour"],
  ["corruption", "Corruption or unethical behaviour"],
  ["service_delays", "Service delays"],
  ["discrimination", "Discrimination"],
  ["policy", "Policy implementation"],
];

const channelOptions = [
  ["in_person", "In person"],
  ["telephone", "Telephone"],
  ["email", "Email"],
  ["online_form", "Online form"],
  ["mail", "Mail"],
  ["whatsapp", "WhatsApp"],
  ["social_media", "Social media"],
  ["suggestion_box", "Suggestion box"],
];

const accommodationOptions = [
  ["sign_language", "Sign language interpreter"],
  ["wheelchair", "Wheelchair accessibility"],
  ["home_visit", "Home visit due to mobility"],
  ["translation", "Language translation"],
];

const allowedFileTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
]);

const steps = [
  ["Complainant", "Submission and contact information"],
  ["Grievance", "Issue and incident details"],
  ["Supporting information", "Documents, witnesses and accommodations"],
  ["Declaration", "Review and submit"],
];

const AdminGrievanceForm = () => {
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem("admin_user") || "null");
  const [form, setForm] = useState(() => initialForm(adminUser?.name || ""));
  const [files, setFiles] = useState([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const [qrCodeReady, setQrCodeReady] = useState(false);
  const [qrCodeError, setQrCodeError] = useState("");
  const qrCanvasRef = useRef(null);
  const anonymous = form.submission_type === "anonymous";

  useEffect(() => {
    if (!confirmation?.tokenNumber || !qrCanvasRef.current) return undefined;

    let active = true;
    setQrCodeReady(false);
    Promise.resolve()
      .then(() =>
        QRCode.toCanvas(
          qrCanvasRef.current,
          buildTrackingUrl(confirmation.tokenNumber),
          {
            color: { dark: "#08213f", light: "#ffffff" },
            errorCorrectionLevel: "H",
            margin: 1,
            width: 190,
          },
        ),
      )
      .then(() => {
        if (!active) return;
        setQrCodeReady(true);
        setQrCodeError("");
      })
      .catch(() => {
        if (!active) return;
        setQrCodeReady(false);
        setQrCodeError("The tracking QR code could not be generated.");
      });

    return () => {
      active = false;
    };
  }, [confirmation]);

  const update = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
    setError("");
  };

  const updateArray = (event) => {
    const { checked, name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: checked
        ? [...current[name], value]
        : current[name].filter((item) => item !== value),
    }));
    setError("");
  };

  const updateAssistance = (event) => {
    const { checked, value } = event.target;
    setForm((current) => ({
      ...current,
      assistance: checked ? [value] : [],
    }));
    setError("");
  };

  const validateStep = (stepNumber) => {
    if (stepNumber === 1 && !anonymous) {
      if (!form.comp_name.trim()) return "Enter the complainant's full name.";
      if (!form.contact_pref) return "Select a preferred contact method.";
      if (["phone", "whatsapp"].includes(form.contact_pref) && form.comp_phone.replace(/\D/g, "").length < 7) {
        return "Enter a valid phone number for the selected contact method.";
      }
      if (form.contact_pref === "email" && !form.comp_email.trim()) return "Enter an email address.";
      if (form.comp_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.comp_email)) return "Enter a valid email address.";
      if (form.contact_pref === "mail" && !form.comp_address.trim()) return "Enter a mailing address.";
      if (!form.on_behalf) return "Select whether the complaint is being submitted on behalf of someone else.";
      if (form.on_behalf === "yes" && (!form.affected_name.trim() || !form.relationship.trim() || !form.permission)) {
        return "Complete all affected-person information.";
      }
    }

    if (stepNumber === 2) {
      if (!form.issue_type.length && !form.issue_other.trim()) return "Select at least one issue or specify another issue.";
      if (!form.channel.length) return "Select at least one submission channel.";
      if (!form.incident_date) return "Enter the incident date.";
      if (form.incident_date > today()) return "Incident date cannot be in the future.";
      if (!form.incident_location.trim()) return "Enter the incident location.";
      if (!form.description.trim()) return "Enter a detailed description.";
      if (!form.desired_outcome.trim()) return "Enter the desired outcome.";
      if (!form.tried_resolve) return "Select whether the complainant tried to resolve the issue before.";
      if (form.tried_resolve === "yes" && !form.prev_attempts.trim()) return "Describe previous resolution attempts.";
    }

    if (stepNumber === 3) {
      if (!form.has_documents) return "Select whether supporting documents are available.";
      if (!form.has_witnesses) return "Select whether there are witnesses.";
      if (files.length > 3) return "Upload a maximum of three documents.";
      if (files.some((file) => file.size > 5 * 1024 * 1024)) return "Each document must be 5 MB or smaller.";
      if (files.some((file) => !allowedFileTypes.has(file.type))) return "Use PDF, DOC, DOCX, JPG, or PNG documents only.";
      if (form.has_documents === "yes" && !files.length) return "Attach at least one supporting document or select No.";
      if (form.has_witnesses === "yes" && !form.witness_name.trim()) return "Enter the witness name.";
      if (form.has_witnesses === "yes" && form.witness_phone.replace(/\D/g, "").length < 7) return "Enter a valid witness phone number.";
    }

    if (stepNumber === 4) {
      if (!form.declaration_confirm) return "Confirm the declaration before submitting.";
      if (!anonymous && !form.signature.trim()) return "Enter the complainant's electronic signature.";
      if (!form.declaration_date) return "Enter the declaration date.";
      if (form.declaration_date > today()) return "Declaration date cannot be in the future.";
      if (!form.office_received_date) return "Enter the office received date.";
      if (!form.office_received_by.trim()) return "Enter the receiving officer's name.";
      if (!form.office_initial_classification) return "Select the initial classification.";
      if (!form.office_assigned_to.trim()) return "Enter who the grievance is assigned to.";
    }

    return "";
  };

  const nextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(4, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (event) => {
    event.preventDefault();
    for (let stepNumber = 1; stepNumber <= 4; stepNumber += 1) {
      const validationError = validateStep(stepNumber);
      if (validationError) {
        setStep(stepNumber);
        setError(validationError);
        return;
      }
    }

    const payload = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      if (Array.isArray(value)) value.forEach((item) => payload.append(key, item));
      else payload.append(key, value);
    });
    files.forEach((file) => payload.append("attachments", file));

    try {
      setSubmitting(true);
      setError("");
      const response = await API.post("/complaints/intake", payload);
      setConfirmation(response.data.data);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to submit grievance.");
    } finally {
      setSubmitting(false);
    }
  };

  const choice = (name, value, label, type = "radio") => (
    <label className={`admin-grievance-choice ${type === "checkbox" && form[name].includes(value) ? "selected" : form[name] === value ? "selected" : ""}`} key={value}>
      <input
        checked={type === "checkbox" ? form[name].includes(value) : form[name] === value}
        name={name}
        onChange={type === "checkbox" ? updateArray : update}
        type={type}
        value={value}
      />
      <span>{label}</span>
    </label>
  );

  if (confirmation) {
    return (
      <div className="admin-grievance-form-page">
        <section className="admin-grievance-success panel">
          <span className="admin-grievance-success-icon"><Icon name="check" size={28} /></span>
          <p className="profile-eyebrow">Submission received</p>
          <h1>Grievance created successfully</h1>
          <p>The grievance has been added to the New Grievances list.</p>
          <div className="admin-grievance-reference">
            <span>Your reference number</span>
            <strong>{confirmation.tokenNumber}</strong>
            <small>Format: GRM · Year · Month · Sequential number</small>
          </div>
          <div className="admin-grievance-qr-card">
            <div className="admin-grievance-qr-image">
              <canvas
                aria-label={`Tracking QR code for ${confirmation.tokenNumber}`}
                hidden={!qrCodeReady}
                ref={qrCanvasRef}
                role="img"
              ></canvas>
              {!qrCodeReady ? (
                <span>{qrCodeError || "Generating QR code..."}</span>
              ) : null}
            </div>
            <div>
              <h2>Scan to track the grievance</h2>
              <p>The QR code opens the tracking form with reference number <strong>{confirmation.tokenNumber}</strong> already entered.</p>
            </div>
          </div>
          <div className="admin-grievance-receipt-summary">
            <div><span>Issue type</span><strong>{confirmation.issueSummary || "Grievance submission"}</strong></div>
            <div><span>Incident location</span><strong>{confirmation.incidentLocation || "Not provided"}</strong></div>
            <div><span>Submitted as</span><strong>{confirmation.isAnonymous ? "Anonymous" : "Named"}</strong></div>
            <div><span>Status</span><strong>{confirmation.status || "New"}</strong></div>
          </div>
          <div className="admin-grievance-next-step">
            <strong>What happens next</strong>
            <p>The grievance will be reviewed and routed to the appropriate team. Named complainants may receive follow-up using their selected contact method.</p>
          </div>
          <div className="admin-grievance-success-actions">
            <button className="button button-secondary" onClick={() => { setForm(initialForm(adminUser?.name || "")); setFiles([]); setStep(1); setConfirmation(null); setQrCodeReady(false); setQrCodeError(""); }} type="button">
              <Icon name="plus" size={16} /> Create another
            </button>
            <button className="button button-primary" onClick={() => navigate("/grievances/new")} type="button">
              View New Grievances <Icon name="arrowRight" size={16} />
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-grievance-form-page">
      <header className="module-page-header">
        <div>
          <div className="module-breadcrumb">
            <span>Grievances</span><Icon name="chevronRight" size={13} /><strong>New grievance</strong>
          </div>
          <h1>Grievance Form</h1>
          <p>Record a grievance received by the Ministry.</p>
        </div>
        <Link className="button button-secondary" to="/grievances/new">
          <Icon name="chevronRight" className="admin-grievance-back-icon" size={16} /> Back to list
        </Link>
      </header>

      <nav aria-label="Form progress" className="admin-grievance-steps panel">
        {steps.map(([title, caption], index) => {
          const number = index + 1;
          return (
            <div className={`${number === step ? "active" : ""} ${number < step ? "complete" : ""}`} key={title}>
              <span>{number < step ? <Icon name="check" size={14} /> : number}</span>
              <div><strong>{title}</strong><small>{caption}</small></div>
            </div>
          );
        })}
      </nav>

      <form className="admin-grievance-form panel" onSubmit={submit}>
        {step === 1 ? (
          <section>
            <div className="admin-grievance-section-heading"><span>01</span><div><h2>Submission and complainant</h2><p>Identify how this grievance is being recorded.</p></div></div>

            <fieldset className="admin-grievance-fieldset">
              <legend>Submission type</legend>
              <div className="admin-grievance-choice-grid two">
                {choice("submission_type", "named", "Named grievance")}
                {choice("submission_type", "anonymous", "Anonymous grievance")}
              </div>
            </fieldset>

            <fieldset className="admin-grievance-fieldset">
              <legend>Language and assistance <small>Optional — select one</small></legend>
              <div className="admin-grievance-choice-grid">
                {assistanceOptions.map(([value, label]) => (
                  <label className={`admin-grievance-choice ${form.assistance.includes(value) ? "selected" : ""}`} key={value}>
                    <input
                      checked={form.assistance.includes(value)}
                      disabled={form.assistance.length > 0 && !form.assistance.includes(value)}
                      name="assistance"
                      onChange={updateAssistance}
                      type="checkbox"
                      value={value}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="admin-grievance-wide"><span>Other assistance or details</span><input name="assistance_other" onChange={update} placeholder="Describe any other assistance needed" value={form.assistance_other} /></label>

            {!anonymous ? (
              <>
                <div className="admin-grievance-grid">
                  <label><span>Full name *</span><input autoComplete="name" name="comp_name" onChange={update} value={form.comp_name} /></label>
                  <label><span>Phone number</span><input autoComplete="tel" name="comp_phone" onChange={update} type="tel" value={form.comp_phone} /></label>
                  <label><span>Email address</span><input autoComplete="email" name="comp_email" onChange={update} type="email" value={form.comp_email} /></label>
                  <label><span>Mailing address</span><input autoComplete="street-address" name="comp_address" onChange={update} value={form.comp_address} /></label>
                  <label><span>Preferred contact method *</span><select name="contact_pref" onChange={update} value={form.contact_pref}><option value="">Select contact method</option><option value="phone">Phone</option><option value="email">Email</option><option value="mail">Mail</option><option value="in_person">In person</option><option value="whatsapp">WhatsApp</option></select></label>
                  <label><span>Submitting on behalf of someone? *</span><select name="on_behalf" onChange={update} value={form.on_behalf}><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select></label>
                </div>
                {form.on_behalf === "yes" ? (
                  <div className="admin-grievance-subsection">
                    <h3>Affected person</h3>
                    <div className="admin-grievance-grid three">
                      <label><span>Full name *</span><input name="affected_name" onChange={update} value={form.affected_name} /></label>
                      <label><span>Relationship *</span><input name="relationship" onChange={update} value={form.relationship} /></label>
                      <label><span>Permission obtained? *</span><select name="permission" onChange={update} value={form.permission}><option value="">Select</option><option value="yes">Yes</option><option value="no">No</option><option value="not_applicable">Not applicable</option></select></label>
                    </div>
                  </div>
                ) : null}
              </>
            ) : <div className="admin-grievance-info"><Icon name="shieldCheck" size={18} /> Personal and contact details are not collected for anonymous grievances.</div>}
          </section>
        ) : null}

        {step === 2 ? (
          <section>
            <div className="admin-grievance-section-heading"><span>02</span><div><h2>Grievance details</h2><p>Describe the concern and the outcome being requested.</p></div></div>
            <fieldset className="admin-grievance-fieldset">
              <legend>Issue type *</legend>
              <div className="admin-grievance-choice-grid">{issueOptions.map(([value, label]) => choice("issue_type", value, label, "checkbox"))}</div>
            </fieldset>
            <label className="admin-grievance-wide"><span>Other issue</span><input name="issue_other" onChange={update} placeholder="Specify another issue" value={form.issue_other} /></label>
            <fieldset className="admin-grievance-fieldset">
              <legend>How was the grievance received? *</legend>
              <div className="admin-grievance-choice-grid compact">{channelOptions.map(([value, label]) => choice("channel", value, label, "checkbox"))}</div>
            </fieldset>
            <div className="admin-grievance-grid">
              <label><span>Incident date *</span><input max={today()} name="incident_date" onChange={update} type="date" value={form.incident_date} /></label>
              <label><span>Incident location *</span><input name="incident_location" onChange={update} value={form.incident_location} /></label>
            </div>
            <label className="admin-grievance-wide"><span>Detailed description *</span><textarea name="description" onChange={update} rows="5" value={form.description} /></label>
            <label className="admin-grievance-wide"><span>Desired outcome *</span><textarea name="desired_outcome" onChange={update} rows="3" value={form.desired_outcome} /></label>
            <div className="admin-grievance-grid">
              <label><span>Previously tried to resolve? *</span><select name="tried_resolve" onChange={update} value={form.tried_resolve}><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select></label>
              {form.tried_resolve === "yes" ? <label><span>Previous attempts *</span><textarea name="prev_attempts" onChange={update} rows="3" value={form.prev_attempts} /></label> : null}
            </div>
          </section>
        ) : null}

        {step === 3 ? (
          <section>
            <div className="admin-grievance-section-heading"><span>03</span><div><h2>Supporting information</h2><p>Add documents, witness details and accessibility needs.</p></div></div>
            <div className="admin-grievance-grid">
              <label><span>Supporting documents available? *</span><select name="has_documents" onChange={(event) => { update(event); if (event.target.value === "no") setFiles([]); }} value={form.has_documents}><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select></label>
              {form.has_documents === "yes" ? <label><span>Upload documents *</span><input accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} type="file" /><small>Maximum 3 files, 5 MB each.</small></label> : null}
              <label><span>Are there witnesses? *</span><select name="has_witnesses" onChange={update} value={form.has_witnesses}><option value="">Select</option><option value="no">No</option><option value="yes">Yes</option></select></label>
            </div>
            {form.has_witnesses === "yes" ? <div className="admin-grievance-subsection"><h3>Witness information</h3><div className="admin-grievance-grid"><label><span>Witness name *</span><input name="witness_name" onChange={update} value={form.witness_name} /></label><label><span>Witness phone *</span><input name="witness_phone" onChange={update} type="tel" value={form.witness_phone} /></label></div></div> : null}
            <fieldset className="admin-grievance-fieldset">
              <legend>Accessibility accommodations <small>Optional</small></legend>
              <div className="admin-grievance-choice-grid compact">{accommodationOptions.map(([value, label]) => choice("accommodation", value, label, "checkbox"))}</div>
            </fieldset>
            <label className="admin-grievance-wide"><span>Other accommodation</span><input name="accommodation_other" onChange={update} value={form.accommodation_other} /></label>
          </section>
        ) : null}

        {step === 4 ? (
          <section>
            <div className="admin-grievance-section-heading"><span>04</span><div><h2>Declaration and submission</h2><p>Confirm that the information recorded is accurate.</p></div></div>
            <div className="admin-grievance-review">
              <div><span>Submission</span><strong>{anonymous ? "Anonymous" : "Named"}</strong></div>
              <div><span>Issue type</span><strong>{[...issueOptions.filter(([value]) => form.issue_type.includes(value)).map(([, label]) => label), form.issue_other].filter(Boolean).join(", ") || "Not selected"}</strong></div>
              <div><span>Incident location</span><strong>{form.incident_location || "Not provided"}</strong></div>
              <div><span>Contact method</span><strong>{anonymous ? "No direct contact" : form.contact_pref || "Not selected"}</strong></div>
            </div>
            <div className="admin-grievance-declaration">
              <Icon name="shieldCheck" size={22} />
              <div>
                <strong>Declaration</strong>
                <p>I declare that the information provided in this form is true and accurate to the best of my knowledge. I understand that:</p>
                <ul>
                  <li>My identity shall be kept confidential.</li>
                  <li>I shall be provided with a unique reference number at intake, unless I have chosen to submit anonymously.</li>
                  <li>I shall receive updates on the progress of my grievance, unless I have chosen to submit anonymously.</li>
                  <li>I have the right to appeal on objective grounds, including disagreement with the decision, a procedural error, evidence not being considered, an unreasonable delay, or retaliation.</li>
                </ul>
              </div>
            </div>
            <label className="admin-grievance-confirm"><input checked={form.declaration_confirm} name="declaration_confirm" onChange={update} type="checkbox" /> <span>I confirm the declaration above. *</span></label>
            <div className="admin-grievance-grid">
              {!anonymous ? <label><span>Electronic signature *</span><input name="signature" onChange={update} placeholder="Type complainant's full name" value={form.signature} /></label> : null}
              <label><span>Declaration date *</span><input max={today()} name="declaration_date" onChange={update} type="date" value={form.declaration_date} /></label>
            </div>

            <div className="admin-grievance-office-panel">
              <div className="admin-grievance-office-heading">
                <div><h3>For office use only</h3><p>Complete these fields for this walk-in grievance.</p></div>
                <span>Office intake</span>
              </div>
              <div className="admin-grievance-grid">
                <label><span>Date received *</span><input max={today()} name="office_received_date" onChange={update} type="date" value={form.office_received_date} /></label>
                <label><span>Reference number</span><input disabled placeholder="Auto-generated after submission" /></label>
                <label><span>Received by *</span><input name="office_received_by" onChange={update} placeholder="Receiving officer's name" value={form.office_received_by} /></label>
                <label><span>Initial classification *</span><select name="office_initial_classification" onChange={update} value={form.office_initial_classification}><option value="">Select level</option><option>Level 1</option><option>Level 2</option><option>Level 3</option><option>Level 4</option></select></label>
                <label className="admin-grievance-office-wide"><span>Assigned to *</span><input name="office_assigned_to" onChange={update} placeholder="Officer, team, or department" value={form.office_assigned_to} /></label>
              </div>
            </div>
          </section>
        ) : null}

        {error ? <div className="admin-grievance-error" role="alert"><Icon name="alert" size={17} /> {error}</div> : null}

        <footer className="admin-grievance-form-actions">
          <button className="button button-secondary" disabled={step === 1 || submitting} onClick={() => { setError(""); setStep((current) => Math.max(1, current - 1)); }} type="button">Back</button>
          {step < 4 ? <button className="button button-primary" onClick={nextStep} type="button">Continue <Icon name="arrowRight" size={16} /></button> : <button className="button button-primary" disabled={submitting} type="submit"><Icon name="check" size={16} /> {submitting ? "Submitting..." : "Submit grievance"}</button>}
        </footer>
      </form>
    </div>
  );
};

export default AdminGrievanceForm;
