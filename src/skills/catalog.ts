import catalogData from './catalog.json' assert { type: 'json' }

export interface CatalogEntry {
  name: string
  description: string
  source: string // GitHub shorthand (owner/repo) or full URL
  skillName?: string // specific skill name within repo (for multi-skill repos)
  subpath?: string // subpath within the repo to narrow discovery
  tags: string[]
}

export const SKILL_CATALOG: CatalogEntry[] = catalogData as CatalogEntry[]

/** Group catalog entries by their source repo for efficient batch cloning */
export function groupBySource(entries: CatalogEntry[]): Map<string, CatalogEntry[]> {
  const map = new Map<string, CatalogEntry[]>()
  for (const entry of entries) {
    const existing = map.get(entry.source) ?? []
    existing.push(entry)
    map.set(entry.source, existing)
  }
  return map
}
