export default function Sidebar({ logo, profile, nav, footer, onLogout }) {
  return (
    <div className="sidebar">
      <div className="sb-head">
        <div className="sb-logo">
          <div className="sb-logo-mark">⭐</div>
          <div>
            <div className="sb-logo-text">{logo.title}</div>
            <div className="sb-logo-sub">{logo.sub}</div>
          </div>
        </div>
      </div>
      <div className="sb-profile">
        <div className="sb-avatar">{profile.avatar}</div>
        <div>
          <div className="sb-name">{profile.name}</div>
          <div className="sb-role">{profile.role}</div>
        </div>
      </div>
      <div className="sb-nav">
        {nav.map((n,i) => (
          <button key={i} className={`nav-i ${n.active?'on':''}`} onClick={n.onClick}>
            <span className="nav-ic">{n.icon}</span>
            {n.label}
            {n.badge > 0 && <span className="nav-badge">{n.badge}</span>}
          </button>
        ))}
      </div>
      <div className="sb-foot">
        <div style={{marginBottom:8,fontSize:11,color:'var(--muted)'}}>{footer}</div>
        {onLogout && (
          <button onClick={onLogout} style={{background:'none',border:'1px solid rgba(240,119,119,.2)',borderRadius:8,padding:'5px 12px',color:'var(--red)',fontSize:11,fontWeight:600,cursor:'pointer',width:'100%',fontFamily:'inherit'}}>
            ↩ Logout
          </button>
        )}
      </div>
    </div>
  )
}
