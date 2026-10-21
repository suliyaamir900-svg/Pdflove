import { ToolDefinition } from '../data/toolsCatalog';

export const TOOL_USAGE_STORAGE_KEY = 'pdflove_tool_usage_counts_v1';
export const TOOL_USAGE_UPDATED_EVENT = 'pdflove:tool-usage-updated';

export type ToolUsageCountsMap = Record<string, number>;

/**
 * Reads the per-tool usage counter map from localStorage.
 */
export function getToolUsageCounts(): ToolUsageCountsMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(TOOL_USAGE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    const clean: ToolUsageCountsMap = {};
    for (const [slug, val] of Object.entries(parsed)) {
      const num = Number(val);
      if (typeof slug === 'string' && Number.isFinite(num) && num > 0) {
        clean[slug] = Math.floor(num);
      }
    }
    return clean;
  } catch {
    return {};
  }
}

/**
 * Returns the number of times a specific tool has been used by the user.
 */
export function getToolUsageCount(slug: string, countsMap?: ToolUsageCountsMap): number {
  const map = countsMap ?? getToolUsageCounts();
  const count = map[slug];
  return typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
}

/**
 * Increments the usage count for a tool in localStorage and broadcasts an update event.
 */
export function incrementToolUsage(slug: string): ToolUsageCountsMap {
  if (!slug || typeof window === 'undefined') return {};
  const current = getToolUsageCounts();
  const nextCount = (current[slug] || 0) + 1;
  const updated: ToolUsageCountsMap = {
    ...current,
    [slug]: nextCount,
  };
  try {
    window.localStorage.setItem(TOOL_USAGE_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }
  try {
    window.dispatchEvent(
      new CustomEvent<ToolUsageCountsMap>(TOOL_USAGE_UPDATED_EVENT, {
        detail: updated,
      })
    );
  } catch {
    // Ignore event dispatch errors
  }
  return updated;
}

/**
 * Formats the usage count into a concise human-readable label.
 */
export function formatToolUsageLabel(count: number): string {
  const safe = Math.max(0, Math.floor(count || 0));
  return safe === 1 ? 'Used 1 time' : `Used ${safe.toLocaleString()} times`;
}

/**
 * Computes the set of tool slugs that qualify for the 'Most Popular' badge
 * based on the highest user usage counts in localStorage (with a fallback
 * to flagship catalog tools before the user has used any tools).
 */
export function getMostPopularToolSlugs(
  tools: ToolDefinition[],
  countsMap: ToolUsageCountsMap,
  maxBadges = 8
): Set<string> {
  const usedTools = tools
    .map((t) => ({
      slug: t.slug,
      count: getToolUsageCount(t.slug, countsMap),
      popular: Boolean(t.popular),
      number: t.number,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (a.popular !== b.popular) return a.popular ? -1 : 1;
      return a.number - b.number;
    });

  // If the user has used tools, award 'Most Popular' to the tools with the highest counts
  if (usedTools.length > 0) {
    const highestCount = usedTools[0].count;
    // Include tools at or near the top usage counts (up to maxBadges)
    const minQualifiedCount =
      usedTools.length <= 4 ? 1 : Math.max(1, Math.ceil(highestCount * 0.4));
    const topUsed = usedTools
      .filter((item, idx) => item.count === highestCount || (idx < maxBadges && item.count >= minQualifiedCount))
      .slice(0, maxBadges)
      .map((item) => item.slug);

    return new Set(topUsed);
  }

  // Fallback when all counts are 0: highlight the top flagship popular tools
  const fallbackPopular = tools
    .filter((t) => t.popular)
    .slice(0, maxBadges)
    .map((t) => t.slug);
  return new Set(fallbackPopular);
}
