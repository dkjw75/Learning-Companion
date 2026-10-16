import { Link } from 'react-router';
import type { SavedLessonSession } from '@/lib/sessions';

type Props = {
  sessionId: string;
  steps: SavedLessonSession['lesson']['steps'];
  activeStep: number | null;
  disabled?: boolean;
  onStepSelect: (position: number) => void;
};

export function LessonStepRail({ sessionId, steps, activeStep, disabled, onStepSelect }: Props) {
  return <nav className="lesson-step-rail" aria-label="Lesson steps"><span className="lesson-rail-heading">On this lesson</span>
    <ol>{steps.map((step, position) => <li key={step.id}><button type="button"
      aria-current={position === activeStep ? 'step' : undefined} disabled={disabled}
      onClick={() => onStepSelect(position)}>{step.heading}</button></li>)}</ol>
    <Link className="lesson-rail-quiz" aria-current={activeStep === null ? 'page' : undefined}
      to={`/learn/${sessionId}/quiz`}>Go to Quiz</Link>
  </nav>;
}
