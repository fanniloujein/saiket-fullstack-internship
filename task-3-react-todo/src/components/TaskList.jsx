import { useState } from "react";
import TaskItem from "./TaskItem";

export default function TaskList({ tasks, canReorder, onToggle, onEdit, onDelete, onMove, emptyMessage }) {
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);

  if (tasks.length === 0) {
    return (
      <div className="empty">
        <span aria-hidden="true">🌼</span>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  // Native HTML5 drag & drop, only when the list is in manual order
  function handlersFor(id) {
    if (!canReorder) return {};
    return {
      onDragStart: (e) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = "move";
      },
      onDragOver: (e) => {
        e.preventDefault();
        if (overId !== id) setOverId(id);
      },
      onDrop: (e) => {
        e.preventDefault();
        if (dragId && dragId !== id) onMove(dragId, id);
        setDragId(null);
        setOverId(null);
      },
      onDragEnd: () => {
        setDragId(null);
        setOverId(null);
      },
    };
  }

  return (
    <ul className="task-list">
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onToggle={onToggle}
          onEdit={onEdit}
          onDelete={onDelete}
          draggable={canReorder}
          dragHandlers={handlersFor(task.id)}
          isDragOver={overId === task.id && dragId !== task.id}
        />
      ))}
    </ul>
  );
}
