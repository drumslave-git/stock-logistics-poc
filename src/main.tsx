import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.tsx';
import { AccessGate } from './components/AccessGate';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <HashRouter>
      <AccessGate>
        <App />
      </AccessGate>
    </HashRouter>
  </StrictMode>,
);
