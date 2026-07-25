import { useState, useEffect, useCallback } from "react";

/* ─── CONFIGURATION ──────────────────────────────────────────────────────── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbymt0JLmP2KEdtXZzu3zH_PWUXOaw1nK2hDV8Rd46a48iX2F8E3dGM7A7eFnnlIZNb1Mg/exec";
/* ────────────────────────────────────────────────────────────────────────── */

/* ─── Dark mode design tokens ────────────────────────────────────────────── */
const T = {
  bg:         "#0F1117",
  surface:    "#1A1D27",
  surfaceUp:  "#22263A",
  surfaceHov: "#2A2F45",
  border:     "#2E3350",
  borderBright:"#404870",
  text:       "#E8EAF0",
  textMid:    "#9AA0BE",
  textDim:    "#5C6380",

  blue:       "#4A8FE8",
  blueDim:    "#1E3A6E",
  bluePale:   "#0F1F40",
  green:      "#3EC98A",
  greenDim:   "#164D36",
  greenPale:  "#0A2A1E",
  amber:      "#F0B429",
  amberDim:   "#5C420A",
  amberPale:  "#2E1F05",
  violet:     "#9B6DFF",
  violetDim:  "#3A1F80",
  violetPale: "#1E0F45",
  red:        "#F05252",
  redDim:     "#5C1A1A",
  redPale:    "#2E0A0A",
  slate:      "#6B7280",
  slatePale:  "#1F2230",
};

/* ─── Status config ──────────────────────────────────────────────────────── */
const DEFAULT_PLATFORMS = ["LinkedIn","Naukri","Wellfound","Company Website","Referral","Other"];
const STATUSES = ["To Apply","Applied","Follow-up 1","Follow-up 2","Follow-up 3","Interview","Offer","Rejected","Ghosted"];
const PRIORITIES = ["High","Medium","Low"];

const STATUS_META = {
  "To Apply":    {bg:T.slatePale,   text:T.textMid,   dot:T.slate,  border:T.border},
  "Applied":     {bg:T.bluePale,    text:T.blue,      dot:T.blue,   border:T.blueDim},
  "Follow-up 1": {bg:T.amberPale,   text:T.amber,     dot:T.amber,  border:T.amberDim},
  "Follow-up 2": {bg:T.amberPale,   text:"#FFD060",   dot:"#FFD060",border:T.amberDim},
  "Follow-up 3": {bg:"#2E1500",     text:"#FF9020",   dot:"#FF9020",border:"#6E3A00"},
  "Interview":   {bg:T.violetPale,  text:T.violet,    dot:T.violet, border:T.violetDim},
  "Offer":       {bg:T.greenPale,   text:T.green,     dot:T.green,  border:T.greenDim},
  "Rejected":    {bg:T.redPale,     text:T.red,       dot:T.red,    border:T.redDim},
  "Ghosted":     {bg:"#1A1A1A",     text:"#555",      dot:"#333",   border:"#2A2A2A"},
};

const PRIORITY_META = {
  "High":   {dot:T.red,   text:T.red},
  "Medium": {dot:T.amber, text:T.amber},
  "Low":    {dot:T.slate, text:T.textDim},
};

const PLATFORM_COLORS = {
  "LinkedIn":"#0A66C2","Naukri":"#FF4500","Wellfound":"#E05A3A",
  "Company Website":"#6366F1","Referral":"#10B981","Other":"#6B7280",
};

/* ─── Follow-up schedule: days after emailDate ───────────────────────────── */
const FU_DAYS = [2, 5, 12]; // FU1 at day 2, FU2 at day 5, FU3 at day 12

function daysSince(d) {
  if (!d) return null;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function getFollowUpAlert(app) {
  const emailDate = app.emailDate || app.dateApplied;
  if (!emailDate) return null;
  if (["To Apply","Rejected","Ghosted","Offer"].includes(app.status)) return null;
  const days = daysSince(emailDate);
  if (days === null) return null;

  const fuIndex = ["Follow-up 1","Follow-up 2","Follow-up 3"].indexOf(app.status);
  const nextFuIndex = fuIndex + 1;

  if (app.status === "Applied" && days >= FU_DAYS[0]) {
    return { msg: `Send Follow-up 1 — ${days}d since email`, urgency: days >= 5 ? "hot" : "warm", next: "Follow-up 1" };
  }
  if (app.status === "Follow-up 1" && days >= FU_DAYS[1]) {
    return { msg: `Send Follow-up 2 — ${days}d since FU1`, urgency: days >= 7 ? "hot" : "warm", next: "Follow-up 2" };
  }
  if (app.status === "Follow-up 2" && days >= FU_DAYS[2]) {
    return { msg: `Send Follow-up 3 — ${days}d since FU2`, urgency: "hot", next: "Follow-up 3" };
  }
  return null;
}

/* ─── Storage ────────────────────────────────────────────────────────────── */
const isConfigured = () => APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE";

async function sheetGet(params) {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`, { redirect:"follow" });
    const json = await res.json();
    return json.error ? null : json;
  } catch { return null; }
}

async function sheetWrite(params) {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`, { redirect:"follow" });
    return await res.json();
  } catch { return null; }
}

function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null;}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

async function loadData() {
  if (isConfigured()) {
    const r = await sheetGet({ action:"getAll", type:"jobs" });
    if (r?.rows) { lsSet("jt_apps", r.rows); return r.rows; }
  }
  return lsGet("jt_apps") || [];
}

async function syncSave(data) {
  await sheetWrite({ action:"save", type:"jobs", data: encodeURIComponent(JSON.stringify(data)) });
}

async function syncDelete(id) {
  await sheetWrite({ action:"delete", type:"jobs", id: String(id) });
}

function exportCSV(apps) {
  const h = ["Company","Role","Status","Priority","Platform","Date Applied","Email Date","Salary (Role)","My Ask","Notes","Job URL","Contacts"];
  const rows = apps.map(a => [
    a.company, a.role, a.status, a.priority||"Medium", a.platform,
    a.dateApplied, a.emailDate||"", a.salaryRange||"", a.expectedSalary||"",
    a.notes||"", a.jobLink||"",
    (a.contacts||[]).map(c=>c.name+(c.url?` (${c.url})`:"")).join(" | ")
  ].map(v => `"${(String(v)||"").replace(/"/g,'""')}"`));
  const csv = [h.join(","), ...rows.map(r=>r.join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], {type:"text/csv"}));
  const a = document.createElement("a"); a.href=url; a.download="job_applications.csv"; a.click();
  URL.revokeObjectURL(url);
}

const emptyApp = () => ({
  id: Date.now() + Math.random(),
  company:"", role:"", jobLink:"",
  dateApplied: new Date().toISOString().slice(0,10),
  emailDate:"",
  platform:"LinkedIn",
  status:"To Apply", priority:"Medium",
  contacts:[],
  emailsSent:[], linkedinsSent:[],
  salaryRange:"", expectedSalary:"",
  notes:"",
});

/* ─── Shared UI ──────────────────────────────────────────────────────────── */
function Label({children}){
  return <p style={{margin:"0 0 6px",fontSize:10,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.12em"}}>{children}</p>;
}

function StatusPill({status}){
  const m = STATUS_META[status] || STATUS_META["To Apply"];
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:4,fontSize:11,fontWeight:700,background:m.bg,color:m.text,border:`1px solid ${m.border}`,whiteSpace:"nowrap",letterSpacing:"0.04em"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
      {status}
    </span>
  );
}

function Btn({children,onClick,variant="ghost",small=false,full=false}){
  const base={border:"none",borderRadius:6,cursor:"pointer",fontWeight:600,fontFamily:"inherit",display:"inline-flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all .15s",width:full?"100%":undefined};
  const sz={padding:small?"4px 10px":"8px 16px",fontSize:small?11:13};
  const vars={
    primary:{...base,...sz,background:T.blue,color:"#fff"},
    green:  {...base,...sz,background:T.green,color:"#000"},
    ghost:  {...base,...sz,background:T.surfaceUp,color:T.text,border:`1px solid ${T.border}`},
    danger: {...base,...sz,background:T.redPale,color:T.red,border:`1px solid ${T.redDim}`},
    amber:  {...base,...sz,background:T.amberPale,color:T.amber,border:`1px solid ${T.amberDim}`},
  };
  return <button onClick={onClick} style={vars[variant]||vars.ghost}>{children}</button>;
}

function TInput({value,onChange,placeholder,type="text",full=true}){
  return(
    <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{width:full?"100%":undefined,boxSizing:"border-box",padding:"8px 11px",fontSize:13,
        border:`1px solid ${T.border}`,borderRadius:6,background:T.bg,color:T.text,
        fontFamily:"inherit",outline:"none"}}
      onFocus={e=>e.target.style.borderColor=T.blue}
      onBlur={e=>e.target.style.borderColor=T.border}
    />
  );
}

function SInput({value,onChange,children,full=true}){
  return(
    <select value={value||""} onChange={e=>onChange(e.target.value)}
      style={{width:full?"100%":undefined,boxSizing:"border-box",padding:"8px 11px",fontSize:13,
        border:`1px solid ${T.border}`,borderRadius:6,background:T.bg,color:T.text,
        fontFamily:"inherit",outline:"none",cursor:"pointer"}}>
      {children}
    </select>
  );
}

function StatCard({label,value,sub,accent,onClick}){
  return(
    <div onClick={onClick} style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"14px 16px",cursor:onClick?"pointer":"default",transition:"border-color .15s"}}
      onMouseEnter={e=>{if(onClick)e.currentTarget.style.borderColor=T.borderBright;}}
      onMouseLeave={e=>{e.currentTarget.style.borderColor=T.border;}}>
      <div style={{fontSize:10,fontWeight:700,color:T.textDim,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,color:accent||T.text,lineHeight:1,fontVariantNumeric:"tabular-nums"}}>{value}</div>
      {sub && <div style={{fontSize:11,color:T.textDim,marginTop:4}}>{sub}</div>}
    </div>
  );
}

function SyncBadge({status}){
  const m={
    idle:         {label:"● Synced",          color:T.green},
    syncing:      {label:"○ Syncing…",         color:T.amber},
    offline:      {label:"◌ Offline",          color:T.textDim},
    unconfigured: {label:"⚠ Sheet not linked", color:T.red},
  };
  const s = m[status]||m.idle;
  return <span style={{fontSize:11,fontWeight:600,color:s.color}}>{s.label}</span>;
}

/* ─── Contact Manager (inside modal) ────────────────────────────────────── */
function ContactManager({contacts, onChange}){
  const add = () => onChange([...contacts, {id:Date.now(), name:"", url:"", emailedOn:"", liOn:""}]);
  const update = (id, field, val) => onChange(contacts.map(c => c.id===id ? {...c,[field]:val} : c));
  const remove = (id) => onChange(contacts.filter(c => c.id!==id));

  return(
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <Label>Contacts</Label>
        <button onClick={add} style={{background:T.bluePale,border:`1px solid ${T.blueDim}`,color:T.blue,borderRadius:5,padding:"2px 10px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+ Add Contact</button>
      </div>
      {contacts.length===0 && <div style={{fontSize:12,color:T.textDim,padding:"8px 0"}}>No contacts added yet</div>}
      {contacts.map(c=>(
        <div key={c.id} style={{background:T.bg,border:`1px solid ${T.border}`,borderRadius:6,padding:"10px 12px",marginBottom:8}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
            <div>
              <Label>Name</Label>
              <TInput value={c.name} onChange={v=>update(c.id,"name",v)} placeholder="e.g. Riya Sharma"/>
            </div>
            <div>
              <Label>LinkedIn URL</Label>
              <TInput value={c.url} onChange={v=>update(c.id,"url",v)} placeholder="linkedin.com/in/..."/>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:8,alignItems:"flex-end"}}>
            <div>
              <Label>Emailed on</Label>
              <TInput type="date" value={c.emailedOn} onChange={v=>update(c.id,"emailedOn",v)}/>
            </div>
            <div>
              <Label>LinkedIn msg on</Label>
              <TInput type="date" value={c.liOn} onChange={v=>update(c.id,"liOn",v)}/>
            </div>
            <button onClick={()=>remove(c.id)} style={{background:T.redPale,border:`1px solid ${T.redDim}`,color:T.red,borderRadius:5,padding:"7px 10px",fontSize:12,cursor:"pointer",fontFamily:"inherit",lineHeight:1}}>✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Platform manager ───────────────────────────────────────────────────── */
function PlatformSelect({value, onChange, customPlatforms, onAddPlatform}){
  const[adding,setAdding]=useState(false);
  const[newP,setNewP]=useState("");
  const all=[...DEFAULT_PLATFORMS,...customPlatforms.filter(p=>!DEFAULT_PLATFORMS.includes(p))];
  return(
    <div>
      <SInput value={value} onChange={onChange}>
        {all.map(p=><option key={p}>{p}</option>)}
        <option value="__add__">+ Add platform…</option>
      </SInput>
      {value==="__add__"&&!adding&&(()=>{setAdding(true);return null;})()}
      {adding&&(
        <div style={{display:"flex",gap:6,marginTop:6}}>
          <TInput value={newP} onChange={setNewP} placeholder="Platform name"/>
          <Btn small onClick={()=>{if(newP.trim()){onAddPlatform(newP.trim());onChange(newP.trim());setNewP("");setAdding(false);}}} variant="primary">Add</Btn>
          <Btn small onClick={()=>{setAdding(false);onChange(DEFAULT_PLATFORMS[0]);}}>✕</Btn>
        </div>
      )}
    </div>
  );
}

/* ─── Job Modal ──────────────────────────────────────────────────────────── */
function JobModal({app, onSave, onClose, customPlatforms, onAddPlatform}){
  const[form,setForm]=useState({...app, contacts: app.contacts||[], emailsSent: app.emailsSent||[], linkedinsSent: app.linkedinsSent||[]});
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem"}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:12,padding:"1.5rem",width:"100%",maxWidth:640,maxHeight:"92vh",overflowY:"auto"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem",paddingBottom:"1rem",borderBottom:`1px solid ${T.border}`}}>
          <div>
            <h2 style={{margin:0,fontSize:16,fontWeight:700,color:T.text}}>{app.company?"Edit Application":"New Application"}</h2>
            {app.company&&<p style={{margin:"2px 0 0",fontSize:12,color:T.textDim}}>{app.company} — {app.role}</p>}
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:T.textDim,lineHeight:1}}>×</button>
        </div>

        {/* Section: Job Info */}
        <div style={{marginBottom:"1.25rem"}}>
          <div style={{fontSize:10,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:10}}>JOB DETAILS</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{gridColumn:"1/-1"}}><Label>Company Name</Label><TInput value={form.company} onChange={v=>set("company",v)} placeholder="e.g. Meesho"/></div>
            <div style={{gridColumn:"1/-1"}}><Label>Role / Position</Label><TInput value={form.role} onChange={v=>set("role",v)} placeholder="e.g. AI Content Strategist"/></div>
            <div style={{gridColumn:"1/-1"}}>
              <Label>Job URL</Label>
              <TInput value={form.jobLink} onChange={v=>set("jobLink",v)} placeholder="https://linkedin.com/jobs/..."/>
            </div>
            <div>
              <Label>Platform</Label>
              <PlatformSelect value={form.platform} onChange={v=>set("platform",v)} customPlatforms={customPlatforms} onAddPlatform={onAddPlatform}/>
            </div>
            <div>
              <Label>Priority</Label>
              <SInput value={form.priority} onChange={v=>set("priority",v)}>
                {PRIORITIES.map(p=><option key={p}>{p}</option>)}
              </SInput>
            </div>
            <div>
              <Label>Salary Range (Role offers)</Label>
              <TInput value={form.salaryRange} onChange={v=>set("salaryRange",v)} placeholder="e.g. ₹12–18 LPA"/>
            </div>
            <div>
              <Label>My Expected Salary</Label>
              <TInput value={form.expectedSalary} onChange={v=>set("expectedSalary",v)} placeholder="e.g. ₹15 LPA"/>
            </div>
          </div>
        </div>

        {/* Section: Dates & Status */}
        <div style={{marginBottom:"1.25rem",paddingTop:"1rem",borderTop:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:10}}>STATUS & DATES</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div>
              <Label>Status</Label>
              <SInput value={form.status} onChange={v=>set("status",v)}>
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </SInput>
            </div>
            <div>
              <Label>Date Saved / Found</Label>
              <TInput type="date" value={form.dateApplied} onChange={v=>set("dateApplied",v)}/>
            </div>
            <div>
              <Label>Date Emailed / Applied</Label>
              <TInput type="date" value={form.emailDate} onChange={v=>set("emailDate",v)}/>
            </div>
          </div>
          <p style={{margin:"8px 0 0",fontSize:11,color:T.textDim}}>
            ⚡ Follow-up reminders: Day 2, Day 5, Day 12 — counted from "Date Emailed"
          </p>
        </div>

        {/* Section: Contacts */}
        <div style={{marginBottom:"1.25rem",paddingTop:"1rem",borderTop:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:10}}>CONTACTS</div>
          <ContactManager contacts={form.contacts} onChange={v=>set("contacts",v)}/>
        </div>

        {/* Section: Notes */}
        <div style={{marginBottom:"1.5rem",paddingTop:"1rem",borderTop:`1px solid ${T.border}`}}>
          <div style={{fontSize:10,fontWeight:700,color:T.blue,textTransform:"uppercase",letterSpacing:"0.14em",marginBottom:10}}>NOTES / NEXT ACTION</div>
          <textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3}
            placeholder="Next step, interview prep notes, anything..."
            style={{width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",fontSize:13,padding:"9px 11px",border:`1px solid ${T.border}`,borderRadius:6,background:T.bg,color:T.text,outline:"none"}}
            onFocus={e=>e.target.style.borderColor=T.blue}
            onBlur={e=>e.target.style.borderColor=T.border}
          />
        </div>

        {/* Actions */}
        <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:"1rem",borderTop:`1px solid ${T.border}`}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn onClick={()=>{if(!form.company.trim())return;onSave(form);}} variant="primary">Save Application</Btn>
        </div>
      </div>
    </div>
  );
}

/* ─── Follow-up alert row ────────────────────────────────────────────────── */
function FollowUpAlerts({apps, onStatusChange}){
  const alerts = apps
    .map(a => ({...a, alert: getFollowUpAlert(a)}))
    .filter(a => a.alert)
    .sort((a,b)=> {
      const urgScore = x => x.alert.urgency==="hot"?0:1;
      return urgScore(a)-urgScore(b);
    });

  if(alerts.length===0) return null;
  return(
    <div style={{background:T.surface,border:`1px solid ${T.amberDim}`,borderRadius:8,padding:"12px 16px",marginBottom:"1rem"}}>
      <div style={{fontSize:10,fontWeight:700,color:T.amber,textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:10}}>⏰ Follow-up Reminders</div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {alerts.map(a=>(
          <div key={a.id} style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <span style={{width:6,height:6,borderRadius:"50%",background:a.alert.urgency==="hot"?T.red:T.amber,flexShrink:0}}/>
            <span style={{fontSize:12,color:T.text,fontWeight:600,minWidth:120}}>{a.company}</span>
            <span style={{fontSize:11,color:T.textMid,flex:1}}>{a.role}</span>
            <span style={{fontSize:11,color:a.alert.urgency==="hot"?T.red:T.amber,fontWeight:600}}>{a.alert.msg}</span>
            <button onClick={()=>onStatusChange(a.id, a.alert.next)}
              style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:4,background:T.amberPale,color:T.amber,border:`1px solid ${T.amberDim}`,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              Mark {a.alert.next} ↗
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Job Tracker ───────────────────────────────────────────────────── */
function JobTracker(){
  const[apps,setApps]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[syncStatus,setSyncStatus]=useState(isConfigured()?"idle":"unconfigured");
  const[modal,setModal]=useState(null);
  const[filterStatus,setFilterStatus]=useState("All");
  const[filterPriority,setFilterPriority]=useState("All");
  const[filterPlatform,setFilterPlatform]=useState("All");
  const[search,setSearch]=useState("");
  const[customPlatforms,setCustomPlatforms]=useState(lsGet("custom_platforms")||[]);
  const[sortBy,setSortBy]=useState("date");

  useEffect(()=>{
    setSyncStatus("syncing");
    loadData().then(rows=>{
      setApps(rows); setLoaded(true);
      setSyncStatus(isConfigured()?"idle":"unconfigured");
    });
  },[]);

  const persist=useCallback(async(next,changed,deleted)=>{
    lsSet("jt_apps",next);
    if(!isConfigured()){setSyncStatus("offline");return;}
    setSyncStatus("syncing");
    try{
      if(deleted) await syncDelete(deleted);
      else if(changed) await syncSave(changed);
      setSyncStatus("idle");
    }catch{setSyncStatus("offline");}
  },[]);

  const save=useCallback(form=>{
    setApps(prev=>{
      const idx=prev.findIndex(a=>a.id===form.id);
      const next=idx>=0?prev.map((a,i)=>i===idx?form:a):[form,...prev];
      persist(next,form,null);
      return next;
    });
    setModal(null);
  },[persist]);

  const del=id=>setApps(prev=>{const next=prev.filter(a=>a.id!==id);persist(next,null,id);return next;});

  const quickStatus=(id,status)=>setApps(prev=>{
    const next=prev.map(a=>{
      if(a.id!==id)return a;
      const u={...a,status};
      persist(prev.map(x=>x.id===id?u:x),u,null);
      return u;
    });
    return next;
  });

  const addCustomPlatform=(p)=>{
    const next=[...customPlatforms,p];
    setCustomPlatforms(next);
    lsSet("custom_platforms",next);
  };

  const allPlatforms=[...DEFAULT_PLATFORMS,...customPlatforms.filter(p=>!DEFAULT_PLATFORMS.includes(p))];

  const filtered = apps
    .filter(a=>filterStatus==="All"||a.status===filterStatus)
    .filter(a=>filterPriority==="All"||(a.priority||"Medium")===filterPriority)
    .filter(a=>filterPlatform==="All"||a.platform===filterPlatform)
    .filter(a=>{
      if(!search.trim())return true;
      const q=search.toLowerCase();
      return(a.company||"").toLowerCase().includes(q)||(a.role||"").toLowerCase().includes(q);
    })
    .sort((a,b)=>{
      if(sortBy==="priority"){const po={High:0,Medium:1,Low:2};return(po[a.priority||"Medium"])-(po[b.priority||"Medium"]);}
      if(sortBy==="status"){return STATUSES.indexOf(a.status)-STATUSES.indexOf(b.status);}
      return new Date(b.dateApplied||0)-new Date(a.dateApplied||0);
    });

  // Stats
  const byStatus = s => apps.filter(a=>a.status===s).length;
  const toApplyN = byStatus("To Apply");
  const appliedN = apps.filter(a=>["Applied","Follow-up 1","Follow-up 2","Follow-up 3"].includes(a.status)).length;
  const interviewN = byStatus("Interview");
  const offerN = byStatus("Offer");
  const alertCount = apps.filter(a=>getFollowUpAlert(a)).length;

  return(
    <div style={{fontFamily:"'Inter','DM Sans',system-ui,sans-serif",background:T.bg,minHeight:"100vh",color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;} select,input,textarea,button{font-family:'Inter',system-ui,sans-serif;}
        ::-webkit-scrollbar{width:4px;height:4px;}
        ::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px;}
        tr:hover td{background:${T.surfaceHov}!important;}
      `}</style>

      {modal&&<JobModal app={modal} onSave={save} onClose={()=>setModal(null)} customPlatforms={customPlatforms} onAddPlatform={addCustomPlatform}/>}

      {/* ── Top bar ── */}
      <div style={{background:T.surface,borderBottom:`1px solid ${T.border}`,padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52,position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:13,fontWeight:700,color:T.text,letterSpacing:"-0.02em"}}>Job Applications</span>
          <span style={{fontSize:11,color:T.textDim,background:T.surfaceUp,padding:"2px 8px",borderRadius:4,fontWeight:600}}>{apps.length} total</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <SyncBadge status={syncStatus}/>
          {apps.length>0&&<Btn onClick={()=>exportCSV(apps)} small>⬇ CSV</Btn>}
          <Btn onClick={()=>setModal(emptyApp())} variant="primary" small>+ New Application</Btn>
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:1400,margin:"0 auto"}}>

        {/* ── Stats ── */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
          <StatCard label="To Apply" value={toApplyN} accent={toApplyN>0?T.textMid:T.textDim} sub="in pipeline" onClick={()=>setFilterStatus("To Apply")}/>
          <StatCard label="Applied / FU" value={appliedN} accent={T.blue} sub="active outreach" onClick={()=>setFilterStatus("Applied")}/>
          <StatCard label="Follow-ups Due" value={alertCount} accent={alertCount>0?T.amber:T.textDim} sub={alertCount>0?"action needed":"all clear ✓"}/>
          <StatCard label="Interviews" value={interviewN} accent={T.violet} sub="in progress" onClick={()=>setFilterStatus("Interview")}/>
          <StatCard label="Offers" value={offerN} accent={T.green} sub={offerN>0?"🎉 congrats!":"keep going"}/>
        </div>

        {/* ── Follow-up alerts ── */}
        <FollowUpAlerts apps={apps} onStatusChange={quickStatus}/>

        {/* ── Filters bar ── */}
        <div style={{background:T.surface,border:`1px solid ${T.border}`,borderRadius:8,padding:"10px 14px",marginBottom:12,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{position:"relative",flex:"1 1 200px",minWidth:140}}>
            <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:13,color:T.textDim,pointerEvents:"none"}}>⌕</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or role..."
              style={{width:"100%",boxSizing:"border-box",padding:"7px 10px 7px 28px",fontSize:13,border:`1px solid ${T.border}`,borderRadius:6,background:T.bg,color:T.text,fontFamily:"inherit",outline:"none"}}
              onFocus={e=>e.target.style.borderColor=T.blue}
              onBlur={e=>e.target.style.borderColor=T.border}
            />
          </div>
          <SInput value={filterStatus} onChange={setFilterStatus} full={false}>
            <option value="All">All statuses</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </SInput>
          <SInput value={filterPriority} onChange={setFilterPriority} full={false}>
            <option value="All">All priorities</option>
            {PRIORITIES.map(p=><option key={p}>{p}</option>)}
          </SInput>
          <SInput value={filterPlatform} onChange={setFilterPlatform} full={false}>
            <option value="All">All platforms</option>
            {allPlatforms.map(p=><option key={p}>{p}</option>)}
          </SInput>
          <SInput value={sortBy} onChange={setSortBy} full={false}>
            <option value="date">Sort: Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="status">Sort: Status</option>
          </SInput>
          {(filterStatus!=="All"||filterPriority!=="All"||filterPlatform!=="All"||search)&&(
            <Btn small onClick={()=>{setFilterStatus("All");setFilterPriority("All");setFilterPlatform("All");setSearch("");}}>Clear filters</Btn>
          )}
          <span style={{fontSize:11,color:T.textDim,marginLeft:"auto"}}>{filtered.length} shown</span>
        </div>

        {/* ── Table ── */}
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"5rem 2rem",color:T.textDim,background:T.surface,border:`1px solid ${T.border}`,borderRadius:8}}>
            <div style={{fontSize:32,marginBottom:12}}>📋</div>
            <div style={{fontSize:15,fontWeight:600,color:T.textMid,marginBottom:4}}>
              {apps.length===0?"No applications yet. Add your first one →":"No results — try clearing filters"}
            </div>
          </div>
        ):(
          <div style={{border:`1px solid ${T.border}`,borderRadius:8,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead>
                <tr style={{background:T.surfaceUp,borderBottom:`1px solid ${T.border}`}}>
                  {[["","28px"],["Company","160px"],["Role","160px"],["Status","140px"],["Platform","110px"],["Email Date","100px"],["Follow-up","130px"],["Salary","130px"],["Contacts","150px"],["Notes","180px"],["Actions","90px"]].map(([h,w])=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:600,color:T.textDim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",width:w,whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((app,i)=>{
                  const pri = PRIORITY_META[app.priority||"Medium"];
                  const alert = getFollowUpAlert(app);
                  const emailDate = app.emailDate || app.dateApplied;
                  const daysE = daysSince(emailDate);
                  const contacts = app.contacts||[];

                  return(
                    <tr key={app.id} style={{borderBottom:`1px solid ${T.border}`,background:T.surface}}>

                      {/* Priority dot */}
                      <td style={{padding:"10px 8px 10px 14px"}}>
                        <span title={app.priority||"Medium"} style={{display:"block",width:7,height:7,borderRadius:"50%",background:pri.dot}}/>
                      </td>

                      {/* Company */}
                      <td style={{padding:"10px 12px",maxWidth:160}}>
                        <div style={{display:"flex",alignItems:"center",gap:5}}>
                          <span style={{fontWeight:600,color:T.text,lineHeight:1.3}}>{app.company||"—"}</span>
                          {app.jobLink&&(
                            <a href={app.jobLink} target="_blank" rel="noopener noreferrer"
                              style={{fontSize:10,color:T.blue,textDecoration:"none",flexShrink:0}} title="View job posting">↗</a>
                          )}
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{padding:"10px 12px",maxWidth:160}}>
                        <div style={{color:T.textMid,fontSize:12,lineHeight:1.4}}>{app.role||"—"}</div>
                      </td>

                      {/* Status — inline dropdown */}
                      <td style={{padding:"10px 12px"}}>
                        <select value={app.status} onChange={e=>quickStatus(app.id,e.target.value)}
                          style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:4,
                            background:STATUS_META[app.status]?.bg||T.slatePale,
                            color:STATUS_META[app.status]?.text||T.textMid,
                            border:`1px solid ${STATUS_META[app.status]?.border||T.border}`,
                            cursor:"pointer",fontFamily:"inherit",letterSpacing:"0.04em",appearance:"none",paddingRight:16}}>
                          {STATUSES.map(s=><option key={s}>{s}</option>)}
                        </select>
                      </td>

                      {/* Platform */}
                      <td style={{padding:"10px 12px"}}>
                        <span style={{fontSize:11,fontWeight:600,color:PLATFORM_COLORS[app.platform]||T.textMid}}>{app.platform||"—"}</span>
                      </td>

                      {/* Email date */}
                      <td style={{padding:"10px 12px",whiteSpace:"nowrap"}}>
                        {emailDate?(
                          <>
                            <div style={{fontSize:11,color:T.textMid}}>{new Date(emailDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                            <div style={{fontSize:10,color:T.textDim,marginTop:1}}>{daysE}d ago</div>
                          </>
                        ):<span style={{color:T.textDim}}>—</span>}
                      </td>

                      {/* Follow-up status */}
                      <td style={{padding:"10px 12px"}}>
                        {alert?(
                          <div style={{display:"flex",flexDirection:"column",gap:3}}>
                            <span style={{fontSize:10,fontWeight:700,color:alert.urgency==="hot"?T.red:T.amber}}>{alert.msg}</span>
                            <button onClick={()=>quickStatus(app.id,alert.next)}
                              style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:3,background:T.amberPale,color:T.amber,border:`1px solid ${T.amberDim}`,cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"fit-content"}}>
                              Mark {alert.next}
                            </button>
                          </div>
                        ):(
                          <span style={{fontSize:10,color:T.textDim}}>
                            {["Applied","Follow-up 1","Follow-up 2"].includes(app.status)?"On track ✓":"—"}
                          </span>
                        )}
                      </td>

                      {/* Salary */}
                      <td style={{padding:"10px 12px"}}>
                        {app.salaryRange&&<div style={{fontSize:11,color:T.textMid}}>{app.salaryRange}</div>}
                        {app.expectedSalary&&<div style={{fontSize:11,color:T.green,marginTop:2,fontWeight:600}}>Ask: {app.expectedSalary}</div>}
                        {!app.salaryRange&&!app.expectedSalary&&<span style={{color:T.textDim}}>—</span>}
                      </td>

                      {/* Contacts */}
                      <td style={{padding:"10px 12px",maxWidth:160}}>
                        {contacts.length===0?<span style={{color:T.textDim,fontSize:11}}>—</span>:(
                          <div style={{display:"flex",flexDirection:"column",gap:3}}>
                            {contacts.map((c,ci)=>(
                              <div key={ci} style={{display:"flex",alignItems:"center",gap:4}}>
                                {c.url?(
                                  <a href={c.url.startsWith("http")?c.url:`https://${c.url}`} target="_blank" rel="noopener noreferrer"
                                    style={{fontSize:11,color:T.blue,textDecoration:"none",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>
                                    {c.name||"Contact"}
                                  </a>
                                ):<span style={{fontSize:11,color:T.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{c.name||"—"}</span>}
                                {c.emailedOn&&<span style={{fontSize:9,color:T.textDim}} title={`Emailed: ${c.emailedOn}`}>✉</span>}
                                {c.liOn&&<span style={{fontSize:9,color:"#0A66C2"}} title={`LI msg: ${c.liOn}`}>in</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Notes */}
                      <td style={{padding:"10px 12px",maxWidth:180}}>
                        {app.notes
                          ?<span style={{fontSize:11,color:T.textDim,display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={app.notes}>{app.notes}</span>
                          :<span style={{color:T.textDim,fontSize:11}}>—</span>
                        }
                      </td>

                      {/* Actions */}
                      <td style={{padding:"10px 12px"}}>
                        <div style={{display:"flex",gap:5}}>
                          <Btn onClick={()=>setModal({...app,contacts:app.contacts||[]})} variant="ghost" small>Edit</Btn>
                          <Btn onClick={()=>del(app.id)} variant="danger" small>✕</Btn>
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
    </div>
  );
}

export default JobTracker;
