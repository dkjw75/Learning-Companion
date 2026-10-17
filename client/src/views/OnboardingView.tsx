import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Sparkles } from 'lucide-react';
import type { CompleteOnboarding } from '@learning-companion/shared';
import { useSession } from '@/auth/session-context';
import { saveOnboarding } from '@/lib/learning';
import { ButtonUi } from '@/components/ui/button-ui';

const areaChoices = [
  { id: 'web_development', label: 'Software Development', detail: 'Websites, apps, and software' },
  { id: 'ai_ml', label: 'AI Engineering', detail: 'Intelligent tools and models' },
  { id: 'cybersecurity', label: 'Cybersecurity', detail: 'Keeping systems and data safe' },
  { id: 'cloud', label: 'Cloud Computing', detail: 'Services and infrastructure online' },
  { id: 'data_science', label: 'Data Science and Analytics', detail: 'Finding patterns in data' },
  { id: 'databases', label: 'Databases and Data Engineering', detail: 'Storing and organising information' },
  { id: 'web_communication', label: 'Computer Networks', detail: 'How connected devices communicate' },
  { id: 'operating_systems', label: 'Operating Systems', detail: 'How computers manage programs and resources' },
  { id: 'hardware_iot', label: 'Hardware and Embedded Systems', detail: 'Devices and their components' },
  { id: 'ui_ux', label: 'Human-Computer Interaction', detail: 'How people use digital products' },
] as const;
const experienceChoices = [
  { id: 'new', label: 'Just starting out', detail: 'I am new to technology topics' },
  { id: 'some', label: 'Some experience', detail: 'I have explored a few tools or projects' },
  { id: 'experienced', label: 'Experienced', detail: 'I have built or worked with technology before' },
] as const;
export function OnboardingView() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useSession();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<CompleteOnboarding['interests']>([]);
  const [experienceLevel, setExperienceLevel] = useState<CompleteOnboarding['experienceLevel']>('new');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!session || !profile) return null;
  if (profile.onboardingComplete) { queueMicrotask(() => navigate('/home', { replace: true })); return null; }
  const finish = async () => {
    if (!interests.length) { setError('Choose an area to continue.'); return; }
    setSaving(true); setError('');
    try {
      await saveOnboarding({
        interests, experienceLevel,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        skippedDiagnostic: true, answers: [],
      });
      await refreshProfile();
      navigate('/home', { replace: true });
    } catch {
      setError('Could not save your starting point. Please try again.');
    } finally { setSaving(false); }
  };
  return <div className="onboarding-shell">
    <div className="onboarding-progress" aria-label={`Step ${step + 1} of 2`}><span style={{ width: `${((step + 1) / 2) * 100}%` }} /></div>
    <div className="onboarding-intro"><span className="eyebrow"><Sparkles size={14} /> YOUR STARTING POINT</span><span className="step-count">{String(step + 1).padStart(2, '0')} / 02</span></div>
    <h1>{step === 0 ? 'What sparks your curiosity?' : 'Where are you starting from?'}</h1>
    <p className="onboarding-subtitle">{step === 0 ? 'Choose the areas that interest you. You can change direction whenever you like.' : 'Think about your overall tech experience, across any field.'}</p>
    <div className={`onboarding-options ${step === 0 ? 'interest-options' : ''}`} role={step === 0 ? 'group' : 'radiogroup'} aria-label={step === 0 ? 'Areas of interest' : 'Current experience'}>
      {step === 0 && areaChoices.map(choice => <ButtonUi key={choice.id} variant="choice" type="button" className={interests.includes(choice.id) ? 'selected' : ''} aria-pressed={interests.includes(choice.id)} onClick={() => setInterests(current => current.includes(choice.id) ? current.filter(item => item !== choice.id) : [...current, choice.id])}><span><strong>{choice.label}</strong><small>{choice.detail}</small></span><span className="choice-mark">{interests.includes(choice.id) && <Check size={17} />}</span></ButtonUi>)}
      {step === 1 && experienceChoices.map(choice => <ButtonUi key={choice.id} variant="choice" type="button" role="radio" aria-checked={experienceLevel === choice.id} className={experienceLevel === choice.id ? 'selected' : ''} onClick={() => setExperienceLevel(choice.id)}><span><strong>{choice.label}</strong><small>{choice.detail}</small></span><span className="choice-mark">{experienceLevel === choice.id && <Check size={17} />}</span></ButtonUi>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="onboarding-actions">
      <ButtonUi variant="quiet" type="button" disabled={step === 0 || saving} onClick={() => setStep(value => value - 1)}>Back</ButtonUi>
      <div className="onboarding-actions-right">
        <ButtonUi type="button" disabled={(step === 0 && interests.length === 0) || saving} onClick={() => { if (step === 0) setStep(1); else void finish(); }}>{saving ? 'Saving…' : step === 1 ? 'See my home' : 'Continue'}</ButtonUi>
      </div>
    </div>
  </div>;
}
