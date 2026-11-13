"use client";

/**
 * A chart on screen as SVG, for a printed report (SDS's chartToPrintSvg). Highcharts' own serialiser
 * (`chart.getSVG()`, the exporting module's) re-renders the chart into a detached container; reading the DOM
 * instead gives whatever the chart did to fit a screen. Looked up when asked, never held: a destroyed chart
 * still looks like a chart. The measured width and height become a viewBox so the page sizes it.
 *
 * Never throws: a chart still drawing returns null and the report prints its table alone.
 */
export interface PrintChart {
  markup: string;
  width: number;
  height: number;
}

export async function chartToPrintSvg(container: HTMLElement | null): Promise<PrintChart | null> {
  if (!container) return null;
  try {
    const drawn = (await serialised(container)) ?? container.querySelector("svg.highcharts-root");
    return drawn ? forPaper(drawn as SVGElement) : null;
  } catch {
    return null;
  }
}

async function serialised(container: HTMLElement): Promise<SVGElement | null> {
  try {
    const { default: Highcharts } = await import("highcharts");
    const chart = Highcharts.charts.find((c) => c && container.contains(c.container));
    // Declared by the exporting module, so checked rather than assumed.
    const exportable = chart as unknown as { getSVG?: (o?: unknown) => string; options?: { exporting?: { chartOptions?: unknown } } } | undefined;
    if (typeof exportable?.getSVG !== "function") return null;
    // The PNG export's overrides, so the print and the download agree on the chart's title.
    const parsed = new DOMParser().parseFromString(exportable.getSVG(exportable.options?.exporting?.chartOptions), "image/svg+xml");
    if (parsed.querySelector("parsererror")) return null;
    return parsed.documentElement as unknown as SVGElement;
  } catch {
    return null;
  }
}

function forPaper(svg: SVGElement): PrintChart | null {
  const copy = svg.cloneNode(true) as SVGElement;
  const width = Number(copy.getAttribute("width"));
  const height = Number(copy.getAttribute("height"));
  if (!(width > 0 && height > 0)) return null;
  copy.setAttribute("viewBox", `0 0 ${width} ${height}`);
  copy.removeAttribute("width");
  copy.removeAttribute("height");
  copy.setAttribute("preserveAspectRatio", "xMidYMid meet");
  // The menu button belongs to the screen; on paper nobody can press it.
  copy.querySelectorAll(".highcharts-contextbutton, .highcharts-exporting-group").forEach((n) => n.remove());
  return { markup: new XMLSerializer().serializeToString(copy), width, height };
}

/** A box the chart's own shape, capped at the page's (the printable width and the .print-chart height, in mm). */
export function chartBoxHeight(chart: PrintChart, landscape: boolean): string {
  const width = landscape ? 273 : 186;
  const cap = landscape ? 130 : 120;
  return `${Math.min(cap, Math.round((width * chart.height) / chart.width))}mm`;
}
