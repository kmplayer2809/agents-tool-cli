import catalogData from './catalog.json' assert { type: 'json' }

export interface RuleCatalogEntry {
  name: string
  description: string
  source: string // GitHub shorthand (owner/repo) or full URL
  ruleName?: string // specific rule name within repo (for multi-rule repos)
  subpath?: string // subpath within the repo to narrow discovery
  tags: string[]
}

export const RULE_CATALOG: RuleCatalogEntry[] = catalogData as RuleCatalogEntry[]

/** Group catalog entries by their source repo for efficient batch cloning */
export function groupBySource(entries: RuleCatalogEntry[]): Map<string, RuleCatalogEntry[]> {
  const map = new Map<string, RuleCatalogEntry[]>()
  for (const entry of entries) {
    const existing = map.get(entry.source) ?? []
    existing.push(entry)
    map.set(entry.source, existing)
  }
  return map
}
