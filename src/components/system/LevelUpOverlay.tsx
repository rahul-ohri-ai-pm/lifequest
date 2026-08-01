import { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BorderBeam } from '../ui/border-beam';
import { NumberTicker } from '../ui/number-ticker';
import { SystemPanel } from './SystemPanel';
import { RuneDivider } from './RuneDivider';
import { useCharacterStore } from '../../store/useCharacterStore';
import { colors } from '../../constants/theme';

// §7: "leveling up triggers a celebration animation". This is the one full-screen moment in
// the app, and it is deliberately the *only* one — the §5 rule is that if everything glows
// equally, nothing reads as emphasised. Everything else earns a bar fill or a bloom; this
// earns the whole viewport.
//
// It dismisses itself after a couple of seconds and on tap, and it never blocks a pending
// action: the XP write has already been committed by the time this renders.

const DISMISS_MS = 2600;

export function LevelUpOverlay() {
  const level = useCharacterStore((s) => s.justLeveledTo);
  const clear = useCharacterStore((s) => s.clearLevelUp);

  useEffect(() => {
    if (level == null) return;
    const t = setTimeout(clear, DISMISS_MS);
    return () => clearTimeout(t);
  }, [level, clear]);

  return (
    <AnimatePresence>
      {level != null && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={clear}
          role="status"
          aria-live="polite"
        >
          <motion.div
            className="w-full max-w-xs"
            initial={{ scale: 0.86, opacity: 0, filter: 'blur(10px)' }}
            animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
            exit={{ scale: 1.04, opacity: 0 }}
            transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
          >
            <SystemPanel glow innerClassName="relative flex flex-col items-center overflow-hidden px-6 py-7">
              <BorderBeam size={140} duration={4} colorFrom={colors.accent} colorTo={colors.accentSecondary} />

              <span className="font-display text-xs uppercase tracking-[0.34em] text-accent text-glow">
                Level up
              </span>

              <RuneDivider className="w-full" />

              {/* Ticking from the level just left behind, not from zero — the count itself
                  is the message ("you were 4, you're 5"), and a spring up from 0 both reads
                  as meaningless and is still mid-flight when the overlay dismisses. */}
              <span className="font-display text-7xl font-bold leading-none text-fg text-glow">
                <NumberTicker value={level} startValue={Math.max(level - 1, 0)} />
              </span>

              <span className="mt-2 font-display text-[11px] uppercase tracking-[0.22em] text-muted">
                Tap to continue
              </span>
            </SystemPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
