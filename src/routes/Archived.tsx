import { useEffect, useState } from 'react';
import { SystemPanel } from '../components/system/SystemPanel';
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
        <li key={item.id}>
          <SystemPanel
            brackets={false}
            tone="quiet"
            className="opacity-80"
            innerClassName="flex items-stretch"
          >
            <div className="w-[3px] shrink-0" style={{ backgroundColor: difficultyColors[item.difficulty] }} />
            <div className="flex flex-1 items-center justify-between gap-2 px-4 py-3">
              <span className="flex-1 truncate text-[15px] text-fg">{item.title}</span>
              <button
                type="button"
                onClick={() => void onUnarchive(item)}
                className="notch [--notch:5px] border border-edge px-2.5 py-1 font-display text-xs uppercase tracking-wider text-accent transition-colors hover:border-accent"
              >
                Restore
              </button>
            </div>
          </SystemPanel>
        </li>
      ))}
    </ul>
  );
}
