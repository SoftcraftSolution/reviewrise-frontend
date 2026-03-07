import { useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'

export default function LoginPage({ onLogin, targetApp }) {
  const [email,   setEmail]   = useState('')
  const [pass,    setPass]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ email: email.trim(), password: pass })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return }
      localStorage.setItem('rr_token', data.token)
      localStorage.setItem('rr_user',  JSON.stringify(data.user))
      if (data.brand) localStorage.setItem('rr_brand', JSON.stringify(data.brand))
      onLogin(data.user, data.token)
    } catch(e) {
      setError('Cannot reach server. Check your internet connection.')
    }
    setLoading(false)
  }

  const isAdmin = targetApp === 'admin'

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'radial-gradient(ellipse 60% 40% at 50% 0%,rgba(233,184,74,.06),transparent),#07090E',padding:20}}>
      <div style={{width:'100%',maxWidth:380,background:'#0C1018',border:'1px solid rgba(255,255,255,.08)',borderRadius:22,overflow:'hidden'}}>
        <div style={{height:3,background:'linear-gradient(90deg,transparent,#E9B84A,transparent)'}}/>
        <div style={{padding:32}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:28,justifyContent:'center'}}>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#b87a20,#E9B84A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>⭐</div>
            <div style={{fontSize:18,fontWeight:800,letterSpacing:'-.02em'}}>ReviewRise</div>
          </div>

          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,textAlign:'center',marginBottom:6}}>
            {isAdmin ? 'Super Admin Login' : 'Brand Owner Login'}
          </div>
          <div style={{fontSize:13,color:'var(--muted)',textAlign:'center',marginBottom:24}}>
            {isAdmin ? 'SoftCraft Solutions · Admin Portal' : 'Manage reviews, coupons & discounts'}
          </div>

          {error && (
            <div style={{background:'rgba(240,119,119,.08)',border:'1px solid rgba(240,119,119,.25)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#F07777',marginBottom:16}}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={submit}>
            <div style={{marginBottom:14}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(237,233,226,.6)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Email</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder={isAdmin ? 'admin@softcraftsolutions.in' : 'owner@brand.com'} required/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={{display:'block',fontSize:11,fontWeight:700,color:'rgba(237,233,226,.6)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:5}}>Password</label>
              <input className="input" type="password" value={pass} onChange={e=>setPass(e.target.value)}
                placeholder="Your password" required/>
            </div>
            <button type="submit" disabled={loading}
              style={{width:'100%',padding:13,borderRadius:12,border:'none',background:'linear-gradient(135deg,#b87a20,#E9B84A)',color:'#07090E',fontFamily:"'Bricolage Grotesque',sans-serif",fontSize:14,fontWeight:800,cursor:'pointer',opacity:loading?.6:1}}>
              {loading ? 'Logging in...' : 'Login →'}
            </button>
          </form>

          <div style={{marginTop:20,padding:14,background:'#111620',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.5)',lineHeight:1.8}}>
            {isAdmin ? (
              <><strong style={{color:'rgba(237,233,226,.8)'}}>Default credentials:</strong><br/>
              Email: admin@softcraftsolutions.in<br/>Password: Admin@123</>
            ) : (
              <><strong style={{color:'rgba(237,233,226,.8)'}}>Demo brands:</strong><br/>
              spice@gmail.com / Spice@123<br/>
              brew@gmail.com / Brew@123<br/>
              style@gmail.com / Style@123</>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
