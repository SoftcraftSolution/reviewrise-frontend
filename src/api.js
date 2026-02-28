const BASE = import.meta.env.VITE_API_URL || 'https://reviewrise-production-2347.up.railway.app'

const h = () => {
  const t = localStorage.getItem('rr_token')
  return { 'Content-Type':'application/json', ...(t ? { Authorization:`Bearer ${t}` } : {}) }
}

export const req = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: h(),
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

export const login           = (e,p)   => req('POST','/api/auth/login',{email:e,password:p})
export const getMe           = ()      => req('GET','/api/auth/me')
export const registerBrand   = (d)     => req('POST','/api/auth/register-brand',d)

export const getBrands       = ()      => req('GET','/api/brands')
export const getAllBrands     = ()      => req('GET','/api/brands/all')
export const getBrand        = (id)    => req('GET',`/api/brands/${id}`)
export const createBrand     = (d)     => req('POST','/api/brands',d)
export const updateBrand     = (id,d)  => req('PUT',`/api/brands/${id}`,d)
export const deleteBrand     = (id)    => req('DELETE',`/api/brands/${id}`)
export const getBrandStats   = (id)    => req('GET',`/api/brands/${id}/stats`)

export const createSession   = (d)     => req('POST','/api/verify/session',d)
export const pollSession     = (sid)   => req('GET',`/api/verify/poll/${sid}`)
export const submitFeedback  = (d)     => req('POST','/api/verify/feedback',d)

export const verifyCoupon    = (code)  => req('POST','/api/coupons/verify',{code})
export const redeemCoupon    = (id)    => req('POST','/api/coupons/redeem',{coupon_id:id})
export const generateCoupon  = (d)     => req('POST','/api/coupons/generate',d)
export const getMyCoupons    = ()      => req('GET','/api/coupons/my')
export const getBrandCoupons = (bid)   => req('GET',`/api/coupons/brand/${bid}`)
export const getAllCoupons    = ()      => req('GET','/api/coupons')

export const getBrandReviews = (bid)   => req('GET',`/api/reviews/brand/${bid}`)
export const getBrandFeedback= (bid)   => req('GET',`/api/feedback/brand/${bid}`)
export const markFeedbackRead= (id)    => req('PATCH',`/api/feedback/${id}/read`)
export const markReplied     = (id)    => req('PATCH',`/api/reviews/${id}/replied`)

export const getAds          = ()      => req('GET','/api/ads')
export const getAllAds        = ()      => req('GET','/api/ads/all')
export const createAd        = (d)     => req('POST','/api/ads',d)
export const toggleAd        = (id)    => req('PATCH',`/api/ads/${id}/toggle`)
export const watchAd         = (id)    => req('POST',`/api/ads/${id}/view`)
export const getBanners      = ()      => req('GET','/api/banners')
export const getAllBanners    = ()      => req('GET','/api/banners/all')
export const createBanner    = (d)     => req('POST','/api/banners',d)
export const toggleBanner    = (id)    => req('PATCH',`/api/banners/${id}/toggle`)

export const getCustomers    = ()      => req('GET','/api/customers')
export const getPlatformStats= ()      => req('GET','/api/stats/platform')
export const createQR        = (d)     => req('POST','/api/qr',d)
export const getQRCodes      = (bid)   => req('GET',`/api/qr/brand/${bid}`)

export const resetAllData    = ()      => req('POST','/api/admin/reset-all',{secret:'softcraft-reset-2024'})
