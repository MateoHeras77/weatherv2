import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'maplibre-gl/dist/maplibre-gl.css'
import './index.css'
import App from './App'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The backend runs on a free tier that can cold-start (~30–50 s) after
      // idle. Retry with backoff for ~40 s so the app self-heals (showing the
      // "Loading…" state) instead of erroring on the first failed request.
      retry: 5,
      retryDelay: (attempt) => Math.min(2000 * 2 ** attempt, 12000),
      refetchOnWindowFocus: false,
    },
  },
})

// NOTE: React.StrictMode is intentionally omitted. Its dev-only double
// mount/unmount races MapLibre's imperative map creation and poisons the
// clustered GeoJSON worker ("Unimplemented type: 4"), leaving station markers
// unrendered. The map lifecycle is managed explicitly in MapView instead.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
)
