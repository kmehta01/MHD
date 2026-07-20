import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import Icon from "../components/Icon";
import API from "../services/api";
import { downloadBlob } from "../utils/download";

const statuses = [
  "New",
  "Under Review",
  "In Progress",
  "Pending Information",
  "Resolved",
  "Closed",
  "Rejected",
  "Duplicate",
];
const priorities = ["Low", "Medium", "High"];
const viewFilters = {
  new: { status: "New" },
  "under-review": { status: "Under Review" },
  unassigned: { assignment: "unassigned" },
  assigned: { assignment: "assigned" },
  "in-progress": { status: "In Progress" },
  "pending-information": { status: "Pending Information" },
  resolved: { status: "Resolved" },
  closed: { status: "Closed" },
  rejected: { status: "Rejected" },
  duplicate: { status: "Duplicate" },
  overdue: { deadline: "overdue" },
  "due-today": { deadline: "due_today" },
};

const valueLabels = {
  phone: "Phone",
  email: "Email",
  mail: "Mail",
  in_person: "In person",
  whatsapp: "WhatsApp",
  social_welfare: "Social welfare or assistance",
  child_protection: "Child protection services",
  family_support: "Family support services",
  gbv_response: "Gender-based violence response",
  elderly_support: "Elderly support services",
  disability_services: "Disability services",
  staff_conduct: "Staff conduct or behaviour",
  corruption: "Corruption or unethical behaviour",
  service_delays: "Service delays",
  discrimination: "Discrimination",
  policy: "Policy implementation",
  telephone: "Telephone",
  online_form: "Online form",
  social_media: "Social media",
  suggestion_box: "Suggestion box",
  sign_language: "Sign language interpreter",
  wheelchair: "Wheelchair accessibility",
  home_visit: "Home visit due to mobility",
  translation: "Language translation",
  yes: "Yes",
  no: "No",
  not_applicable: "Not applicable",
  named: "Named",
  anonymous: "Anonymous",
};

const displayValue = (value) => {
  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => valueLabels[item] || item).join(", ")
      : "None selected";
  }

  if (value === true) return "Yes";
  if (value === false) return "No";
  if (!value) return "Not provided";
  return valueLabels[value] || value;
};

const formatBelizeDate = (value) => {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Belize",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const statusClass = (status) =>
  String(status || "")
    .toLowerCase()
    .replace(/\s+/g, "-");

const fileSizeLabel = (bytes) => {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFilename = (headers, fallback) => {
  const disposition = headers["content-disposition"] || "";
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

const ManageGrievances = () => {
  const { view } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeFilter = viewFilters[view] || {};
  const [complaints, setComplaints] = useState([]);
  const [loadedComplaint, setSelectedComplaint] = useState(null);
  const [detailLoadedId, setDetailLoadedId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const effectiveStatus = routeFilter.status || status;
  const effectivePriority = searchParams.get("priority") || priority;
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const [error, setError] = useState("");
  const requestedComplaintId = Number(searchParams.get("complaint"));
  const selectedId =
    Number.isInteger(requestedComplaintId) && requestedComplaintId > 0
      ? requestedComplaintId
      : null;
  const detailLoading =
    Boolean(selectedId) &&
    loadedComplaint?.id !== selectedId &&
    detailLoadedId !== selectedId;
  const selectedComplaint =
    loadedComplaint?.id === selectedId ? loadedComplaint : null;

  const queryParams = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(effectiveStatus ? { status: effectiveStatus } : {}),
      ...(effectivePriority ? { priority: effectivePriority } : {}),
      ...(routeFilter.assignment ? { assignment: routeFilter.assignment } : {}),
      ...(routeFilter.deadline ? { deadline: routeFilter.deadline } : {}),
      page,
      per_page: 10,
    }),
    [
      page,
      effectivePriority,
      effectiveStatus,
      routeFilter.assignment,
      routeFilter.deadline,
      search,
    ],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      if (nextSearch === search) return;
      setSearch(nextSearch);
      setPage(1);
      setLoading(true);
      setError("");
    }, 350);

    return () => window.clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    let active = true;

    API.get("/complaints", { params: queryParams })
      .then((response) => {
        if (!active) return;
        setComplaints(response.data.data || []);
        setPagination(
          response.data.pagination || { page: 1, total: 0, total_pages: 1 },
        );
      })
      .catch((requestError) => {
        if (!active) return;
        setComplaints([]);
        setError(
          requestError.response?.data?.message || "Failed to load grievances",
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [queryParams, requestedComplaintId]);

  useEffect(() => {
    if (!selectedId) {
      return undefined;
    }

    let active = true;

    API.get(`/complaints/${selectedId}`)
      .then((response) => {
        if (active) setSelectedComplaint(response.data.data);
      })
      .catch((requestError) => {
        if (active) {
          setSelectedComplaint(null);
          setError(
            requestError.response?.data?.message ||
              "Failed to load grievance details",
          );
        }
      })
      .finally(() => {
        if (active) setDetailLoadedId(selectedId);
      });

    return () => {
      active = false;
    };
  }, [selectedId]);

  const selectComplaint = (id) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("complaint", String(id));
    setSearchParams(nextParams, { replace: true });
    setError("");
  };

  const updateFilter = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
    setLoading(true);
    setError("");
  };

  const refresh = () => {
    setLoading(true);
    setError("");
    API.get("/complaints", { params: queryParams })
      .then((response) => {
        setComplaints(response.data.data || []);
        setPagination(
          response.data.pagination || { page: 1, total: 0, total_pages: 1 },
        );
      })
      .catch((requestError) => {
        setComplaints([]);
        setError(
          requestError.response?.data?.message || "Failed to load grievances",
        );
      })
      .finally(() => setLoading(false));
  };

  const clearFilters = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("priority");
    setSearchParams(nextParams, { replace: true });
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPriority("");
    setPage(1);
    setLoading(true);
    setError("");
  };

  const changePage = (nextPage) => {
    setPage(nextPage);
    setLoading(true);
    setError("");
  };

  const downloadAttachment = async (attachment) => {
    if (!selectedComplaint) return;

    try {
      setDownloadingId(attachment.id);
      const response = await API.get(
        `/complaints/${selectedComplaint.id}/attachments/${attachment.id}/download`,
        { responseType: "blob" },
      );
      downloadBlob(
        response.data,
        getFilename(response.headers, attachment.originalName),
        "grievance-attachment",
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to download attachment",
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const grievanceData = selectedComplaint?.grievanceData;

  return (
    <div className="grievance-admin-page">
      <div className="module-page-header">
        <div>
          <div className="module-breadcrumb">
            <span>Administration</span>
            <Icon name="chevronRight" size={13} />
            <strong>Grievances</strong>
          </div>
          <h1>Grievances</h1>
          <p>
            Track citizen complaint tickets submitted through the public
            website.
          </p>
        </div>
        <div className="module-page-actions">
          {view === "new" ? (
            <Link
              className="button button-secondary"
              to="/grievances/new/create"
            >
              <Icon name="plus" size={17} /> Grievance Form
            </Link>
          ) : null}
          <button
            className="button button-primary"
            onClick={refresh}
            type="button"
          >
            <Icon name="refresh" size={17} /> Refresh
          </button>
        </div>
      </div>

      <section className="module-toolbar panel grievance-toolbar">
        <label className="module-search">
          <Icon name="search" size={17} />
          <input
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search token, citizen, subject..."
            type="search"
            value={searchInput}
          />
        </label>
        <div className="grievance-filter-controls">
          <select
            disabled={Boolean(routeFilter.status)}
            onChange={updateFilter(setStatus)}
            value={effectiveStatus}
          >
            <option value="">All statuses</option>
            {statuses.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <select
            disabled={Boolean(searchParams.get("priority"))}
            onChange={updateFilter(setPriority)}
            value={effectivePriority}
          >
            <option value="">All priorities</option>
            {priorities.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <button onClick={clearFilters} type="button">
            Clear
          </button>
        </div>
      </section>

      {error ? (
        <div className="grievance-error" role="alert">
          {error}
        </div>
      ) : null}

      <div className="grievance-admin-grid">
        <section className="panel grievance-list-panel">
          <div className="panel-header">
            <div>
              <h2>Complaint Tickets</h2>
              <p>
                {pagination.total} ticket{pagination.total === 1 ? "" : "s"}{" "}
                found
              </p>
            </div>
          </div>

          <div className="table-wrap">
            <table className="data-table grievance-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Grievance</th>
                  <th>Submission</th>
                  <th>Incident location</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>View</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="grievance-status-cell" colSpan="8">
                      Loading grievance tickets...
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td className="grievance-status-cell" colSpan="8">
                      No grievance tickets match these filters.
                    </td>
                  </tr>
                ) : (
                  complaints.map((complaint) => (
                    <tr key={complaint.id}>
                      <td>
                        <button
                          className="reference-link grievance-token-button"
                          onClick={() => selectComplaint(complaint.id)}
                          type="button"
                        >
                          {complaint.tokenNumber}
                        </button>
                      </td>
                      <td>
                        <strong className="subject-cell">
                          {complaint.complaintSubject}
                        </strong>
                        <small>{complaint.fullName}</small>
                      </td>
                      <td>{displayValue(complaint.submissionType)}</td>
                      <td>{complaint.incidentLocation || "Not provided"}</td>
                      <td>
                        <span
                          className={`priority-label ${String(complaint.ticketPriority).toLowerCase()}`}
                        >
                          <i /> {complaint.ticketPriority}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${statusClass(complaint.status)}`}
                        >
                          {complaint.status}
                        </span>
                      </td>
                      <td className="muted-cell">
                        {formatBelizeDate(complaint.submittedAt)}
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => selectComplaint(complaint.id)}
                          type="button"
                          aria-label={`View ${complaint.tokenNumber}`}
                        >
                          <Icon name="eye" size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grievance-pagination">
            <button
              disabled={loading || page <= 1}
              onClick={() => changePage(page - 1)}
              type="button"
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <button
              disabled={loading || page >= pagination.total_pages}
              onClick={() => changePage(page + 1)}
              type="button"
            >
              Next
            </button>
          </div>
        </section>

        <aside className="panel grievance-detail-panel">
          <div className="panel-header compact">
            <div>
              <h2>Ticket Details</h2>
              <p>
                {selectedComplaint?.tokenNumber || "Select a ticket to review"}
              </p>
            </div>
          </div>

          {detailLoading ? (
            <div className="grievance-detail-empty">
              Loading ticket details...
            </div>
          ) : !selectedComplaint ? (
            <div className="grievance-detail-empty">
              Choose a grievance ticket from the table.
            </div>
          ) : (
            <div className="grievance-detail-body">
              {grievanceData ? (
                <>
                  <div className="grievance-detail-copy">
                    <h3>Submission and complainant</h3>
                  </div>
                  <dl className="grievance-detail-list">
                    <div>
                      <dt>Submission type</dt>
                      <dd>{displayValue(grievanceData.submission_type)}</dd>
                    </div>
                    <div>
                      <dt>Language / assistance</dt>
                      <dd>{displayValue(grievanceData.assistance)}</dd>
                    </div>
                    <div>
                      <dt>Other assistance</dt>
                      <dd>{displayValue(grievanceData.assistance_other)}</dd>
                    </div>
                    <div>
                      <dt>Complainant</dt>
                      <dd>{displayValue(grievanceData.comp_name)}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{displayValue(grievanceData.comp_phone)}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{displayValue(grievanceData.comp_email)}</dd>
                    </div>
                    <div>
                      <dt>Address</dt>
                      <dd>{displayValue(grievanceData.comp_address)}</dd>
                    </div>
                    <div>
                      <dt>Preferred contact</dt>
                      <dd>{displayValue(grievanceData.contact_pref)}</dd>
                    </div>
                    <div>
                      <dt>Submitting on behalf</dt>
                      <dd>{displayValue(grievanceData.on_behalf)}</dd>
                    </div>
                    <div>
                      <dt>Affected person</dt>
                      <dd>{displayValue(grievanceData.affected_name)}</dd>
                    </div>
                    <div>
                      <dt>Relationship</dt>
                      <dd>{displayValue(grievanceData.relationship)}</dd>
                    </div>
                    <div>
                      <dt>Permission obtained</dt>
                      <dd>{displayValue(grievanceData.permission)}</dd>
                    </div>
                  </dl>

                  <div className="grievance-detail-copy">
                    <h3>Grievance details</h3>
                  </div>
                  <dl className="grievance-detail-list">
                    <div>
                      <dt>Issue types</dt>
                      <dd>{displayValue(grievanceData.issue_type)}</dd>
                    </div>
                    <div>
                      <dt>Other issue</dt>
                      <dd>{displayValue(grievanceData.issue_other)}</dd>
                    </div>
                    <div>
                      <dt>Channels used</dt>
                      <dd>{displayValue(grievanceData.channel)}</dd>
                    </div>
                    <div>
                      <dt>Incident date</dt>
                      <dd>{displayValue(grievanceData.incident_date)}</dd>
                    </div>
                    <div>
                      <dt>Incident location</dt>
                      <dd>{displayValue(grievanceData.incident_location)}</dd>
                    </div>
                    <div>
                      <dt>Tried to resolve</dt>
                      <dd>{displayValue(grievanceData.tried_resolve)}</dd>
                    </div>
                  </dl>
                  <div className="grievance-detail-copy">
                    <h3>Detailed description</h3>
                    <p>{displayValue(grievanceData.description)}</p>
                  </div>
                  <div className="grievance-detail-copy">
                    <h3>Desired outcome</h3>
                    <p>{displayValue(grievanceData.desired_outcome)}</p>
                  </div>
                  {grievanceData.prev_attempts ? (
                    <div className="grievance-detail-copy">
                      <h3>Previous resolution attempts</h3>
                      <p>{grievanceData.prev_attempts}</p>
                    </div>
                  ) : null}

                  <div className="grievance-detail-copy">
                    <h3>Supporting information and accommodations</h3>
                  </div>
                  <dl className="grievance-detail-list">
                    <div>
                      <dt>Has documents</dt>
                      <dd>{displayValue(grievanceData.has_documents)}</dd>
                    </div>
                    <div>
                      <dt>Has witnesses</dt>
                      <dd>{displayValue(grievanceData.has_witnesses)}</dd>
                    </div>
                    <div>
                      <dt>Witness name</dt>
                      <dd>{displayValue(grievanceData.witness_name)}</dd>
                    </div>
                    <div>
                      <dt>Witness phone</dt>
                      <dd>{displayValue(grievanceData.witness_phone)}</dd>
                    </div>
                    <div>
                      <dt>Accommodations</dt>
                      <dd>{displayValue(grievanceData.accommodation)}</dd>
                    </div>
                    <div>
                      <dt>Other accommodation</dt>
                      <dd>{displayValue(grievanceData.accommodation_other)}</dd>
                    </div>
                    <div>
                      <dt>Electronic signature</dt>
                      <dd>{displayValue(grievanceData.signature)}</dd>
                    </div>
                    <div>
                      <dt>Declaration date</dt>
                      <dd>{displayValue(grievanceData.declaration_date)}</dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span
                          className={`status-badge ${statusClass(selectedComplaint.status)}`}
                        >
                          {selectedComplaint.status}
                        </span>
                      </dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <dl className="grievance-detail-list">
                    <div>
                      <dt>Citizen</dt>
                      <dd>{selectedComplaint.fullName}</dd>
                    </div>
                    <div>
                      <dt>Phone Number</dt>
                      <dd>{selectedComplaint.phoneNumber}</dd>
                    </div>
                    <div>
                      <dt>Email Address</dt>
                      <dd>
                        {selectedComplaint.emailAddress || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt>Gender</dt>
                      <dd>{selectedComplaint.gender || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Social Security Number</dt>
                      <dd>
                        {selectedComplaint.socialSecurityNumber ||
                          "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt>Department / Ministry</dt>
                      <dd>{selectedComplaint.departmentMinistry}</dd>
                    </div>
                    <div>
                      <dt>Complaint Category</dt>
                      <dd>{selectedComplaint.complaintCategory}</dd>
                    </div>
                    <div>
                      <dt>Location / District</dt>
                      <dd>{selectedComplaint.district || "Not provided"}</dd>
                    </div>
                    <div>
                      <dt>Incident Date</dt>
                      <dd>
                        {selectedComplaint.incidentDate || "Not provided"}
                      </dd>
                    </div>
                    <div>
                      <dt>Status</dt>
                      <dd>
                        <span
                          className={`status-badge ${statusClass(selectedComplaint.status)}`}
                        >
                          {selectedComplaint.status}
                        </span>
                      </dd>
                    </div>
                  </dl>

                  <div className="grievance-detail-copy">
                    <h3>{selectedComplaint.complaintSubject}</h3>
                    <p>{selectedComplaint.complaintDetails}</p>
                  </div>
                </>
              )}

              {selectedComplaint.officeData ? (
                <>
                  <div className="grievance-detail-copy">
                    <h3>Office intake</h3>
                    <p>
                      This grievance was recorded in the admin panel for a
                      walk-in complainant.
                    </p>
                  </div>
                  <dl className="grievance-detail-list">
                    <div>
                      <dt>Date received</dt>
                      <dd>
                        {displayValue(
                          selectedComplaint.officeData.receivedDate,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Received by</dt>
                      <dd>
                        {displayValue(selectedComplaint.officeData.receivedBy)}
                      </dd>
                    </div>
                    <div>
                      <dt>Initial classification</dt>
                      <dd>
                        {displayValue(
                          selectedComplaint.officeData.initialClassification,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Assigned to</dt>
                      <dd>
                        {displayValue(selectedComplaint.officeData.assignedTo)}
                      </dd>
                    </div>
                  </dl>
                </>
              ) : null}

              <div className="grievance-attachments">
                <h3>Supporting Documents</h3>
                {selectedComplaint.attachments.length === 0 ? (
                  <p>No supporting documents uploaded.</p>
                ) : (
                  <ul>
                    {selectedComplaint.attachments.map((attachment) => (
                      <li key={attachment.id}>
                        <span>
                          <strong>{attachment.originalName}</strong>
                          <small>{fileSizeLabel(attachment.fileSize)}</small>
                        </span>
                        <button
                          disabled={downloadingId === attachment.id}
                          onClick={() => downloadAttachment(attachment)}
                          type="button"
                        >
                          <Icon name="download" size={15} />
                          {downloadingId === attachment.id
                            ? "Downloading"
                            : "Download"}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default ManageGrievances;
