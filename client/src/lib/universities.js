/** Default university for guests: the one with the most reviews, not the first one alphabetically. */
export function defaultUniversity(universities = []) {
  return universities
    .filter((u) => u.status === 'active')
    .reduce((best, u) => (!best || u.reviewCount > best.reviewCount ? u : best), null);
}
