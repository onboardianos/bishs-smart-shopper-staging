import { createRoot } from 'react-dom/client';
import '@v1/tokens/tokens.css';
import '@v1/components/components.css';
import './ssw.css';
import { ToastProvider } from '@v1/components/Toast';
import { startIdStamper } from '@v1/components/stampIds';
import { Step1Start } from './start';
import { Landing } from './Landing';
import { Step2Path, Step3Type, Step4Bumper } from './screens';
import { Loading } from './Loading';
import { Matches } from './Matches';

// ?screen=00 (public landing; default) | loading | matches |01|02|03|04 · &unit=100384 (known-unit path) · &view=list (matches list) · &garage=1 · &case=1 · &q= &loc=1 · &freeze=1 (hold loading mid-progress / pulse, for stills)
const q = new URLSearchParams(location.search);
const s = q.get('screen') || '00';
const sheet = q.get('case') === '1';
if (q.get('freeze') === '1') document.documentElement.classList.add('freeze');
const root = document.getElementById('root')!;
createRoot(root).render(
  <ToastProvider>
    {s === '00' && <Landing query={q.get('q') || ''} locOpen={q.get('loc') === '1'} />}
    {s === 'loading' && <Loading />}
    {s === 'matches' && <Matches />}
    {s === '01' && <Step1Start query={q.get('q') || ''} locMode={q.get('loc') === '1' ? 'multi' : q.get('loc') || ''} />}
    {s === '02' && <Step2Path sheet={sheet} />}
    {s === '03' && <Step3Type sheet={sheet} />}
    {s === '04' && <Step4Bumper garageOpen={q.get('garage') === '1'} sheet={sheet} />}
  </ToastProvider>
);
startIdStamper(root);
