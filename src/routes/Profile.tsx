import { Link } from 'react-router';
import { BorderBeam } from '../components/ui/border-beam';
import { NumberTicker } from '../components/ui/number-ticker';
import { useCharacterStore } from '../store/useCharacterStore';
import { levelProgress } from '../engine/xp';
import { colors, text } from '../constants/theme';

export default function Profile() {
  const character = useCharacterStore((s) => s.character);
  if (!character) return <div className="flex-1" />;

  const p = levelProgress(character.totalXp);

  return (
    <div className="p-4">
      <section className="relative flex flex-col items-center overflow-hidden rounded-lg bg-panel p-6 panel-glow">
        <BorderBeam size={120} duration={8} colorFrom={colors.accent} colorTo={colors.accentSecondary} />

        <span className={text.panelLabel}>Level</span>
        <span className="font-display text-6xl font-bold text-accent">{p.level}</span>

        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-bg">
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-700 ease-out"
            style={{ width: `${Math.min(p.progress * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 font-display text-fg">
          <NumberTicker value={character.totalXp} /> / {p.nextLevelXp} XP
        </p>
      </section>

      <Link to="/archived" className="mt-4 inline-block p-2 text-sm text-accent hover:underline">
        Archived quests →
      </Link>
    </div>
  );
}
