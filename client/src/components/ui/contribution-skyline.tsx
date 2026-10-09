import { useMemo, useRef, useState, type KeyboardEvent } from 'react';

type ActivityCount = { date: string; count: number };
type ContributionSkylineProps = { activityCounts: ActivityCount[]; endDate?: string };
const DAY = 86_400_000;

function isoDate(date: Date) { return date.toISOString().slice(0, 10); }
function longestRun(days: { date: string; count: number }[]) {
  let best = 0, run = 0;
  for (const day of days) { run = day.count ? run + 1 : 0; best = Math.max(best, run); }
  return best;
}

export default function ContributionSkyline({ activityCounts, endDate }: ContributionSkylineProps) {
  const [active, setActive] = useState<number | null>(null);
  const dayRefs = useRef<(SVGGElement | null)[]>([]);
  const finalDate = endDate ?? isoDate(new Date());
  const days = useMemo(() => {
    const counts = new Map(activityCounts.map(item => [item.date, item.count]));
    const startEnd = new Date(`${finalDate}T00:00:00.000Z`);
    return Array.from({ length: 365 }, (_, index) => {
      const date = isoDate(new Date(startEnd.getTime() - (364 - index) * DAY));
      return { date, count: counts.get(date) ?? 0 };
    });
  }, [activityCounts, finalDate]);
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const busiest = days.reduce((best, day) => day.count > best.count ? day : best, { date: '—', count: 0 });
  const currentRun = (() => {
    let run = 0;
    let index = days.length - 1;
    if (days[index]!.count === 0) index--;
    for (; index >= 0 && days[index]!.count; index--) run++;
    return run;
  })();
  const weeks = Array.from({ length: 53 }, (_, col) => days.slice(col * 7, col * 7 + 7));
  const color = (n: number) => n === 0 ? '#17243a' : n === 1 ? '#064e3b' : n < 4 ? '#047857' : n < 7 ? '#10b981' : '#6ee7b7';
  const selected = active === null ? null : days[active];
  function handleKey(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowDown' ? 7 : -7;
      const next = Math.max(0, Math.min(days.length - 1, (active ?? days.length - 1) + delta));
      dayRefs.current[next]?.focus();
    }
  }
  return <section className="skyline-card" aria-label="Past-year contribution chart">
    <div className="skyline-chart">
      <svg viewBox="0 0 980 230" role="img" aria-label={`Showing ${total} lesson sessions over the past year`} onKeyDown={handleKey}>
        {weeks.map((week, col) => week.map((day, row) => {
          const index = col * 7 + row;
          const x = 24 + col * 17;
          const y = 35 + row * 19;
          const isActive = active === index;
          return <g key={day.date} ref={element => { dayRefs.current[index] = element; }} className="skyline-day" tabIndex={index === (active ?? 364) ? 0 : -1} role="button" aria-label={`${day.date}: ${day.count} lesson sessions`} onFocus={() => setActive(index)} onMouseEnter={() => setActive(index)} onMouseLeave={() => setActive(null)} onClick={() => setActive(index)}>
            <rect x={x} y={y + 4} width="11" height="12" rx="2" fill={color(day.count)} stroke={isActive ? '#67e8f9' : 'none'} strokeWidth="2" />
          </g>;
        }))}
        {selected && <text x="24" y="218" className="skyline-selected">{selected.date} · {selected.count} {selected.count === 1 ? 'session' : 'sessions'}</text>}
      </svg>
    </div>
    <div className="skyline-legend"><span>Less</span>{['#17243a', '#064e3b', '#047857', '#10b981', '#6ee7b7'].map(value => <i key={value} style={{ background: value }} />)}<span>More</span><span className="skyline-range">Past year</span></div>
    <div className="skyline-stats"><div><strong>{total}</strong><span>Sessions</span></div><div><strong>{busiest.count || '—'}</strong><span>Busiest day</span><small>{busiest.date}</small></div><div><strong>{longestRun(days)}</strong><span>Longest streak</span></div><div><strong>{currentRun}</strong><span>Current streak</span></div></div>
    {total === 0 && <p className="activity-empty">Your learning history will appear here as you study.</p>}
  </section>;
}
