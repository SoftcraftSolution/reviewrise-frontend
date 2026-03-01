import { useState, useEffect } from 'react'
import Sidebar from './Sidebar.jsx'
import * as api from '../api.js'

const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'

function Modal({ onClose, children, maxWidth=480 }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{maxWidth}} onClick={e=>e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

export default function SuperAdmin({ user, onLogout }) {
  const [tab,       setTab]     = useState('brands')
  const [brands,    setBrands]  = useState([])
  const [customers, setCust]    = useState([])
  const [ads,       setAds]     = useState([])
  const [banners,   setBanners] = useState([])
  const [stats,     setStats]   = useState(null)
  const [loading,   setLoading] = useState(true)
  const [err,       setErr]     = useState('')
  const [modal,     setModal]   = useState(null)   // 'brand'|'ad'|'banner'|'edit'
  const [editBrand, setEditBrand]= useState(null)  // brand object being edited
  const [newCreds,  setNewCreds] = useState(null)
  const [confirm,   setConfirm]  = useState(null)  // brandId | 'RESET_ALL'
  const [resetting, setResetting]= useState(false)
  const [deleting,  setDeleting] = useState(null)

  const load = async () => {
    setLoading(true); setErr('')
    try {
      const [b,c,a,bn,s] = await Promise.all([
        api.getAllBrands(), api.getCustomers(),
        api.getAllAds(), api.getAllBanners(), api.getPlatformStats()
      ])
      const seen = new Set()
      setBrands(b.filter(x => seen.has(x.id) ? false : seen.add(x.id)))
      setCust(c); setAds(a); setBanners(bn); setStats(s)
    } catch(e) { setErr(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const TABS = [
    {id:'brands',    icon:'🏪', label:'Brands'},
    {id:'overview',  icon:'📊', label:'Overview'},
    {id:'customers', icon:'👥', label:'Customers'},
    {id:'ads',       icon:'📺', label:'Ads & Banners'},
    {id:'qr',        icon:'📲', label:'QR Generator'},
  ]

  const handleAddBrand = async (formData) => {
    const r = await api.createBrand(formData)
    setModal(null); setNewCreds(r.owner_credentials); load()
  }

  const handleEditBrand = async (formData) => {
    await api.updateBrand(editBrand.id, formData)
    setModal(null); setEditBrand(null); load()
  }

  const handleDelete = async (id) => {
    setDeleting(id)
    try { await api.deleteBrand(id); setBrands(p=>p.filter(b=>b.id!==id)); setConfirm(null) }
    catch(e) { alert('Delete failed: '+e.message) }
    setDeleting(null)
  }

  const handleResetAll = async () => {
    setResetting(true)
    try {
      const res = await fetch(`${BASE}/api/admin/reset-all`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ secret:'softcraft-reset-2024' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error||'Reset failed')
      setBrands([]); setCust([]); setAds([]); setBanners([])
      setConfirm(null); alert('✅ All data wiped successfully!')
    } catch(e) { alert('Reset failed: '+e.message) }
    setResetting(false)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'var(--muted)'}}>
      <div style={{fontSize:36}}>⭐</div>Loading...
    </div>
  )

  return (
    <div className="dash-layout fade" style={{position:'relative'}}>
      <Sidebar
        logo={{title:'ReviewRise',sub:'Super Admin'}}
        profile={{avatar:'🔐',name:user?.name||'SoftCraft Admin',role:'Platform Administrator'}}
        nav={TABS.map(t=>({...t,active:tab===t.id,onClick:()=>setTab(t.id)}))}
        footer="SoftCraft Solutions"
        onLogout={onLogout}
      />

      <div className="main-area">
        <div className="topbar">
          <div className="topbar-l">
            <div className="t1">{{brands:'Brand Management',overview:'Platform Overview',customers:'Customers',ads:'Ads & Banners',qr:'QR Generator'}[tab]}</div>
            <div className="t2">SoftCraft Solutions · {brands.length} brand{brands.length!==1?'s':''}</div>
          </div>
          <div className="topbar-r">
            {tab==='brands' && <>
              <button className="btn danger" onClick={()=>setConfirm('RESET_ALL')} style={{marginRight:8}}>🗑 Clear All</button>
              <button className="btn primary" onClick={()=>setModal('brand')}>+ Add Brand</button>
            </>}
            {tab==='ads' && <>
              <button className="btn primary" onClick={()=>setModal('ad')}>+ New Ad</button>
              <button className="btn" style={{marginLeft:6}} onClick={()=>setModal('banner')}>+ Banner</button>
            </>}
          </div>
        </div>

        <div className="content-area">
          {err && <div style={{background:'var(--redbg)',borderRadius:10,padding:'10px 14px',fontSize:12,color:'var(--red)',marginBottom:16,display:'flex',gap:10,alignItems:'center'}}>
            ⚠ {err} <button className="btn sm" onClick={load}>Retry</button>
          </div>}

          {/* BRANDS */}
          {tab==='brands' && (
            <div className="fade">
              {brands.length === 0 ? (
                <div style={{textAlign:'center',padding:'80px 20px'}}>
                  <div style={{fontSize:56,marginBottom:12}}>🏪</div>
                  <div style={{fontSize:20,fontWeight:900,marginBottom:8}}>No Brands Yet</div>
                  <div style={{color:'var(--muted)',fontSize:13,marginBottom:24,lineHeight:1.7}}>Add your first real client.</div>
                  <button className="btn primary" style={{fontSize:14,padding:'12px 28px'}} onClick={()=>setModal('brand')}>+ Add First Brand</button>
                </div>
              ) : (
                <div className="table-wrap">
                  <div className="table-head" style={{gridTemplateColumns:'2.5fr 2fr 0.8fr 1fr 0.8fr auto'}}>
                    <span>Brand</span><span>Owner / Login</span><span>Plan</span><span>Joined</span><span>Status</span><span></span>
                  </div>
                  {brands.map(b => (
                    <div key={b.id} className="table-row" style={{gridTemplateColumns:'2.5fr 2fr 0.8fr 1fr 0.8fr auto'}}>
                      <span style={{display:'flex',alignItems:'center',gap:10}}>
                        <span style={{fontSize:22}}>{b.emoji}</span>
                        <span>
                          <div style={{fontWeight:700,fontSize:13}}>{b.name}</div>
                          <div style={{fontSize:11,color:'var(--muted)'}}>{b.category} · {b.location}</div>
                          {b.google_place_id && <div style={{fontSize:10,color:'var(--green)',fontFamily:'monospace',marginTop:2}}>📍 Place ID set</div>}
                        </span>
                      </span>
                      <span>
                        <div style={{fontSize:12,fontWeight:600}}>{b.owner_name}</div>
                        <div style={{fontSize:11,color:'var(--gold)',fontFamily:'monospace'}}>{b.owner_email}</div>
                      </span>
                      <span><span className={`badge ${b.plan==='Pro'?'gold':'blue'}`}>{b.plan}</span></span>
                      <span style={{fontSize:11,color:'var(--muted2)'}}>{new Date(b.joined_at).toLocaleDateString('en-IN')}</span>
                      <span><span className={`badge ${b.active?'green':'muted'}`}>{b.active?'Active':'Off'}</span></span>
                      <span style={{display:'flex',gap:6}}>
                        <button className="btn sm" onClick={()=>{setEditBrand(b);setModal('edit')}}>✏️ Edit</button>
                        <button className="btn sm danger" disabled={deleting===b.id} onClick={()=>setConfirm(b.id)}>
                          {deleting===b.id?'...':'Remove'}
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OVERVIEW */}
          {tab==='overview' && stats && (
            <div className="fade">
              <div className="stat-row" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
                {[
                  {icon:'🏪',val:stats.brands?.active||0,lbl:'Active Brands',color:'var(--gold)'},
                  {icon:'👥',val:stats.customers?.total||0,lbl:'Customers',color:'var(--green)'},
                  {icon:'⭐',val:stats.reviews?.total||0,lbl:'Reviews',color:'var(--blue)'},
                  {icon:'💰',val:'₹'+Math.round((stats.mrr||0)/1000)+'K',lbl:'MRR',color:'var(--purple)'},
                ].map(s=>(
                  <div key={s.lbl} className="stat-item">
                    <div style={{fontSize:24,marginBottom:8}}>{s.icon}</div>
                    <div className="stat-val" style={{color:s.color}}>{s.val}</div>
                    <div className="stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CUSTOMERS */}
          {tab==='customers' && (
            <div className="fade">
              {customers.length===0
                ? <div style={{textAlign:'center',padding:60,color:'var(--muted)'}}>No customers yet.</div>
                : <div className="table-wrap">
                    <div className="table-head" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr'}}>
                      <span>Customer</span><span>Visits</span><span>Reviews</span><span>Coupons</span><span>Last Visit</span>
                    </div>
                    {customers.map(c=>(
                      <div key={c.id} className="table-row" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr'}}>
                        <span><div style={{fontWeight:700}}>{c.name}</div><div style={{fontSize:11,color:'var(--muted)'}}>{c.email}</div></span>
                        <span>{c.total_visits||0}</span>
                        <span style={{color:'var(--gold)',fontWeight:600}}>{c.total_reviews||0}</span>
                        <span style={{color:'var(--green)',fontWeight:600}}>{c.total_coupons||0}</span>
                        <span style={{fontSize:11,color:'var(--muted2)'}}>{c.last_visit?new Date(c.last_visit).toLocaleDateString('en-IN'):'—'}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          )}

          {/* ADS */}
          {tab==='ads' && (
            <div className="fade">
              <div style={{fontWeight:800,marginBottom:10}}>Ad Campaigns</div>
              <div className="table-wrap" style={{marginBottom:20}}>
                <div className="table-head" style={{gridTemplateColumns:'2fr 1.5fr 1fr 1fr auto'}}>
                  <span>Title</span><span>Brand</span><span>Views</span><span>Status</span><span></span>
                </div>
                {ads.map(a=>(
                  <div key={a.id} className="table-row" style={{gridTemplateColumns:'2fr 1.5fr 1fr 1fr auto'}}>
                    <span style={{fontWeight:600}}>{a.title}</span>
                    <span style={{fontSize:12}}>{a.brand_emoji} {a.brand_name}</span>
                    <span>{a.views||0}</span>
                    <span><span className={`badge ${a.active?'green':'muted'}`}>{a.active?'Live':'Off'}</span></span>
                    <button className={`btn sm ${a.active?'danger':'success'}`} onClick={async()=>{await api.toggleAd(a.id);load()}}>{a.active?'Pause':'Resume'}</button>
                  </div>
                ))}
                {ads.length===0&&<div style={{padding:20,textAlign:'center',color:'var(--muted)'}}>No ads yet.</div>}
              </div>
              <div style={{fontWeight:800,marginBottom:10}}>Banners</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                {banners.map(b=>(
                  <div key={b.id} className="card-box" style={{borderColor:b.active?'var(--goldb)':'var(--b1)'}}>
                    <div style={{fontSize:26,marginBottom:6}}>{b.brand_emoji}</div>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:10}}>{b.title}</div>
                    <div style={{fontSize:11,color:b.active?'var(--green)':'var(--muted)',marginBottom:10}}>{b.active?'● Live':'○ Off'}</div>
                    <button className={`btn sm ${b.active?'danger':'success'}`} onClick={async()=>{await api.toggleBanner(b.id);load()}}>{b.active?'Hide':'Show'}</button>
                  </div>
                ))}
                {banners.length===0&&<div style={{color:'var(--muted)',fontSize:13}}>No banners yet.</div>}
              </div>
            </div>
          )}

          {/* QR */}
          {tab==='qr' && <QRGenerator brands={brands} onCreated={load}/>}
        </div>
      </div>

      {/* ── MODALS ── */}
      {newCreds && (
        <Modal onClose={()=>setNewCreds(null)} maxWidth={420}>
          <div style={{textAlign:'center',marginBottom:16}}>
            <div style={{fontSize:40,marginBottom:8}}>🎉</div>
            <div style={{fontSize:18,fontWeight:900,marginBottom:4}}>Brand Created!</div>
            <div style={{fontSize:13,color:'var(--muted2)'}}>Share these login credentials with the brand owner</div>
          </div>
          <div style={{background:'var(--card2)',borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:8}}>LOGIN URL: <strong style={{color:'var(--gold)'}}>/brand</strong></div>
            <div style={{fontSize:13,marginBottom:6}}>📧 <strong>Email:</strong> <span style={{fontFamily:'monospace',color:'var(--gold)'}}>{newCreds.email}</span></div>
            <div style={{fontSize:13}}>🔑 <strong>Password:</strong> <span style={{fontFamily:'monospace',color:'var(--gold)'}}>{newCreds.password}</span></div>
          </div>
          <button className="btn primary" style={{width:'100%',justifyContent:'center'}} onClick={()=>{
            navigator.clipboard?.writeText(`Login: ${newCreds.email}\nPassword: ${newCreds.password}\nURL: https://reviewrise-frontend.vercel.app/brand`)
          }}>📋 Copy Credentials</button>
        </Modal>
      )}

      {modal==='brand' && (
        <Modal onClose={()=>setModal(null)} maxWidth={520}>
          <AddBrandForm onClose={()=>setModal(null)} onAdd={handleAddBrand}/>
        </Modal>
      )}

      {modal==='edit' && editBrand && (
        <Modal onClose={()=>{setModal(null);setEditBrand(null)}} maxWidth={520}>
          <EditBrandForm brand={editBrand} onClose={()=>{setModal(null);setEditBrand(null)}} onSave={handleEditBrand}/>
        </Modal>
      )}

      {modal==='ad' && (
        <Modal onClose={()=>setModal(null)}>
          <div style={{fontSize:16,fontWeight:900,marginBottom:4}}>New Ad Campaign</div>
          <AdForm onClose={()=>setModal(null)} onAdd={async d=>{await api.createAd(d);load();setModal(null)}} brands={brands}/>
        </Modal>
      )}

      {modal==='banner' && (
        <Modal onClose={()=>setModal(null)}>
          <div style={{fontSize:16,fontWeight:900,marginBottom:4}}>Add Banner</div>
          <BannerForm onClose={()=>setModal(null)} onAdd={async d=>{await api.createBanner(d);load();setModal(null)}} brands={brands}/>
        </Modal>
      )}

      {confirm && (
        <Modal onClose={()=>setConfirm(null)} maxWidth={380}>
          {confirm==='RESET_ALL' ? (
            <>
              <div style={{textAlign:'center',marginBottom:20}}>
                <div style={{fontSize:44,marginBottom:8}}>🗑️</div>
                <div style={{fontSize:18,fontWeight:900,marginBottom:8}}>Delete ALL Data?</div>
                <div style={{fontSize:13,color:'var(--muted2)',lineHeight:1.7}}>
                  Permanently removes all brands, reviews, coupons &amp; data.<br/>
                  <strong style={{color:'var(--green)'}}>Your admin account is kept.</strong>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn danger" style={{flex:1,justifyContent:'center',padding:12,fontSize:13}} disabled={resetting} onClick={handleResetAll}>
                  {resetting?'Deleting...':'🗑 Yes, Delete Everything'}
                </button>
                <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={()=>setConfirm(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div style={{fontSize:17,fontWeight:900,marginBottom:8}}>Remove Brand?</div>
              <div style={{fontSize:13,color:'var(--muted2)',lineHeight:1.7,marginBottom:20}}>
                Permanently removes this brand and all its data.
              </div>
              <div style={{display:'flex',gap:10}}>
                <button className="btn danger" style={{flex:1,justifyContent:'center'}} disabled={deleting===confirm} onClick={()=>handleDelete(confirm)}>
                  {deleting===confirm?'Removing...':'Remove'}
                </button>
                <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={()=>setConfirm(null)}>Cancel</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}

// ── QR Generator ────────────────────────────────────────────────
function QRGenerator({ brands, onCreated }) {
  const [brandId, setBrandId] = useState(brands[0]?.id||'')
  const [label,   setLabel]   = useState('Main Entrance')
  const [done,    setDone]    = useState(false)
  const brand  = brands.find(b=>b.id===brandId)
  const url    = `https://reviewrise-frontend.vercel.app/review?brand=${brandId}&t=${encodeURIComponent(label)}`
  const qrImg  = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&margin=10`

  if (!brands.length) return <div style={{textAlign:'center',padding:60,color:'var(--muted)'}}>Add brands first.</div>
  return (
    <div className="fade" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,alignItems:'start'}}>
      <div className="card-box">
        <div style={{fontWeight:800,fontSize:15,marginBottom:16}}>Generate QR Code</div>
        <div className="form-row">
          <label className="label">Brand</label>
          <select className="input" value={brandId} onChange={e=>{setBrandId(e.target.value);setDone(false)}}>
            {brands.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label className="label">Table / Location Label</label>
          <input className="input" value={label} onChange={e=>{setLabel(e.target.value);setDone(false)}} placeholder="T1, Main Entrance..."/>
        </div>
        <div className="form-row">
          <label className="label">QR Points To</label>
          <div style={{fontFamily:'monospace',fontSize:10,color:'var(--gold)',background:'#161D28',padding:'8px 12px',borderRadius:8,wordBreak:'break-all'}}>{url}</div>
        </div>
        {brand?.google_place_id && (
          <div className="form-row">
            <label className="label">Place ID</label>
            <div style={{fontFamily:'monospace',fontSize:11,color:'var(--green)',background:'#161D28',padding:'8px 12px',borderRadius:8}}>{brand.google_place_id}</div>
          </div>
        )}
        <div style={{display:'flex',gap:8}}>
          <button className="btn primary" style={{flex:1,justifyContent:'center'}} onClick={async()=>{await api.createQR({brand_id:brandId,table_label:label});setDone(true);onCreated()}}>
            💾 Save QR
          </button>
          <button className="btn" onClick={()=>{const a=document.createElement('a');a.href=qrImg;a.download=`QR-${brand?.name}-${label}.png`;a.click()}}>
            ⬇ Download
          </button>
        </div>
        {done && <div style={{marginTop:12,padding:10,background:'var(--greenbg)',borderRadius:8,fontSize:12,color:'var(--green)'}}>✓ Saved!</div>}
      </div>
      <div style={{background:'white',borderRadius:16,padding:24,display:'flex',flexDirection:'column',alignItems:'center',gap:10,boxShadow:'0 8px 32px rgba(0,0,0,.3)'}}>
        <div style={{fontSize:10,color:'#999',textTransform:'uppercase',letterSpacing:'.1em',fontWeight:700}}>ReviewRise</div>
        <img src={qrImg} alt="QR" width={180} height={180} style={{borderRadius:8}}/>
        <div style={{fontWeight:900,color:'#111',fontSize:15}}>{brand?.emoji} {brand?.name}</div>
        <div style={{fontSize:11,color:'#777'}}>📍 {label}</div>
        <div style={{background:'#fff8e1',borderRadius:10,padding:'8px 18px',textAlign:'center',border:'2px solid #ffe082'}}>
          <div style={{fontSize:10,color:'#a07010',marginBottom:2,fontWeight:600}}>Scan &amp; Earn</div>
          <div style={{fontWeight:900,fontSize:16,color:'#E9B84A'}}>{brand?.reward_offer||'20% OFF'}</div>
        </div>
        <div style={{fontSize:9,color:'#bbb',textAlign:'center',maxWidth:180}}>Scan → Review on Google → Reward unlocked</div>
      </div>
    </div>
  )
}

// ── Edit Brand Form ─────────────────────────────────────────────
function EditBrandForm({ brand, onClose, onSave }) {
  const EMOJIS = ['🏪','🍛','☕','💈','🍕','🏋️','👗','💊','🍰','🍣','🥐','🍔','🎂','🛍️','🍷','🌮','🏨','💻','📚','🎮']
  const [f, setF] = useState({
    name:                brand.name||'',
    category:            brand.category||'',
    emoji:               brand.emoji||'🏪',
    location:            brand.location||'',
    plan:                brand.plan||'Starter',
    google_place_id:     brand.google_place_id||'',
    reward_offer:        brand.reward_offer||'20% OFF',
    reward_min_order:    String(brand.reward_min_order||500),
    coupon_validity_days:String(brand.coupon_validity_days||30),
    owner_name:          brand.owner_name||'',
    owner_email:         brand.owner_email||'',
    owner_phone:         brand.owner_phone||'',
    new_password:        '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const s = k => v => setF(p=>({...p,[k]:v}))

  const handleSave = async () => {
    if (!f.name.trim()) { setError('Brand name is required'); return }
    setLoading(true); setError('')
    try {
      const payload = { ...f }
      if (!payload.new_password) delete payload.new_password
      await onSave(payload)
    } catch(e) { setError(e.message); setLoading(false) }
  }

  return (
    <>
      <div style={{fontSize:17,fontWeight:900,marginBottom:4}}>✏️ Edit Brand</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>{brand.emoji} {brand.name}</div>

      {error && <div style={{background:'var(--redbg)',border:'1px solid rgba(240,119,119,.3)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--red)',marginBottom:14}}>⚠ {error}</div>}

      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Brand Info</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Brand Name *</label><input className="input" value={f.name} onChange={e=>s('name')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Emoji</label>
          <select className="input" value={f.emoji} onChange={e=>s('emoji')(e.target.value)} style={{fontSize:20,textAlign:'center',padding:'6px 4px'}}>
            {EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Category</label><input className="input" value={f.category} onChange={e=>s('category')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Plan</label><select className="input" value={f.plan} onChange={e=>s('plan')(e.target.value)}><option>Starter</option><option>Pro</option></select></div>
      </div>
      <div className="form-row"><label className="label">Location</label><input className="input" value={f.location} onChange={e=>s('location')(e.target.value)}/></div>
      <div className="form-row">
        <label className="label">Google Place ID <span style={{fontWeight:400,color:'var(--muted)',textTransform:'none'}}>(for review verification)</span></label>
        <input className="input" value={f.google_place_id} onChange={e=>s('google_place_id')(e.target.value)} placeholder="ChIJN1t_tDeuEmsRUsoy" style={{fontFamily:'monospace'}}/>
        <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Google Maps → search business → Share → copy ID from link</div>
      </div>

      <div style={{height:1,background:'var(--b1)',margin:'6px 0 14px'}}/>
      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Reward Settings</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Reward Offer</label><input className="input" value={f.reward_offer} onChange={e=>s('reward_offer')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Min Order (₹)</label><input className="input" type="number" value={f.reward_min_order} onChange={e=>s('reward_min_order')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Valid (days)</label><input className="input" type="number" value={f.coupon_validity_days} onChange={e=>s('coupon_validity_days')(e.target.value)}/></div>
      </div>

      <div style={{height:1,background:'var(--b1)',margin:'6px 0 14px'}}/>
      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Owner Details</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Owner Name</label><input className="input" value={f.owner_name} onChange={e=>s('owner_name')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Owner Email</label><input className="input" type="email" value={f.owner_email} onChange={e=>s('owner_email')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Phone</label><input className="input" value={f.owner_phone} onChange={e=>s('owner_phone')(e.target.value)}/></div>
        <div className="form-row">
          <label className="label">New Password <span style={{fontWeight:400,color:'var(--muted)',textTransform:'none'}}>(leave blank to keep current)</span></label>
          <input className="input" type="password" value={f.new_password} onChange={e=>s('new_password')(e.target.value)} placeholder="Leave blank to keep current"/>
        </div>
      </div>

      <div style={{display:'flex',gap:10,marginTop:4}}>
        <button className="btn primary" style={{flex:2,justifyContent:'center',padding:12,fontSize:14}} disabled={loading} onClick={handleSave}>
          {loading?'Saving...':'✓ Save Changes'}
        </button>
        <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button>
      </div>
    </>
  )
}

// ── Add Brand Form ──────────────────────────────────────────────
function AddBrandForm({ onClose, onAdd }) {
  const EMOJIS = ['🏪','🍛','☕','💈','🍕','🏋️','👗','💊','🍰','🍣','🥐','🍔','🎂','🛍️','🍷','🌮','🏨','💻','📚','🎮']
  const [f,setF]=useState({name:'',category:'',emoji:'🏪',location:'',plan:'Starter',google_place_id:'',reward_offer:'20% OFF',reward_min_order:'500',coupon_validity_days:'30',owner_name:'',owner_email:'',owner_phone:'',owner_password:'Brand@123'})
  const [loading,setLoading]=useState(false)
  const [error,  setError  ]=useState('')
  const s = k => v => setF(p=>({...p,[k]:v}))
  return (
    <>
      <div style={{fontSize:17,fontWeight:900,marginBottom:4}}>Add New Brand</div>
      <div style={{fontSize:12,color:'var(--muted)',marginBottom:16}}>Creates brand + owner login in one step</div>
      {error && <div style={{background:'var(--redbg)',border:'1px solid rgba(240,119,119,.3)',borderRadius:8,padding:'10px 14px',fontSize:12,color:'var(--red)',marginBottom:14}}>⚠ {error}</div>}
      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Brand Info</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 90px',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Brand Name *</label><input className="input" value={f.name} onChange={e=>s('name')(e.target.value)} placeholder="The Spice Garden" autoFocus/></div>
        <div className="form-row"><label className="label">Emoji</label>
          <select className="input" value={f.emoji} onChange={e=>s('emoji')(e.target.value)} style={{fontSize:20,textAlign:'center',padding:'6px 4px'}}>
            {EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}
          </select>
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Category</label><input className="input" value={f.category} onChange={e=>s('category')(e.target.value)} placeholder="Restaurant, Café..."/></div>
        <div className="form-row"><label className="label">Plan</label><select className="input" value={f.plan} onChange={e=>s('plan')(e.target.value)}><option>Starter</option><option>Pro</option></select></div>
      </div>
      <div className="form-row"><label className="label">Location</label><input className="input" value={f.location} onChange={e=>s('location')(e.target.value)} placeholder="Connaught Place, New Delhi"/></div>
      <div className="form-row">
        <label className="label">Google Place ID</label>
        <input className="input" value={f.google_place_id} onChange={e=>s('google_place_id')(e.target.value)} placeholder="ChIJN1t_tDeuEmsRUsoy" style={{fontFamily:'monospace'}}/>
        <div style={{fontSize:10,color:'var(--muted)',marginTop:3}}>Google Maps → search business → Share → copy ID from link</div>
      </div>
      <div style={{height:1,background:'var(--b1)',margin:'6px 0 14px'}}/>
      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Reward Settings</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Reward Offer</label><input className="input" value={f.reward_offer} onChange={e=>s('reward_offer')(e.target.value)} placeholder="20% OFF"/></div>
        <div className="form-row"><label className="label">Min Order (₹)</label><input className="input" type="number" value={f.reward_min_order} onChange={e=>s('reward_min_order')(e.target.value)}/></div>
        <div className="form-row"><label className="label">Valid (days)</label><input className="input" type="number" value={f.coupon_validity_days} onChange={e=>s('coupon_validity_days')(e.target.value)}/></div>
      </div>
      <div style={{height:1,background:'var(--b1)',margin:'6px 0 14px'}}/>
      <div style={{fontSize:11,fontWeight:700,color:'var(--gold)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>Brand Owner Login</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
        <div className="form-row"><label className="label">Owner Name *</label><input className="input" value={f.owner_name} onChange={e=>s('owner_name')(e.target.value)} placeholder="John Smith"/></div>
        <div className="form-row"><label className="label">Owner Email *</label><input className="input" type="email" value={f.owner_email} onChange={e=>s('owner_email')(e.target.value)} placeholder="owner@brand.com"/></div>
        <div className="form-row"><label className="label">Phone</label><input className="input" value={f.owner_phone} onChange={e=>s('owner_phone')(e.target.value)} placeholder="+91 98765 43210"/></div>
        <div className="form-row"><label className="label">Password</label><input className="input" value={f.owner_password} onChange={e=>s('owner_password')(e.target.value)} placeholder="Brand@123"/></div>
      </div>
      <div style={{display:'flex',gap:10,marginTop:4}}>
        <button className="btn primary" style={{flex:2,justifyContent:'center',padding:12,fontSize:14}} disabled={loading} onClick={async()=>{
          if (!f.name.trim()) { setError('Brand name is required'); return }
          if (!f.owner_email.trim()) { setError('Owner email is required'); return }
          if (!f.owner_name.trim()) { setError('Owner name is required'); return }
          setLoading(true); setError('')
          try { await onAdd(f) }
          catch(e) { setError(e.message); setLoading(false) }
        }}>{loading?'Creating...':'✓ Create Brand'}</button>
        <button className="btn" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button>
      </div>
    </>
  )
}

function AdForm({ onClose, onAdd, brands }) {
  const [f,setF]=useState({brand_id:brands[0]?.id||'',title:'',description:''})
  return (
    <>
      <div className="form-row"><label className="label">Brand</label><select className="input" value={f.brand_id} onChange={e=>setF(p=>({...p,brand_id:e.target.value}))}>{brands.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}</select></div>
      <div className="form-row"><label className="label">Title</label><input className="input" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))}/></div>
      <div className="form-row"><label className="label">Description</label><textarea className="input" style={{height:70,resize:'none'}} value={f.description} onChange={e=>setF(p=>({...p,description:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8}}><button className="btn primary" style={{flex:1,justifyContent:'center'}} onClick={()=>onAdd(f)}>Create</button><button className="btn" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button></div>
    </>
  )
}

function BannerForm({ onClose, onAdd, brands }) {
  const [f,setF]=useState({brand_id:brands[0]?.id||'',title:''})
  return (
    <>
      <div className="form-row"><label className="label">Brand</label><select className="input" value={f.brand_id} onChange={e=>setF(p=>({...p,brand_id:e.target.value}))}>{brands.map(b=><option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}</select></div>
      <div className="form-row"><label className="label">Headline</label><input className="input" value={f.title} onChange={e=>setF(p=>({...p,title:e.target.value}))}/></div>
      <div style={{display:'flex',gap:8}}><button className="btn primary" style={{flex:1,justifyContent:'center'}} onClick={()=>onAdd(f)}>Add</button><button className="btn" style={{flex:1,justifyContent:'center'}} onClick={onClose}>Cancel</button></div>
    </>
  )
}
