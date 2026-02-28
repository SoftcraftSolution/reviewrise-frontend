import { useState, useEffect } from 'react'
import * as api from '../api.js'

export default function DiscoveryApp({ user }) {
  const [brands,  setBrands]  = useState([])
  const [banners, setBanners] = useState([])
  const [ads,     setAds]     = useState([])
  const [page,    setPage]    = useState('home')
  const [selected,setSelected]= useState(null)
  const [loading, setLoading] = useState(true)
  const [watching,setWatching]= useState(null)
  const [progress,setProgress]= useState(0)
  const [adsWatched,setAdsWatched]=useState(0)
  const [earned,  setEarned]  = useState(null)
  const [search,  setSearch]  = useState('')

  useEffect(()=>{
    Promise.all([api.getBrands(), api.getBanners(), api.getAds()])
      .then(([b,bn,a])=>{ setBrands(b); setBanners(bn); setAds(a) })
      .catch(console.error)
      .finally(()=>setLoading(false))
  },[])

  const watchAd = (ad) => {
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
        if(n>=3 && user){
          try{
            const r = await api.watchAd(ad.id)
            if(r.reward){ setEarned(r.reward); setAdsWatched(0) }
          }catch{
            setEarned({code:'ADS'+Math.random().toString(36).toUpperCase().slice(2,7),discount:'₹50 OFF'})
            setAdsWatched(0)
          }
        } else if(n>=3) {
          setEarned({code:'LOGIN'+Math.random().toString(36).toUpperCase().slice(2,6),discount:'₹50 OFF'})
          setAdsWatched(0)
        }
      },300)
    },3300)
  }

  const filtered = brands.filter(b => !search || b.name?.toLowerCase().includes(search.toLowerCase()) || b.category?.toLowerCase().includes(search.toLowerCase()))

  const S = `
    .da{min-height:100vh;background:#07090E;padding-bottom:70px;}
    .da-top{padding:12px 16px;background:#0C1018;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:10;}
    .da-search{display:flex;align-items:center;gap:8px;background:#161D28;border:1px solid rgba(255,255,255,.07);border-radius:100px;padding:7px 14px;flex:1;max-width:280px;}
    .da-search input{background:none;border:none;outline:none;color:var(--text);font-family:'Bricolage Grotesque',sans-serif;font-size:13px;flex:1;}
    .da-search input::placeholder{color:var(--muted);}
    .da-c{padding:14px 14px 0;}
    .da-sec{font-size:14px;font-weight:800;margin-bottom:10px;margin-top:18px;display:flex;align-items:center;gap:8px;}
    .da-banner{border-radius:14px;padding:18px;margin-bottom:8px;cursor:pointer;background:linear-gradient(135deg,#1a1200,#3a2800);border:1px solid rgba(233,184,74,.15);}
    .da-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;}
    .da-card{background:#0C1018;border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:14px;cursor:pointer;transition:all .2s;}
    .da-card:hover{border-color:rgba(233,184,74,.3);background:#111820;transform:translateY(-1px);}
    .da-ad-row{background:#161D28;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s;}
    .da-ad-row:hover{border-color:rgba(233,184,74,.25);}
    .da-prog-bg{background:#0a0a0a;border-radius:100px;height:8px;overflow:hidden;margin:8px 0;}
    .da-prog-bar{height:100%;background:linear-gradient(90deg,#b87a20,#E9B84A);border-radius:100px;transition:width .1s linear;}
    .da-bnav{position:fixed;bottom:0;left:0;right:0;background:#0C1018;border-top:1px solid rgba(255,255,255,.06);display:flex;z-index:20;}
    .da-bnav-btn{flex:1;padding:10px 8px;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;border:none;background:transparent;font-family:'Bricolage Grotesque',sans-serif;}
    .da-bnav-btn.on .da-bnav-lbl{color:var(--gold);}
    .da-bnav-ic{font-size:18px;}
    .da-bnav-lbl{font-size:10px;font-weight:600;color:var(--muted2);}
  `

  if(loading) return (
    <>
      <style>{S}</style>
      <div className="da" style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'var(--muted)'}}>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>⭐</div>
          <div>Loading brands...</div>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{S}</style>
      <div className="da">
        {/* TOP BAR */}
        <div className="da-top">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#b87a20,#E9B84A)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>⭐</div>
            <div style={{fontSize:14,fontWeight:800}}>ReviewRise</div>
          </div>
          <div className="da-search">
            <span style={{color:'var(--muted)',fontSize:14}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search brands..."/>
          </div>
          {user ? (
            <div style={{display:'flex',alignItems:'center',gap:6,background:'#161D28',border:'1px solid rgba(255,255,255,.07)',borderRadius:100,padding:'5px 10px 5px 6px'}}>
              <div style={{width:22,height:22,borderRadius:'50%',background:'linear-gradient(135deg,#4285F4,#34A853)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:800,color:'white'}}>{user.name?.[0]}</div>
              <span style={{fontSize:12,fontWeight:600,color:'var(--muted2)'}}>{user.name.split(' ')[0]}</span>
            </div>
          ) : (
            <button className="btn sm" onClick={()=>window.location.href='/brand'} style={{fontSize:11}}>Login</button>
          )}
        </div>

        {/* HOME PAGE */}
        {page==='home' && (
          <div className="da-c fade">
            {/* BANNERS */}
            {banners.length > 0 && (
              <>
                <div className="da-sec">🔥 Featured Offers</div>
                {banners.map((b,i)=>(
                  <div key={b.id} className="da-banner" style={{background:`linear-gradient(135deg,${['#1a1200','#0a1520','#1a0a20'][i%3]},${['#3a2800','#1a3050','#3a1a50'][i%3]})`}}
                    onClick={()=>{setSelected(brands.find(br=>br.id===b.brand_id)||{name:b.brand_name,emoji:b.brand_emoji});setPage('brand')}}>
                    <div style={{fontSize:26,marginBottom:6}}>{b.brand_emoji}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:17,fontWeight:900,color:'white',marginBottom:3}}>{b.title}</div>
                    <div style={{fontSize:12,color:'rgba(255,255,255,.5)'}}>{b.brand_name} · Tap to explore →</div>
                  </div>
                ))}
              </>
            )}

            {/* BRANDS */}
            <div className="da-sec">🏪 {search ? `Results for "${search}"` : 'All Brands'} <span style={{fontSize:12,fontWeight:400,color:'var(--muted)'}}>({filtered.length})</span></div>
            <div className="da-grid">
              {filtered.map(b=>(
                <div key={b.id} className="da-card" onClick={()=>{setSelected(b);setPage('brand')}}>
                  <div style={{fontSize:28,marginBottom:8}}>{b.emoji}</div>
                  <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{b.name}</div>
                  <div style={{fontSize:11,color:'var(--muted)',marginBottom:6}}>{b.category}</div>
                  <div style={{fontSize:12,color:'var(--gold)',fontWeight:600,marginBottom:8}}>★ {b.google_rating} · {b.total_reviews} reviews</div>
                  <span style={{fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600}}>🎁 {b.reward_offer}</span>
                </div>
              ))}
              {filtered.length===0 && <div style={{gridColumn:'span 2',padding:40,textAlign:'center',color:'var(--muted)'}}>
                {search ? `No brands found for "${search}"` : 'No brands yet.'}
              </div>}
            </div>

            {/* WATCH ADS */}
            {ads.length > 0 && (
              <div className="card-box" style={{marginTop:20,marginBottom:10}}>
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
                    <div className="da-prog-bg"><div className="da-prog-bar" style={{width:`${progress}%`}}/></div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>{progress<100?'Watching...':'✓ Done!'}</div>
                  </div>
                ) : (
                  ads.slice(0,3).map(a=>(
                    <div key={a.id} className="da-ad-row" onClick={()=>watchAd(a)}>
                      <div style={{fontSize:22}}>{a.brand_emoji}</div>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{a.title}</div><div style={{fontSize:11,color:'var(--muted)'}}>{a.brand_name}</div></div>
                      <span style={{fontSize:11,background:'rgba(233,184,74,.1)',border:'1px solid rgba(233,184,74,.2)',borderRadius:100,padding:'3px 10px',color:'var(--gold)',fontWeight:600,whiteSpace:'nowrap'}}>▶ Watch</span>
                    </div>
                  ))
                )}
                {earned && (
                  <div style={{marginTop:12,background:'rgba(233,184,74,.08)',border:'2px dashed rgba(233,184,74,.3)',borderRadius:14,padding:16,textAlign:'center',animation:'fadeIn .5s both'}}>
                    <div style={{fontSize:28,marginBottom:6}}>🎉</div>
                    <div style={{fontWeight:800,fontSize:15,marginBottom:4}}>Reward Earned!</div>
                    <div style={{fontFamily:'monospace',fontSize:18,fontWeight:700,color:'var(--gold)',marginBottom:4,letterSpacing:'.1em'}}>{earned.code}</div>
                    <div style={{fontSize:12,color:'var(--muted)'}}>{earned.discount} · Show at any brand</div>
                    <button className="btn sm" style={{marginTop:8}} onClick={()=>navigator.clipboard?.writeText(earned.code)}>Copy Code</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* BRAND DETAIL PAGE */}
        {page==='brand' && selected && (
          <div className="da-c fade">
            <button className="btn" style={{marginBottom:16,marginTop:4}} onClick={()=>{setPage('home');setSelected(null)}}>← Back</button>
            <div style={{textAlign:'center',marginBottom:20}}>
              <div style={{fontSize:52,marginBottom:10}}>{selected.emoji}</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,fontWeight:900,marginBottom:6}}>{selected.name}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>{selected.category} · {selected.location}</div>
              <div style={{display:'inline-flex',gap:8}}>
                <span className="badge gold">★ {selected.google_rating}</span>
                <span className="badge green">{selected.total_reviews} verified reviews</span>
              </div>
            </div>
            <div className="card-box" style={{textAlign:'center',marginBottom:14}}>
              <div style={{fontSize:28,marginBottom:8}}>🎁</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:30,fontWeight:900,color:'var(--gold)',marginBottom:4}}>{selected.reward_offer}</div>
              <div style={{fontSize:13,color:'var(--muted)',marginBottom:16}}>Min. order ₹{selected.reward_min_order} · Valid {selected.coupon_validity_days} days</div>
              <p style={{fontSize:13,color:'var(--muted2)',lineHeight:1.7,marginBottom:16}}>
                Scan the QR code at the venue, write a genuine Google review, and we'll verify it instantly. Your reward code will appear automatically.
              </p>
              <div style={{background:'var(--card2)',borderRadius:10,padding:12,fontSize:12,color:'var(--muted)',marginBottom:14}}>
                📍 {selected.location}
              </div>
            </div>
          </div>
        )}

        {/* MY REWARDS */}
        {page==='rewards' && (
          <div className="da-c fade">
            <div className="da-sec">🎟️ My Rewards</div>
            {!user ? (
              <div style={{textAlign:'center',padding:'40px 20px'}}>
                <div style={{fontSize:40,marginBottom:12}}>🔐</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Login to see your rewards</div>
                <div style={{color:'var(--muted)',fontSize:13,marginBottom:16}}>Scan a QR code at any brand to get started</div>
              </div>
            ) : (
              <div style={{padding:'20px 0',textAlign:'center',color:'var(--muted)'}}>Your coupons will appear here after scanning QR codes</div>
            )}
          </div>
        )}

        {/* BOTTOM NAV */}
        <div className="da-bnav">
          {[{id:'home',icon:'🏠',lbl:'Home'},{id:'brand',icon:'🏪',lbl:'Brands'},{id:'rewards',icon:'🎟️',lbl:'Rewards'}].map(n=>(
            <button key={n.id} className={`da-bnav-btn ${page===n.id?'on':''}`} onClick={()=>setPage(n.id)}>
              <span className="da-bnav-ic">{n.icon}</span>
              <span className="da-bnav-lbl">{n.lbl}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
