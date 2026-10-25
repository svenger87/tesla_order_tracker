import directory from '@/data/tesla-delivery-centers.json'

export interface DeliveryCenterOption {
  value: string
  label: string
  country: string
  city: string
}

// Tesla only publishes dedicated delivery-center directories for these markets.
// Other pickup sites can still be entered directly in the order form.
export function deliveryCenterOptions(country?: string): DeliveryCenterOption[] {
  return directory.centers
    .filter(center => !country || center.country === country)
    .map(center => ({
      value: center.name,
      label: center.name,
      country: center.country,
      city: center.city,
    }))
}
