import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { AnalysisResult, Package } from '../types';

interface Props {
  data: AnalysisResult;
}

interface Node extends d3.SimulationNodeDatum {
  id: string;
  pkg: Package;
  radius: number;
  group: number;
}

interface Link {
  source: string;
  target: string;
}

export default function Galaxy({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.packages.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth;
    const height = 700;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const direct = data.packages.filter((p) => p.direct);
    const transitive = data.packages.filter((p) => !p.direct);

    const nodes: Node[] = data.packages.map((pkg) => ({
      id: pkg.name,
      pkg,
      radius: Math.max(4, Math.min(20, (pkg.installed_size ?? 100000) / 100000)),
      group: pkg.direct ? 1 : 2,
    }));

    const links: Link[] = [];
    for (const pkg of data.packages) {
      for (const dep of pkg.dependencies) {
        if (data.packages.some((p) => p.name === dep)) {
          links.push({ source: pkg.name, target: dep });
        }
      }
    }

    if (links.length === 0) {
      const rootPkg = data.packages.find((p) => p.direct);
      if (rootPkg) {
        for (const pkg of data.packages) {
          if (!pkg.direct) {
            links.push({ source: rootPkg.name, target: pkg.name });
          }
        }
      }
    }

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.radius + 4));

    const defs = svg.append('defs');
    defs.append('radialGradient')
      .attr('id', 'bg-glow')
      .attr('cx', '50%').attr('cy', '50%').attr('r', '50%')
      .append('stop').attr('offset', '0%').attr('stop-color', '#1e3a5f').attr('stop-opacity', '0.3');
    defs.append('stop').attr('offset', '100%').attr('stop-color', '#0d1117').attr('stop-opacity', '0');

    svg.append('rect')
      .attr('width', width).attr('height', height)
      .attr('fill', 'url(#bg-glow)');

    const linkGroup = svg.append('g');
    const nodeGroup = svg.append('g');
    const labelGroup = svg.append('g');

    const linkElements = linkGroup.selectAll<SVGLineElement, Link>('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#30363d')
      .attr('stroke-width', 0.5)
      .attr('stroke-opacity', 0.6);

    const nodeElements = nodeGroup.selectAll<SVGCircleElement, Node>('circle')
      .data(nodes)
      .enter()
      .append('circle')
      .attr('r', (d) => d.radius)
      .attr('fill', (d) => d.pkg.direct ? '#58a6ff' : '#8b949e')
      .attr('stroke', (d) => {
        if (d.pkg.risk_level === 'Critical' || d.pkg.risk_level === 'High') return '#f85149';
        if (d.pkg.risk_level === 'Medium') return '#d29922';
        return 'transparent';
      })
      .attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', d.radius + 4);
        tooltip
          .style('opacity', 1)
          .html(`
            <strong>${d.pkg.name}</strong> v${d.pkg.version}<br/>
            ${d.pkg.direct ? 'Direct' : 'Transitive'} · Depth ${d.pkg.depth}<br/>
            ${d.pkg.health_score ? `Health: ${Math.round(d.pkg.health_score)}` : ''}
            ${d.pkg.installed_size ? ` · Size: ${formatSize(d.pkg.installed_size)}` : ''}
            ${d.pkg.risk_level ? `<br/>Risk: ${d.pkg.risk_level}` : ''}
            ${d.pkg.vulnerabilities.length ? `<br/>CVEs: ${d.pkg.vulnerabilities.length}` : ''}
          `)
          .style('left', `${event.offsetX + 12}px`)
          .style('top', `${event.offsetY - 28}px`);
      })
      .on('mouseleave', function () {
        d3.select(this).attr('r', (d: any) => d.radius);
        tooltip.style('opacity', 0);
      })
      .call(
        d3.drag<SVGCircleElement, Node>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    const labelElements = labelGroup.selectAll<SVGTextElement, Node>('text')
      .data(nodes.filter((n) => n.pkg.direct || n.radius > 8))
      .enter()
      .append('text')
      .text((d) => d.pkg.name.length > 16 ? d.pkg.name.slice(0, 14) + '...' : d.pkg.name)
      .attr('font-size', '9px')
      .attr('fill', '#8b949e')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => d.radius + 12);

    const tooltip = d3.select(svgRef.current.parentElement!)
      .append('div')
      .attr('class', 'absolute bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs pointer-events-none')
      .style('opacity', 0)
      .style('z-index', '50');

    simulation.on('tick', () => {
      linkElements
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      nodeElements
        .attr('cx', (d) => d.x!)
        .attr('cy', (d) => d.y!);

      labelElements
        .attr('x', (d) => d.x!)
        .attr('y', (d) => d.y!);
    });

    return () => {
      simulation.stop();
      tooltip.remove();
    };
  }, [data]);

  return (
    <div className="relative">
      <h2 className="text-2xl font-bold text-white mb-4">Dependency Galaxy</h2>
      <p className="text-gray-500 text-sm mb-4">
        Stars = direct deps · Planets = transitive deps · Size = package weight · Color = health
      </p>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden relative">
        <svg ref={svgRef} className="w-full" style={{ minHeight: '700px' }} />
      </div>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`;
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}
