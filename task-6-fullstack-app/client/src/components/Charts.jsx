// Two small SVG / CSS charts, no chart library needed

export function SignupChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.users));
  const width = 560, height = 150, gap = 6;
  const barW = (width - gap * (days.length - 1)) / days.length;
  return (
    <figure className="chart">
      <svg viewBox={`0 0 ${width} ${height + 22}`} role="img" aria-label="Inscriptions par jour sur 14 jours">
        {days.map((d, i) => {
          const h = Math.max(3, (d.users / max) * height);
          const x = i * (barW + gap);
          const label = new Date(d.day + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
          return (
            <g key={d.day}>
              <rect x={x} y={height - h} width={barW} height={h} rx="5" className={d.users ? "bar" : "bar empty"}>
                <title>{`${label} : ${d.users} inscription(s)`}</title>
              </rect>
              {d.users > 0 && <text x={x + barW / 2} y={height - h - 5} textAnchor="middle" className="bar-value">{d.users}</text>}
              {i % 2 === 1 && <text x={x + barW / 2} y={height + 16} textAnchor="middle" className="bar-label">{label}</text>}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function AgeBars({ brackets, total }) {
  return (
    <ul className="age-bars">
      {brackets.map((b) => (
        <li key={b.bracket}>
          <span>{b.bracket} ans</span>
          <span className="track"><span style={{ width: `${total ? (b.users / total) * 100 : 0}%` }} /></span>
          <b>{b.users}</b>
        </li>
      ))}
    </ul>
  );
}
