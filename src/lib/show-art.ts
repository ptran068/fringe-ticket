const POSTER_TONES = [
  'from-[#1c1a18] via-[#3a2a1c] to-[#8a5a22]',
  'from-[#14182a] via-[#1e3350] to-[#2d6a6a]',
  'from-[#1a1420] via-[#4a2438] to-[#c45c3a]',
  'from-[#121c18] via-[#1f3d32] to-[#3d7a58]',
  'from-[#1a1528] via-[#2c2458] to-[#6b4aa0]',
  'from-[#1c1612] via-[#4a2818] to-[#b84a28]',
] as const;

/** Stable festival poster gradient from a show id — visual only, not a hash of secrets. */
export function showPosterTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return POSTER_TONES[hash % POSTER_TONES.length];
}
