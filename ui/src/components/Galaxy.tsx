import { useEffect, useRef } from "react";
import * as d3 from "d3";
import { AnalysisResult, Package } from "../types";

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
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.packages.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = 700;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const nodes: Node[] = data.packages.map((pkg) => ({
      id: pkg.name,
      pkg,
      radius: Math.max(
        4,
        Math.min(22, Math.sqrt(pkg.installed_size ?? 100000) / 10),
      ),
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

    // Zoom behavior
    const g = svg.append("g");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Background
    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "#0d1117")
      .attr("opacity", 0.3);

    // Glow
    const defs = svg.append("defs");
    defs
      .append("radialGradient")
      .attr("id", "galaxy-glow")
      .attr("cx", "50%")
      .attr("cy", "50%")
      .attr("r", "50%")
      .append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#1e3a5f")
      .attr("stop-opacity", "0.2");
    defs
      .select(null)
      .append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#0d1117")
      .attr("stop-opacity", "0");

    g.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#galaxy-glow)")
      .attr("pointer-events", "none");

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(100),
      )
      .force("charge", d3.forceManyBody().strength(-250))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collision",
        d3.forceCollide().radius((d: any) => d.radius + 6),
      );

    const linkGroup = g.append("g");
    const nodeGroup = g.append("g");
    const labelGroup = g.append("g");

    const linkElements = linkGroup
      .selectAll<SVGLineElement, Link>("line")
      .data(links)
      .enter()
      .append("line")
      .attr("stroke", "#30363d")
      .attr("stroke-width", 0.5)
      .attr("stroke-opacity", 0.4);

    const nodeElements = nodeGroup
      .selectAll<SVGCircleElement, Node>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => d.radius)
      .attr("fill", (d) => {
        const rl = d.pkg.risk_level;
        if (rl === "Critical" || rl === "High") return "#f85149";
        if (rl === "Medium") return "#d29922";
        return d.pkg.direct ? "#58a6ff" : "#8b949e";
      })
      .attr("stroke", (d) => {
        if (d.pkg.risk_level === "Critical") return "#ff6b6b";
        if (d.pkg.risk_level === "High") return "#f85149";
        return "transparent";
      })
      .attr("stroke-width", (d) => (d.pkg.risk_level === "Critical" ? 3 : 2))
      .attr("stroke-opacity", 0.8)
      .attr("cursor", "pointer")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", d.radius + 6);
        const tt = d3.select(tooltipRef.current);
        tt
          .style("opacity", 1)
          .style("left", `${Math.min(event.offsetX + 16, width - 260)}px`)
          .style("top", `${Math.max(event.offsetY - 40, 10)}px`).html(`
            <div class="font-semibold text-white mb-1">${d.pkg.name}</div>
            <div class="text-gray-400">v${d.pkg.version}</div>
            <div class="mt-1 text-gray-500">
              ${d.pkg.direct ? "Direct" : "Transitive"} · Depth ${d.pkg.depth}<br/>
              ${d.pkg.health_score ? `Health: ${Math.round(d.pkg.health_score)}` : "Health: N/A"}
              ${d.pkg.installed_size ? ` · Size: ${formatSize(d.pkg.installed_size)}` : ""}
              ${d.pkg.risk_level ? `<br/>Risk: ${d.pkg.risk_level}` : ""}
              ${d.pkg.license ? `<br/>License: ${d.pkg.license}` : ""}
              ${d.pkg.vulnerabilities.length ? `<br/>🚨 ${d.pkg.vulnerabilities.length} CVE(s)` : ""}
            </div>
          `);
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("r", (d: any) => d.radius);
        d3.select(tooltipRef.current).style("opacity", 0);
      })
      .call(
        d3
          .drag<SVGCircleElement, Node>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }),
      );

    const labelElements = labelGroup
      .selectAll<SVGTextElement, Node>("text")
      .data(nodes.filter((n) => n.pkg.direct || n.radius > 9))
      .enter()
      .append("text")
      .text((d) =>
        d.pkg.name.length > 18 ? d.pkg.name.slice(0, 16) + "…" : d.pkg.name,
      )
      .attr("font-size", (d) => (d.pkg.direct ? "10px" : "8px"))
      .attr("font-weight", (d) => (d.pkg.direct ? "600" : "400"))
      .attr("fill", (d) => (d.pkg.direct ? "#c9d1d9" : "#8b949e"))
      .attr("text-anchor", "middle")
      .attr("dy", (d) => d.radius + 14)
      .attr("pointer-events", "none");

    // Legend
    const legend = g
      .append("g")
      .attr("transform", "translate(16, 16)")
      .attr("class", "bg-gray-900/80 rounded-lg p-2");

    const legendItems = [
      { color: "#58a6ff", label: "Direct dep" },
      { color: "#8b949e", label: "Transitive dep" },
      { color: "#d29922", label: "Medium risk" },
      { color: "#f85149", label: "High risk" },
    ];

    legendItems.forEach((item, i) => {
      const ly = i * 20;
      legend
        .append("circle")
        .attr("cx", 6)
        .attr("cy", ly + 4)
        .attr("r", 4)
        .attr("fill", item.color);
      legend
        .append("text")
        .attr("x", 16)
        .attr("y", ly + 8)
        .attr("font-size", "10px")
        .attr("fill", "#8b949e")
        .text(item.label);
    });

    simulation.on("tick", () => {
      linkElements
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeElements.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);

      labelElements.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
    });

    // Initial zoom to center
    svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <div className="relative animate-fade-in">
      <h2 className="text-2xl font-bold text-white mb-1">Dependency Galaxy</h2>
      <p className="text-gray-500 text-sm mb-4">
        Node size = package weight · Color = risk level · Scroll to zoom · Drag
        to pan · Hover for details
      </p>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden relative">
        <svg ref={svgRef} className="w-full" style={{ minHeight: "700px" }} />
        <div
          ref={tooltipRef}
          className="tooltip"
          style={{
            position: "absolute",
            opacity: 0,
            transition: "opacity 0.15s",
          }}
        />
        {/* Zoom controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
          <button
            onClick={() => {
              const sel = d3.select(svgRef.current!);
              sel
                .transition()
                .duration(300)
                .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 1.3);
            }}
            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-lg leading-none transition-colors"
          >
            +
          </button>
          <button
            onClick={() => {
              const sel = d3.select(svgRef.current!);
              sel
                .transition()
                .duration(300)
                .call(d3.zoom<SVGSVGElement, unknown>().scaleBy, 0.7);
            }}
            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-lg leading-none transition-colors"
          >
            −
          </button>
          <button
            onClick={() => {
              const sel = d3.select(svgRef.current!);
              sel
                .transition()
                .duration(500)
                .call(
                  d3.zoom<SVGSVGElement, unknown>().transform,
                  d3.zoomIdentity,
                );
            }}
            className="w-8 h-8 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 text-xs transition-colors"
          >
            ⟲
          </button>
        </div>
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
