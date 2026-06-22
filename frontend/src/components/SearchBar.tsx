import CityAutocomplete from './CityAutocomplete'
import { useApp } from '../lib/store'

export default function SearchBar() {
  const flyTo = useApp((s) => s.flyTo)
  return (
    <div className="w-full max-w-md">
      <CityAutocomplete onSelect={(s) => flyTo(s.lon, s.lat, s.id)} />
    </div>
  )
}
