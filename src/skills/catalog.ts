export interface CatalogEntry {
  name: string
  description: string
  source: string // GitHub shorthand (owner/repo) or full URL
  skillName?: string // specific skill name within repo (for multi-skill repos)
  subpath?: string // subpath within the repo to narrow discovery
  tags: string[]
}

export const SKILL_CATALOG: CatalogEntry[] = [
  // ── UI Frameworks ──────────────────────────────────────────────────────────
  {
    name: 'Ant Design',
    description: 'Component patterns and best practices for Ant Design (antd)',
    source: 'ant-design/antd-skill',
    tags: ['react', 'ui', 'antd'],
  },

  // ── Forms & Validation ────────────────────────────────────────────────────
  {
    name: 'React Hook Form + Zod',
    description: 'Type-safe form handling with react-hook-form and Zod schema validation',
    source: 'jezweb/claude-skills',
    skillName: 'react-hook-form-zod',
    subpath: 'react-hook-form-zod',
    tags: ['react', 'forms', 'validation', 'zod'],
  },

  // ── Next.js ───────────────────────────────────────────────────────────────
  {
    name: 'Next.js App Router',
    description: 'Best practices for Next.js App Router, Server Components, and server actions',
    source: 'jezweb/claude-skills',
    skillName: 'nextjs-app-router',
    subpath: 'nextjs-app-router',
    tags: ['nextjs', 'react', 'server-components'],
  },

  // ── Styling ───────────────────────────────────────────────────────────────
  {
    name: 'Tailwind CSS',
    description: 'Utility-first CSS patterns and component design with Tailwind CSS',
    source: 'jezweb/claude-skills',
    skillName: 'tailwind-css',
    subpath: 'tailwind-css',
    tags: ['css', 'styling', 'tailwind'],
  },

  // ── State Management ──────────────────────────────────────────────────────
  {
    name: 'Zustand',
    description: 'Minimal, scalable state management with Zustand',
    source: 'jezweb/claude-skills',
    skillName: 'zustand',
    subpath: 'zustand',
    tags: ['react', 'state', 'zustand'],
  },

  // ── Data Fetching ─────────────────────────────────────────────────────────
  {
    name: 'TanStack Query',
    description: 'Async state management and data fetching with TanStack Query (React Query)',
    source: 'jezweb/claude-skills',
    skillName: 'tanstack-query',
    subpath: 'tanstack-query',
    tags: ['react', 'data-fetching', 'tanstack'],
  },

  // ── Vercel Labs ───────────────────────────────────────────────────────────
  {
    name: 'React Composition Patterns',
    description:
      'React composition patterns that scale — eliminates boolean prop proliferation and designs flexible, reusable component APIs',
    source: 'vercel-labs/agent-skills',
    skillName: 'vercel-composition-patterns',
    subpath: 'skills/composition-patterns',
    tags: ['react', 'architecture', 'components', 'vercel'],
  },
  {
    name: 'Deploy to Vercel',
    description:
      'Deploy applications and websites to Vercel — handles deploy, preview deployment, and live link creation',
    source: 'vercel-labs/agent-skills',
    skillName: 'deploy-to-vercel',
    subpath: 'skills/deploy-to-vercel',
    tags: ['vercel', 'deployment', 'hosting'],
  },
  {
    name: 'React & Next.js Best Practices',
    description:
      'React and Next.js performance optimization guidelines from Vercel Engineering — components, data fetching, and bundle optimization',
    source: 'vercel-labs/agent-skills',
    skillName: 'vercel-react-best-practices',
    subpath: 'skills/react-best-practices',
    tags: ['react', 'nextjs', 'performance', 'vercel'],
  },
  {
    name: 'React Native & Expo',
    description:
      'React Native and Expo best practices for performant mobile apps — list performance, animations, and native modules',
    source: 'vercel-labs/agent-skills',
    skillName: 'vercel-react-native-skills',
    subpath: 'skills/react-native-skills',
    tags: ['react-native', 'expo', 'mobile'],
  },
  {
    name: 'Web Design Guidelines',
    description:
      'Review UI code for Web Interface Guidelines compliance — accessibility, UX audit, and design best practices',
    source: 'vercel-labs/agent-skills',
    skillName: 'web-design-guidelines',
    subpath: 'skills/web-design-guidelines',
    tags: ['design', 'accessibility', 'ux', 'ui'],
  },
]

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
