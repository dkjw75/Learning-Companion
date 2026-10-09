import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Sparkles } from 'lucide-react';
import type { CompleteOnboarding } from '@learning-companion/shared';
import { useSession } from '@/auth/session-context';
import { saveOnboarding } from '@/lib/learning';
import { ButtonUi } from '@/components/ui/button-ui';

const areaChoices = [
  { id: 'web_development', label: 'Web development', detail: 'Websites and web apps' },
  { id: 'cloud', label: 'Cloud computing', detail: 'Services and infrastructure online' },
  { id: 'cybersecurity', label: 'Cybersecurity', detail: 'Keeping systems and data safe' },
  { id: 'ai_ml', label: 'AI and machine learning', detail: 'Intelligent tools and models' },
  { id: 'data_science', label: 'Data science', detail: 'Finding patterns in data' },
  { id: 'mobile', label: 'Mobile development', detail: 'Apps for phones and tablets' },
  { id: 'game_development', label: 'Game development', detail: 'Interactive worlds and play' },
  { id: 'devops', label: 'DevOps', detail: 'Building and running software' },
  { id: 'ui_ux', label: 'UI and UX design', detail: 'How digital products look and feel' },
  { id: 'hardware_iot', label: 'Hardware and IoT', detail: 'Devices and connected things' },
  { id: 'apis', label: 'APIs', detail: 'How software shares data' },
  { id: 'databases', label: 'Databases', detail: 'How information is organised' },
  { id: 'web_communication', label: 'Web communication', detail: 'How browsers and servers talk' },
] as const;
const experienceChoices = [
  { id: 'new', label: 'Just starting out', detail: 'I am new to technology topics' },
  { id: 'some', label: 'Some experience', detail: 'I have explored a few tools or projects' },
  { id: 'experienced', label: 'Experienced', detail: 'I have built or worked with technology before' },
] as const;
const questions = [
  { id: 'interest', title: 'Which tech topic would you explore first?', options: [['websites', 'Websites and apps'], ['apis', 'APIs and connected software'], ['data', 'Data and databases'], ['cloud', 'Cloud computing'], ['cybersecurity', 'Cybersecurity'], ['ai_ml', 'AI and machine learning'], ['mobile', 'Mobile apps'], ['games', 'Games'], ['design', 'Digital design'], ['hardware', 'Hardware and devices'], ['unsure', 'I am still exploring']] },
  { id: 'confidence', title: 'How familiar are you with technology overall?', options: [['beginner', 'Mostly new'], ['some', 'I know a little'], ['comfortable', 'Fairly familiar']] },
  { id: 'practice', title: 'What have you spent the most time trying?', options: [['none', 'Nothing hands-on yet'], ['web_apps', 'Websites or apps'], ['cloud_tools', 'Cloud tools'], ['security_tools', 'Security tools'], ['ai_tools', 'AI tools'], ['data_tools', 'Data tools'], ['mobile_apps', 'Mobile apps'], ['other', 'Something else']] },
  { id: 'goal', title: 'What brings you here today?', options: [['understand', 'Understand the fundamentals'], ['project', 'Apply ideas in a project'], ['explore', 'Explore what interests me']] },
  { id: 'pace', title: 'What pace feels right?', options: [['guided', 'Guide me step by step'], ['balanced', 'A balanced path'], ['independent', 'Let me choose freely']] },
] as const;

export function OnboardingView() {
  const navigate = useNavigate();
  const { session, profile, refreshProfile } = useSession();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<CompleteOnboarding['interests']>([]);
  const [experienceLevel, setExperienceLevel] = useState<CompleteOnboarding['experienceLevel']>('new');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!session || !profile) return null;
  if (profile.onboardingComplete) { queueMicrotask(() => navigate('/home', { replace: true })); return null; }
  const question = step >= 2 ? questions[step - 2] : null;
  const selected = question ? answers[question.id] : undefined;
  const nextDisabled = step === 0 ? interests.length === 0 : question ? !selected : false;
  const finish = async (skippedDiagnostic: boolean) => {
    setSaving(true); setError('');
    try {
      await saveOnboarding({
        interests, experienceLevel,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        skippedDiagnostic,
        answers: skippedDiagnostic ? [] : questions.map(item => ({ questionId: item.id, answerId: answers[item.id]! })),
      });
      await refreshProfile();
      navigate('/home', { replace: true });
    } catch {
      setError('Could not save your starting point. Please try again.');
    } finally { setSaving(false); }
  };
  return <div className="onboarding-shell">
    <div className="onboarding-progress" aria-label={`Step ${step + 1} of 7`}><span style={{ width: `${((step + 1) / 7) * 100}%` }} /></div>
    <div className="onboarding-intro"><span className="eyebrow"><Sparkles size={14} /> YOUR STARTING POINT</span><span className="step-count">{String(step + 1).padStart(2, '0')} / 07</span></div>
    <h1>{step === 0 ? 'What sparks your curiosity?' : step === 1 ? 'Where are you starting from?' : question?.title}</h1>
    <p className="onboarding-subtitle">{step === 0 ? 'Choose up to three areas across tech that interest you. You can change direction whenever you like.' : step === 1 ? 'Think about your overall tech experience, across any field.' : 'This quick check helps us suggest a starting topic. It does not grade your understanding.'}</p>
    <div className={`onboarding-options ${step === 0 ? 'interest-options' : ''}`} role={step === 0 ? 'group' : 'radiogroup'} aria-label={step === 0 ? 'Areas of interest' : step === 1 ? 'Current experience' : question?.title}>
      {step === 0 && areaChoices.map(choice => <ButtonUi key={choice.id} variant="choice" type="button" className={interests.includes(choice.id) ? 'selected' : ''} aria-pressed={interests.includes(choice.id)} disabled={!interests.includes(choice.id) && interests.length >= 3} onClick={() => setInterests(current => current.includes(choice.id) ? current.filter(item => item !== choice.id) : [...current, choice.id])}><span><strong>{choice.label}</strong><small>{choice.detail}</small></span><span className="choice-mark">{interests.includes(choice.id) && <Check size={17} />}</span></ButtonUi>)}
      {step === 1 && experienceChoices.map(choice => <ButtonUi key={choice.id} variant="choice" type="button" role="radio" aria-checked={experienceLevel === choice.id} className={experienceLevel === choice.id ? 'selected' : ''} onClick={() => setExperienceLevel(choice.id)}><span><strong>{choice.label}</strong><small>{choice.detail}</small></span><span className="choice-mark">{experienceLevel === choice.id && <Check size={17} />}</span></ButtonUi>)}
      {question?.options.map(([id, label]) => <ButtonUi key={id} variant="choice" type="button" role="radio" aria-checked={selected === id} className={selected === id ? 'selected' : ''} onClick={() => setAnswers(current => ({ ...current, [question.id]: id }))}><strong>{label}</strong><span className="choice-mark">{selected === id && <Check size={17} />}</span></ButtonUi>)}
    </div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="onboarding-actions">
      <ButtonUi variant="quiet" type="button" disabled={step === 0 || saving} onClick={() => setStep(value => value - 1)}>Back</ButtonUi>
      <div className="onboarding-actions-right">
        <ButtonUi variant="quiet" type="button" disabled={saving} onClick={() => { void finish(true); }}>Skip</ButtonUi>
        <ButtonUi type="button" disabled={nextDisabled || saving} onClick={() => { if (step < 6) setStep(value => value + 1); else void finish(false); }}>{saving ? 'Saving…' : step === 6 ? 'See my home' : 'Continue'}</ButtonUi>
      </div>
    </div>
  </div>;
}
