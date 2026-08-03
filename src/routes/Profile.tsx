import { useMemo } from 'react';
import { Link } from 'react-router';
import { BorderBeam } from '../components/ui/border-beam';
import { NumberTicker } from '../components/ui/number-ticker';
import { SystemPanel } from '../components/system/SystemPanel';
import { RuneDivider } from '../components/system/RuneDivider';
import { StorageStatus } from '../components/StorageStatus';
import { SkillRadar } from '../components/system/SkillRadar';
import { SkillRow } from '../components/system/SkillRow';
import { Sigil } from '../components/system/Sigil';
import { BoltIcon, CalendarIcon, CheckIcon, StreakIcon } from '../components/icons';
import { useCharacterStore } from '../store/useCharacterStore';
import { useSkillStore } from '../store/useSkillStore';
import { useStreakStore } from '../store/useStreakStore';
import { levelProgress } from '../engine/xp';
import { colors, text } from '../constants/theme';

// The bottom half of the design reference lives here: the framed emblem with the level
// readout, then the stat block, then the radar. The reference's stats are invented RPG
// attributes (STR/AGI/INT/STA); ours are the user's real skills (§6), so the shape of the
// web says something true about which areas are being neglected.
//
// This screen was ~85% empty before — PROGRESS.md carried it as an open design item.

/** One cell of the lifetime-record strip: a glyph, a count, a caption. */
function Record({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ color: tone ?? colors.accent }}>{icon}</span>
      <span className="font-display text-lg leading-none tabular-nums text-fg">{value}</span>
      <span className="font-display text-[9px] uppercase tracking-[0.16em] text-muted">{label}</span>
    </div>
  );
}

export default function Profile() {
  const character = useCharacterStore((s) => s.character);
  const skills = useSkillStore((s) => s.skills);
  const totalCompletions = useStreakStore((s) => s.totalCompletions);
  const activeDays = useStreakStore((s) => s.activeDays);
  const global = useStreakStore((s) => s.global);

  // Strongest first, so the stat block leads with what the user has actually built.
  const ranked = useMemo(() => [...skills].sort((a, b) => b.totalXp - a.totalXp || a.name.localeCompare(b.name)), [skills]);
  // The radar needs a bounded number of axes or the labels collide; six is the reference's
  // hexagon and also about as many as stays readable at phone width.
  const axes = useMemo(
    () => ranked.slice(0, 6).map((s) => ({ label: s.name, value: s.totalXp })),
    [ranked]
  );
  // A radar needs at least three *earning* axes to describe anything. With one skill at XP
  // and the rest at zero it collapses into a needle, which looks broken rather than
  // lopsided — and the stat bars above already say everything at that point.
  const scoringSkills = ranked.filter((s) => s.totalXp > 0).length;

  if (!character) return <div className="flex-1" />;

  const p = levelProgress(character.totalXp);

  return (
    <div className="flex flex-col gap-4 p-4 pb-8">
      <SystemPanel glow innerClassName="relative flex flex-col items-center overflow-hidden px-6 py-6">
        <BorderBeam size={120} duration={8} colorFrom={colors.accent} colorTo={colors.accentSecondary} />

        <Sigil level={p.level} size={132} />

        <span className={`${text.panelLabel} mt-3`}>Level {p.level}</span>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full border border-edge bg-bg">
          <div
            className="h-full rounded-full bg-linear-to-r from-accent to-accent-2 transition-[width] duration-700 ease-out"
            style={{
              width: `${Math.min(p.progress * 100, 100)}%`,
              boxShadow: `0 0 10px ${colors.accent}`,
            }}
          />
        </div>
        <p className="mt-2 font-display text-fg">
          XP: <NumberTicker value={character.totalXp} /> / {p.nextLevelXp}
        </p>

        {/* The record. Profile had nothing to say about history — it showed a level and a bar,
            both of which Today already shows. These four are the numbers that only make sense
            on a profile, and every one is counted from the log rather than stored (§4). */}
        <div className="mt-5 grid w-full grid-cols-4 gap-2 border-t border-edge/60 pt-4">
          <Record icon={<CheckIcon size={15} />} label="Cleared" value={totalCompletions} />
          <Record icon={<CalendarIcon size={15} />} label="Days" value={activeDays.size} />
          <Record icon={<BoltIcon size={15} />} label="Total XP" value={character.totalXp} />
          <Record
            icon={<StreakIcon size={15} />}
            label="Best"
            value={global?.longest ?? 0}
            tone={colors.epic}
          />
        </div>
      </SystemPanel>

      <RuneDivider label="Skills" />

      <SystemPanel brackets={false} innerClassName="flex flex-col gap-3.5 px-4 py-4">
        {ranked.length === 0 ? (
          <p className="text-center text-sm text-muted">No categories yet.</p>
        ) : (
          ranked.map((skill, i) => {
            const sp = levelProgress(skill.totalXp);
            return (
              <SkillRow
                key={skill.id}
                name={skill.name}
                color={skill.color}
                level={sp.level}
                totalXp={skill.totalXp}
                progress={skill.totalXp === 0 ? 0 : sp.progress}
                delay={Math.min(i, 8) * 0.05}
              />
            );
          })
        )}
      </SystemPanel>

      {/* The radar is only honest once there is something to compare. With no XP at all it
          would draw a perfectly regular hexagon, which reads as "balanced" when it actually
          means "empty". */}
      {scoringSkills >= 3 && axes.length >= 3 && (
        <>
          <RuneDivider label="Balance" />
          <SystemPanel brackets={false} innerClassName="grid place-items-center px-8 py-8">
            <SkillRadar axes={axes} size={210} />
          </SystemPanel>
        </>
      )}

      <RuneDivider label="Storage" />
      <StorageStatus />

      <Link
        to="/archived"
        className="notch [--notch:6px] border border-edge px-3 py-2 text-center font-display text-sm uppercase tracking-[0.16em] text-accent transition-colors hover:border-accent"
      >
        Archived quests →
      </Link>
    </div>
  );
}
