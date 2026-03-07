import { useState, useEffect } from 'react'
import SuperAdmin     from './apps/SuperAdmin.jsx'
import BrandDashboard from './apps/BrandDashboard.jsx'
import CustomerReview from './apps/CustomerReview.jsx'
import DiscoveryApp   from './apps/DiscoveryApp.jsx'
import LoginPage      from './apps/LoginPage.jsx'

const G = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box;}
:root{
  --bg:#07090E;--panel:#0C1018;--card:#111620;--card2:#161D28;--card3:#1C2434;
  --b1:rgba(255,255,255,0.06);--b2:rgba(255,255,255,0.1);
  --gold:#E9B84A;--gold2:rgba(233,184,74,.13);--goldb:rgba(233,184,74,.22);
  --text:#EDE9E2;--muted:rgba(237,233,226,.38);--muted2:rgba(237,233,226,.62);
  --green:#3DD68C;--greenbg:rgba(61,214,140,.09);
  --red:#F07777;--redbg:rgba(240,119,119,.09);
  --blue:#6AA3F8;--bluebg:rgba(106,163,248,.09);
  --purple:#B47CFF;--purplebg:rgba(180,124,255,.09);
  --r:14px;--r2:10px;--r3:8px;
}
html,body,#root{background:var(--bg);color:var(--text);font-family:'Bricolage Grotesque',sans-serif;min-height:100vh;}
::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-thumb{background:var(--card3);border-radius:4px;}
.fade{animation:fadeIn .3s ease both;}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}

/* BUTTONS */
.btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:var(--r2);border:1px solid var(--b2);background:var(--card2);color:var(--muted2);font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;}
.btn:hover{background:var(--card3);color:var(--text);}
.btn.primary{background:linear-gradient(135deg,#b87a20,var(--gold));color:#07090E;border-color:transparent;}
.btn.primary:hover{opacity:.9;}
.btn.danger{background:var(--redbg);color:var(--red);border-color:rgba(240,119,119,.2);}
.btn.success{background:var(--greenbg);color:var(--green);border-color:rgba(61,214,140,.2);}
.btn.sm{padding:5px 12px;font-size:11px;}
.btn:disabled{opacity:.5;cursor:not-allowed;}

/* BADGES */
.badge{display:inline-flex;align-items:center;gap:4px;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;}
.badge.green{background:var(--greenbg);color:var(--green);border:1px solid rgba(61,214,140,.2);}
.badge.red{background:var(--redbg);color:var(--red);border:1px solid rgba(240,119,119,.2);}
.badge.gold{background:var(--gold2);color:var(--gold);border:1px solid var(--goldb);}
.badge.blue{background:var(--bluebg);color:var(--blue);border:1px solid rgba(106,163,248,.2);}
.badge.purple{background:var(--purplebg);color:var(--purple);border:1px solid rgba(180,124,255,.2);}
.badge.muted{background:var(--card2);color:var(--muted2);border:1px solid var(--b1);}

/* INPUTS */
.input{width:100%;background:var(--card2);border:1px solid var(--b2);border-radius:var(--r2);padding:9px 13px;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;font-size:13px;outline:none;transition:border-color .2s;}
.input:focus{border-color:var(--goldb);}
.input::placeholder{color:var(--muted);}
.label{display:block;font-size:11px;font-weight:700;color:var(--muted2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px;}
.form-row{margin-bottom:14px;}

/* CARDS & TABLES */
.card-box{background:var(--card);border:1px solid var(--b1);border-radius:var(--r);padding:20px;}
.table-wrap{background:var(--card);border:1px solid var(--b1);border-radius:var(--r);overflow:hidden;}
.table-head,.table-row{display:grid;padding:11px 18px;gap:10px;align-items:center;font-size:12px;}
.table-head{background:var(--card2);color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;border-bottom:1px solid var(--b1);}
.table-row{border-bottom:1px solid var(--b1);font-size:13px;transition:background .15s;}
.table-row:last-child{border-bottom:none;}
.table-row:hover{background:var(--card2);}

/* MODAL — always fixed, always centered */
.modal-overlay{
  position:fixed !important;
  top:0 !important; left:0 !important; right:0 !important; bottom:0 !important;
  z-index:99999 !important;
  background:rgba(0,0,0,.82);
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  padding:20px;
}
.modal-box{
  background:#0C1018;
  border:1px solid rgba(255,255,255,.12);
  border-radius:20px;
  padding:28px;
  width:100%;
  max-height:90vh;
  overflow-y:auto;
  box-shadow:0 32px 80px rgba(0,0,0,.9);
  animation:fadeIn .2s ease both;
}

/* STATS */
.stat-row{display:grid;gap:14px;margin-bottom:20px;}
.stat-item{background:var(--card);border:1px solid var(--b1);border-radius:var(--r);padding:16px;}
.stat-val{font-size:26px;font-weight:800;letter-spacing:-.03em;line-height:1;margin-bottom:4px;}
.stat-lbl{font-size:11px;color:var(--muted);}

/* LAYOUT */
.dash-layout{display:flex;min-height:100vh;position:relative;}
.sidebar{width:214px;flex-shrink:0;background:var(--panel);border-right:1px solid var(--b1);display:flex;flex-direction:column;position:sticky;top:0;height:100vh;overflow-y:auto;}
.main-area{flex:1;display:flex;flex-direction:column;min-width:0;overflow:hidden;}
.topbar{padding:14px 26px;border-bottom:1px solid var(--b1);display:flex;align-items:center;justify-content:space-between;background:var(--panel);position:sticky;top:0;z-index:10;}
.topbar-l .t1{font-size:17px;font-weight:800;letter-spacing:-.02em;}
.topbar-l .t2{font-size:11px;color:var(--muted);margin-top:2px;}
.topbar-r{display:flex;align-items:center;gap:8px;}
.content-area{padding:22px 26px;flex:1;overflow-y:auto;}

/* SIDEBAR */
.sb-head{padding:20px 16px 16px;border-bottom:1px solid var(--b1);}
.sb-logo{display:flex;align-items:center;gap:9px;}
.sb-logo-mark{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#b87a20,var(--gold));display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;}
.sb-logo-text{font-size:14px;font-weight:800;letter-spacing:-.02em;}
.sb-logo-sub{font-size:10px;color:var(--muted);letter-spacing:.06em;text-transform:uppercase;}
.sb-profile{padding:12px 14px;border-bottom:1px solid var(--b1);display:flex;align-items:center;gap:9px;}
.sb-avatar{width:32px;height:32px;border-radius:9px;background:var(--card3);border:1px solid var(--b2);display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;}
.sb-name{font-size:12px;font-weight:600;}
.sb-role{font-size:10px;color:var(--muted);margin-top:1px;}
.sb-nav{flex:1;padding:10px 8px;display:flex;flex-direction:column;gap:2px;}
.nav-i{display:flex;align-items:center;gap:9px;padding:8px 11px;border-radius:var(--r3);font-size:13px;font-weight:600;color:var(--muted2);cursor:pointer;transition:all .15s;position:relative;border:none;background:transparent;width:100%;text-align:left;}
.nav-i:hover{background:var(--card);color:var(--text);}
.nav-i.on{background:var(--gold2);color:var(--gold);}
.nav-i.on::before{content:'';position:absolute;left:-8px;top:50%;transform:translateY(-50%);width:3px;height:16px;border-radius:0 3px 3px 0;background:var(--gold);}
.nav-ic{font-size:14px;width:16px;text-align:center;}
.nav-badge{margin-left:auto;background:var(--red);color:white;font-size:9px;font-weight:800;padding:1px 6px;border-radius:100px;}
.sb-foot{padding:12px 14px;border-top:1px solid var(--b1);font-size:10px;color:var(--muted);}
`

export default function App() {
  const [app,   setApp]   = useState('discover')
  const [user,  setUser]  = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    const path = window.location.pathname
    if      (path.startsWith('/admin'))  setApp('admin')
    else if (path.startsWith('/brand'))  setApp('brand')
    else if (path.startsWith('/review')) setApp('review')
    else                                 setApp('discover')

    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t) setToken(t)
    if (u) try { setUser(JSON.parse(u)) } catch{}
  }, [])

  const handleLogin = (u, t) => {
    setUser(u); setToken(t)
    localStorage.setItem('rr_token', t)
    localStorage.setItem('rr_user', JSON.stringify(u))
    if (u.role === 'superadmin')  setApp('admin')
    else if (u.role === 'brand_owner') setApp('brand')
    else setApp('discover')
  }

  const handleLogout = () => {
    localStorage.clear()
    setUser(null); setToken(null)
    setApp('discover')
  }

  const render = () => {
    if (app === 'review')   return <CustomerReview />
    if (app === 'discover') return <DiscoveryApp user={user} />
    if (!token) return <LoginPage onLogin={handleLogin} targetApp={app} />
    if (app === 'admin') return <SuperAdmin user={user} onLogout={handleLogout} />
    if (app === 'brand') return <BrandDashboard user={user} onLogout={handleLogout} />
    return <DiscoveryApp user={user} />
  }

  return (
    <>
      <style>{G}</style>
      {render()}
    </>
  )
}
