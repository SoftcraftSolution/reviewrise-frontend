import { useState, useEffect } from 'react'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'

const apiReq = async (path, token) => {
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization:`Bearer ${token}` } : {}
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default function DiscoveryApp({ user: propUser }) {
  const [brands,   setBrands]  = useState([])
  const [banners,  setBanners] = useState([])
  const [ads,      setAds]     = useState([])
  const [coupons,  setCoupons] = useState([])
  const [page,     setPage]    = useState('home')
  const [selected, setSelected]= useState(null)
  const [loading,  setLoading] = useState(true)
  const [cpnLoading,setCpnLoading]=useState(false)
  const [watching, setWatching]= useState(null)
  const [progress, setProgress]= useState(0)
  const [adsWatched,setAdsWatched]=useState(0)
  const [earned,   setEarned]  = useState(null)
  const [search,   setSearch]  = useState('')
  const [user,     setUser]    = useState(propUser)
  const [token,    setToken]   = useState(null)

  useEffect(()=>{
    const t = localStorage.getItem('rr_token')
    const u = localStorage.getItem('rr_user')
    if (t) setToken(t)
    if (u) try { setUser(JSON.parse(u)) } catch{}
  },[])

  useEffect(()=>{
    Promise.all([
      apiReq('/api/brands'),
      apiReq('/api/banners').catch(()=>[]),
      apiReq('/api/ads').catch(()=>[]),
    ]).then(([b,bn,a])=>{ setBrands(b); setBanners(bn); setAds(a) })
    .catch(console.error)
    .finally(()=>setLoading(false))
  },[])

  // Load user coupons when on rewards tab
  useEffect(()=>{
    if (page==='rewards' && token && coupons.length===0) {
      setCpnLoading(true)
      apiReq('/api/coupons/my', token)
        .then(c => setCoupons(c))
        .catch(console.error)
        .finally(()=>setCpnLoading(false))
    }
  },[page, token])

  const watchAd = async (ad) => {
    setWatching(ad); setProgress(0)
    const t = setInterval(()=>setProgress(p=>{
      if(p>=100){clearInterval(t);return 100}
      return p+3.3
    }),100)
    setTimeout(async()=>{
      clearInterval(t); setProgress(100)
      setTimeout(async()=>{
        const n = adsWatched+1
        setAdsWatched(n); setWatching(null); setProgress(0)
        if(n>=3){
          try{
            const res = await fetch(`${BASE}/api/ads/${ad.id}/view`,{
              method:'POST', headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}
            })
            const r = await res.json()
            if(r.reward){ setEarned(r.reward); setAdsWatched(0) }
            else { setAdsWatched(0) }
          }catch{
            setEarned({code:'ADS'+Math.random().toString(36).toUpperCase().slice(2,7),discount:'₹50 OFF'})
            setAdsWatched(0)
          }
        }
      },300)
    },3300)
  }

  const filtered = brands.filter(b=>!search||
    b.name?.toLowerCase().includes(search.toLowerCase())||
    b.category?.toLowerCase().includes(search.toLowerCase()))

  const S = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,700;9..144,900&display=swap');
    *{margin:0;padding:0;box-sizing:border-box;}
    :root{--gold:#E9B84A;--green:#3DD68C;--red:#F07777;--text:#EDE9E2;--muted:rgba(237,233,226,.38);--muted2:rgba(237,233,226,.62);}
    body{background:#07090E;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;}
    @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    @keyframes sp{to{transform:rotate(360deg)}}
    .fade{animation:fi .3s ease both;}
    .da{min-height:100vh;background:#07090E;padding-bottom:70px;}
    .top{padding:12px 16px;background:#0C1018;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;gap:10px;}
    .srch{display:flex;align-items:center;gap:8px;background:#161D28;border:1px solid rgba(255,255,255,.07);border-radius:100px;padding:7px 14px;flex:1;max-width:260px;}
    .srch input{background:none;border:none;outline:none;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;font-size:13px;flex:1;width:100%;}
    .srch input::placeholder{color:var(--muted);}
    .cont{padding:14px 14px 0;}
    .sec{font-size:14px;font-weight:800;margin-bottom:10px;margin-top:16px;display:flex;align-items:center;gap:8px;}
    .bnr{border-radius:14px;padding:18px;margin-bottom:8px;cursor:pointer;transition:transform .2s;}
    .bnr:hover{transform:translateY(-1px);}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .bcard{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;}
    .bcard:hover{border-color:rgba(233,184,74,.3);transform:translateY(-2px);}
    .ad-row{background:#161D28;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:border-color .15s;}
    .ad-row:hover{border-color:rgba(233,184,74,.25);}
    .pbg{background:#0a0a0a;border-radius:100px;height:8px;overflow:hidden;margin:8px 0;}
    .pbar{height:100%;background:linear-gradient(90deg,#b87a20,#E9B84A);border-radius:100px;transition:width .1s linear;}
    .bnav{position:fixed;bottom:0;left:0;right:0;background:#0C1018;border-top:1px solid rgba(255,255,255,.06);display:flex;z-index:20;}
    .nbtn{flex:1;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:transparent;font-family:'Bricolage Grotesque',sans-serif;transition:background .15s;}
    .nbtn:hover{background:rgba(255,255,255,.03);}
    .nbtn.on .nlbl{color:var(--gold);}
    .nbtn.on .nic{filter:grayscale(0);}
    .nic{font-size:18px;}
    .nlbl{font-size:10px;font-weight:600;color:var(--muted2);}
    .cbox{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:16px;margin-bottom:10px;}
    .badge{display:inline-flex;align-items:center;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;}
    .badge-g{background:rgba(61,214,140,.09);color:var(--green);border:1px solid rgba(61,214,140,.2);}
    .badge-gold{background:rgba(233,184,74,.1);color:var(--gold);border:1px solid rgba(233,184,74,.2);}
    .badge-red{background:rgba(240,119,119,.09);color:var(--red);border:1px solid rgba(240,119,119,.2);}
    .badge-muted{background:rgba(255,255,255,.06);color:var(--muted2);border:1px solid rgba(255,255,255,.08);}
    .goldbtn{width:100%;padding:12px;border-radius:12px;background:linear-gradient(135deg,#b87a20,#E9B84A);color:#07090E;border:none;font-family:'Bricolage Grotesque',sans-serif;font-size:13px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;}
    .goldbtn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(233,184,74,.3);}
  `

  if(loading) return (
    <><style>{S}</style>
    <div className="da" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'rgba(237,233,226,.4)'}}>
      <div style={{fontSize:36,marginBottom:4}}>⭐</div>
      <div style={{fontSize:13}}>Loading brands...</div>
    </div></>
  )

  return (
    <><style>{S}</style>
    <div className="da">

      {/* TOP BAR */}
      <div className="top">
        <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
          <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#b87a20,#E9B84A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>⭐</div>
          <div style={{fontSize:14,fontWeight:800}}>ReviewRise</div>
        </div>
        <div className="srch">
          <span style={{color:'var(--muted)',fontSize:14}}>🔍</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search brands..."/>
        </div>
        {user ? (
          <div style={{display:'flex',alignItems:'center',gap:6,background:'#161D28',border:'1px solid rgba(255,255,255,.07)',borderRadius:100,padding:'4px 10px 4px 5px',flexShrink:0,cursor:'pointer'}}
            onClick={()=>setPage('rewards')}>
            <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'white'}}>{user.name?.[0]}</div>
            <span style={{fontSize:11,fontWeight:600,color:'var(--muted2)'}}>{user.name.split(' ')[0]}</span>
          </div>
        ) : (
          <button style={{background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'5px 12px',color:'var(--gold)',fontSize:11,fontWeight:700,cursor:'pointer',fontFamily:'inherit',flexShrink:0}}
            onClick={()=>window.location.href='/review'}>
            Scan QR
          </button>
        )}
      </div>

      {/* HOME */}
      {page==='home' && (
        <div className="cont fade">
          {/* BANNERS */}
          {banners.length>0 && (
            <>
              <div className="sec">🔥 Featured Offers</div>
              {banners.map((b,i)=>(
                <div key={b.id} className="bnr"
                  style={{background:`linear-gradient(135deg,${['#1a1200','#0a1520','#140a1a'][i%3]},${['#3a2800','#1a3050','#2a1040'][i%3]})`,border:'1px solid rgba(255,255,255,.06)'}}
                  onClick={()=>{const br=brands.find(x=>x.id===b.brand_id);if(br){setSelected(br);setPage('brand')}}}>
                  <div style={{fontSize:24,marginBottom:5}}>{b.brand_emoji}</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:16,fontWeight:900,color:'white',marginBottom:2}}>{b.title}</div>
                  <div style={{fontSize:12,color:'rgba(255,255,255,.45)'}}>{b.brand_name} · Tap to explore →</div>
                </div>
              ))}
            </>
          )}

          {/* ALL BRANDS */}
          <div className="sec">
            🏪 {search?`Results for "${search}"`: 'All Brands'}
            <span style={{fontSize:12,fontWeight:400,color:'var(--muted)'}}>({filtered.length})</span>
          </div>
          <div className="grid">
            {filtered.map(b=>(
              <div key={b.id} className="bcard" onClick={()=>{setSelected(b);setPage('brand')}}>
                <div style={{fontSize:28,marginBottom:8}}>{b.emoji}</div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{b.name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.category}</div>
                {b.google_rating>0 && <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginBottom:6}}>★ {b.google_rating} · {b.total_reviews} reviews</div>}
                <span style={{fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600}}>🎁 {b.reward_offer}</span>
              </div>
            ))}
            {filtered.length===0 && (
              <div style={{gridColumn:'span 2',padding:40,textAlign:'center',color:'var(--muted)'}}>
                {search ? `No brands found for "${search}"` : 'No brands yet. Check back soon!'}
              </div>
            )}
          </div>

          {/* WATCH ADS */}
          {ads.length>0 && (
            <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,padding:16,marginTop:20,marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:3}}>📺 Watch Ads → Earn Rewards</div>
              <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>Watch 3 ads to earn a free discount coupon</div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
                {[0,1,2].map(i=>(
                  <div key={i} style={{flex:1,height:6,borderRadius:100,background:i<adsWatched?'var(--gold)':'rgba(255,255,255,.08)',transition:'background .4s'}}/>
                ))}
                <span style={{fontSize:11,color:'var(--muted)',whiteSpace:'nowrap'}}>{adsWatched}/3</span>
              </div>
              {watching ? (
                <div style={{background:'#0a0a0a',borderRadius:12,padding:16,textAlign:'center'}}>
                  <div style={{fontSize:24,marginBottom:6}}>{watching.brand_emoji}</div>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:4}}>{watching.title}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:10}}>{watching.description}</div>
                  <div className="pbg"><div className="pbar" style={{width:`${progress}%`}}/></div>
                  <div style={{fontSize:11,color:'var(--muted)'}}>{progress<100?'Watching...':'✓ Done!'}</div>
                </div>
              ) : (
                ads.slice(0,3).map(a=>(
                  <div key={a.id} className="ad-row" onClick={()=>watchAd(a)}>
                    <div style={{fontSize:22}}>{a.brand_emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:12}}>{a.title}</div>
                      <div style={{fontSize:11,color:'var(--muted)'}}>{a.brand_name}</div>
                    </div>
                    <span style={{fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600,whiteSpace:'nowrap'}}>▶ Watch</span>
                  </div>
                ))
              )}
              {earned && (
                <div style={{marginTop:12,background:'rgba(233,184,74,.07)',border:'2px dashed rgba(233,184,74,.3)',borderRadius:14,padding:16,textAlign:'center',animation:'fi .5s both'}}>
                  <div style={{fontSize:26,marginBottom:6}}>🎉</div>
                  <div style={{fontWeight:800,fontSize:14,marginBottom:4}}>Reward Earned!</div>
                  <div style={{fontFamily:'monospace',fontSize:17,fontWeight:700,color:'var(--gold)',marginBottom:4,letterSpacing:'.1em'}}>{earned.code}</div>
                  <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>{earned.discount}</div>
                  <button style={{background:'#161D28',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'5px 14px',color:'var(--muted2)',fontSize:11,cursor:'pointer',fontFamily:'inherit'}}
                    onClick={()=>navigator.clipboard?.writeText(earned.code)}>Copy Code</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* BRAND DETAIL */}
      {page==='brand' && selected && (
        <div className="cont fade">
          <button style={{background:'none',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,padding:'6px 14px',color:'var(--muted2)',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginBottom:16,marginTop:4}}
            onClick={()=>{setPage('home');setSelected(null)}}>← Back</button>
          <div style={{textAlign:'center',marginBottom:20}}>
            <div style={{fontSize:52,marginBottom:10}}>{selected.emoji}</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:5}}>{selected.name}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>{selected.category}{selected.location?` · ${selected.location}`:''}</div>
            <div style={{display:'inline-flex',gap:8,flexWrap:'wrap',justifyContent:'center'}}>
              {selected.google_rating>0&&<span className="badge badge-gold">★ {selected.google_rating}</span>}
              {selected.total_reviews>0&&<span className="badge badge-g">{selected.total_reviews} verified reviews</span>}
            </div>
          </div>
          <div style={{background:'#0C1018',border:'1px solid rgba(233,184,74,.15)',borderRadius:16,padding:20,textAlign:'center',marginBottom:14}}>
            <div style={{fontSize:28,marginBottom:8}}>🎁</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:900,color:'var(--gold)',marginBottom:4}}>{selected.reward_offer}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:14}}>Min ₹{selected.reward_min_order} · Valid {selected.coupon_validity_days} days</div>
            <div style={{fontSize:13,color:'rgba(237,233,226,.55)',lineHeight:1.7,marginBottom:16}}>
              Scan the QR code at the venue, write a genuine Google review,<br/>and get your reward instantly.
            </div>
            {selected.location&&(
              <div style={{background:'rgba(255,255,255,.04)',borderRadius:10,padding:'8px 14px',fontSize:12,color:'var(--muted)',marginBottom:14}}>
                📍 {selected.location}
              </div>
            )}
            <button className="goldbtn" onClick={()=>window.location.href=`/review?brand=${selected.id}`}>
              🗺 Scan QR / Leave a Review →
            </button>
          </div>
        </div>
      )}

      {/* BRANDS LIST PAGE */}
      {page==='brand' && !selected && (
        <div className="cont fade">
          <div className="sec">🏪 All Brands</div>
          <div className="grid">
            {brands.map(b=>(
              <div key={b.id} className="bcard" onClick={()=>setSelected(b)}>
                <div style={{fontSize:28,marginBottom:8}}>{b.emoji}</div>
                <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{b.name}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.category}</div>
                <span style={{fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600}}>🎁 {b.reward_offer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MY REWARDS / PROFILE */}
      {page==='rewards' && (
        <div className="cont fade">
          {user ? (
            <>
              {/* USER PROFILE */}
              <div style={{background:'#0C1018',border:'1px solid rgba(255,255,255,.06)',borderRadius:16,padding:20,marginBottom:16,textAlign:'center'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:800,color:'white',margin:'0 auto 10px'}}>{user.name?.[0]}</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:18,fontWeight:900,marginBottom:2}}>{user.name}</div>
                <div style={{fontSize:12,color:'var(--muted)',marginBottom:12}}>{user.email}</div>
                <div style={{display:'flex',gap:12,justifyContent:'center'}}>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:18,color:'var(--gold)'}}>{coupons.length}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>Coupons</div>
                  </div>
                  <div style={{width:1,background:'rgba(255,255,255,.06)'}}/>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:18,color:'var(--green)'}}>{coupons.filter(c=>c.status==='active').length}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>Active</div>
                  </div>
                  <div style={{width:1,background:'rgba(255,255,255,.06)'}}/>
                  <div style={{textAlign:'center'}}>
                    <div style={{fontWeight:800,fontSize:18,color:'var(--muted2)'}}>{coupons.filter(c=>c.status==='redeemed').length}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>Used</div>
                  </div>
                </div>
              </div>

              <div className="sec">🎟️ My Coupons</div>

              {cpnLoading ? (
                <div style={{textAlign:'center',padding:30,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',gap:10}}>
                  <div style={{width:20,height:20,borderRadius:'50%',border:'2px solid rgba(233,184,74,.3)',borderTopColor:'var(--gold)',animation:'sp 1s linear infinite'}}/>
                  Loading coupons...
                </div>
              ) : coupons.length===0 ? (
                <div style={{textAlign:'center',padding:'40px 20px'}}>
                  <div style={{fontSize:40,marginBottom:12}}>🎟️</div>
                  <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>No coupons yet</div>
                  <div style={{color:'var(--muted)',fontSize:13,marginBottom:20,lineHeight:1.7}}>
                    Scan a QR code at any brand,<br/>write a Google review, and earn your first reward!
                  </div>
                  <button className="goldbtn" style={{maxWidth:240,margin:'0 auto'}} onClick={()=>setPage('home')}>
                    Browse Brands →
                  </button>
                </div>
              ) : (
                coupons.map(c=>(
                  <div key={c.id} className="cbox">
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                      <div style={{fontSize:22}}>{c.emoji||'🏪'}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:13}}>{c.brand_name}</div>
                        <div style={{fontSize:11,color:'var(--muted)'}}>Earned via verified review</div>
                      </div>
                      <span className={`badge ${c.status==='active'?'badge-g':c.status==='redeemed'?'badge-muted':'badge-red'}`}>
                        {c.status==='active'?'● Active':c.status==='redeemed'?'Used':'Expired'}
                      </span>
                    </div>
                    <div style={{background:'rgba(233,184,74,.06)',border:'1px dashed rgba(233,184,74,.25)',borderRadius:12,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                      <div>
                        <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,color:'var(--gold)',lineHeight:1}}>{c.discount}</div>
                        <div style={{fontSize:11,color:'var(--muted)',marginTop:2}}>Min ₹{c.min_order}</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontFamily:'monospace',fontSize:16,fontWeight:700,color:c.status==='active'?'var(--gold)':'var(--muted2)',letterSpacing:'.08em'}}>{c.code}</div>
                        {c.status==='active' && (
                          <button style={{marginTop:4,background:'none',border:'1px solid rgba(233,184,74,.2)',borderRadius:6,padding:'2px 10px',color:'var(--gold)',fontSize:10,cursor:'pointer',fontFamily:'inherit',fontWeight:700}}
                            onClick={()=>{navigator.clipboard?.writeText(c.code);alert('Code copied!')}}>
                            Copy
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{fontSize:11,color:'var(--muted)',display:'flex',justifyContent:'space-between'}}>
                      <span>Expires: {new Date(c.expires_at).toLocaleDateString('en-IN')}</span>
                      <span>Source: {c.source==='review'?'Google Review':'Ad Reward'}</span>
                    </div>
                  </div>
                ))
              )}

              <button style={{width:'100%',padding:'10px',background:'none',border:'1px solid rgba(240,119,119,.2)',borderRadius:10,color:'var(--red)',fontSize:12,cursor:'pointer',fontFamily:'inherit',marginTop:8,fontWeight:600}}
                onClick={()=>{localStorage.clear();setUser(null);setToken(null);setCoupons([])}}>
                ↩ Logout
              </button>
            </>
          ) : (
            <div style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:48,marginBottom:14}}>🔐</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:20,fontWeight:900,marginBottom:8}}>See Your Rewards</div>
              <div style={{color:'var(--muted)',fontSize:13,marginBottom:24,lineHeight:1.7}}>
                Scan a QR code at any brand to login with Google and start earning rewards.
              </div>
              <button className="goldbtn" style={{maxWidth:240,margin:'0 auto'}} onClick={()=>setPage('home')}>
                Browse Brands →
              </button>
            </div>
          )}
        </div>
      )}

      {/* BOTTOM NAV */}
      <div className="bnav">
        {[
          {id:'home',   icon:'🏠', lbl:'Home'},
          {id:'brand',  icon:'🏪', lbl:'Brands'},
          {id:'rewards',icon:'🎟️', lbl:'My Rewards'},
        ].map(n=>(
          <button key={n.id} className={`nbtn ${page===n.id?'on':''}`} onClick={()=>setPage(n.id)}>
            <span className="nic">{n.icon}</span>
            <span className="nlbl">{n.lbl}</span>
          </button>
        ))}
      </div>
    </div></>
  )
}
