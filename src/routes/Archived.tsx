import { useEffect, useState } from 'react';
import { getArchivedTasks } from '../db/queries/tasks';
import { useTaskStore } from '../store/useTaskStore';
import { difficultyColors } from '../constants/theme';
import type { Task } from '../types';

export default function Archived() {
  const [archived, setArchived] = useState<Task[]>([]);
  const unarchiveTask = useTaskStore((s) => s.unarchiveTask);

  useEffect(() => {
    void getArchivedTasks().then(setArchived);
  }, []);

  const onUnarchive = async (task: Task) => {
    await unarchiveTask(task.id, new Date());
    setArchived((prev) => prev.filter((t) => t.id !== task.id));
  };

  if (!archived.length) {
    return <p className="mt-8 text-center text-muted">Nothing archived.</p>;
  }

  return (
    <ul className="flex flex-col gap-2 p-4">
      {archived.map((item) => (
        <li
          key={item.id}
          className="flex items-center justify-between gap-2 rounded-lg border bg-panel p-4 opacity-80"
          style={{ borderColor: difficultyColors[item.difficulty] }}
        >
          <span className="flex-1 truncate text-[15px] text-fg">{item.title}</span>
          <button
            type="button"
            onClick={() => void onUnarchive(item)}
            className="text-sm text-accent hover:underline"
          >
            Restore
          </button>
        </li>
      ))}
    </ul>
  );
}
