import type { SkillDef } from '../types';
import { colors } from '../constants/theme';

interface Props {
  skills: SkillDef[];
  selected: string[];
  onToggle(skillId: string): void;
}

// One-click category chips (multi-select allowed; §7 split-XP). MRU ordering is the
// caller's job so the user's top categories sit first. The chip color comes from the
// skill row, so it's an inline style rather than a Tailwind class.
export function SkillChips({ skills, selected, onToggle }: Props) {
  return (
    <div className="flex flex-wrap gap-1">
      {skills.map((s) => {
        const on = selected.includes(s.id);
        const color = s.color ?? colors.accent;
        return (
          <button
            key={s.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(s.id)}
            className="rounded border px-2 py-1 text-xs transition-colors"
            style={{ borderColor: color, color, backgroundColor: on ? `${color}33` : 'transparent' }}
          >
            {s.name}
          </button>
        );
      })}
    </div>
  );
}
