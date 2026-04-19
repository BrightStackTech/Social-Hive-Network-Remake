/**
 * Simple utility to merge class names for Tailwind CSS
 * Avoids extra dependencies while providing basic merging functionality
 */
export function cn(...inputs: any[]) {
  return inputs
    .flat()
    .filter((x) => typeof x === 'string' && x.length > 0)
    .join(' ');
}
