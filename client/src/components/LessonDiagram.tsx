import { useId, useState } from 'react';
import type { DiagramSpec, LessonStep } from '@learning-companion/shared';
import { AppWindow, ArrowLeftRight, Boxes, Braces, Database, KeyRound, Laptop, Network, Server, Smartphone, Table2 } from 'lucide-react';

const icons = { client: Laptop, server: Server, api: Network, database: Database, table: Table2,
  json: Braces, security: KeyRound, mobile: Smartphone, web: AppWindow, exchange: ArrowLeftRight, generic: Boxes };
const position = (index: number) => ({ x: index % 2 ? 450 : 20, y: Math.floor(index / 2) * 330 + 30 });
function connection(diagram: DiagramSpec, edge: DiagramSpec['edges'][number]) {
  const from = position(diagram.nodes.findIndex(node => node.id === edge.from));
  const to = position(diagram.nodes.findIndex(node => node.id === edge.to));
  const pair = diagram.edges.filter(item => [edge.from, edge.to].includes(item.from) && [edge.from, edge.to].includes(item.to));
  const lane = (pair.indexOf(edge) - (pair.length - 1) / 2) * 95;
  const middle = 350 + lane / 3;
  const y1 = from.y + 110 + lane;
  const y2 = to.y + 110 + lane;
  return { path: `M ${from.x === 20 ? 250 : 450} ${y1} H ${middle} V ${y2} H ${to.x === 20 ? 250 : 450}`,
    x: middle, y: (y1 + y2) / 2, direction: from.x === to.x ? (to.y > from.y ? '↓' : '↑') : (to.x > from.x ? '→' : '←') };
}

export function LessonDiagram({ diagram, step, runningExample }: { diagram: DiagramSpec; step: LessonStep; runningExample: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const markerId = useId().replace(/:/g, '');
  const selectedPart = diagram.nodes.find(part => part.id === selected) ?? diagram.edges.find(part => part.id === selected);
  const select = (id: string) => setSelected(selected === id ? null : id);
  return <section className={`lesson-diagram ${diagram.type}`} aria-label={diagram.title}>
    <header className="diagram-heading"><h3>{diagram.title}</h3><span>Explore the example · Select a part</span></header>
    <p className="diagram-scenario"><span>RUNNING EXAMPLE</span>{runningExample}</p>
    {diagram.type === 'table' ? <div className="lesson-table-scroll"><table>
      <thead><tr>{diagram.table.columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
      <tbody>{diagram.table.rows.map((row, index) => <tr key={index} className={step.highlightRowIndexes.includes(index) ? 'highlight' : ''}>
        {row.map((cell, cellIndex) => <td key={cellIndex}><button type="button"
          aria-label={`Row ${index + 1}, ${diagram.table.columns[cellIndex]}: ${cell}`}
          aria-pressed={selected === `${index}:${cellIndex}`} onClick={() => select(`${index}:${cellIndex}`)}>{cell}</button></td>)}
      </tr>)}</tbody></table>
      {selected && <p className="diagram-selection" role="status">{diagram.table.columns[Number(selected.split(':')[1])]}: {diagram.table.rows[Number(selected.split(':')[0])]?.[Number(selected.split(':')[1])]}</p>}
    </div> : <div className="diagram-scroll" tabIndex={0} aria-label="Example diagram; scroll to explore">
      <div className="diagram-stage" style={{ height: Math.ceil(diagram.nodes.length / 2) * 330 }}>
        <svg className="diagram-wires" width="700" height="100%" aria-hidden="true">
          <defs><marker id={markerId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
          </marker></defs>
          {diagram.edges.map(edge => {
            return <path key={edge.id} data-edge-id={edge.id} className={step.highlightEdgeIds.includes(edge.id) ? 'highlight' : ''}
              d={connection(diagram, edge).path}
              markerEnd={`url(#${markerId})`} />;
          })}
        </svg>
        {diagram.nodes.map((node, index) => {
          const Icon = icons[node.icon ?? 'generic'];
          const point = position(index);
          return <button type="button" key={node.id} style={{ left: point.x, top: point.y }}
            className={`diagram-node tone-${index % 4} ${step.highlightNodeIds.includes(node.id) ? 'highlight' : 'inactive'} ${selected === node.id ? 'selected' : ''}`}
            aria-label={`${node.label}: ${node.description}`} aria-pressed={selected === node.id} onClick={() => select(node.id)}>
            <span className="diagram-node-heading"><Icon size={22} strokeWidth={1.6} /><strong>{node.label}</strong></span>
            <span className="diagram-node-example">{node.example}</span>
            <span className="diagram-node-state">{step.highlightNodeIds.includes(node.id) ? '● In this step' : 'Select to inspect'}</span>
          </button>;
        })}
        {diagram.edges.map(edge => {
          const line = connection(diagram, edge);
          return <button type="button" key={edge.id}
            style={{ left: line.x, top: line.y }}
            className={`diagram-edge ${step.highlightEdgeIds.includes(edge.id) ? 'highlight' : 'inactive'} ${selected === edge.id ? 'selected' : ''}`}
            aria-label={`${diagram.nodes.find(node => node.id === edge.from)?.label} to ${diagram.nodes.find(node => node.id === edge.to)?.label}: ${edge.label}`}
            aria-pressed={selected === edge.id} onClick={() => select(edge.id)}>{edge.label}<span aria-hidden="true">{line.direction}</span></button>;
        })}
      </div>
    </div>}
    {selectedPart && <p className="diagram-selection" role="status"><strong>{selectedPart.label}</strong>{'description' in selectedPart ? ` — ${selectedPart.description}` : ''}</p>}
    <p className="diagram-legend"><span>● Highlighted: this step</span><span>Arrows show direction or a relationship</span></p>
  </section>;
}
