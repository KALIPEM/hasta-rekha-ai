import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
// Replace the invalid legacy worker on existing installations, then unregister it.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      if (registration.active?.scriptURL === new URL('/sw.js', location.origin).href) registration.update().catch(() => {});
    }
  });
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
