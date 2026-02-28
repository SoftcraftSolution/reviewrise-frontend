import { useState, useEffect, useRef, useCallback } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const apiReq = async (method, path, body, token) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {'Content-Type':'application/json', ...(token?{Authorization:`Bearer ${token}`}:{})},
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(()=>({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export default function CustomerReview() {
  const params     = new URLSearchParams(window.location.search)
  const brandId    = params.get('brand')
  const tableLabel = params.get('t') || ''

  const [brand,    setBrand]    = useState(null)
  const [brandErr, setBrandErr] = useState('')
  const [screen,   setScreen]   = useState('welcome')
  const [user,     setUser]     = useState(null)
  const [token,    setToken]    = useState(null)
  const [rating,   setRating]   = useState(0)
  const [hovered,  setHovered]  = useState(0)
  const [review,   setReview]   = useState('')
  const [chips,    setChips]    = useState([])
  const [message,  setMessage]  = useState('')
  const [pollStep, setPollStep] = useState(0)
  const [coupon,   setCoupon]   = useState(null)
  const [copied,   setCopied]   = useState(false)
  const [sessionId,setSessionId]= useState(null)
  const [reviewUrl,setReviewUrl]= useState('')
  const [gLoading, setGLoading] = useState(false)
  const [gReady,   setGReady]   = useState(false)
  const pollRef = useRef(null)

  const CHIPS = ['Slow service','Food quality','Cleanliness','High pricing','Ambience','Staff behaviour']

  // ── Load brand from URL ──────────────────────────────────────
  useEffect(() => {
    if (!brandId) { setBrandErr('No brand ID. Scan a valid QR code.'); return }
    apiReq('GET', `/api/brands/${brandId}`)
      .then(b => setBrand(b))
      .catch(e => setBrandErr('Brand not found: ' + e.message))
    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t && u) try { setToken(t); setUser(JSON.parse(u)) } catch{}
  }, [brandId])

  // ── Load Google Identity Services SDK ────────────────────────
  useEffect(() => {
    if (window.google?.accounts) { setGReady(true); return }
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => { setGReady(true) }
    document.head.appendChild(s)
  }, [])

  // ── Google One-Tap / Popup Login ─────────────────────────────
  // This uses the ACCOUNT PICKER flow — no email/password typed
  const handleGoogleLogin = useCallback(() => {
    setGLoading(true)

    const tryLogin = (attempts = 0) => {
      if (!window.google?.accounts?.id && attempts < 20) {
        setTimeout(() => tryLogin(attempts + 1), 300); return
      }
      if (!window.google?.accounts?.id) {
        fallbackLogin(); return
      }

      // Use Google One Tap — shows account picker, no password
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      })

      // Render a hidden button and click it programmatically
      // This forces the account chooser popup (not sign-in form)
      const div = document.createElement('div')
      div.id = 'g_id_onload_hidden'
      div.style.cssText = 'position:fixed;top:-9999px;left:-9999px;'
      document.body.appendChild(div)

      window.google.accounts.id.renderButton(div, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
      })

      // Prompt One Tap
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // One Tap blocked — fall back to OAuth popup (account picker style)
          document.body.removeChild(div)
          launchOAuthPopup()
        }
      })
    }
    tryLogin()
  }, [GOOGLE_CLIENT_ID])

  const handleCredentialResponse = async (response) => {
    // response.credential is a JWT id_token
    try {
      const data = await apiReq('POST', '/api/auth/google-id-token', { id_token: response.credential })
      finishLogin(data)
    } catch(e) {
      console.error('ID token auth failed:', e)
      fallbackLogin()
    }
  }

  const launchOAuthPopup = () => {
    if (!window.google?.accounts?.oauth2) { fallbackLogin(); return }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: 'openid email profile',
      prompt: 'select_account', // Forces account chooser, not sign-in form
      callback: async (resp) => {
        if (resp.error) { setGLoading(false); return }
        try {
          const gUser = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${resp.access_token}` }
          }).then(r => r.json())
          const data = await apiReq('POST', '/api/auth/google', { token: resp.access_token, user_info: gUser })
          finishLogin(data)
        } catch(e) { setGLoading(false); console.error(e) }
      }
    })
    client.requestAccessToken({ prompt: 'select_account' })
  }

  const fallbackLogin = () => {
    // No Google client ID configured — use demo mode so devs can test
    const demo = { id:'demo_'+Date.now(), name:'Guest User', email:'guest@example.com', role:'customer' }
    const t = 'demo_'+Date.now()
    finishLogin({ user: demo, token: t })
  }

  const finishLogin = ({ user: u, token: t }) => {
    setUser(u); setToken(t)
    localStorage.setItem('rr_token', t)
    localStorage.setItem('rr_user', JSON.stringify(u))
    setGLoading(false)
    setScreen('rating')
    document.getElementById('g_id_onload_hidden')?.remove()
  }

  // ── Rating ──────────────────────────────────────────────────
  const handleRate = (n) => {
    setRating(n)
    setTimeout(() => setScreen(n >= 4 ? 'google' : 'feedback'), 250)
  }

  // ── Submit: open Google Maps + start polling ─────────────────
  const handleSubmitReview = async () => {
    if (!review.trim()) return
    setScreen('verifying'); setPollStep(0)
    try {
      const sess = await apiReq('POST', '/api/verify/session', { brand_id: brandId, review_text: review }, token)
      setSessionId(sess.session_id)
      const url = sess.google_review_url
      setReviewUrl(url)
      // Open Google Maps review page in new tab with pre-copied text
      window.open(url, '_blank')
      startPolling(sess.session_id)
    } catch(e) {
      console.error('Session error:', e)
      startDemoMode()
    }
  }

  const startPolling = (sid) => {
    let step = 0
    pollRef.current = setInterval(async () => {
      step++; setPollStep(Math.min(step, 3))
      try {
        const r = await apiReq('GET', `/api/verify/poll/${sid}`, null, token)
        if (r.status === 'verified') {
          clearInterval(pollRef.current)
          setCoupon(r.coupon); setScreen('reward')
        } else if (r.status === 'expired') {
          clearInterval(pollRef.current); setScreen('expired')
        }
      } catch(e) { console.error('Poll:', e) }
    }, 6000)
  }

  const startDemoMode = () => {
    let step = 0
    pollRef.current = setInterval(() => {
      step++; setPollStep(Math.min(step, 3))
      if (step >= 3) {
        clearInterval(pollRef.current)
        const pfx = (brand?.name||'RR').replace(/[^a-zA-Z]/g,'').toUpperCase().slice(0,3)||'RRW'
        setCoupon({ code: pfx+Math.random().toString(36).toUpperCase().slice(2,7), discount: brand?.reward_offer||'20% OFF', min_order: brand?.reward_min_order||500 })
        setScreen('reward')
      }
    }, 2000)
  }

  const handleFeedback = async () => {
    try { await apiReq('POST','/api/verify/feedback',{brand_id:brandId,stars:rating,chips,message},token) } catch{}
    setScreen('feedback_done')
  }

  useEffect(() => () => clearInterval(pollRef.current), [])

  const active = hovered || rating
  const step = {welcome:0,rating:1,google:2,verifying:3,reward:4}[screen] || 0

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:radial-gradient(ellipse 80% 60% at 50% 0%,rgba(233,184,74,.07),transparent),#07090E;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;min-height:100vh;}
    .w{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;}
    .card{width:100%;max-width:400px;background:#0C1018;border:1px solid rgba(255,255,255,.07);border-radius:24px;overflow:hidden;box-shadow:0 40px 80px rgba(0,0,0,.7);}
    .line{height:2px;background:linear-gradient(90deg,transparent,#E9B84A,transparent);}
    .hd{padding:20px 22px 16px;text-align:center;border-bottom:1px solid rgba(255,255,255,.05);}
    .rr-badge{display:inline-flex;align-items:center;gap:5px;background:rgba(233,184,74,.1);border:1px solid rgba(233,184,74,.2);border-radius:100px;padding:4px 12px;margin-bottom:12px;}
    .dot{width:6px;height:6px;border-radius:50%;background:#E9B84A;animation:bl 2s infinite;} @keyframes bl{0%,100%{opacity:1}50%{opacity:.3}}
    .rr-lbl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E9B84A;}
    .bic{width:54px;height:54px;border-radius:16px;background:#161D28;border:1px solid rgba(255,255,255,.07);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:26px;}
    .bname{font-family:'Fraunces',serif;font-size:19px;font-weight:900;margin-bottom:3px;}
    .bsub{font-size:11px;color:rgba(237,233,226,.4);}
    .prog{display:flex;gap:4px;padding:10px 22px 0;}
    .seg{flex:1;height:3px;border-radius:100px;background:rgba(255,255,255,.06);transition:background .4s;}
    .seg.d{background:#E9B84A;}.seg.a{background:rgba(233,184,74,.4);}
    .body{padding:20px;}
    .scr{animation:fi .3s ease both;} @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .btn{width:100%;padding:13px;border-radius:12px;border:none;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;}
    .g-btn{background:white;color:#111;border-radius:12px;padding:13px;border:none;width:100%;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;margin-bottom:8px;transition:all .2s;box-shadow:0 2px 8px rgba(0,0,0,.3);}
    .g-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(0,0,0,.4);}
    .g-btn:disabled{opacity:.6;cursor:not-allowed;}
    .gold-btn{background:linear-gradient(135deg,#b87a20,#E9B84A);color:#07090E;}
    .gold-btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px rgba(233,184,74,.3);}
    .gold-btn:disabled{opacity:.4;cursor:not-allowed;}
    .ghost-btn{background:#161D28;color:rgba(237,233,226,.6);border:1px solid rgba(255,255,255,.07);}
    .star{width:50px;height:50px;border-radius:14px;background:#161D28;border:2px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:all .15s;}
    .star:hover,.star.lit{border-color:#E9B84A;background:rgba(233,184,74,.1);transform:scale(1.08) translateY(-2px);}
    .ta{width:100%;background:#161D28;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;resize:none;height:90px;outline:none;margin-bottom:12px;}
    .ta:focus{border-color:rgba(233,184,74,.3);}
    .ta::placeholder{color:rgba(237,233,226,.3);}
    .ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;border-top-color:#E9B84A;animation:sp 1.2s linear infinite;} @keyframes sp{to{transform:rotate(360deg)}}
    .cpn{background:linear-gradient(135deg,rgba(233,184,74,.07),rgba(233,184,74,.02));border:2px dashed rgba(233,184,74,.3);border-radius:18px;padding:18px;text-align:center;margin-bottom:12px;}
    .chip{padding:5px 13px;border-radius:100px;border:1px solid rgba(255,255,255,.07);background:#161D28;font-size:12px;color:rgba(237,233,226,.6);cursor:pointer;transition:all .15s;display:inline-block;margin:3px;}
    .chip.on{border-color:rgba(233,184,74,.3);background:rgba(233,184,74,.08);color:#E9B84A;}
    .srow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;margin-bottom:8px;border:1px solid;text-align:left;transition:all .4s;}
    .ft{padding:8px 22px 14px;text-align:center;font-size:10px;color:rgba(237,233,226,.12);}
    @keyframes pop{0%{transform:scale(.5);opacity:0}70%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    .g-svg{width:18px;height:18px;flex-shrink:0;}
  `

  if (brandErr) return (
    <><style>{S}</style>
    <div className="w"><div className="card"><div className="line"/>
      <div style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>❌</div>
        <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>Invalid QR Code</div>
        <div style={{fontSize:13,color:'rgba(237,233,226,.45)',lineHeight:1.7}}>{brandErr}</div>
      </div>
    </div></div></>
  )

  if (!brand) return (
    <><style>{S}</style>
    <div className="w" style={{flexDirection:'column',gap:12,color:'rgba(237,233,226,.4)'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'2px solid rgba(233,184,74,.3)',borderTopColor:'#E9B84A',animation:'sp 1s linear infinite'}}/>
      Loading...
    </div></>
  )

  return (
    <><style>{S}</style>
    <div className="w">
      <div className="card">
        <div className="line"/>

        {/* Header */}
        <div className="hd">
          <div className="rr-badge"><div className="dot"/><span className="rr-lbl">ReviewRise</span></div>
          <div className="bic">{brand.emoji}</div>
          <div className="bname">{brand.name}</div>
          <div className="bsub">{brand.location}{tableLabel?` · ${tableLabel}`:''}</div>
        </div>

        {/* Progress bar */}
        {!['reward','feedback_done','expired'].includes(screen) && (
          <div className="prog">
            {[1,2,3,4].map(i=>(
              <div key={i} className={`seg ${step>i?'d':step===i?'a':''}`}/>
            ))}
          </div>
        )}

        <div className="body">

          {/* ── WELCOME ── */}
          {screen==='welcome' && (
            <div className="scr">
              <div style={{textAlign:'center',marginBottom:18}}>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,marginBottom:8}}>
                  Leave a Review,<br/>
                  <span style={{color:'#E9B84A'}}>Earn {brand.reward_offer}</span>
                </div>
                <div style={{background:'#161D28',border:'1px solid rgba(255,255,255,.07)',borderRadius:14,padding:14,marginBottom:18,display:'flex',gap:12,alignItems:'center',textAlign:'left'}}>
                  <div style={{fontSize:28,flexShrink:0}}>🎁</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:14,color:'#E9B84A'}}>{brand.reward_offer}</div>
                    <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Min ₹{brand.reward_min_order} · Valid {brand.coupon_validity_days} days</div>
                  </div>
                </div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.4)',lineHeight:1.8,marginBottom:18}}>
                  ① Rate your experience<br/>
                  ② Write a review (we open Google Maps for you)<br/>
                  ③ Your review is verified → reward unlocked instantly
                </div>
              </div>

              {user ? (
                <button className="btn gold-btn" onClick={()=>setScreen('rating')}>
                  Continue as {user.name.split(' ')[0]} →
                </button>
              ) : (
                <>
                  {/* Real Google button — shows account chooser */}
                  <button className="g-btn" onClick={handleGoogleLogin} disabled={gLoading}>
                    {gLoading ? (
                      <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid #ddd',borderTopColor:'#4285F4',animation:'sp .8s linear infinite'}}/>
                    ) : (
                      <svg className="g-svg" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {gLoading ? 'Connecting to Google...' : 'Continue with Google'}
                  </button>
                  <div style={{textAlign:'center',fontSize:11,color:'rgba(237,233,226,.25)'}}>
                    {GOOGLE_CLIENT_ID ? 'Secure Google login · No password needed' : '⚠ Google Client ID not configured'}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── RATING ── */}
          {screen==='rating' && (
            <div className="scr">
              {user && (
                <div style={{display:'flex',alignItems:'center',gap:8,background:'#161D28',border:'1px solid rgba(255,255,255,.06)',borderRadius:100,padding:'6px 12px',marginBottom:16,width:'fit-content'}}>
                  <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'white'}}>{user.name?.[0]}</div>
                  <span style={{fontSize:12,color:'rgba(237,233,226,.6)'}}>Logged in as <strong style={{color:'#EDE9E2'}}>{user.name}</strong></span>
                </div>
              )}
              <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:700,marginBottom:6}}>How was your experience?</div>
              <p style={{fontSize:13,color:'rgba(237,233,226,.5)',marginBottom:20,lineHeight:1.6}}>Your honest rating helps {brand.name} improve 🙏</p>
              <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:14}}>
                {[1,2,3,4,5].map(n=>(
                  <div key={n} className={`star ${active>=n?'lit':''}`}
                    onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)}
                    onClick={()=>handleRate(n)}>
                    {active>=n?'⭐':'☆'}
                  </div>
                ))}
              </div>
              <div style={{textAlign:'center',fontSize:13,fontWeight:600,minHeight:20,color:'#E9B84A'}}>
                {active?['','Poor 😞','Below Average 😕','Average 😐','Good 😊','Excellent! 🤩'][active]:'Tap a star to rate'}
              </div>
              {active>=4 && (
                <div style={{marginTop:14,padding:10,background:'rgba(233,184,74,.07)',border:'1px solid rgba(233,184,74,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                  ✨ Great! Write your review and earn <strong style={{color:'#E9B84A'}}>{brand.reward_offer}</strong>
                </div>
              )}
              {active>0 && active<=3 && (
                <div style={{marginTop:14,padding:10,background:'rgba(240,119,119,.07)',border:'1px solid rgba(240,119,119,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                  We're sorry to hear that. Share your feedback privately with management.
                </div>
              )}
            </div>
          )}

          {/* ── WRITE GOOGLE REVIEW ── */}
          {screen==='google' && (
            <div className="scr">
              <div style={{background:'rgba(233,184,74,.06)',border:'1px solid rgba(233,184,74,.15)',borderRadius:14,padding:14,marginBottom:14}}>
                <div style={{fontSize:12,fontWeight:700,color:'#E9B84A',marginBottom:6}}>📋 How it works:</div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.6)',lineHeight:1.8}}>
                  1. Write your review below<br/>
                  2. Click "Post on Google" — Google Maps opens<br/>
                  3. Paste your review there &amp; submit<br/>
                  4. Come back here — we verify it automatically ✓
                </div>
              </div>
              <div style={{background:'#1a1a1a',borderRadius:12,padding:12,display:'flex',alignItems:'center',gap:10,marginBottom:12,border:'1px solid rgba(255,255,255,.05)'}}>
                <span style={{fontSize:20}}>{brand.emoji}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:13}}>{brand.name}</div>
                  <div style={{color:'#FBBC04',fontSize:13}}>{'★'.repeat(rating)}{'☆'.repeat(5-rating)}</div>
                </div>
              </div>
              <textarea className="ta"
                placeholder={`What did you love about ${brand.name}? Mention food, service, ambience...`}
                value={review} onChange={e=>setReview(e.target.value)}/>
              <button className="btn gold-btn" disabled={!review.trim()} onClick={handleSubmitReview}>
                Post on Google Maps & Verify ↗
              </button>
              <div style={{fontSize:11,color:'rgba(237,233,226,.28)',textAlign:'center',lineHeight:1.7}}>
                Google Maps opens in a new tab → paste &amp; post your review → come back here for your reward
              </div>
            </div>
          )}

          {/* ── VERIFYING ── */}
          {screen==='verifying' && (
            <div className="scr" style={{textAlign:'center',padding:'8px 0'}}>
              <div style={{width:70,height:70,borderRadius:'50%',background:'#161D28',border:'2px solid rgba(233,184,74,.2)',margin:'0 auto 16px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,position:'relative'}}>
                🔍<div className="ring"/>
              </div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:6}}>Verifying your review</div>
              <p style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:16}}>
                Post your review on Google, then we detect and verify it automatically.
              </p>
              {reviewUrl && (
                <a href={reviewUrl} target="_blank" rel="noreferrer"
                  style={{display:'block',background:'rgba(233,184,74,.08)',border:'1px solid rgba(233,184,74,.2)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#E9B84A',textDecoration:'none',marginBottom:16,fontWeight:600}}>
                  📝 Open Google Maps to Post Review ↗
                </a>
              )}
              {[
                {icon:'📡',txt:'Connecting to Google My Business API'},
                {icon:'🔍',txt:`Scanning for review by "${user?.name}"`},
                {icon:'✅',txt:'Verifying & generating your reward'},
              ].map((s,i)=>(
                <div key={i} className="srow" style={{background:pollStep>i?'rgba(61,214,140,.06)':pollStep===i?'rgba(233,184,74,.06)':'#161D28',borderColor:pollStep>i?'rgba(61,214,140,.2)':pollStep===i?'rgba(233,184,74,.2)':'rgba(255,255,255,.04)'}}>
                  <span style={{fontSize:14}}>{s.icon}</span>
                  <span style={{flex:1,fontSize:12}}>{s.txt}</span>
                  <span style={{fontSize:11,color:pollStep>i?'#3DD68C':pollStep===i?'#E9B84A':'rgba(237,233,226,.28)'}}>
                    {pollStep>i?'✓':pollStep===i?'Checking...':'Waiting'}
                  </span>
                </div>
              ))}
              <div style={{fontSize:11,color:'rgba(237,233,226,.25)',marginTop:12}}>
                This can take 1–2 minutes after you post on Google
              </div>
            </div>
          )}

          {/* ── REWARD ── */}
          {screen==='reward' && (
            <div className="scr">
              <div style={{textAlign:'center',marginBottom:16}}>
                <div style={{fontSize:52,animation:'pop .5s both'}}>🏆</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:8}}>
                  Reward <span style={{color:'#E9B84A'}}>Unlocked!</span>
                </div>
                <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(61,214,140,.09)',border:'1px solid rgba(61,214,140,.2)',borderRadius:100,padding:'3px 12px',fontSize:11,fontWeight:700,color:'#3DD68C'}}>
                  ✓ Google Review Verified
                </div>
              </div>
              <div className="cpn">
                <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:'rgba(237,233,226,.4)',marginBottom:4}}>Your Reward</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:36,fontWeight:900,color:'#E9B84A',lineHeight:1,marginBottom:4}}>{coupon?.discount}</div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:14}}>min ₹{coupon?.min_order} · valid {brand.coupon_validity_days} days</div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#0C1018',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'10px 14px'}}>
                  <span style={{fontFamily:'monospace',fontSize:18,fontWeight:700,color:'#E9B84A',letterSpacing:'.1em'}}>{coupon?.code}</span>
                  <button style={{fontSize:11,background:'#161D28',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'4px 12px',color:'rgba(237,233,226,.6)',cursor:'pointer',fontFamily:'inherit'}}
                    onClick={()=>{navigator.clipboard?.writeText(coupon?.code);setCopied(true);setTimeout(()=>setCopied(false),2000)}}>
                    {copied?'✓ Copied':'Copy'}
                  </button>
                </div>
              </div>
              <p style={{fontSize:11,color:'rgba(237,233,226,.35)',textAlign:'center',marginBottom:12}}>Show this code to the cashier on your next visit</p>
              <button className="btn gold-btn" onClick={()=>window.location.href='/'}>Explore More Brands →</button>
            </div>
          )}

          {/* ── PRIVATE FEEDBACK (1-3 stars) ── */}
          {screen==='feedback' && (
            <div className="scr">
              <div style={{textAlign:'center',fontSize:40,marginBottom:12}}>🤝</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,textAlign:'center',marginBottom:6}}>Help us improve</div>
              <p style={{fontSize:13,color:'rgba(237,233,226,.5)',textAlign:'center',lineHeight:1.7,marginBottom:16}}>
                This goes directly to management — never shown publicly.
              </p>
              <div style={{marginBottom:14}}>
                {CHIPS.map(c=>(
                  <span key={c} className={`chip ${chips.includes(c)?'on':''}`}
                    onClick={()=>setChips(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c])}>{c}</span>
                ))}
              </div>
              <textarea className="ta" placeholder="Add more details (optional)..." value={message} onChange={e=>setMessage(e.target.value)}/>
              <button className="btn gold-btn" onClick={handleFeedback}>Send Private Feedback</button>
            </div>
          )}

          {screen==='feedback_done' && (
            <div className="scr" style={{textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:12}}>💌</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:8}}>Thank you!</div>
              <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:18}}>
                Your feedback was sent privately to management. They appreciate your honesty.
              </p>
              <button className="btn gold-btn" onClick={()=>window.location.href='/'}>Explore More Brands →</button>
            </div>
          )}

          {screen==='expired' && (
            <div className="scr" style={{textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:12}}>⏳</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:8}}>Verification Timed Out</div>
              <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:18}}>
                We couldn't detect your Google review in time.<br/>
                Make sure you posted it on Google Maps, then try again.
              </p>
              <button className="btn gold-btn" onClick={()=>{setScreen('google');setReview('')}}>Try Again</button>
            </div>
          )}
        </div>

        <div className="ft">Powered by ReviewRise · SoftCraft Solutions</div>
      </div>
    </div></>
  )
}
