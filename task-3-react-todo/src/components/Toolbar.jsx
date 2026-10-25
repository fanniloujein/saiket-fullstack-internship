import { CATEGORIES } from "../state/tasksReducer";

const STATUS_TABS = [
  { key: "all", label: "Toutes" },
  { key: "active", label: "À faire" },
  { key: "done", label: "Terminées" },
];

export default function Toolbar({ counts, status, onStatus, category, onCategory, query, onQuery, sort, onSort }) {
  return (
    <div className="toolbar">
      <div className="tabs" role="tablist" aria-label="Filtrer par statut">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={status === tab.key}
            className={`tab ${status === tab.key ? "active" : ""}`}
            onClick={() => onStatus(tab.key)}
          >
            {tab.label} <span className="tab-count">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      <div className="toolbar-row">
        <div className="chips" role="group" aria-label="Filtrer par catégorie">
          <button type="button" className={`chip ${category === "all" ? "active" : ""}`} aria-pressed={category === "all"} onClick={() => onCategory("all")}>
            Toutes
          </button>
          {Object.entries(CATEGORIES).map(([key, c]) => (
            <button
              key={key}
              type="button"
              className={`chip ${category === key ? "active" : ""}`}
              aria-pressed={category === key}
              onClick={() => onCategory(key)}
              style={{ "--chip": c.color }}
            >
              <span className="dot" /> {c.label}
            </button>
          ))}
        </div>

        <div className="toolbar-right">
          <input
            type="search"
            className="input"
            placeholder="Rechercher…"
            aria-label="Rechercher une tâche"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
          <select className="input" value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Trier">
            <option value="manual">Ordre manuel</option>
            <option value="due">Échéance</option>
            <option value="priority">Priorité</option>
            <option value="recent">Plus récentes</option>
          </select>
        </div>
      </div>
    </div>
  );
}
