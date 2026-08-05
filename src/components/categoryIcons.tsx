// The category icon library.
//
// One file rather than a package: §5 rules out icon fonts and §3 rules out an asset budget,
// so every glyph here is inline SVG in the same duotone treatment — a `currentColor` fill at
// low alpha under a stroked outline, which is what gives them mass in a `CategorySlot`.
//
// **Why a fixed library and not a lookup service.** The obvious way to let a user pick an icon
// for a category they just invented is to query an icon API for their keyword. That is a
// network call, and §2 says the app makes none — ever, not "only when online". So the search
// is real but *local*: every glyph carries keywords and `searchIcons` matches against them, so
// typing "gym" finds the dumbbell and "spanish" finds the language mark without a request
// leaving the device. The cost is that the library is finite; the benefit is that it works on
// a plane, and that the icon a category shows can never change out from under it.
import { cn } from '../lib/utils';

interface IconProps {
  className?: string;
  size?: number;
}

const base = { fill: 'none', strokeWidth: 1.8, stroke: 'currentColor' } as const;
const body = { fill: 'currentColor', fillOpacity: 0.42, stroke: 'currentColor', strokeWidth: 1.6 } as const;

// ---- Glyphs ---------------------------------------------------------------------------

export function FitnessIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={5.4} y={6.6} width={3.4} height={10.8} rx={1.1} {...body} />
      <rect x={15.2} y={6.6} width={3.4} height={10.8} rx={1.1} {...body} />
      <path d="M2.6 9.6v4.8M21.4 9.6v4.8" strokeLinecap="round" />
      <path d="M8.8 12h6.4" strokeWidth={2.2} strokeLinecap="round" />
    </svg>
  );
}

export function RunIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={15.4} cy={4.6} r={2.2} {...body} />
      <path d="M13.6 9.2l-3.4 2.2.6 4 3 3.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.6 9.2l3.6 1.6 1.4 3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.8 13.4L7 15.2M4.4 9.8H8" strokeLinecap="round" />
    </svg>
  );
}

export function BikeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={5.4} cy={16.6} r={3.4} {...body} />
      <circle cx={18.6} cy={16.6} r={3.4} {...body} />
      <path d="M8 16.6l4-8.2 3.2 8.2M9.4 8.4h4.4M12 8.4l3.2 8.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={16.4} cy={5} r={1.6} {...body} />
    </svg>
  );
}

export function DietIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path
        d="M12 7.4c1.3-1 2.6-1.2 3.9-.6 1.8.8 2.9 2.9 2.9 5.4 0 4-2.6 8-4.9 8-.9 0-1.3-.5-1.9-.5s-1 .5-1.9.5c-2.3 0-4.9-4-4.9-8 0-2.5 1.1-4.6 2.9-5.4 1.3-.6 2.6-.4 3.9.6z"
        {...body}
        strokeLinejoin="round"
      />
      <path d="M12 7.4V4.6M12 4.6c0-1.2 1-2.1 2.6-2.1 0 1.3-1 2.1-2.6 2.1z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function WaterIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.8c3.6 4.4 6.2 7.5 6.2 10.8a6.2 6.2 0 11-12.4 0c0-3.3 2.6-6.4 6.2-10.8z" {...body} strokeLinejoin="round" />
      <path d="M9 13.6a3 3 0 003 3" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function CookIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M4.4 10.4h15.2v4.2a5 5 0 01-5 5H9.4a5 5 0 01-5-5v-4.2z" {...body} strokeLinejoin="round" />
      <path d="M19.6 11.6h1.2a1.8 1.8 0 010 3.6h-1.2" strokeLinecap="round" />
      <path d="M8.6 7.4c0-1.2 1.4-1.4 1.4-2.6M12 7.4c0-1.4 1.4-1.6 1.4-2.8" strokeLinecap="round" opacity={0.75} />
    </svg>
  );
}

export function SleepIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M20 14.6A8.4 8.4 0 019.4 4a8.4 8.4 0 1010.6 10.6z" {...body} strokeLinejoin="round" />
      <path d="M15.6 4.4h3.2l-3.2 3.4h3.2" strokeLinecap="round" strokeLinejoin="round" opacity={0.75} />
    </svg>
  );
}

export function ReadingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 6.6C10.4 5 7.9 4.4 3.8 4.4v13.2c4.1 0 6.6.6 8.2 2.2V6.6z" {...body} strokeLinejoin="round" />
      <path d="M12 6.6c1.6-1.6 4.1-2.2 8.2-2.2v13.2c-4.1 0-6.6.6-8.2 2.2V6.6z" {...body} strokeLinejoin="round" />
      <path d="M6.4 8.4h3M6.4 11.4h3M14.6 8.4h3M14.6 11.4h3" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function WritingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M15.4 3.8l4.8 4.8-10 10-5.8 1 1-5.8 10-10z" {...body} strokeLinejoin="round" />
      <path d="M14 5.2l4.8 4.8M4.4 20.8h15.2" strokeLinecap="round" />
    </svg>
  );
}

export function CareerIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={2.8} y={7} width={18.4} height={13.2} rx={2.2} {...body} />
      <path d="M8.8 7V5.2a2 2 0 012-2h2.4a2 2 0 012 2V7M2.8 12.4h18.4" strokeLinecap="round" />
      <rect x={10.4} y={10.9} width={3.2} height={3} rx={0.8} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function CodeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={2.6} y={4} width={18.8} height={16} rx={2.2} {...body} />
      <path d="M7.6 10l2.4 2.4-2.4 2.4M12.6 15.2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function GamingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path
        d="M7.4 7h9.2a4.6 4.6 0 014.5 3.7l.7 4.1A2.9 2.9 0 0119 18.2c-1 0-1.6-.5-2.3-1.2l-.9-.9H8.2l-.9.9c-.7.7-1.3 1.2-2.3 1.2a2.9 2.9 0 01-2.8-3.4l.7-4.1A4.6 4.6 0 017.4 7z"
        {...body}
        strokeLinejoin="round"
      />
      <path d="M6.6 10.6v3.2M5 12.2h3.2" strokeLinecap="round" />
      <circle cx={16} cy={11.4} r={1} fill="currentColor" stroke="none" />
      <circle cx={18} cy={13.6} r={1} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SocialIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={9.2} cy={7.8} r={3.4} {...body} />
      <path d="M2.6 20c.9-3.7 3.5-5.4 6.6-5.4S14.9 16.3 15.8 20z" {...body} strokeLinejoin="round" />
      <circle cx={17} cy={9} r={2.4} {...body} />
      <path d="M17.6 14.8c2 .6 3.3 2.2 3.8 4.4" strokeLinecap="round" />
    </svg>
  );
}

export function TradingIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      {/* Candlesticks rather than a plain up-arrow: this is the one category whose whole
          activity is reading a chart, and a rising arrow is also every other "progress" mark
          in the app. */}
      <path d="M6.4 6.6v11M12 3.6v13.2M17.6 8.4v9" strokeLinecap="round" opacity={0.75} />
      <rect x={4.6} y={9} width={3.6} height={6.2} rx={0.8} {...body} />
      <rect x={10.2} y={6} width={3.6} height={7.4} rx={0.8} {...body} />
      <rect x={15.8} y={10.6} width={3.6} height={5} rx={0.8} {...body} />
      <path d="M3 21h18" strokeLinecap="round" opacity={0.5} />
    </svg>
  );
}

export function MoneyIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <rect x={2.6} y={6} width={18.8} height={12.4} rx={2.4} {...body} />
      <circle cx={12} cy={12.2} r={2.8} strokeLinejoin="round" />
      <path d="M6 10v4.4M18 10v4.4" strokeLinecap="round" opacity={0.7} />
    </svg>
  );
}

export function MusicIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M9.4 17V5.6l9.2-2v11.2" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx={6.8} cy={17.4} rx={2.8} ry={2.4} {...body} />
      <ellipse cx={16} cy={14.8} rx={2.8} ry={2.4} {...body} />
    </svg>
  );
}

export function ArtIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path
        d="M12 3.4a8.6 8.6 0 000 17.2c1.4 0 2-.9 2-1.8 0-1.4-1.2-1.7-1.2-2.8 0-.9.8-1.6 1.8-1.6h2a4.2 4.2 0 004.2-4.2c0-3.8-3.9-6.8-8.8-6.8z"
        {...body}
        strokeLinejoin="round"
      />
      <circle cx={8} cy={9.6} r={1.1} fill="currentColor" stroke="none" />
      <circle cx={12.4} cy={7.4} r={1.1} fill="currentColor" stroke="none" />
      <circle cx={16.4} cy={9.8} r={1.1} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function MeditateIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={12} cy={5.4} r={2.4} {...body} />
      <path d="M12 9.4c-1.4 0-2.4 1-2.4 2.4v1.6l-4.6 2.2c-.8.4-1 1.4-.4 2 .5.5 1.2.6 1.8.3l3-1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9.4c1.4 0 2.4 1 2.4 2.4v1.6l4.6 2.2c.8.4 1 1.4.4 2-.5.5-1.2.6-1.8.3l-3-1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.6 20.2h8.8" strokeLinecap="round" opacity={0.6} />
    </svg>
  );
}

export function LanguageIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={12} cy={12} r={9} {...body} />
      <path d="M3.2 12h17.6M12 3a14 14 0 010 18M12 3a14 14 0 000 18" strokeLinecap="round" />
    </svg>
  );
}

export function TravelIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M10.4 3.6a1.6 1.6 0 013.2 0v5.2l7.4 4v2.2l-7.4-2.2v4l2.4 1.8v1.8L12 19l-4 1.4v-1.8l2.4-1.8v-4L3 15v-2.2l7.4-4V3.6z" {...body} strokeLinejoin="round" />
    </svg>
  );
}

export function HomeIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3.4 10.6L12 3.4l8.6 7.2v8.2a1.8 1.8 0 01-1.8 1.8H5.2a1.8 1.8 0 01-1.8-1.8v-8.2z" {...body} strokeLinejoin="round" />
      <path d="M9.6 20.6v-6h4.8v6" strokeLinejoin="round" />
    </svg>
  );
}

export function PetIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 12.6c2.6 0 4.8 2 4.8 4.4 0 1.6-1.2 2.6-2.8 2.6-.9 0-1.4-.4-2-.4s-1.1.4-2 .4c-1.6 0-2.8-1-2.8-2.6 0-2.4 2.2-4.4 4.8-4.4z" {...body} strokeLinejoin="round" />
      <ellipse cx={5.8} cy={11} rx={2.1} ry={2.5} {...body} />
      <ellipse cx={18.2} cy={11} rx={2.1} ry={2.5} {...body} />
      <ellipse cx={9.4} cy={6.4} rx={2} ry={2.4} {...body} />
      <ellipse cx={14.6} cy={6.4} rx={2} ry={2.4} {...body} />
    </svg>
  );
}

export function GardenIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 20.6v-8.2" strokeLinecap="round" />
      <path d="M12 12.4C12 8.6 14.8 5 19 4.2c.6 4.4-2.2 8.2-7 8.2z" {...body} strokeLinejoin="round" />
      <path d="M12 15.4C9.4 15.4 6.6 13.2 6 9.6c3.6.2 6 2.6 6 5.8z" {...body} strokeLinejoin="round" />
    </svg>
  );
}

export function HealthIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 20.4l-7-6.8a4.6 4.6 0 117-6 4.6 4.6 0 117 6l-7 6.8z" {...body} strokeLinejoin="round" />
      <path d="M4.6 12.6h3.2l1.6-2.6 2 4.6 1.6-3 1 1h5.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BrainIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 4.4a3 3 0 00-5.4 1.2A3 3 0 004.4 9a3 3 0 00.8 4.4A3 3 0 008 18.4a3 3 0 004 1.4V4.4z" {...body} strokeLinejoin="round" />
      <path d="M12 4.4a3 3 0 015.4 1.2A3 3 0 0119.6 9a3 3 0 01-.8 4.4A3 3 0 0116 18.4a3 3 0 01-4 1.4V4.4z" {...body} strokeLinejoin="round" />
    </svg>
  );
}

export function FocusIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <circle cx={12} cy={12} r={8.6} {...body} />
      <circle cx={12} cy={12} r={4.6} strokeLinejoin="round" />
      <circle cx={12} cy={12} r={1.4} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ShieldIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 3l7.4 2.8v5.8c0 4.2-3 7.6-7.4 9.4-4.4-1.8-7.4-5.2-7.4-9.4V5.8L12 3z" {...body} strokeLinejoin="round" />
      <path d="M8.8 12.2l2.2 2.2 4.2-4.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CameraIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M3.4 7.8h3.4L8.4 5h7.2l1.6 2.8h3.4v11.4a1.4 1.4 0 01-1.4 1.4H4.8a1.4 1.4 0 01-1.4-1.4V7.8z" {...body} strokeLinejoin="round" />
      <circle cx={12} cy={13.4} r={3.6} strokeLinejoin="round" />
    </svg>
  );
}

export function StarIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.8l2.9 6.1 6.5.9-4.7 4.7 1.1 6.7-5.8-3.2-5.8 3.2 1.1-6.7L2.6 9.8l6.5-.9L12 2.8z" {...body} strokeLinejoin="round" />
    </svg>
  );
}

export function RuneIcon({ className, size = 18 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} {...base}>
      <path d="M12 2.8l9.2 9.2-9.2 9.2L2.8 12z" {...body} strokeLinejoin="round" />
      <path d="M12 7.6L16.4 12 12 16.4 7.6 12z" strokeLinejoin="round" opacity={0.65} />
    </svg>
  );
}

// ---- Registry -------------------------------------------------------------------------

export interface IconEntry {
  key: string;
  label: string;
  Icon: (p: IconProps) => React.ReactElement;
  /** Lower-case search terms. The label is matched separately, so it need not repeat here. */
  keywords: string[];
}

export const ICON_LIBRARY: IconEntry[] = [
  { key: 'fitness', label: 'Fitness', Icon: FitnessIcon, keywords: ['gym', 'workout', 'exercise', 'lift', 'weights', 'strength', 'training', 'muscle'] },
  { key: 'run', label: 'Running', Icon: RunIcon, keywords: ['run', 'jog', 'cardio', 'walk', 'steps', 'marathon', 'sprint'] },
  { key: 'bike', label: 'Cycling', Icon: BikeIcon, keywords: ['bike', 'cycle', 'cycling', 'ride', 'bicycle', 'spin'] },
  { key: 'diet', label: 'Diet', Icon: DietIcon, keywords: ['diet', 'food', 'nutrition', 'eat', 'healthy', 'meal', 'fruit', 'calories'] },
  { key: 'water', label: 'Hydration', Icon: WaterIcon, keywords: ['water', 'hydrate', 'drink', 'glass', 'thirst'] },
  { key: 'cook', label: 'Cooking', Icon: CookIcon, keywords: ['cook', 'recipe', 'kitchen', 'bake', 'meal prep', 'chef'] },
  { key: 'sleep', label: 'Sleep', Icon: SleepIcon, keywords: ['sleep', 'rest', 'bed', 'night', 'nap', 'wake'] },
  { key: 'reading', label: 'Reading', Icon: ReadingIcon, keywords: ['read', 'book', 'study', 'learn', 'pages', 'literature'] },
  { key: 'writing', label: 'Writing', Icon: WritingIcon, keywords: ['write', 'journal', 'blog', 'notes', 'diary', 'essay'] },
  { key: 'career', label: 'Career', Icon: CareerIcon, keywords: ['work', 'job', 'career', 'office', 'business', 'meeting'] },
  { key: 'code', label: 'Code', Icon: CodeIcon, keywords: ['code', 'dev', 'program', 'build', 'ship', 'software', 'engineering'] },
  { key: 'gaming', label: 'Gaming', Icon: GamingIcon, keywords: ['game', 'gaming', 'play', 'console', 'controller'] },
  { key: 'social', label: 'Social', Icon: SocialIcon, keywords: ['social', 'friends', 'family', 'people', 'call', 'connect'] },
  { key: 'trading', label: 'Trading', Icon: TradingIcon, keywords: ['trade', 'trading', 'stock', 'stocks', 'invest', 'market', 'chart', 'swing'] },
  { key: 'money', label: 'Money', Icon: MoneyIcon, keywords: ['money', 'save', 'budget', 'finance', 'expense', 'spend', 'cash'] },
  { key: 'music', label: 'Music', Icon: MusicIcon, keywords: ['music', 'guitar', 'piano', 'practice', 'instrument', 'sing', 'song'] },
  { key: 'art', label: 'Art', Icon: ArtIcon, keywords: ['art', 'draw', 'paint', 'design', 'sketch', 'creative', 'illustration'] },
  { key: 'meditate', label: 'Meditation', Icon: MeditateIcon, keywords: ['meditate', 'mindful', 'calm', 'breathe', 'yoga', 'stretch', 'zen'] },
  { key: 'language', label: 'Language', Icon: LanguageIcon, keywords: ['language', 'speak', 'spanish', 'french', 'german', 'japanese', 'vocab', 'translate'] },
  { key: 'travel', label: 'Travel', Icon: TravelIcon, keywords: ['travel', 'trip', 'flight', 'explore', 'plane', 'holiday', 'adventure'] },
  { key: 'home', label: 'Home', Icon: HomeIcon, keywords: ['home', 'chores', 'clean', 'tidy', 'house', 'laundry', 'dishes'] },
  { key: 'pet', label: 'Pets', Icon: PetIcon, keywords: ['pet', 'dog', 'cat', 'animal', 'puppy', 'vet'] },
  { key: 'garden', label: 'Garden', Icon: GardenIcon, keywords: ['garden', 'plant', 'grow', 'nature', 'outdoors', 'flowers'] },
  { key: 'health', label: 'Health', Icon: HealthIcon, keywords: ['health', 'medical', 'doctor', 'meds', 'vitamin', 'heart', 'therapy'] },
  { key: 'brain', label: 'Mind', Icon: BrainIcon, keywords: ['brain', 'mind', 'think', 'memory', 'mental', 'knowledge'] },
  { key: 'focus', label: 'Focus', Icon: FocusIcon, keywords: ['focus', 'deep work', 'concentrate', 'target', 'goal', 'pomodoro'] },
  { key: 'shield', label: 'Discipline', Icon: ShieldIcon, keywords: ['discipline', 'habit', 'resist', 'quit', 'streak', 'willpower', 'sober'] },
  { key: 'camera', label: 'Photo', Icon: CameraIcon, keywords: ['photo', 'camera', 'film', 'video', 'shoot', 'picture'] },
  { key: 'star', label: 'Star', Icon: StarIcon, keywords: ['star', 'favourite', 'favorite', 'special', 'misc', 'other'] },
  { key: 'rune', label: 'Rune', Icon: RuneIcon, keywords: ['rune', 'generic', 'default', 'unknown', 'other'] },
];

const BY_KEY = new Map(ICON_LIBRARY.map((e) => [e.key, e]));

// Same data as a plain record. `CategoryIcon` has to resolve its glyph with a *member
// expression* rather than a function call: react-hooks/static-components rejects a
// component-typed local produced by a call inside render, and it is right to — if the identity
// ever moved, React would remount the subtree instead of updating it.
const ICON_BY_KEY: Record<string, (p: IconProps) => React.ReactElement> = Object.fromEntries(
  ICON_LIBRARY.map((e) => [e.key, e.Icon])
);

// Names the app seeds itself (§6). Kept so a database written before icon keys existed still
// renders the right glyph, and so a category the user *renames* keeps matching by its key.
const NAME_ALIASES: Record<string, string> = {
  diet: 'diet',
  career: 'career',
  reading: 'reading',
  fitness: 'fitness',
  exercise: 'fitness', // merged into Fitness by migration 0004
  gaming: 'gaming',
  social: 'social',
  'stock trading': 'trading',
};

/**
 * Resolve a category to a library key. An explicit `iconKey` wins; otherwise the *name* is
 * matched, first against the seeded aliases and then against the same keyword index the picker
 * uses — so a category called "Guitar practice" gets the music mark even though nobody picked
 * one for it.
 */
export function resolveIconKey(
  iconKey: string | null | undefined,
  name: string | null | undefined
): string {
  if (iconKey && BY_KEY.has(iconKey)) return iconKey;
  const n = (name ?? '').trim().toLowerCase();
  if (!n) return 'rune';
  const alias = NAME_ALIASES[n];
  if (alias) return alias;
  return searchIcons(n)[0]?.key ?? 'rune';
}

/**
 * Rank the library against a free-text query, best first. Empty query returns the library in
 * its declared order, which is grouped by theme so the picker reads sensibly at rest.
 *
 * Scoring is deliberately blunt — exact term, prefix, then substring — because the corpus is
 * thirty entries and anything cleverer would be untestable ceremony over a list this small.
 *
 * It *does* tokenise, though, because category names are usually phrases: "Meal prep" and
 * "Deep work" match nothing as single strings but everything as words. The whole phrase is
 * still scored, and double-weighted, so an exact library term beats a lucky word hit.
 */
function termScore(terms: string[], q: string): number {
  let best = 0;
  for (const t of terms) {
    if (t === q) best = Math.max(best, 3);
    else if (t.startsWith(q)) best = Math.max(best, 2);
    else if (t.includes(q) || q.includes(t)) best = Math.max(best, 1);
  }
  return best;
}

export function searchIcons(query: string): IconEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_LIBRARY;
  const tokens = q.split(/[^a-z0-9]+/).filter((t) => t.length > 1);
  const scored: Array<{ entry: IconEntry; score: number }> = [];
  for (const entry of ICON_LIBRARY) {
    const terms = [entry.label.toLowerCase(), entry.key, ...entry.keywords];
    let score = termScore(terms, q) * 2;
    if (tokens.length > 1) {
      for (const token of tokens) score += termScore(terms, token);
    }
    if (score) scored.push({ entry, score });
  }
  return scored.sort((a, b) => b.score - a.score).map((s) => s.entry);
}

/** Icon for a category, by explicit key or by name. */
export function CategoryIcon({
  iconKey,
  name,
  className,
  size = 18,
}: IconProps & { iconKey?: string | null; name?: string | null }) {
  const Icon = ICON_BY_KEY[resolveIconKey(iconKey, name)] ?? RuneIcon;
  return <Icon className={cn('glyph-3d', className)} size={size} />;
}
