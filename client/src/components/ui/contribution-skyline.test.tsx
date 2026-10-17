import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import ContributionSkyline from './contribution-skyline';

it('aligns weekday rows and month labels with their dates', () => {
  const { container } = render(<ContributionSkyline activityCounts={[]} endDate="2026-01-16" />);
  const labels = container.querySelectorAll('svg g[aria-hidden="true"] text');
  expect(Array.from(labels).slice(0, 7).map(label => label.textContent)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
  expect(screen.getByRole('button', { name: '2025-01-17: 0 lesson sessions' }).querySelector('rect')).toHaveAttribute('y', '115');
  expect(screen.getByRole('button', { name: '2025-01-20: 0 lesson sessions' }).querySelector('rect')).toHaveAttribute('y', '39');
  expect(Array.from(labels).find(label => label.textContent === 'Feb')).toHaveAttribute('x', '58');
});
