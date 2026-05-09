import { wrapFetchWithPayment } from 'x402-fetch'
import { BACKEND_URL } from './constants'

const BACKEND_WALLET = import.meta.env.VITE_BACKEND_WALLET_ADDRESS

export async function buildX402Header(wallet: any, priceAtomic: string): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet no conectada o no soporta firmas')
  }

  const fetchWithPayment = wrapFetchWithPayment(fetch, wallet)

  const res = await fetchWithPayment(`${BACKEND_URL}/buy/preflight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ price: priceAtomic, payTo: BACKEND_WALLET }),
  })

  if (!res.ok) throw new Error('Error generando header de pago x402')

  const data = await res.json()
  return data.paymentHeader as string
}

export function createX402Fetch(wallet: any) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet no conectada o no soporta firmas')
  }
  return wrapFetchWithPayment(fetch, wallet)
}
