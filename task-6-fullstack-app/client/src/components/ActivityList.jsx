import { describeActivity, timeAgo } from "../utils/format";
import { EmptyState } from "./ui";

export default function ActivityList({ items }) {
  if (!items.length) return <EmptyState icon="🕊️" title="Aucune activité pour le moment" />;
  return (
    <ol className="activity">
      {items.map((a) => {
        const { icon, text } = describeActivity(a);
        return (
          <li key={a.id}>
            <span className="activity-icon" aria-hidden="true">{icon}</span>
            <div>
              <p>{text}</p>
              <time dateTime={a.createdAt} title={new Date(a.createdAt).toLocaleString("fr-FR")}>{timeAgo(a.createdAt)}</time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
