/** Tiny inline SVG sparkline — renders as absolute-positioned background. */
export default function SparklineSvg({ data, className }: { data: number[]; className?: string }) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Build SVG polyline points: x goes 0→100, y goes 100→0 (SVG y is inverted)
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  // Determine color based on trend (last vs first)
  const trending = data[data.length - 1] >= data[0];
  const color = trending ? 'var(--green)' : 'var(--red)';

  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
