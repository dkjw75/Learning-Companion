import { expect, test } from '@playwright/test';

// Isolated synthetic examples exercise the real renderer; no test route or fixture is served by the app.
const diagrams = [
  { id: 'flow', type: 'flow', title: 'A cache lookup', nodes: [
    { id: 'app', label: 'Course app', description: 'Asks for the saved course list.', icon: 'web', example: 'Read key: courses:42' },
    { id: 'cache', label: 'Cache', description: 'Returns the stored value.', icon: 'database', example: 'courses:42\n["Databases", "Web development"]' },
  ], edges: [{ id: 'read', from: 'app', to: 'cache', label: 'Read courses:42' }, { id: 'return', from: 'cache', to: 'app', label: 'Return the stored course list' }] },
  { id: 'relationship', type: 'relationship', title: 'One reader and their loans', nodes: [
    { id: 'reader', label: 'Reader', description: 'The reader identified by 42.', icon: 'table', example: 'reader_id: 42\nname: Ada' },
    { id: 'loan', label: 'Book loan', description: 'A loan linked to reader 42.', icon: 'table', example: 'loan_id: 1042\nreader_id: 42\nbook: Dune' },
  ], edges: [{ id: 'link', from: 'reader', to: 'loan', label: 'reader_id 42 links this loan' }] },
  { id: 'table', type: 'table', title: 'A job queue', nodes: [], edges: [],
    table: { columns: ['Job', 'Action', 'State'], rows: [['1042', 'Send receipt', 'Waiting'], ['1043', 'Resize photo', 'Running']] } },
];

for (const diagram of diagrams) {
  test(`synthetic ${diagram.type} example uses the shared lesson design`, async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Connect concepts. Build understanding.' })).toBeVisible();
    await page.addScriptTag({ type: 'module', content: `
      import React from '/node_modules/.vite/deps/react.js';
      import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
      import { LessonDiagram } from '/src/components/LessonDiagram.tsx';
      document.getElementById('root').remove();
      const host = document.createElement('main');
      host.style.cssText = 'max-width:1100px;margin:32px auto;padding:16px;';
      document.body.append(host);
      const diagram = ${JSON.stringify(diagram)};
      const step = { highlightNodeIds: diagram.nodes.slice(0,1).map(n => n.id), highlightEdgeIds: diagram.edges.slice(0,1).map(e => e.id), highlightRowIndexes: diagram.type === 'table' ? [0] : [] };
      ReactDOM.createRoot(host).render(React.createElement(LessonDiagram, { diagram, step, runningExample: 'Follow one concrete example through the highlighted parts of this lesson.' }));
    ` });
    await expect(page.getByRole('region', { name: diagram.title })).toBeVisible();
    await expect(page.getByText('RUNNING EXAMPLE', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (diagram.type === 'table') {
      await expect(page.locator('tbody tr').first()).toHaveClass('highlight');
      await page.getByRole('button', { name: 'Row 1, Job: 1042' }).click();
      await expect(page.getByRole('status')).toHaveText('Job: 1042');
    } else {
      await expect(page.locator('.diagram-wires > path')).toHaveCount(diagram.edges.length);
      const node = page.locator('.diagram-node').first();
      await node.focus();
      await page.keyboard.press('Enter');
      await expect(node).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('status')).toContainText(diagram.nodes[0]!.description);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await expect(page.locator('.diagram-wires > path.highlight')).toHaveCSS('animation-name', 'none');
    }
    await page.screenshot({ path: testInfo.outputPath(`${diagram.type}.png`), fullPage: true });
  });
}
