import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@v1/tokens/tokens.css';
import './ss.css';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
