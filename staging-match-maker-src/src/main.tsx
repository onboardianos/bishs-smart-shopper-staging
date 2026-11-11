import { createRoot } from 'react-dom/client';
import '@v1/tokens/tokens.css';
import '@v1/components/components.css';
import './steps/ssw.css';
import './results/ss.css';
import './steps/sh.css';
import './steps/mq.css';
import './results/bishify-fixes.css';
import { ToastProvider } from '@v1/components/Toast';
import { Landing } from './steps/Landing';
import { Step1Start } from './steps/start';
import { Step2Path, Step3Type, Step4Bumper, StepFifth, StepMotorhome } from './steps/screens';
import { Loading } from './steps/Loading';
import { QLoading } from './steps/QLoading';
import { StepCamping, StepTradeNow, StepTradeWhy, StepCampStyle, StepActivities, StepSleep, StepBedroom, StepTow, StepLength, StepGarage, StepMulti, StepSize, StepBuild, StepBudget, StepSummary } from './steps/more';
import { App } from './results/App';
import { Portal } from './save/Portal';
import { savePhaseFromUrl } from './save/SaveFlow';
import './save/save.css';

const q = new URLSearchParams(location.search);
const screen = q.get('screen') || '00';
const sheet = q.get('case') === '1';
if (q.get('freeze') === '1') document.documentElement.classList.add('freeze');

function StateCard({ kind, title, body }: { kind: string; title: string; body: string }) {
  return (
    <div className="mm-state" data-state={kind} data-spec-id={`card-state-${kind}`} role="alert">
      <span>
        <strong className="mm-state-title">{title}</strong>
        <span className="mm-state-body">{body}</span>
      </span>
    </div>
  );
}

function Screen() {
  const state = q.get('state');
  if (state === 'error') return <StateCard kind="error" title="Matches didn't load" body="The inventory snapshot didn't come back. Refresh the page. Nothing was saved." />;
  if (state === 'permission') return <StateCard kind="permission" title="An outfitter sends this" body="Purchase options uses match.send. Browsing uses discovery.navigate and discovery.advance." />;
  if (screen === '01') return <Step1Start query={q.get('q') || ''} locMode={q.get('loc') || ''} />;
  if (screen === '02') return <Step2Path sheet={sheet} />;
  if (screen === '03') return <Step3Type sheet={sheet} />;
  if (screen === '04') return <Step4Bumper garageOpen={q.get('garage') === '1'} sheet={sheet} />;
  if (screen === 'fw') return <StepFifth sheet={sheet} />;
  if (screen === 'mh') return <StepMotorhome sheet={sheet} />;
  if (screen === 'camping') return <StepCamping />;
  if (screen === 'trade-now') return <StepTradeNow />;
  if (screen === 'trade-why') return <StepTradeWhy />;
  if (screen === 'camp-style') return <StepCampStyle />;
  if (screen === 'activities') return <StepActivities />;
  if (screen === 'sleep') return <StepSleep />;
  if (screen === 'bedroom') return <StepBedroom />;
  if (screen === 'tow') return <StepTow />;
  if (screen === 'length') return <StepLength />;
  if (screen === 'garage') return <StepGarage />;
  if (screen === 'bath' || screen === 'inside' || screen === 'outside') return <StepMulti key={screen} k={screen} />;
  if (screen === 'size') return <StepSize />;
  if (screen === 'build') return <StepBuild />;
  if (screen === 'budget') return <StepBudget />;
  if (screen === 'summary') return <StepSummary />;
  if (screen === 'qload') return <QLoading />;
  if (screen === 'loading') return <Loading />;
  if (screen === 'portal' || q.get('state') === 'portal') return <Portal />;
  if (screen === 'results' || screen === 'matches' || savePhaseFromUrl()) return <App />;
  return <Landing query={q.get('q') || ''} locOpen={q.get('loc') === '1'} />;
}

createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <Screen />
  </ToastProvider>,
);
