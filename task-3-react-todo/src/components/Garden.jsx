import { useMemo } from "react";
import { CATEGORIES } from "../state/tasksReducer";

const WIDTH = 600;
const GROUND = 150;
const MAX_FLOWERS = 60;

// Turn a task id into a stable number, so each flower always grows at the same spot
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

function Flower({ x, height, color, delay }) {
  return (
    <g transform={`translate(${x} ${GROUND})`}>
      <g className="flower" style={{ animationDelay: `${delay}ms` }}>
        <path d={`M0 0 Q ${height / 6} ${-height / 2} 0 ${-height}`} stroke="#4d7c3a" strokeWidth="3" fill="none" />
        <ellipse cx="6" cy={-height / 2.4} rx="7" ry="3.2" fill="#65a30d" transform={`rotate(-30 6 ${-height / 2.4})`} />
        {[0, 72, 144, 216, 288].map((angle) => (
          <circle
            key={angle}
            cx={Math.cos((angle * Math.PI) / 180) * 7}
            cy={-height + Math.sin((angle * Math.PI) / 180) * 7}
            r="6.5"
            fill={color}
          />
        ))}
        <circle cx="0" cy={-height} r="4.5" fill="#fde68a" />
      </g>
    </g>
  );
}

function message(done, total) {
  if (total === 0) return "Ajoute une tâche pour planter ta première graine 🌱";
  if (done === 0) return "Termine une tâche pour faire pousser ta première fleur 🌱";
  if (done === total) return "Tout est fait ! Ton jardin est en pleine floraison 🌻";
  if (done / total >= 0.5) return "Plus de la moitié ! Ton jardin fleurit 🌸";
  return "Belle pousse, continue comme ça 🌿";
}

export default function Garden({ tasks }) {
  // useMemo: only recompute the flowers when the task list changes
  const done = useMemo(() => tasks.filter((t) => t.done), [tasks]);
  const total = tasks.length;
  const percent = total ? Math.round((done.length / total) * 100) : 0;

  const flowers = useMemo(
    () =>
      done
        .slice(0, MAX_FLOWERS)
        .map((t) => {
          const h = hash(t.id);
          return { id: t.id, x: 24 + (h % (WIDTH - 48)), height: 38 + (h % 52), color: CATEGORIES[t.category]?.color ?? "#f472b6" };
        })
        .sort((a, b) => b.height - a.height),
    [done]
  );

  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <section className="card garden" aria-label="Jardin des tâches terminées">
      <div className="garden-head">
        <div className="ring" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" aria-label="Tâches terminées">
          <svg viewBox="0 0 64 64" width="64" height="64">
            <circle cx="32" cy="32" r={radius} className="ring-bg" />
            <circle
              cx="32" cy="32" r={radius} className="ring-fg"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - percent / 100)}
            />
          </svg>
          <span>{percent}%</span>
        </div>
        <div>
          <p className="garden-title">
            {done.length} fleur{done.length > 1 ? "s" : ""} · {done.length}/{total} tâche{total > 1 ? "s" : ""}
          </p>
          <p className="muted small" aria-live="polite">{message(done.length, total)}</p>
        </div>
      </div>

      <svg className="garden-scene" viewBox={`0 0 ${WIDTH} 180`} preserveAspectRatio="xMidYMax meet" aria-hidden="true">
        <circle cx="530" cy="40" r="22" className="sun" />
        <path d={`M0 ${GROUND} Q 150 ${GROUND - 14} 300 ${GROUND} T 600 ${GROUND} V180 H0Z`} className="ground" />
        {flowers.length === 0 && (
          <g transform={`translate(300 ${GROUND})`} className="sprout">
            <path d="M0 0 V-16" stroke="#4d7c3a" strokeWidth="3" />
            <ellipse cx="-6" cy="-16" rx="7" ry="3.5" fill="#65a30d" transform="rotate(25 -6 -16)" />
            <ellipse cx="6" cy="-18" rx="7" ry="3.5" fill="#65a30d" transform="rotate(-25 6 -18)" />
          </g>
        )}
        {flowers.map((f, i) => (
          <Flower key={f.id} x={f.x} height={f.height} color={f.color} delay={Math.min(i, 10) * 60} />
        ))}
      </svg>
    </section>
  );
}
