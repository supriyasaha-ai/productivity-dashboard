import { useState, useEffect, useCallback } from "react";

const PLATFORMS = ["LinkedIn", "Naukri", "Wellfound", "Company Website", "Referral", "Other"];
const STATUSES = ["Applied", "Followed Up", "Interview", "Offer", "Rejected"];

const STATUS_COLORS = {
  "Applied":     { bg: "#E6F1FB", text: "#0C447C", border: "#185FA5" },
  "Followed Up": { bg: "#FAEEDA", text: "#633806", border: "#BA7517" },
  "Interview":   { bg: "#EEEDFE", text: "#3C3489", border: "#534AB7" },
  "Offer":       { bg: "#EAF3DE", text: "#27500A", border: "#3B6D11" },
  "Rejected":    { bg: "#FCEBEB", text: "#791F1F", border: "#A32D2D" },
};

const PLATFORM_COLORS = {
  "LinkedIn":        "#0A66C2",
  "Naukri":          "#EF4035",
  "Wellfound":       "#FF6154",
  "Company Website": "#534AB7",
  "Referral":        "#1D9E75",
  "Other":           "#888780",
};

function daysSince(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

const emptyApp = () => ({
  id: Date.now() + Math.random(),
  company: "", role: "", dateApplied: new Date().toISOString().slice(0, 10),
  platform: "LinkedIn", contactName: "", contactLink: "",
  status: "Applied", emailSent: false, linkedinSent: false,
  salaryRange: "", expectedSalary: "", notes: "",
});

function Modal({ app, onSave, onClose }) {
  const [form, setForm] = useState(app);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 580,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {form.id === app.id && app.company ? "Edit Application" : "New Application"}
          </h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            fontSize: 20, color: "var(--color-text-secondary)", padding: "4px 8px",
          }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Company Name</FieldLabel>
            <input value={form.company} onChange={e => set("company", e.target.value)}
              placeholder="e.g. Google" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Role / Position</FieldLabel>
            <input value={form.role} onChange={e => set("role", e.target.value)}
              placeholder="e.g. Senior Product Designer" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Date Applied</FieldLabel>
            <input type="date" value={form.dateApplied} onChange={e => set("dateApplied", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Platform</FieldLabel>
            <select value={form.platform} onChange={e => set("platform", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Contact Person</FieldLabel>
            <input value={form.contactName} onChange={e => set("contactName", e.target.value)}
              placeholder="Name" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Contact Email / LinkedIn</FieldLabel>
            <input value={form.contactLink} onChange={e => set("contactLink", e.target.value)}
              placeholder="email or profile URL" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={form.status} onChange={e => set("status", e.target.value)}
              style={{ width: "100%", boxSizing: "border-box" }}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Salary Range (Role)</FieldLabel>
            <input value={form.salaryRange} onChange={e => set("salaryRange", e.target.value)}
              placeholder="e.g. ₹8–12 LPA" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>My Expected Salary</FieldLabel>
            <input value={form.expectedSalary} onChange={e => set("expectedSalary", e.target.value)}
              placeholder="e.g. ₹10 LPA" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
            <Toggle label="Email Sent?" value={form.emailSent} onChange={v => set("emailSent", v)} />
            <Toggle label="LinkedIn Sent?" value={form.linkedinSent} onChange={v => set("linkedinSent", v)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Notes / Next Action</FieldLabel>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} placeholder="e.g. Follow up Thursday, ask about team size..."
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit", fontSize: 14, padding: "8px 10px",
                border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)",
                color: "var(--color-text-primary)" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => {
            if (!form.company.trim()) return;
            onSave(form);
          }} style={{
            background: "#534AB7", color: "#EEEDFE", border: "none",
            borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 500, fontSize: 14,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{children}</p>;
}

function Toggle({ label, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{
        width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
        background: value ? "#1D9E75" : "var(--color-border-secondary)",
        position: "relative", transition: "background 0.2s",
      }}>
        <span style={{
          position: "absolute", top: 3, left: value ? 22 : 3,
          width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s",
        }} />
      </button>
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS["Applied"];
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

function SummaryCard({ label, value, accent }) {
  return (
    <div style={{
      background: "var(--color-background-secondary)", borderRadius: 10,
      padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <span style={{ fontSize: 12, color: "var(--color-text-secondary)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontSize: 28, fontWeight: 500, color: accent || "var(--color-text-primary)", lineHeight: 1 }}>{value}</span>
    </div>
  );
}

// ─── Job Tracker Tab ─────────────────────────────────────────────────────────

function JobTracker() {
  const [apps, setApps] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jt_apps") || "[]"); } catch { return []; }
  });
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterPlatform, setFilterPlatform] = useState("All");

  useEffect(() => {
    localStorage.setItem("jt_apps", JSON.stringify(apps));
  }, [apps]);

  const save = useCallback(form => {
    setApps(prev => {
      const idx = prev.findIndex(a => a.id === form.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = form; return n; }
      return [form, ...prev];
    });
    setModal(null);
  }, []);

  const del = id => setApps(prev => prev.filter(a => a.id !== id));

  const filtered = apps
    .filter(a => filterStatus === "All" || a.status === filterStatus)
    .filter(a => filterPlatform === "All" || a.platform === filterPlatform)
    .sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));

  const total = apps.length;
  const needFollowUp = apps.filter(a => a.status === "Applied" && daysSince(a.dateApplied) >= 5).length;
  const interviews = apps.filter(a => a.status === "Interview").length;
  const offers = apps.filter(a => a.status === "Offer").length;

  return (
    <div>
      {modal && <Modal app={modal} onSave={save} onClose={() => setModal(null)} />}

      {/* Summary bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
        <SummaryCard label="Total Applied" value={total} />
        <SummaryCard label="Need Follow-up" value={needFollowUp} accent={needFollowUp > 0 ? "#BA7517" : undefined} />
        <SummaryCard label="Interviews" value={interviews} accent="#534AB7" />
        <SummaryCard label="Offers" value={offers} accent="#1D9E75" />
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
          <option value="All">All Statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterPlatform} onChange={e => setFilterPlatform(e.target.value)} style={{ fontSize: 13 }}>
          <option value="All">All Platforms</option>
          {PLATFORMS.map(p => <option key={p}>{p}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal(emptyApp())} style={{
          background: "#534AB7", color: "#EEEDFE", border: "none",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 500, fontSize: 14,
        }}>+ Add Application</button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
          No applications yet. Add your first one!
        </div>
      ) : (
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--color-background-secondary)" }}>
                {["Company / Role", "Date", "Platform", "Status", "Contact", "Salary", "Actions"].map(h => (
                  <th key={h} style={{
                    padding: "10px 12px", textAlign: "left", fontWeight: 500,
                    color: "var(--color-text-secondary)", fontSize: 11, textTransform: "uppercase",
                    letterSpacing: "0.05em", borderBottom: "0.5px solid var(--color-border-tertiary)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app, i) => {
                const stale = app.status === "Applied" && daysSince(app.dateApplied) >= 5;
                return (
                  <tr key={app.id} style={{
                    background: stale
                      ? "rgba(250,174,0,0.07)"
                      : i % 2 === 0 ? "transparent" : "var(--color-background-secondary)",
                    borderLeft: stale ? "3px solid #BA7517" : "3px solid transparent",
                  }}>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{app.company || "—"}</div>
                      <div style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{app.role || "—"}</div>
                      {stale && <div style={{ fontSize: 11, color: "#BA7517", marginTop: 2 }}>⏰ Follow up!</div>}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>
                      {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                      <div style={{ fontSize: 11 }}>{daysSince(app.dateApplied)}d ago</div>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20,
                        background: PLATFORM_COLORS[app.platform] + "18",
                        color: PLATFORM_COLORS[app.platform],
                        border: `0.5px solid ${PLATFORM_COLORS[app.platform]}44`,
                      }}>{app.platform}</span>
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <StatusBadge status={app.status} />
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      {app.contactName ? (
                        <div>
                          <div style={{ color: "var(--color-text-primary)" }}>{app.contactName}</div>
                          {app.contactLink && (
                            <a href={app.contactLink.startsWith("http") ? app.contactLink : `mailto:${app.contactLink}`}
                              target="_blank" rel="noreferrer"
                              style={{ fontSize: 11, color: "#185FA5" }}>
                              {app.contactLink.includes("linkedin") ? "LinkedIn ↗" : app.contactLink.includes("@") ? "Email ↗" : "Link ↗"}
                            </a>
                          )}
                          <div style={{ display: "flex", gap: 6, marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: app.emailSent ? "#1D9E75" : "var(--color-text-tertiary)" }}>
                              {app.emailSent ? "✓ Email" : "○ Email"}
                            </span>
                            <span style={{ fontSize: 10, color: app.linkedinSent ? "#0A66C2" : "var(--color-text-tertiary)" }}>
                              {app.linkedinSent ? "✓ LI" : "○ LI"}
                            </span>
                          </div>
                        </div>
                      ) : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      {app.salaryRange && <div style={{ color: "var(--color-text-primary)" }}>{app.salaryRange}</div>}
                      {app.expectedSalary && <div style={{ fontSize: 11, color: "#1D9E75" }}>Expected: {app.expectedSalary}</div>}
                    </td>
                    <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button onClick={() => setModal({ ...app })} style={{
                          background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)",
                          borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                        }}>Edit</button>
                        <button onClick={() => del(app.id)} style={{
                          background: "#FCEBEB", border: "0.5px solid #A32D2D33",
                          color: "#A32D2D", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                        }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Content Planner Tab ──────────────────────────────────────────────────────

const CONTENT_TYPES = ["Blog Post", "LinkedIn Post", "Twitter/X Thread", "YouTube Video", "Newsletter", "Instagram", "Podcast", "Other"];
const CONTENT_STATUSES = ["Idea", "Drafting", "Review", "Scheduled", "Published"];
const CONTENT_STATUS_COLORS = {
  "Idea":      { bg: "#F1EFE8", text: "#444441", border: "#888780" },
  "Drafting":  { bg: "#E6F1FB", text: "#0C447C", border: "#185FA5" },
  "Review":    { bg: "#FAEEDA", text: "#633806", border: "#BA7517" },
  "Scheduled": { bg: "#EEEDFE", text: "#3C3489", border: "#534AB7" },
  "Published": { bg: "#EAF3DE", text: "#27500A", border: "#3B6D11" },
};

const emptyContent = () => ({
  id: Date.now() + Math.random(),
  title: "", type: "Blog Post", status: "Idea",
  platform: "", dueDate: "", publishDate: "",
  keywords: "", hook: "", cta: "", notes: "",
  createdAt: new Date().toISOString().slice(0, 10),
});

function ContentModal({ item, onSave, onClose }) {
  const [form, setForm] = useState(item);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem",
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 16, padding: "1.5rem", width: "100%", maxWidth: 560,
        maxHeight: "90vh", overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>
            {form.title ? "Edit Content" : "New Content Piece"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "var(--color-text-secondary)", padding: "4px 8px" }}>×</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Title / Topic</FieldLabel>
            <input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="e.g. 10 things I learned building in public" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Content Type</FieldLabel>
            <select value={form.type} onChange={e => set("type", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Status</FieldLabel>
            <select value={form.status} onChange={e => set("status", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }}>
              {CONTENT_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Target Platform</FieldLabel>
            <input value={form.platform} onChange={e => set("platform", e.target.value)}
              placeholder="e.g. Personal blog, LinkedIn..." style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div>
            <FieldLabel>Due Date</FieldLabel>
            <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Keywords / Tags</FieldLabel>
            <input value={form.keywords} onChange={e => set("keywords", e.target.value)}
              placeholder="e.g. career, productivity, design" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Hook / Opening Line</FieldLabel>
            <input value={form.hook} onChange={e => set("hook", e.target.value)}
              placeholder="What's the grabber?" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>CTA / Goal</FieldLabel>
            <input value={form.cta} onChange={e => set("cta", e.target.value)}
              placeholder="e.g. Subscribe, Share, Apply" style={{ width: "100%", boxSizing: "border-box" }} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <FieldLabel>Notes / Outline</FieldLabel>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={4} placeholder="Rough outline, references, thoughts..."
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit",
                fontSize: 14, padding: "8px 10px", border: "0.5px solid var(--color-border-secondary)",
                borderRadius: 8, background: "var(--color-background-primary)", color: "var(--color-text-primary)" }} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: "1.25rem" }}>
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => { if (!form.title.trim()) return; onSave(form); }} style={{
            background: "#1D9E75", color: "#E1F5EE", border: "none",
            borderRadius: 8, padding: "8px 20px", cursor: "pointer", fontWeight: 500, fontSize: 14,
          }}>Save</button>
        </div>
      </div>
    </div>
  );
}

function ContentStatusBadge({ status }) {
  const c = CONTENT_STATUS_COLORS[status] || CONTENT_STATUS_COLORS["Idea"];
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
      background: c.bg, color: c.text, border: `0.5px solid ${c.border}`,
      whiteSpace: "nowrap",
    }}>{status}</span>
  );
}

const TYPE_ICONS = {
  "Blog Post": "📝", "LinkedIn Post": "💼", "Twitter/X Thread": "🐦",
  "YouTube Video": "🎬", "Newsletter": "📨", "Instagram": "📸",
  "Podcast": "🎙️", "Other": "✏️",
};

function ContentPlanner() {
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cp_items") || "[]"); } catch { return []; }
  });
  const [modal, setModal] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [view, setView] = useState("board"); // board | list

  useEffect(() => {
    localStorage.setItem("cp_items", JSON.stringify(items));
  }, [items]);

  const save = useCallback(form => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === form.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = form; return n; }
      return [form, ...prev];
    });
    setModal(null);
  }, []);

  const del = id => setItems(prev => prev.filter(i => i.id !== id));
  const moveStatus = (id, newStatus) => setItems(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i));

  const filtered = items
    .filter(i => filterStatus === "All" || i.status === filterStatus)
    .filter(i => filterType === "All" || i.type === filterType);

  const totalIdeas = items.filter(i => i.status === "Idea").length;
  const inProgress = items.filter(i => ["Drafting", "Review"].includes(i.status)).length;
  const scheduled = items.filter(i => i.status === "Scheduled").length;
  const published = items.filter(i => i.status === "Published").length;

  const overdueCount = items.filter(i => i.dueDate && new Date(i.dueDate) < new Date() && i.status !== "Published").length;

  return (
    <div>
      {modal && <ContentModal item={modal} onSave={save} onClose={() => setModal(null)} />}

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: "1.5rem" }}>
        <SummaryCard label="Ideas" value={totalIdeas} />
        <SummaryCard label="In Progress" value={inProgress} accent="#185FA5" />
        <SummaryCard label="Scheduled" value={scheduled} accent="#534AB7" />
        <SummaryCard label="Published" value={published} accent="#1D9E75" />
      </div>
      {overdueCount > 0 && (
        <div style={{
          background: "#FCEBEB", border: "0.5px solid #A32D2D44", borderRadius: 8,
          padding: "8px 14px", marginBottom: "1rem", fontSize: 13, color: "#791F1F",
        }}>
          ⚠️ {overdueCount} piece{overdueCount > 1 ? "s are" : " is"} past due date
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: "1rem", flexWrap: "wrap" }}>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize: 13 }}>
          <option value="All">All Statuses</option>
          {CONTENT_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ fontSize: 13 }}>
          <option value="All">All Types</option>
          {CONTENT_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <div style={{ display: "flex", border: "0.5px solid var(--color-border-secondary)", borderRadius: 8, overflow: "hidden" }}>
          {["board", "list"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "var(--color-background-secondary)" : "transparent",
              border: "none", padding: "6px 14px", cursor: "pointer", fontSize: 12,
              fontWeight: view === v ? 500 : 400, color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}>{v === "board" ? "Board" : "List"}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal(emptyContent())} style={{
          background: "#1D9E75", color: "#E1F5EE", border: "none",
          borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 500, fontSize: 14,
        }}>+ New Piece</button>
      </div>

      {view === "board" ? (
        <BoardView items={filtered} statuses={CONTENT_STATUSES} onEdit={setModal} onDelete={del} onMove={moveStatus} />
      ) : (
        <ListView items={filtered} onEdit={setModal} onDelete={del} onMove={moveStatus} />
      )}
    </div>
  );
}

function BoardView({ items, statuses, onEdit, onDelete, onMove }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, alignItems: "start" }}>
      {statuses.map(status => {
        const col = items.filter(i => i.status === status);
        const c = CONTENT_STATUS_COLORS[status];
        return (
          <div key={status} style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%", background: c.border, flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>{status}</span>
              <span style={{
                marginLeft: "auto", fontSize: 11, background: c.bg, color: c.text,
                border: `0.5px solid ${c.border}`, borderRadius: 10, padding: "1px 6px",
              }}>{col.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {col.map(item => (
                <div key={item.id} style={{
                  background: "var(--color-background-primary)",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: 8, padding: "10px 10px 8px",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 4, lineHeight: 1.3 }}>
                    {TYPE_ICONS[item.type]} {item.title}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginBottom: 6 }}>{item.type}</div>
                  {item.dueDate && (
                    <div style={{
                      fontSize: 11,
                      color: new Date(item.dueDate) < new Date() && status !== "Published" ? "#A32D2D" : "var(--color-text-tertiary)",
                    }}>
                      📅 {new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  )}
                  {item.keywords && <div style={{ fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.keywords}</div>}
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    <button onClick={() => onEdit({ ...item })} style={{
                      flex: 1, background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)",
                      borderRadius: 5, padding: "3px 0", cursor: "pointer", fontSize: 11,
                    }}>Edit</button>
                    <button onClick={() => onDelete(item.id)} style={{
                      background: "#FCEBEB", border: "0.5px solid #A32D2D33",
                      color: "#A32D2D", borderRadius: 5, padding: "3px 8px", cursor: "pointer", fontSize: 11,
                    }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({ items, onEdit, onDelete, onMove }) {
  if (items.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)", fontSize: 14 }}>
      No content pieces yet. Add your first one!
    </div>
  );
  return (
    <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: 12, overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--color-background-secondary)" }}>
            {["Title", "Type", "Status", "Due", "Keywords", "Actions"].map(h => (
              <th key={h} style={{
                padding: "10px 12px", textAlign: "left", fontWeight: 500,
                color: "var(--color-text-secondary)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em",
                borderBottom: "0.5px solid var(--color-border-tertiary)",
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--color-background-secondary)" }}>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ fontWeight: 500 }}>{TYPE_ICONS[item.type]} {item.title}</div>
                {item.hook && <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{item.hook.slice(0, 60)}{item.hook.length > 60 ? "…" : ""}</div>}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap", color: "var(--color-text-secondary)" }}>{item.type}</td>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <ContentStatusBadge status={item.status} />
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", whiteSpace: "nowrap",
                color: item.dueDate && new Date(item.dueDate) < new Date() && item.status !== "Published" ? "#A32D2D" : "var(--color-text-secondary)" }}>
                {item.dueDate ? new Date(item.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", color: "var(--color-text-secondary)", maxWidth: 140 }}>
                <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.keywords || "—"}</span>
              </td>
              <td style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => onEdit({ ...item })} style={{
                    background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                  }}>Edit</button>
                  <button onClick={() => onDelete(item.id)} style={{
                    background: "#FCEBEB", border: "0.5px solid #A32D2D33",
                    color: "#A32D2D", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12,
                  }}>Del</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [tab, setTab] = useState("jobs");

  return (
    <div style={{ fontFamily: "var(--font-sans)", maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1rem" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>
          Command Center
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 2, marginBottom: "1.5rem",
        background: "var(--color-background-secondary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: 10, padding: 4, width: "fit-content",
      }}>
        {[
          { id: "jobs", label: "🎯 Job Tracker" },
          { id: "content", label: "✍️ Content Planner" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "var(--color-background-primary)" : "transparent",
            border: tab === t.id ? "0.5px solid var(--color-border-secondary)" : "none",
            borderRadius: 7, padding: "8px 20px", cursor: "pointer",
            fontSize: 14, fontWeight: tab === t.id ? 500 : 400,
            color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            transition: "all 0.15s",
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "jobs" ? <JobTracker /> : <ContentPlanner />}
    </div>
  );
}
