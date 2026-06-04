import { useState, useEffect, useCallback, useRef } from "react";

/* ─── CONFIGURATION — paste your Apps Script URL here after deploying ────── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx5qUYNykaYb9o5Hrg2TSYMeDnljAxh3TydomgNUiC5aS4p2PwpJuBIIihJ1Yn4ODjk/exec";
/* ────────────────────────────────────────────────────────────────────────── */

const T = {
  cream:"#FBF8F3",parchment:"#F5F0E8",cardBg:"#FFFDF9",
  border:"#EAE4D9",borderMid:"#D9D0C0",
  ink:"#2D2420",inkMid:"#6B5E57",inkLight:"#9E9189",
  rose:"#E8A0A8",roseDark:"#C4606E",rosePale:"#FDF0F1",roseBg:"#FAE6E8",
  peach:"#F2C4A0",peachDark:"#C47840",peachPale:"#FEF4EC",
  sage:"#A8C4A8",sageDark:"#4A8050",sagePale:"#EEF6EE",
  periwinkle:"#A8B4E8",periwinkleDark:"#3C4FAA",periwinklePale:"#EEF0FB",
  lavender:"#C8A8E8",lavDark:"#6A3AAA",lavPale:"#F5EEFB",
  mustard:"#E8D0A0",mustardDark:"#A07830",mustardPale:"#FBF5E6",
};

const PLATFORMS      = ["LinkedIn","Naukri","Wellfound","Company Website","Referral","Other"];
const STATUSES       = ["Applied","Followed Up","Interview","Offer","Rejected"];
const PRIORITIES     = ["High","Medium","Low"];
const CONTENT_TYPES  = ["LinkedIn Post","Blog Post","Twitter/X Thread","YouTube Video","Newsletter","Instagram","Podcast","Other"];
const CONTENT_STATUSES = ["Idea","Drafting","Review","Scheduled","Published"];

const STATUS_META = {
  "Applied":     {bg:T.periwinklePale,text:T.periwinkleDark,dot:T.periwinkle},
  "Followed Up": {bg:T.mustardPale,   text:T.mustardDark,   dot:T.mustard},
  "Interview":   {bg:T.lavPale,       text:T.lavDark,       dot:T.lavender},
  "Offer":       {bg:T.sagePale,      text:T.sageDark,      dot:T.sage},
  "Rejected":    {bg:T.roseBg,        text:T.roseDark,      dot:T.rose},
};
const PRIORITY_META = {
  "High":  {bg:T.roseBg,   text:T.roseDark,  dot:"#E8A0A8"},
  "Medium":{bg:T.peachPale,text:T.peachDark, dot:"#F2C4A0"},
  "Low":   {bg:T.parchment,text:T.inkMid,    dot:"#D9D0C0"},
};
const PLATFORM_COLORS = {
  "LinkedIn":"#5A8FD4","Naukri":"#D46060","Wellfound":"#D47060",
  "Company Website":"#7A70C4","Referral":"#60A880","Other":"#9E9189",
};
const CONTENT_STATUS_META = {
  "Idea":     {bg:T.parchment,      text:T.inkMid,         dot:T.borderMid},
  "Drafting": {bg:T.periwinklePale, text:T.periwinkleDark, dot:T.periwinkle},
  "Review":   {bg:T.mustardPale,    text:T.mustardDark,    dot:T.mustard},
  "Scheduled":{bg:T.lavPale,        text:T.lavDark,        dot:T.lavender},
  "Published":{bg:T.sagePale,       text:T.sageDark,       dot:T.sage},
};
const TYPE_ICONS = {
  "LinkedIn Post":"💼","Blog Post":"📝","Twitter/X Thread":"🐦","YouTube Video":"🎬",
  "Newsletter":"📨","Instagram":"📸","Podcast":"🎙️","Other":"✏️",
};

function daysSince(d){if(!d)return 0;return Math.floor((Date.now()-new Date(d).getTime())/86400000);}
function urgencyColor(days){
  if(days>=14)return{color:T.roseDark,  bg:T.roseBg};
  if(days>=10)return{color:T.peachDark, bg:T.peachPale};
  if(days>=5) return{color:T.mustardDark,bg:T.mustardPale};
  return null;
}

/* ─── Storage layer: Sheet primary, localStorage fallback ─────────────────── */
const isConfigured = () => APPS_SCRIPT_URL && APPS_SCRIPT_URL !== "YOUR_APPS_SCRIPT_URL_HERE";

async function sheetRequest(params) {
  if (!isConfigured()) return null;
  try {
    const url = `${APPS_SCRIPT_URL}?${new URLSearchParams(params)}`;
    const res = await fetch(url, { redirect: "follow" });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } catch (e) {
    console.warn("Sheet request failed:", e.message);
    return null;
  }
}

async function sheetPost(body) {
  if (!isConfigured()) return null;
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST", redirect: "follow",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json;
  } catch (e) {
    console.warn("Sheet post failed:", e.message);
    return null;
  }
}

function lsGet(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function lsSet(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

async function loadData(type) {
  const lsKey = type === "jobs" ? "jt_apps" : "cp_items";
  if (isConfigured()) {
    const result = await sheetRequest({ action: "getAll", type });
    if (result && result.rows) {
      lsSet(lsKey, result.rows); // update local cache
      return result.rows;
    }
  }
  return lsGet(lsKey) || [];
}

async function syncSave(type, data) {
  await sheetPost({ action: "save", type, data });
}

async function syncDelete(type, id) {
  await sheetPost({ action: "delete", type, id: String(id) });
}

function exportCSV(apps) {
  const headers = ["Company","Role","Date Applied","Platform","Status","Priority","Salary Range","Expected Salary","Contact","Notes"];
  const rows = apps.map(a=>[a.company,a.role,a.dateApplied,a.platform,a.status,a.priority||"Medium",a.salaryRange,a.expectedSalary,a.contactName,a.notes].map(v=>`"${(v||"").replace(/"/g,'""')}"`));
  const csv = [headers.join(","),...rows.map(r=>r.join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
  const a=document.createElement("a");a.href=url;a.download="job_applications.csv";a.click();
  URL.revokeObjectURL(url);
}

/* ─── Sync status indicator ──────────────────────────────────────────────── */
function SyncBadge({ status }) {
  const map = {
    idle:    { label:"Saved to Sheet ✓",  color:T.sageDark,   bg:T.sagePale   },
    syncing: { label:"Syncing…",           color:T.mustardDark,bg:T.mustardPale},
    offline: { label:"Offline — saved locally", color:T.peachDark, bg:T.peachPale },
    unconfigured: { label:"⚠ Connect Google Sheet", color:T.roseDark, bg:T.roseBg },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{
      fontSize:11, fontWeight:600, padding:"3px 10px", borderRadius:20,
      background:s.bg, color:s.color, whiteSpace:"nowrap",
    }}>{s.label}</span>
  );
}

/* ─── Setup banner (shown when URL not configured) ───────────────────────── */
function SetupBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div style={{
      background:"#FFFBF0", border:`1px solid ${T.mustard}`,
      borderRadius:12, padding:"1rem 1.25rem", marginBottom:"1.5rem",
      fontSize:13, color:T.ink, lineHeight:1.7,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <strong style={{ fontSize:14 }}>📋 Connect Google Sheets in 5 minutes</strong>
        <button onClick={()=>setOpen(false)} style={{ background:"none",border:"none",cursor:"pointer",fontSize:18,color:T.inkLight,lineHeight:1 }}>×</button>
      </div>
      <ol style={{ margin:"0.75rem 0 0 1.2rem", padding:0, display:"flex", flexDirection:"column", gap:4 }}>
        <li>Open <strong>script.google.com</strong> → New project → paste the <code>apps_script.js</code> file I gave you</li>
        <li>Click <strong>Deploy → New deployment → Web app</strong></li>
        <li>Set "Execute as" → <strong>Me</strong> · "Who has access" → <strong>Anyone</strong></li>
        <li>Copy the <strong>Web app URL</strong></li>
        <li>In <code>productivity_dashboard.jsx</code>, replace <code>YOUR_APPS_SCRIPT_URL_HERE</code> with that URL</li>
      </ol>
      <p style={{ margin:"0.75rem 0 0", color:T.inkMid, fontSize:12 }}>
        Until then, data saves to your browser's local storage. Nothing is lost.
      </p>
    </div>
  );
}

/* ─── Shared UI primitives ───────────────────────────────────────────────── */
function FieldLabel({children}){return <p style={{margin:"0 0 5px",fontSize:11,fontWeight:600,color:T.inkLight,textTransform:"uppercase",letterSpacing:"0.07em"}}>{children}</p>;}

function Pill({children,bg,color,dot}){return(<span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:bg,color,whiteSpace:"nowrap"}}>{dot&&<span style={{width:6,height:6,borderRadius:"50%",background:dot,flexShrink:0}}/>}{children}</span>);}

function Toggle({label,value,onChange}){return(<label style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5,cursor:"pointer"}}><span style={{fontSize:11,color:T.inkLight,fontWeight:500}}>{label}</span><div onClick={()=>onChange(!value)} style={{width:40,height:22,borderRadius:11,cursor:"pointer",background:value?T.sage:T.borderMid,position:"relative",transition:"background .2s",flexShrink:0,border:`1.5px solid ${value?T.sageDark+"44":T.borderMid}`}}><span style={{position:"absolute",top:2,left:value?18:2,width:14,height:14,borderRadius:"50%",background:"#fff",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.15)"}}/></div></label>);}

function StatCard({label,value,accent,sub}){return(<div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:14,padding:"1rem 1.1rem",display:"flex",flexDirection:"column",gap:4,boxShadow:"0 1px 4px rgba(45,36,32,.04)"}}><span style={{fontSize:11,color:T.inkLight,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</span><span style={{fontSize:30,fontWeight:700,color:accent||T.ink,lineHeight:1,fontFamily:"'DM Serif Display',Georgia,serif"}}>{value}</span>{sub&&<span style={{fontSize:11,color:T.inkLight}}>{sub}</span>}</div>);}

function Btn({children,onClick,variant="ghost",small=false}){
  const base={border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:small?12:13,display:"inline-flex",alignItems:"center",gap:5,padding:small?"5px 12px":"8px 16px",transition:"all .15s",fontFamily:"inherit"};
  const styles={
    primary:{...base,background:T.rose,color:"#fff",boxShadow:`0 2px 8px ${T.rose}55`},
    sage:   {...base,background:T.sage,color:"#fff",boxShadow:`0 2px 8px ${T.sage}55`},
    ghost:  {...base,background:T.cardBg,color:T.ink,border:`1px solid ${T.border}`},
    danger: {...base,background:T.roseBg,color:T.roseDark,border:`1px solid ${T.rose}55`},
  };
  return <button onClick={onClick} style={styles[variant]||styles.ghost}>{children}</button>;
}

function TextInput({value,onChange,placeholder,full=true,type="text"}){return(<input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:full?"100%":undefined,boxSizing:"border-box",padding:"9px 12px",fontSize:13,border:`1.5px solid ${T.border}`,borderRadius:9,background:T.cardBg,color:T.ink,fontFamily:"inherit",outline:"none",transition:"border .15s"}} onFocus={e=>e.target.style.borderColor=T.rose} onBlur={e=>e.target.style.borderColor=T.border}/>);}

function SelectInput({value,onChange,children,full=true}){return(<select value={value} onChange={e=>onChange(e.target.value)} style={{width:full?"100%":undefined,boxSizing:"border-box",padding:"9px 12px",fontSize:13,border:`1.5px solid ${T.border}`,borderRadius:9,background:T.cardBg,color:T.ink,fontFamily:"inherit",outline:"none",cursor:"pointer"}}>{children}</select>);}

/* ─── Modal shell ────────────────────────────────────────────────────────── */
function ModalShell({title,onClose,onSave,saveLabel="Save",saveVariant="primary",children}){return(<div style={{position:"fixed",inset:0,background:"rgba(45,36,32,.35)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"1rem"}} onClick={e=>e.target===e.currentTarget&&onClose()}><div style={{background:T.cream,border:`1px solid ${T.border}`,borderRadius:18,padding:"1.5rem",width:"100%",maxWidth:580,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 60px rgba(45,36,32,.18)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}><h2 style={{margin:0,fontSize:17,fontWeight:700,color:T.ink,fontFamily:"'DM Serif Display',Georgia,serif"}}>{title}</h2><button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:22,color:T.inkLight,lineHeight:1,padding:"2px 6px"}}>×</button></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"14px"}}>{children}</div><div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:"1.5rem"}}><Btn onClick={onClose}>Cancel</Btn><Btn onClick={onSave} variant={saveVariant}>{saveLabel}</Btn></div></div></div>);}

/* ─── Job Modal ──────────────────────────────────────────────────────────── */
const emptyApp=()=>({id:Date.now()+Math.random(),company:"",role:"",dateApplied:new Date().toISOString().slice(0,10),platform:"LinkedIn",contactName:"",contactLink:"",status:"Applied",priority:"Medium",emailSent:false,linkedinSent:false,salaryRange:"",expectedSalary:"",notes:""});

function JobModal({app,onSave,onClose}){
  const[form,setForm]=useState(app);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <ModalShell title={app.company?"Edit Application":"✨ New Application"} onClose={onClose} onSave={()=>{if(!form.company.trim())return;onSave(form);}} saveLabel="Save Application">
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Company Name</FieldLabel><TextInput value={form.company} onChange={v=>set("company",v)} placeholder="e.g. Nykaa"/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Role / Position</FieldLabel><TextInput value={form.role} onChange={v=>set("role",v)} placeholder="e.g. Product Marketing Manager"/></div>
      <div><FieldLabel>Date Applied</FieldLabel><TextInput type="date" value={form.dateApplied} onChange={v=>set("dateApplied",v)}/></div>
      <div><FieldLabel>Platform</FieldLabel><SelectInput value={form.platform} onChange={v=>set("platform",v)}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</SelectInput></div>
      <div><FieldLabel>Priority</FieldLabel><SelectInput value={form.priority||"Medium"} onChange={v=>set("priority",v)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</SelectInput></div>
      <div><FieldLabel>Status</FieldLabel><SelectInput value={form.status} onChange={v=>set("status",v)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</SelectInput></div>
      <div><FieldLabel>Contact Person</FieldLabel><TextInput value={form.contactName} onChange={v=>set("contactName",v)} placeholder="Name"/></div>
      <div><FieldLabel>Contact Email / LinkedIn</FieldLabel><TextInput value={form.contactLink} onChange={v=>set("contactLink",v)} placeholder="email or profile URL"/></div>
      <div><FieldLabel>Salary Range (Role)</FieldLabel><TextInput value={form.salaryRange} onChange={v=>set("salaryRange",v)} placeholder="e.g. ₹10–15 LPA"/></div>
      <div><FieldLabel>My Expected Salary</FieldLabel><TextInput value={form.expectedSalary} onChange={v=>set("expectedSalary",v)} placeholder="e.g. ₹12 LPA"/></div>
      <div style={{display:"flex",gap:28,alignItems:"center",paddingTop:4}}><Toggle label="Email sent?" value={form.emailSent} onChange={v=>set("emailSent",v)}/><Toggle label="LinkedIn sent?" value={form.linkedinSent} onChange={v=>set("linkedinSent",v)}/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Notes / Next Action</FieldLabel><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={3} placeholder="e.g. Follow up Friday, ask about team size..." style={{width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",fontSize:13,padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,background:T.cardBg,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.rose} onBlur={e=>e.target.style.borderColor=T.border}/></div>
    </ModalShell>
  );
}

/* ─── Job Tracker ────────────────────────────────────────────────────────── */
function JobTracker({syncStatus,setSyncStatus}){
  const[apps,setApps]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[modal,setModal]=useState(null);
  const[filterStatus,setFilterStatus]=useState("All");
  const[filterPlatform,setFilterPlatform]=useState("All");
  const[filterPriority,setFilterPriority]=useState("All");
  const[search,setSearch]=useState("");

  useEffect(()=>{
    setSyncStatus("syncing");
    loadData("jobs").then(rows=>{
      setApps(rows);
      setLoaded(true);
      setSyncStatus(isConfigured()?"idle":"unconfigured");
    });
  },[]);

  const persist = useCallback(async(newApps,changedItem,deleted)=>{
    lsSet("jt_apps",newApps);
    if(!isConfigured()){setSyncStatus("offline");return;}
    setSyncStatus("syncing");
    try{
      if(deleted) await syncDelete("jobs",deleted);
      else if(changedItem) await syncSave("jobs",changedItem);
      setSyncStatus("idle");
    }catch{setSyncStatus("offline");}
  },[setSyncStatus]);

  const save=useCallback(form=>{
    setApps(prev=>{
      const idx=prev.findIndex(a=>a.id===form.id);
      const next=idx>=0?prev.map((a,i)=>i===idx?form:a):[form,...prev];
      persist(next,form,null);
      return next;
    });
    setModal(null);
  },[persist]);

  const del=id=>{
    setApps(prev=>{
      const next=prev.filter(a=>a.id!==id);
      persist(next,null,id);
      return next;
    });
  };

  const quickStatus=(id,status)=>{
    setApps(prev=>{
      const next=prev.map(a=>{
        if(a.id!==id)return a;
        const updated={...a,status};
        persist(prev.map(x=>x.id===id?updated:x),updated,null);
        return updated;
      });
      return next;
    });
  };

  const filtered=apps
    .filter(a=>filterStatus==="All"||a.status===filterStatus)
    .filter(a=>filterPlatform==="All"||a.platform===filterPlatform)
    .filter(a=>filterPriority==="All"||(a.priority||"Medium")===filterPriority)
    .filter(a=>{if(!search.trim())return true;const q=search.toLowerCase();return(a.company||"").toLowerCase().includes(q)||(a.role||"").toLowerCase().includes(q);})
    .sort((a,b)=>{const po={High:0,Medium:1,Low:2};const pd=(po[a.priority||"Medium"]||1)-(po[b.priority||"Medium"]||1);return pd!==0?pd:new Date(b.dateApplied)-new Date(a.dateApplied);});

  const needFollowUp=apps.filter(a=>a.status==="Applied"&&daysSince(a.dateApplied)>=5).length;
  const interviews=apps.filter(a=>a.status==="Interview").length;
  const offers=apps.filter(a=>a.status==="Offer").length;
  const highPri=apps.filter(a=>(a.priority||"Medium")==="High").length;

  return(
    <div>
      {modal&&<JobModal app={modal} onSave={save} onClose={()=>setModal(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:"1.5rem"}}>
        <StatCard label="Total Applied" value={apps.length}/>
        <StatCard label="Need Follow-up" value={needFollowUp} accent={needFollowUp>0?T.mustardDark:undefined} sub={needFollowUp>0?"5+ days, no update":"All good ✓"}/>
        <StatCard label="Interviews" value={interviews} accent={T.lavDark}/>
        <StatCard label="Offers" value={offers} accent={T.sageDark} sub={offers>0?"🎉 Congrats!":undefined}/>
      </div>

      <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:14,padding:"12px 14px",marginBottom:"1.25rem",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",boxShadow:"0 1px 4px rgba(45,36,32,.04)"}}>
        <div style={{position:"relative",flex:"1 1 180px",minWidth:140}}>
          <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,pointerEvents:"none"}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search company or role..." style={{width:"100%",boxSizing:"border-box",padding:"7px 10px 7px 32px",fontSize:13,border:`1.5px solid ${T.border}`,borderRadius:9,background:T.cream,color:T.ink,fontFamily:"inherit",outline:"none"}} onFocus={e=>e.target.style.borderColor=T.rose} onBlur={e=>e.target.style.borderColor=T.border}/>
        </div>
        <SelectInput value={filterStatus} onChange={setFilterStatus} full={false}><option value="All">All statuses</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</SelectInput>
        <SelectInput value={filterPlatform} onChange={setFilterPlatform} full={false}><option value="All">All platforms</option>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</SelectInput>
        <SelectInput value={filterPriority} onChange={setFilterPriority} full={false}><option value="All">All priorities</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</SelectInput>
        <div style={{flex:1}}/>
        {apps.length>0&&<Btn onClick={()=>exportCSV(apps)} variant="ghost" small>⬇ CSV</Btn>}
        <Btn onClick={()=>setModal(emptyApp())} variant="primary">+ Add</Btn>
      </div>

      {highPri>0&&(<div style={{background:T.roseBg,border:`1px solid ${T.rose}88`,borderRadius:10,padding:"9px 14px",marginBottom:"1rem",fontSize:13,color:T.roseDark,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:16}}>🔥</span><strong>{highPri} high-priority</strong> application{highPri>1?"s":""} need your attention</div>)}

      {filtered.length===0?(
        <div style={{textAlign:"center",padding:"4rem 2rem",color:T.inkLight,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:14}}>
          <div style={{fontSize:36,marginBottom:"0.75rem"}}>📋</div>
          <div style={{fontSize:15,fontWeight:600,color:T.inkMid,marginBottom:4}}>{apps.length===0?"No applications yet":"No results match your filters"}</div>
          <div style={{fontSize:13}}>{apps.length===0?"Start tracking your job hunt — add your first application!":"Try adjusting your search or filters"}</div>
        </div>
      ):(
        <div style={{border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(45,36,32,.04)"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead>
              <tr style={{background:T.parchment}}>
                {["","Company / Role","Applied","Platform","Status","Salary","Outreach","Actions"].map(h=>(
                  <th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:T.inkLight,fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}`}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((app,i)=>{
                const days=daysSince(app.dateApplied);
                const stale=app.status==="Applied"&&days>=5;
                const urg=stale?urgencyColor(days):null;
                const pri=PRIORITY_META[app.priority||"Medium"];
                const sm=STATUS_META[app.status]||STATUS_META["Applied"];
                return(
                  <tr key={app.id} style={{background:stale?T.mustardPale+"88":i%2===0?T.cardBg:T.cream,borderLeft:stale?`3px solid ${T.mustard}`:"3px solid transparent",transition:"background .15s"}}>
                    <td style={{padding:"10px 8px 10px 12px",borderBottom:`1px solid ${T.border}`}}><span title={app.priority||"Medium"} style={{display:"block",width:8,height:8,borderRadius:"50%",background:pri.dot}}/></td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,maxWidth:220}}>
                      <div style={{fontWeight:600,color:T.ink,lineHeight:1.3}}>{app.company||"—"}</div>
                      <div style={{color:T.inkMid,fontSize:12,marginTop:2}}>{app.role||"—"}</div>
                      {stale&&urg&&<div style={{fontSize:10.5,color:urg.color,marginTop:3,fontWeight:600}}>⏰ {days}d — follow up!</div>}
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>
                      <div style={{color:T.inkMid}}>{app.dateApplied?new Date(app.dateApplied).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}</div>
                      <div style={{fontSize:11,color:T.inkLight,marginTop:1}}>{days}d ago</div>
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
                      <span style={{fontSize:11,fontWeight:600,padding:"3px 9px",borderRadius:20,background:PLATFORM_COLORS[app.platform]+"18",color:PLATFORM_COLORS[app.platform],border:`0.5px solid ${PLATFORM_COLORS[app.platform]}44`,whiteSpace:"nowrap"}}>{app.platform}</span>
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
                      <select value={app.status} onChange={e=>quickStatus(app.id,e.target.value)} style={{fontSize:11,fontWeight:600,padding:"3px 8px",borderRadius:20,background:sm.bg,color:sm.text,border:`0.5px solid ${sm.dot}55`,cursor:"pointer",fontFamily:"inherit",appearance:"none"}}>
                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>
                      {app.salaryRange&&<div style={{color:T.ink,fontSize:12}}>{app.salaryRange}</div>}
                      {app.expectedSalary&&<div style={{fontSize:11,color:T.sageDark,marginTop:1}}>My ask: {app.expectedSalary}</div>}
                      {!app.salaryRange&&!app.expectedSalary&&<span style={{color:T.inkLight}}>—</span>}
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap"}}>
                      <div style={{display:"flex",gap:5}}>
                        <span style={{fontSize:11,color:app.emailSent?T.sageDark:T.inkLight,fontWeight:app.emailSent?600:400}}>{app.emailSent?"✓ Email":"○ Email"}</span>
                        <span style={{color:T.border}}>·</span>
                        <span style={{fontSize:11,color:app.linkedinSent?"#5A8FD4":T.inkLight,fontWeight:app.linkedinSent?600:400}}>{app.linkedinSent?"✓ LI":"○ LI"}</span>
                      </div>
                      {app.contactName&&<div style={{fontSize:11,color:T.inkLight,marginTop:2}}>{app.contactName}</div>}
                    </td>
                    <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:"flex",gap:5}}>
                        <Btn onClick={()=>setModal({...app})} variant="ghost" small>Edit</Btn>
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
  );
}

/* ─── Content Modal ──────────────────────────────────────────────────────── */
const emptyContent=()=>({id:Date.now()+Math.random(),title:"",type:"LinkedIn Post",status:"Idea",platform:"",dueDate:"",keywords:"",hook:"",cta:"",notes:"",createdAt:new Date().toISOString().slice(0,10)});

function ContentModal({item,onSave,onClose}){
  const[form,setForm]=useState(item);
  const set=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <ModalShell title={item.title?"Edit Content":"✨ New Content Piece"} onClose={onClose} onSave={()=>{if(!form.title.trim())return;onSave(form);}} saveLabel="Save Piece" saveVariant="sage">
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Title / Topic</FieldLabel><TextInput value={form.title} onChange={v=>set("title",v)} placeholder="e.g. How I managed 550+ brands with AI"/></div>
      <div><FieldLabel>Content Type</FieldLabel><SelectInput value={form.type} onChange={v=>set("type",v)}>{CONTENT_TYPES.map(t=><option key={t}>{t}</option>)}</SelectInput></div>
      <div><FieldLabel>Status</FieldLabel><SelectInput value={form.status} onChange={v=>set("status",v)}>{CONTENT_STATUSES.map(s=><option key={s}>{s}</option>)}</SelectInput></div>
      <div><FieldLabel>Target Platform</FieldLabel><TextInput value={form.platform} onChange={v=>set("platform",v)} placeholder="e.g. LinkedIn, Blog..."/></div>
      <div><FieldLabel>Due Date</FieldLabel><TextInput type="date" value={form.dueDate} onChange={v=>set("dueDate",v)}/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Keywords / Tags</FieldLabel><TextInput value={form.keywords} onChange={v=>set("keywords",v)} placeholder="e.g. career, AI, ecommerce"/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Hook / Opening Line</FieldLabel><TextInput value={form.hook} onChange={v=>set("hook",v)} placeholder="What's the scroll-stopping first line?"/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>CTA / Goal</FieldLabel><TextInput value={form.cta} onChange={v=>set("cta",v)} placeholder="e.g. Book a call, Subscribe, Share"/></div>
      <div style={{gridColumn:"1/-1"}}><FieldLabel>Notes / Outline</FieldLabel><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={4} placeholder="Rough outline, references, inspiration..." style={{width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:"inherit",fontSize:13,padding:"9px 12px",border:`1.5px solid ${T.border}`,borderRadius:9,background:T.cardBg,color:T.ink,outline:"none"}} onFocus={e=>e.target.style.borderColor=T.sage} onBlur={e=>e.target.style.borderColor=T.border}/></div>
    </ModalShell>
  );
}

/* ─── Content Planner ────────────────────────────────────────────────────── */
function ContentPlanner({syncStatus,setSyncStatus}){
  const[items,setItems]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[modal,setModal]=useState(null);
  const[filterStatus,setFilterStatus]=useState("All");
  const[filterType,setFilterType]=useState("All");
  const[view,setView]=useState("board");

  useEffect(()=>{
    loadData("content").then(rows=>{setItems(rows);setLoaded(true);});
  },[]);

  const persist=useCallback(async(newItems,changedItem,deleted)=>{
    lsSet("cp_items",newItems);
    if(!isConfigured())return;
    setSyncStatus("syncing");
    try{
      if(deleted)await syncDelete("content",deleted);
      else if(changedItem)await syncSave("content",changedItem);
      setSyncStatus("idle");
    }catch{setSyncStatus("offline");}
  },[setSyncStatus]);

  const save=useCallback(form=>{
    setItems(prev=>{
      const idx=prev.findIndex(i=>i.id===form.id);
      const next=idx>=0?prev.map((x,i)=>i===idx?form:x):[form,...prev];
      persist(next,form,null);
      return next;
    });
    setModal(null);
  },[persist]);

  const del=id=>{setItems(prev=>{const next=prev.filter(i=>i.id!==id);persist(next,null,id);return next;});};
  const moveStatus=(id,s)=>setItems(prev=>{const next=prev.map(i=>{if(i.id!==id)return i;const u={...i,status:s};persist(prev.map(x=>x.id===id?u:x),u,null);return u;});return next;});

  const filtered=items.filter(i=>filterStatus==="All"||i.status===filterStatus).filter(i=>filterType==="All"||i.type===filterType);
  const overdueCount=items.filter(i=>i.dueDate&&new Date(i.dueDate)<new Date()&&i.status!=="Published").length;
  const published=items.filter(i=>i.status==="Published").length;
  const inProgress=items.filter(i=>["Drafting","Review"].includes(i.status)).length;
  const ideas=items.filter(i=>i.status==="Idea").length;
  const scheduled=items.filter(i=>i.status==="Scheduled").length;

  return(
    <div>
      {modal&&<ContentModal item={modal} onSave={save} onClose={()=>setModal(null)}/>}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:"1.5rem"}}>
        <StatCard label="Ideas" value={ideas}/>
        <StatCard label="In Progress" value={inProgress} accent={T.periwinkleDark}/>
        <StatCard label="Scheduled" value={scheduled} accent={T.lavDark}/>
        <StatCard label="Published" value={published} accent={T.sageDark} sub={published>0?"🎉 Nice work!":undefined}/>
      </div>
      {overdueCount>0&&(<div style={{background:T.roseBg,border:`1px solid ${T.rose}88`,borderRadius:10,padding:"9px 14px",marginBottom:"1rem",fontSize:13,color:T.roseDark,display:"flex",alignItems:"center",gap:8}}><span>⚠️</span><strong>{overdueCount} piece{overdueCount>1?"s are":" is"} past due</strong> — update status or push deadline</div>)}
      <div style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:14,padding:"12px 14px",marginBottom:"1.25rem",display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",boxShadow:"0 1px 4px rgba(45,36,32,.04)"}}>
        <SelectInput value={filterStatus} onChange={setFilterStatus} full={false}><option value="All">All statuses</option>{CONTENT_STATUSES.map(s=><option key={s}>{s}</option>)}</SelectInput>
        <SelectInput value={filterType} onChange={setFilterType} full={false}><option value="All">All types</option>{CONTENT_TYPES.map(t=><option key={t}>{t}</option>)}</SelectInput>
        <div style={{display:"flex",border:`1px solid ${T.border}`,borderRadius:9,overflow:"hidden"}}>
          {[["board","⊞ Board"],["list","☰ List"]].map(([v,label])=>(
            <button key={v} onClick={()=>setView(v)} style={{background:view===v?T.parchment:"transparent",border:"none",padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:view===v?600:400,color:view===v?T.ink:T.inkLight,fontFamily:"inherit"}}>{label}</button>
          ))}
        </div>
        <div style={{flex:1}}/>
        <Btn onClick={()=>setModal(emptyContent())} variant="sage">+ New Piece</Btn>
      </div>
      {view==="board"?<BoardView items={filtered} onEdit={setModal} onDelete={del} onMove={moveStatus}/>:<ContentListView items={filtered} onEdit={setModal} onDelete={del}/>}
    </div>
  );
}

function BoardView({items,onEdit,onDelete,onMove}){
  return(
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,alignItems:"start"}}>
      {CONTENT_STATUSES.map(status=>{
        const col=items.filter(i=>i.status===status);
        const m=CONTENT_STATUS_META[status];
        return(
          <div key={status} style={{background:T.parchment,borderRadius:12,padding:10,border:`1px solid ${T.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:m.dot,flexShrink:0}}/>
              <span style={{fontSize:11,fontWeight:600,color:T.inkMid}}>{status}</span>
              <span style={{marginLeft:"auto",fontSize:10,background:m.bg,color:m.text,border:`0.5px solid ${m.dot}66`,borderRadius:10,padding:"1px 7px",fontWeight:600}}>{col.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:500,overflowY:"auto"}}>
              {col.length===0&&<div style={{textAlign:"center",padding:"1.5rem 0.5rem",color:T.inkLight,fontSize:12}}>Empty</div>}
              {col.map(item=>{
                const overdue=item.dueDate&&new Date(item.dueDate)<new Date()&&status!=="Published";
                return(
                  <div key={item.id} style={{background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:10,padding:"10px 10px 8px",borderTop:overdue?`2px solid ${T.rose}`:"2px solid transparent"}}>
                    <div style={{fontSize:12,fontWeight:600,color:T.ink,marginBottom:3,lineHeight:1.35}}>{TYPE_ICONS[item.type]} {item.title}</div>
                    <div style={{fontSize:10.5,color:T.inkLight,marginBottom:6}}>{item.type}</div>
                    {item.dueDate&&<div style={{fontSize:10.5,color:overdue?T.roseDark:T.inkLight,fontWeight:overdue?600:400}}>📅 {new Date(item.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}{overdue?" — overdue!":""}</div>}
                    {item.keywords&&<div style={{fontSize:10,color:T.inkLight,marginTop:4,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🏷 {item.keywords}</div>}
                    <select value={status} onChange={e=>onMove(item.id,e.target.value)} style={{marginTop:7,width:"100%",fontSize:10.5,padding:"3px 6px",border:`0.5px solid ${T.border}`,borderRadius:6,background:T.cream,color:T.inkMid,fontFamily:"inherit",cursor:"pointer"}}>
                      {CONTENT_STATUSES.map(s=><option key={s}>{s}</option>)}
                    </select>
                    <div style={{display:"flex",gap:5,marginTop:6}}>
                      <button onClick={()=>onEdit({...item})} style={{flex:1,background:T.parchment,border:`0.5px solid ${T.border}`,borderRadius:6,padding:"3px 0",cursor:"pointer",fontSize:11,color:T.inkMid,fontFamily:"inherit"}}>Edit</button>
                      <button onClick={()=>onDelete(item.id)} style={{background:T.roseBg,border:`0.5px solid ${T.rose}55`,color:T.roseDark,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ContentListView({items,onEdit,onDelete}){
  if(items.length===0)return(<div style={{textAlign:"center",padding:"4rem 2rem",color:T.inkLight,background:T.cardBg,border:`1px solid ${T.border}`,borderRadius:14}}><div style={{fontSize:36,marginBottom:"0.75rem"}}>✍️</div><div style={{fontSize:15,fontWeight:600,color:T.inkMid}}>No content pieces yet</div><div style={{fontSize:13,marginTop:4}}>Start planning your content!</div></div>);
  return(
    <div style={{border:`1px solid ${T.border}`,borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(45,36,32,.04)"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
        <thead><tr style={{background:T.parchment}}>{["Title","Type","Status","Due","Keywords","Actions"].map(h=><th key={h} style={{padding:"10px 12px",textAlign:"left",fontWeight:600,color:T.inkLight,fontSize:10.5,textTransform:"uppercase",letterSpacing:"0.07em",borderBottom:`1px solid ${T.border}`}}>{h}</th>)}</tr></thead>
        <tbody>
          {items.map((item,i)=>{
            const overdue=item.dueDate&&new Date(item.dueDate)<new Date()&&item.status!=="Published";
            const m=CONTENT_STATUS_META[item.status]||CONTENT_STATUS_META["Idea"];
            return(
              <tr key={item.id} style={{background:i%2===0?T.cardBg:T.cream}}>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><div style={{fontWeight:600,color:T.ink}}>{TYPE_ICONS[item.type]} {item.title}</div>{item.hook&&<div style={{fontSize:11,color:T.inkLight,marginTop:2}}>{item.hook.slice(0,70)}{item.hook.length>70?"…":""}</div>}</td>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,color:T.inkMid,whiteSpace:"nowrap"}}>{item.type}</td>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><Pill bg={m.bg} color={m.text} dot={m.dot}>{item.status}</Pill></td>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,whiteSpace:"nowrap",color:overdue?T.roseDark:T.inkMid,fontWeight:overdue?600:400}}>{item.dueDate?new Date(item.dueDate).toLocaleDateString("en-IN",{day:"numeric",month:"short"}):"—"}{overdue?" ⚠️":""}</td>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`,color:T.inkLight,maxWidth:140}}><span style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.keywords||"—"}</span></td>
                <td style={{padding:"10px 12px",borderBottom:`1px solid ${T.border}`}}><div style={{display:"flex",gap:5}}><Btn onClick={()=>onEdit({...item})} variant="ghost" small>Edit</Btn><Btn onClick={()=>onDelete(item.id)} variant="danger" small>✕</Btn></div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function Dashboard(){
  const[tab,setTab]=useState("jobs");
  const[syncStatus,setSyncStatus]=useState(isConfigured()?"idle":"unconfigured");

  return(
    <div style={{fontFamily:"'DM Sans',system-ui,sans-serif",background:T.cream,minHeight:"100vh",maxWidth:1140,margin:"0 auto",padding:"2rem 1.25rem 4rem"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Serif+Display:ital@0;1&display=swap');*{box-sizing:border-box;}select,input,textarea,button{font-family:'DM Sans',system-ui,sans-serif;}::-webkit-scrollbar{width:4px;height:4px;}::-webkit-scrollbar-thumb{background:${T.borderMid};border-radius:4px;}tr:hover{filter:brightness(0.985);}`}</style>

      {!isConfigured()&&<SetupBanner/>}

      <div style={{marginBottom:"2rem"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:"0.75rem"}}>
          <div>
            <h1 style={{margin:"0 0 4px",fontSize:28,fontWeight:700,color:T.ink,fontFamily:"'DM Serif Display',Georgia,serif",letterSpacing:"-0.03em"}}>
              Supriya's Command Center <span style={{fontStyle:"italic",color:T.rose}}>✦</span>
            </h1>
            <p style={{margin:0,fontSize:13,color:T.inkLight}}>
              {new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
              {" · "}<span style={{color:T.sageDark,fontWeight:500}}>You've got this 🌸</span>
            </p>
          </div>
          <SyncBadge status={syncStatus}/>
        </div>
        <div style={{display:"inline-flex",gap:3,marginTop:"1.25rem",background:T.parchment,border:`1px solid ${T.border}`,borderRadius:12,padding:4}}>
          {[{id:"jobs",label:"🎯 Job Tracker"},{id:"content",label:"✍️ Content Planner"}].map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{background:tab===t.id?T.cardBg:"transparent",border:tab===t.id?`1px solid ${T.border}`:"none",boxShadow:tab===t.id?"0 1px 4px rgba(45,36,32,.07)":"none",borderRadius:9,padding:"8px 22px",cursor:"pointer",fontSize:13,fontWeight:tab===t.id?600:500,color:tab===t.id?T.ink:T.inkMid,transition:"all .15s",fontFamily:"inherit"}}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{height:1,background:T.border,marginBottom:"1.5rem",borderRadius:1}}/>

      {tab==="jobs"
        ?<JobTracker syncStatus={syncStatus} setSyncStatus={setSyncStatus}/>
        :<ContentPlanner syncStatus={syncStatus} setSyncStatus={setSyncStatus}/>
      }
    </div>
  );
}
