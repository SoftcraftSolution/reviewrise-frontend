import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'
const GCID = import.meta.env.VITE_GOOGLE_CLIENT_ID
           || '894420486164-9lnvnbmsvqm2kptp2grq1hbh838ed6ar.apps.googleusercontent.com'

const apiCall = async (method, path, body, token) => {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', ...(token ? { Authorization:`Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const d = await r.json().catch(()=>({}))
  if (!r.ok) {
    const err = new Error(d.error || `HTTP ${r.status}`)
    err.code    = d.error
    err.payload = d
    throw err
  }
  return d
}

const CHIPS = ['Slow service','Food quality','Cleanliness','High pricing','Ambience','Staff behaviour']

export default function CustomerReview() {
  const p          = new URLSearchParams(window.location.search)
  const brandId    = p.get('brand')
  const tableLabel = p.get('t') || ''

  // ── Core state ───────────────────────────────────────────────
  const [brand,      setBrand]     = useState(null)
  const [brandErr,   setBrandErr]  = useState('')
  const [screen,     setScreen]    = useState('welcome')
  const [user,       setUser]      = useState(null)
  const [token,      setToken]     = useState(null)

  // ── Review flow ──────────────────────────────────────────────
  const [rating,     setRating]    = useState(0)
  const [hovered,    setHovered]   = useState(0)
  const [review,     setReview]    = useState('')
  const [chips,      setChips]     = useState([])
  const [fbMsg,      setFbMsg]     = useState('')

  // ── Verification ─────────────────────────────────────────────
  const [pollStep,   setPollStep]  = useState(0)
  const [secsLeft,   setSecsLeft]  = useState(120)
  const [coupon,     setCoupon]    = useState(null)
  const [reviewUrl,  setReviewUrl] = useState('')
  const [submitting, setSubmit]    = useState(false)
  const [expiredMsg, setExpiredMsg]= useState('')
  const [alreadyDone,setAlreadyDone]=useState(null)

  // ── Copy ─────────────────────────────────────────────────────
  const [copied,     setCopied]    = useState(false)
  const [clipOk,     setClipOk]    = useState(false)

  // ── Google Sign-In ───────────────────────────────────────────
  const [gState,     setGState]    = useState('idle') // idle|loading|error
  const [gError,     setGError]    = useState('')

  const pollRef   = useRef(null)
  const timerRef  = useRef(null)
  const btnDiv    = useRef(null)
  const gInited   = useRef(false)

  // ── Load brand + cached user ─────────────────────────────────
  useEffect(() => {
    if (!brandId) { setBrandErr('No brand ID. Scan the QR again.'); return }
    apiCall('GET', `/api/brands/${brandId}`)
      .then(setBrand)
      .catch(e => setBrandErr(e.message))
    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t && u) try { setToken(t); setUser(JSON.parse(u)) } catch {}
  }, [brandId])

  // ── Google Sign-In init ──────────────────────────────────────
  const onCredential = async ({ credential }) => {
    setGState('loading'); setGError('')
    try {
      const data = await apiCall('POST', '/api/auth/google-id-token', { id_token: credential })
      localStorage.setItem('rr_token', data.token)
      localStorage.setItem('rr_user', JSON.stringify(data.user))
      setToken(data.token); setUser(data.user)
      setScreen('rating'); setGState('idle')
    } catch(e) { setGError(e.message); setGState('error') }
  }

  const initGoogle = () => {
    if (gInited.current || !window.google?.accounts?.id) return
    gInited.current = true
    const prev = (() => { try { return JSON.parse(localStorage.getItem('rr_user')) } catch { return null } })()
    window.google.accounts.id.initialize({
      client_id: GCID, callback: onCredential,
      auto_select: true, cancel_on_tap_outside: false,
      itp_support: true, login_hint: prev?.email || '',
    })
    if (btnDiv.current) {
      window.google.accounts.id.renderButton(btnDiv.current, {
        type:'standard', theme:'filled_blue', size:'large',
        text:'continue_with', shape:'rectangular', width: 340,
      })
    }
    window.google.accounts.id.prompt()
  }

  useEffect(() => {
    if (user || screen !== 'welcome') return
    if (!document.querySelector('script[src*="gsi/client"]')) {
      const s = document.createElement('script')
      s.src = 'https://accounts.google.com/gsi/client'
      s.async = true; s.defer = true
      document.head.appendChild(s)
    }
    const t = setInterval(() => {
      if (window.google?.accounts?.id && btnDiv.current) { clearInterval(t); initGoogle() }
    }, 150)
    return () => clearInterval(t)
  }, [screen, user])

  const switchAccount = () => {
    localStorage.removeItem('rr_token'); localStorage.removeItem('rr_user')
    setUser(null); setToken(null); setGState('idle'); setGError('')
    gInited.current = false
    window.google?.accounts?.id?.disableAutoSelect()
    window.google?.accounts?.id?.cancel()
    if (btnDiv.current) btnDiv.current.innerHTML = ''
    setTimeout(() => initGoogle(), 100)
  }

  // ── Rating selection ─────────────────────────────────────────
  const handleRate = n => {
    setRating(n)
    setTimeout(() => setScreen(n >= 4 ? 'google' : 'feedback'), 200)
  }

  // ── Submit: open Maps + start session ────────────────────────
  const handleSubmit = async () => {
    if (!review.trim() || submitting) return
    setSubmit(true)

    // Google AccountChooser forces correct account before Maps
    const email        = user?.email || ''
    const reviewTarget = brand?.google_place_id
      ? `https://search.google.com/local/writereview?placeid=${brand.google_place_id}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand?.name || '')}`
    const gmUrl = email
      ? `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(email)}&continue=${encodeURIComponent(reviewTarget)}`
      : reviewTarget

    setReviewUrl(gmUrl)
    try { await navigator.clipboard.writeText(review); setClipOk(true) } catch {}
    window.open(gmUrl, '_blank')
    setScreen('verifying'); setPollStep(0); setSecsLeft(120)

    try {
      const sess = await apiCall('POST', '/api/verify/session',
        { brand_id: brandId, review_text: review, stars: rating }, token)
      startPolling(sess.session_id)
      startCountdown()
    } catch(e) {
      if (e.code === 'already_reviewed') {
        setAlreadyDone(e.payload)
        setScreen('already_done')
      } else {
        setExpiredMsg(e.message)
        setScreen('expired')
      }
      setSubmit(false)
    }
  }

  const startCountdown = () => {
    clearInterval(timerRef.current)
    let s = 120
    timerRef.current = setInterval(() => {
      s = Math.max(0, s - 1); setSecsLeft(s)
      if (s <= 0) clearInterval(timerRef.current)
    }, 1000)
  }

  const startPolling = sid => {
    clearInterval(pollRef.current)
    let step = 0
    pollRef.current = setInterval(async () => {
      step = Math.min(step + 1, 3); setPollStep(step)
      try {
        const r = await apiCall('GET', `/api/verify/poll/${sid}`, null, token)
        if (r.seconds_left !== undefined) setSecsLeft(r.seconds_left)
        if (r.status === 'verified') {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          setCoupon(r.coupon); setScreen('reward')
        } else if (r.status === 'expired') {
          clearInterval(pollRef.current); clearInterval(timerRef.current)
          setExpiredMsg(r.message || 'No review detected in 2 minutes.')
          setScreen('expired')
        }
      } catch(e) { console.error('poll:', e.message) }
    }, 3000)
  }

  const handleFeedback = async () => {
    try { await apiCall('POST', '/api/verify/feedback', { brand_id: brandId, stars: rating, chips, message: fbMsg }, token) } catch {}
    setScreen('feedback_done')
  }

  useEffect(() => () => { clearInterval(pollRef.current); clearInterval(timerRef.current) }, [])

  // ── Derived ──────────────────────────────────────────────────
  const active = hovered || rating
  const step   = { welcome:0, rating:1, google:2, verifying:3, reward:4 }[screen] || 0
  const pct    = Math.max(0, Math.min(100, ((120 - secsLeft) / 120) * 100))

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(233,184,74,.09),transparent),#07090E;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;min-height:100vh}
    .w{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}
    .card{width:100%;max-width:400px;background:#0C1018;border:1px solid rgba(255,255,255,.08);border-radius:24px;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.8)}
    .gl{height:2px;background:linear-gradient(90deg,transparent,#E9B84A 40%,transparent)}
    .hd{padding:20px 22px 14px;text-align:center;border-bottom:1px solid rgba(255,255,255,.05)}
    .rrb{display:inline-flex;align-items:center;gap:5px;background:rgba(233,184,74,.1);border:1px solid rgba(233,184,74,.22);border-radius:100px;padding:3px 12px;margin-bottom:10px}
    .dot{width:6px;height:6px;border-radius:50%;background:#E9B84A;animation:bl 2s infinite} @keyframes bl{0%,100%{opacity:1}50%{opacity:.3}}
    .rrl{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#E9B84A}
    .bic{width:52px;height:52px;border-radius:14px;background:#161D28;border:1px solid rgba(255,255,255,.07);margin:0 auto 10px;display:flex;align-items:center;justify-content:center;font-size:24px}
    .bn{font-family:'Fraunces',serif;font-size:18px;font-weight:900;margin-bottom:3px}
    .bs{font-size:11px;color:rgba(237,233,226,.4)}
    .pg{display:flex;gap:4px;padding:10px 22px 0}
    .sg{flex:1;height:3px;border-radius:100px;background:rgba(255,255,255,.06);transition:background .4s}
    .sg.d{background:#E9B84A} .sg.a{background:rgba(233,184,74,.35)}
    .body{padding:18px 20px 20px}
    .scr{animation:fi .3s ease both} @keyframes fi{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .btn{width:100%;padding:13px;border-radius:12px;background:linear-gradient(135deg,#b87a20,#E9B84A);color:#07090E;border:none;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:8px;transition:all .18s}
    .btn:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 22px rgba(233,184,74,.3)}
    .btn:disabled{opacity:.45;cursor:not-allowed}
    .btn.sec{background:transparent;border:1px solid rgba(255,255,255,.12);color:rgba(237,233,226,.6);font-size:12px;padding:9px}
    .btn.sec:hover:not(:disabled){background:rgba(255,255,255,.05);transform:none;box-shadow:none}
    .star{width:48px;height:48px;border-radius:13px;background:#161D28;border:2px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:20px;cursor:pointer;transition:all .15s;user-select:none}
    .star:hover,.star.on{border-color:#E9B84A;background:rgba(233,184,74,.1);transform:scale(1.08) translateY(-2px)}
    .ta{width:100%;background:#161D28;border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px 14px;color:#EDE9E2;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;resize:none;height:88px;outline:none;margin-bottom:12px}
    .ta:focus{border-color:rgba(233,184,74,.35)}
    .ta::placeholder{color:rgba(237,233,226,.28)}
    .ring{position:absolute;inset:-6px;border-radius:50%;border:2px solid transparent;border-top-color:#E9B84A;animation:sp 1.2s linear infinite} @keyframes sp{to{transform:rotate(360deg)}}
    .cpn{background:linear-gradient(135deg,rgba(233,184,74,.08),rgba(233,184,74,.02));border:2px dashed rgba(233,184,74,.3);border-radius:18px;padding:18px;text-align:center;margin-bottom:12px}
    .chip{padding:5px 12px;border-radius:100px;border:1px solid rgba(255,255,255,.07);background:#161D28;font-size:12px;color:rgba(237,233,226,.6);cursor:pointer;transition:all .15s;display:inline-block;margin:3px}
    .chip.on{border-color:rgba(233,184,74,.3);background:rgba(233,184,74,.08);color:#E9B84A}
    .srow{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;margin-bottom:6px;border:1px solid;transition:all .4s}
    .acct{background:#161D28;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px}
    .av{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4285F4,#34A853);display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:white;flex-shrink:0}
    .warn{background:rgba(233,184,74,.06);border:1px solid rgba(233,184,74,.18);border-radius:10px;padding:10px 14px;font-size:12px;line-height:1.7;margin-bottom:12px}
    .ft{padding:6px 22px 14px;text-align:center;font-size:10px;color:rgba(237,233,226,.1)}
    @keyframes pop{0%{transform:scale(.4);opacity:0}75%{transform:scale(1.1)}100%{transform:scale(1);opacity:1}}
    #gbtn>div{width:100%!important} #gbtn iframe{width:100%!important;border-radius:10px!important}
  `

  if (brandErr) return (
    <><style>{S}</style><div className="w"><div className="card"><div className="gl"/>
      <div style={{padding:40,textAlign:'center'}}>
        <div style={{fontSize:40,marginBottom:12}}>❌</div>
        <div style={{fontSize:15,fontWeight:700,marginBottom:8}}>Invalid QR Code</div>
        <div style={{fontSize:12,color:'rgba(237,233,226,.4)',lineHeight:1.7}}>{brandErr}</div>
      </div>
    </div></div></>
  )
  if (!brand) return (
    <><style>{S}</style>
    <div className="w" style={{flexDirection:'column',gap:12,color:'rgba(237,233,226,.35)'}}>
      <div style={{width:36,height:36,borderRadius:'50%',border:'2px solid rgba(233,184,74,.3)',borderTopColor:'#E9B84A',animation:'sp 1s linear infinite'}}/>
      <span style={{fontSize:13}}>Loading...</span>
    </div></>
  )

  return (<><style>{S}</style>
    <div className="w"><div className="card">
      <div className="gl"/>
      <div className="hd">
        <div className="rrb"><div className="dot"/><span className="rrl">ReviewRise</span></div>
        <div className="bic">{brand.emoji}</div>
        <div className="bn">{brand.name}</div>
        <div className="bs">{brand.location}{tableLabel ? ` · ${tableLabel}` : ''}</div>
      </div>

      {!['reward','feedback_done','expired','already_done'].includes(screen) && (
        <div className="pg">
          {[1,2,3,4].map(i => (
            <div key={i} className={`sg ${step>i?'d':step===i?'a':''}`}/>
          ))}
        </div>
      )}

      <div className="body">

        {/* ══ WELCOME ════════════════════════════════════════ */}
        {screen==='welcome' && (
          <div className="scr">
            <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,textAlign:'center',marginBottom:12,lineHeight:1.2}}>
              Scan · Review · <span style={{color:'#E9B84A'}}>Earn {brand.reward_offer}</span>
            </div>
            <div style={{background:'rgba(233,184,74,.06)',border:'1px solid rgba(233,184,74,.15)',borderRadius:14,padding:14,marginBottom:14,display:'flex',gap:12,alignItems:'center'}}>
              <div style={{fontSize:28}}>🎁</div>
              <div>
                <div style={{fontWeight:700,fontSize:15,color:'#E9B84A'}}>{brand.reward_offer}</div>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)'}}>Min ₹{brand.reward_min_order} · Valid {brand.coupon_validity_days} days</div>
              </div>
            </div>
            <div style={{fontSize:12,color:'rgba(237,233,226,.4)',lineHeight:2,background:'#161D28',borderRadius:12,padding:'11px 14px',marginBottom:16}}>
              <span style={{color:'#E9B84A',fontWeight:700}}>①</span> Sign in with Google<br/>
              <span style={{color:'#E9B84A',fontWeight:700}}>②</span> Rate &amp; write your review<br/>
              <span style={{color:'#E9B84A',fontWeight:700}}>③</span> Post on Google Maps → reward unlocked ✓
            </div>

            {user ? (
              <>
                <div className="acct">
                  <div className="av">{user.name?.[0]}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:13}}>{user.name}</div>
                    <div style={{fontSize:11,color:'#E9B84A',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</div>
                  </div>
                  <div style={{fontSize:10,color:'rgba(61,214,140,.8)',fontWeight:700}}>✓</div>
                </div>
                <button className="btn" onClick={()=>setScreen('rating')}>
                  Continue as {user.name.split(' ')[0]} →
                </button>
                <button className="btn sec" onClick={switchAccount}>Switch Google account</button>
              </>
            ) : gState==='loading' ? (
              <div style={{height:46,borderRadius:12,background:'#fff',display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:8}}>
                <div style={{width:18,height:18,borderRadius:'50%',border:'2px solid #ddd',borderTopColor:'#4285F4',animation:'sp .8s linear infinite'}}/>
                <span style={{fontSize:13,fontWeight:700,color:'#111'}}>Signing in...</span>
              </div>
            ) : (
              <>
                <div id="gbtn" ref={btnDiv} style={{width:'100%',minHeight:46,marginBottom:8}}/>
                {gState==='error' && (
                  <div style={{background:'rgba(240,119,119,.1)',border:'1px solid rgba(240,119,119,.25)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'#F07777',lineHeight:1.6}}>
                    ⚠ {gError}
                  </div>
                )}
                <p style={{fontSize:11,color:'rgba(237,233,226,.25)',textAlign:'center',marginTop:6}}>Your Google account signs in automatically</p>
              </>
            )}
          </div>
        )}

        {/* ══ RATING ═════════════════════════════════════════ */}
        {screen==='rating' && (
          <div className="scr">
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:5}}>How was your experience?</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',marginBottom:18}}>Only 4★ or 5★ reviews earn rewards</p>
            <div style={{display:'flex',justifyContent:'center',gap:10,marginBottom:12}}>
              {[1,2,3,4,5].map(n=>(
                <div key={n} className={`star ${active>=n?'on':''}`}
                  onMouseEnter={()=>setHovered(n)} onMouseLeave={()=>setHovered(0)}
                  onClick={()=>handleRate(n)}>
                  {active>=n?'⭐':'☆'}
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',fontSize:13,fontWeight:600,minHeight:20,color:'#E9B84A'}}>
              {active ? ['','Poor 😞','Below Average 😕','Average 😐','Good 😊','Excellent! 🤩'][active] : 'Tap to rate'}
            </div>
            {active >= 4 && (
              <div style={{marginTop:12,padding:10,background:'rgba(233,184,74,.07)',border:'1px solid rgba(233,184,74,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                ✨ Write a review → earn <strong style={{color:'#E9B84A'}}>{brand.reward_offer}</strong>
              </div>
            )}
            {active > 0 && active < 4 && (
              <div style={{marginTop:12,padding:10,background:'rgba(240,119,119,.07)',border:'1px solid rgba(240,119,119,.15)',borderRadius:10,fontSize:12,color:'rgba(237,233,226,.6)',textAlign:'center'}}>
                We're sorry! Share feedback privately with the management.
              </div>
            )}
          </div>
        )}

        {/* ══ WRITE REVIEW ════════════════════════════════════ */}
        {screen==='google' && (
          <div className="scr">
            <div className="warn">
              <div style={{fontWeight:700,color:'#E9B84A',marginBottom:6}}>⚠ Use this account on Google Maps:</div>
              <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(0,0,0,.2)',borderRadius:8,padding:'7px 10px'}}>
                <div className="av" style={{width:26,height:26,fontSize:11}}>{user?.name?.[0]}</div>
                <span style={{fontWeight:700,fontSize:12,color:'#EDE9E2',wordBreak:'break-all'}}>{user?.email}</span>
              </div>
              <div style={{fontSize:11,color:'rgba(237,233,226,.45)',marginTop:5}}>
                If Maps shows a different account → tap profile → switch to this email → then post.
              </div>
            </div>

            <div style={{background:'#161D28',borderRadius:12,padding:'10px 12px',display:'flex',alignItems:'center',gap:10,marginBottom:12,border:'1px solid rgba(255,255,255,.05)'}}>
              <span style={{fontSize:20}}>{brand.emoji}</span>
              <div>
                <div style={{fontWeight:700,fontSize:13}}>{brand.name}</div>
                <div style={{color:'#FBBC04',fontSize:13}}>{'★'.repeat(rating)}{'☆'.repeat(5-rating)}</div>
              </div>
            </div>

            <textarea className="ta"
              placeholder={`What did you love about ${brand.name}? Write your review here...`}
              value={review} onChange={e=>setReview(e.target.value)}/>

            {review.trim() && (
              <div style={{marginBottom:12}}>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4,display:'flex',justifyContent:'space-between'}}>
                  <span>👆 Tap box to copy:</span>
                  {clipOk && <span style={{color:'#3DD68C',fontWeight:700}}>✓ Copied!</span>}
                </div>
                <textarea readOnly value={review}
                  onFocus={e=>e.target.select()}
                  onClick={e=>{
                    e.target.select()
                    navigator.clipboard?.writeText(review).then(()=>{setClipOk(true);setTimeout(()=>setClipOk(false),8000)})
                    try{document.execCommand('copy')}catch{}
                  }}
                  style={{width:'100%',background:clipOk?'rgba(61,214,140,.08)':'rgba(233,184,74,.05)',border:`2px solid ${clipOk?'rgba(61,214,140,.5)':'rgba(233,184,74,.4)'}`,borderRadius:10,padding:'10px 12px',color:clipOk?'#3DD68C':'#EDE9E2',fontSize:13,fontFamily:'inherit',resize:'none',height:66,cursor:'copy',outline:'none'}}
                />
              </div>
            )}

            <button className="btn" disabled={!review.trim() || submitting} onClick={handleSubmit}>
              {submitting ? '🔄 Opening Maps...' : '🗺️ Open Google Maps & Post Review ↗'}
            </button>
            <p style={{fontSize:11,color:'rgba(237,233,226,.22)',textAlign:'center'}}>Opens as {user?.email} · Must be 4★ or 5★ to earn reward</p>
          </div>
        )}

        {/* ══ VERIFYING ══════════════════════════════════════ */}
        {screen==='verifying' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{width:66,height:66,borderRadius:'50%',background:'#161D28',border:'2px solid rgba(233,184,74,.2)',margin:'0 auto 12px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,position:'relative'}}>
              🔍<div className="ring"/>
            </div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,marginBottom:4}}>Verifying your review</div>
            <p style={{fontSize:12,color:'rgba(237,233,226,.4)',marginBottom:10}}>Checking Google Maps every 3 seconds</p>

            {/* 2-minute countdown bar */}
            <div style={{background:'rgba(255,255,255,.05)',borderRadius:100,height:6,marginBottom:4,overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:100,background:secsLeft>30?'#E9B84A':'#F07777',width:`${100-pct}%`,transition:'width 1s linear'}}/>
            </div>
            <div style={{fontSize:12,fontWeight:700,color:secsLeft>30?'#E9B84A':'#F07777',marginBottom:14}}>
              {secsLeft > 0 ? `⏱ ${secsLeft}s to post your review` : '⏱ Time\'s up'}
            </div>

            {reviewUrl && (
              <a href={reviewUrl} target="_blank" rel="noreferrer"
                style={{display:'block',background:'#4285F4',borderRadius:12,padding:'12px 16px',fontSize:13,color:'white',textDecoration:'none',marginBottom:12,fontWeight:700}}>
                📝 Open Google Maps Again ↗
              </a>
            )}

            {review && (
              <div style={{background:'#161D28',border:'1px solid rgba(255,255,255,.06)',borderRadius:10,padding:'10px 12px',marginBottom:12,textAlign:'left'}}>
                <div style={{fontSize:10,color:'rgba(237,233,226,.3)',marginBottom:4,textTransform:'uppercase',letterSpacing:'.05em'}}>Paste this on Google Maps:</div>
                <div style={{fontSize:12,color:'rgba(237,233,226,.7)',lineHeight:1.6,marginBottom:8}}>{review}</div>
                <button onClick={()=>{navigator.clipboard?.writeText(review);setClipOk(true);setTimeout(()=>setClipOk(false),3000)}}
                  style={{fontSize:11,background:clipOk?'rgba(61,214,140,.1)':'rgba(255,255,255,.06)',border:`1px solid ${clipOk?'rgba(61,214,140,.3)':'rgba(255,255,255,.08)'}`,borderRadius:6,padding:'4px 12px',color:clipOk?'#3DD68C':'rgba(237,233,226,.6)',cursor:'pointer',fontFamily:'inherit',fontWeight:600}}>
                  {clipOk?'✓ Copied!':'Copy Text'}
                </button>
              </div>
            )}

            {[
              '📡 Connecting to Google Places API',
              '🔍 Matching your review text on Google',
              '⭐ Confirming 4-5★ rating & issuing reward',
            ].map((txt,i) => (
              <div key={i} className="srow" style={{
                background: pollStep>i?'rgba(61,214,140,.06)':pollStep===i?'rgba(233,184,74,.06)':'#161D28',
                borderColor: pollStep>i?'rgba(61,214,140,.2)':pollStep===i?'rgba(233,184,74,.2)':'rgba(255,255,255,.04)',
                textAlign:'left',
              }}>
                <span style={{flex:1,fontSize:12}}>{txt}</span>
                <span style={{fontSize:11,fontWeight:600,color:pollStep>i?'#3DD68C':pollStep===i?'#E9B84A':'rgba(237,233,226,.2)'}}>
                  {pollStep>i?'✓':pollStep===i?'Checking...':'Waiting'}
                </span>
              </div>
            ))}

            <button className="btn sec" style={{marginTop:14}} onClick={()=>{
              clearInterval(pollRef.current); clearInterval(timerRef.current)
              setScreen('google'); setSubmit(false)
            }}>← Go back &amp; fix</button>
          </div>
        )}

        {/* ══ REWARD ═════════════════════════════════════════ */}
        {screen==='reward' && (
          <div className="scr">
            <div style={{textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:52,animation:'pop .6s both'}}>🏆</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:8}}>
                Reward <span style={{color:'#E9B84A'}}>Unlocked!</span>
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:5,background:'rgba(61,214,140,.09)',border:'1px solid rgba(61,214,140,.2)',borderRadius:100,padding:'3px 14px',fontSize:11,fontWeight:700,color:'#3DD68C'}}>
                ✓ Google Review Verified
              </div>
            </div>
            <div className="cpn">
              <div style={{fontSize:10,textTransform:'uppercase',letterSpacing:'.1em',color:'rgba(237,233,226,.35)',marginBottom:4}}>Your Reward Code</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:34,fontWeight:900,color:'#E9B84A',lineHeight:1,marginBottom:4}}>{coupon?.discount}</div>
              <div style={{fontSize:12,color:'rgba(237,233,226,.38)',marginBottom:14}}>min ₹{coupon?.min_order} · valid {brand.coupon_validity_days} days</div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#0C1018',border:'1px solid rgba(255,255,255,.08)',borderRadius:10,padding:'10px 14px'}}>
                <span style={{fontFamily:'monospace',fontSize:18,fontWeight:700,color:'#E9B84A',letterSpacing:'.1em'}}>{coupon?.code}</span>
                <button onClick={()=>{navigator.clipboard?.writeText(coupon?.code);setCopied(true);setTimeout(()=>setCopied(false),2000)}}
                  style={{fontSize:11,background:'#161D28',border:'1px solid rgba(255,255,255,.1)',borderRadius:6,padding:'4px 12px',color:'rgba(237,233,226,.6)',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>
                  {copied?'✓ Copied':'Copy'}
                </button>
              </div>
            </div>
            <p style={{fontSize:11,color:'rgba(237,233,226,.32)',textAlign:'center',marginBottom:12}}>📱 Show this to the cashier on your next visit</p>
            <button className="btn" onClick={()=>window.location.href='/'}>
              Explore More Restaurants &amp; Win Rewards →
            </button>
          </div>
        )}

        {/* ══ ALREADY DONE ════════════════════════════════════ */}
        {screen==='already_done' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12,animation:'pop .5s both'}}>⭐</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:19,fontWeight:900,marginBottom:8}}>Review Already Given!</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:16}}>
              You already reviewed <strong style={{color:'#E9B84A'}}>{brand.name}</strong> and earned your reward.
            </p>
            {alreadyDone?.coupon_code && (
              <div className="cpn" style={{marginBottom:16}}>
                <div style={{fontSize:11,color:'rgba(237,233,226,.4)',marginBottom:4}}>Your existing reward:</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:26,fontWeight:900,color:'#E9B84A',marginBottom:4}}>
                  {alreadyDone.coupon_discount}
                </div>
                <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,letterSpacing:'.1em',
                  color:alreadyDone.coupon_status==='active'?'#E9B84A':'rgba(237,233,226,.35)'}}>
                  {alreadyDone.coupon_code}
                </div>
                <div style={{fontSize:11,color:'rgba(237,233,226,.3)',marginTop:4}}>
                  {alreadyDone.coupon_status==='redeemed'?'✓ Already used':'● Active — show to cashier'}
                </div>
              </div>
            )}
            <button className="btn" onClick={()=>window.location.href='/'}>
              Explore More Restaurants &amp; Win Rewards →
            </button>
          </div>
        )}

        {/* ══ EXPIRED ════════════════════════════════════════ */}
        {screen==='expired' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:12}}>⏱️</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:700,marginBottom:8,color:'#F07777'}}>
              Review Not Received
            </div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:20}}>
              {expiredMsg || 'No review detected within 2 minutes.'}<br/><br/>
              Make sure you posted from <strong style={{color:'#E9B84A'}}>{user?.email}</strong> on Google Maps with 4★ or 5★.
            </p>
            <button className="btn" onClick={()=>{
              setScreen('google'); setReview(''); setSubmit(false); setSecsLeft(120)
            }}>Try Again</button>
            <button className="btn sec" onClick={()=>window.location.href='/'}>Explore Other Restaurants →</button>
          </div>
        )}

        {/* ══ PRIVATE FEEDBACK ════════════════════════════════ */}
        {screen==='feedback' && (
          <div className="scr">
            <div style={{textAlign:'center',fontSize:38,marginBottom:10}}>🤝</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,textAlign:'center',marginBottom:5}}>Help us improve</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',textAlign:'center',lineHeight:1.7,marginBottom:14}}>
              Sent privately to management — never public.
            </p>
            <div style={{marginBottom:14}}>
              {CHIPS.map(c=>(
                <span key={c} className={`chip ${chips.includes(c)?'on':''}`}
                  onClick={()=>setChips(prev=>prev.includes(c)?prev.filter(x=>x!==c):[...prev,c])}>
                  {c}
                </span>
              ))}
            </div>
            <textarea className="ta" placeholder="Add details (optional)..." value={fbMsg} onChange={e=>setFbMsg(e.target.value)}/>
            <button className="btn" onClick={handleFeedback}>Send Private Feedback</button>
          </div>
        )}

        {screen==='feedback_done' && (
          <div className="scr" style={{textAlign:'center'}}>
            <div style={{fontSize:46,marginBottom:10}}>💌</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:700,marginBottom:6}}>Thank you!</div>
            <p style={{fontSize:13,color:'rgba(237,233,226,.5)',lineHeight:1.7,marginBottom:16}}>
              Your feedback was sent privately to management.
            </p>
            <button className="btn" onClick={()=>window.location.href='/'}>
              Explore More Restaurants &amp; Win Rewards →
            </button>
          </div>
        )}

      </div>
      <div className="ft">Powered by ReviewRise · SoftCraft Solutions</div>
    </div></div></>
  )
}
