import * as p from '@clack/prompts'
import pc from 'picocolors'
import { parseSource } from '../source-parser.js'
import { cloneRepo, cleanupTempDir, GitCloneError } from '../git.js'
import { discoverRules } from './discover.js'
import { installAsset, type InstallMode } from '../skills/installer.js'
import { detectInstalledAgents, agents } from '../agents.js'
import { addToLock } from '../lock.js'
import type { AgentType, Asset } from '../types.js'
import { RULE_CATALOG, groupBySource, type RuleCatalogEntry } from './catalog.js'

interface BrowseOptions {
  global: boolean
  agentArgs: string[]
  copy: boolean
}

export async function runRulesBrowse(options: BrowseOptions): Promise<void> {
  p.intro(pc.cyan('agents-tool-cli') + pc.dim(' — Browse Rules Catalog'))

  // Build multiselect options from catalog
  const catalogOptions = RULE_CATALOG.map(entry => ({
    value: entry.name,
    label: pc.bold(entry.name),
    hint: entry.description + pc.dim(' [' + entry.tags.join(', ') + ']'),
  }))

  const chosen = await p.multiselect({
    message: 'Select rules to install:',
    options: catalogOptions,
    required: true,
  })

  if (p.isCancel(chosen)) {
    p.cancel('Cancelled')
    process.exit(0)
  }

  const selectedNames = chosen as string[]
  const selectedEntries = RULE_CATALOG.filter(e => selectedNames.includes(e.name))

  // Agent selection
  const installedAgents = await detectInstalledAgents()
  let targetAgents: AgentType[]

  if (options.agentArgs.length > 0) {
    targetAgents = options.agentArgs as AgentType[]
  } else {
    const agentChoices = installedAgents.map(a => ({
      value: a,
      label: agents[a]?.displayName || a,
    }))

    const chosenAgents = await p.multiselect({
      message: 'Which agents should receive these rules?',
      options: agentChoices,
      required: true,
    })

    if (p.isCancel(chosenAgents)) {
      p.cancel('Installation cancelled')
      process.exit(0)
    }

    targetAgents = chosenAgents as AgentType[]
  }

  // Install mode
  let mode: InstallMode = options.copy ? 'copy' : 'symlink'
  if (!options.copy) {
    const modeResult = await p.select({
      message: 'Installation method:',
      options: [
        { value: 'symlink', label: 'Symlink (recommended)', hint: 'Single source of truth' },
        { value: 'copy', label: 'Copy', hint: 'Independent copies' },
      ],
    })

    if (p.isCancel(modeResult)) {
      p.cancel('Installation cancelled')
      process.exit(0)
    }

    mode = modeResult as InstallMode
  }

  const confirmed = await p.confirm({
    message: `Install ${selectedEntries.length} rule(s) for ${targetAgents.length} agent(s)?`,
  })

  if (p.isCancel(confirmed) || !confirmed) {
    p.cancel('Installation cancelled')
    process.exit(0)
  }

  // Group by source and install each group
  const grouped = groupBySource(selectedEntries)
  const allResults: { rule: string; agent: string; success: boolean; error?: string }[] = []

  for (const [source, entries] of grouped) {
    await installFromSource(source, entries, targetAgents, mode, options.global, allResults)
  }

  // Summary
  const succeeded = allResults.filter(r => r.success)
  const failed = allResults.filter(r => !r.success)

  if (succeeded.length > 0) {
    console.log(pc.green(`\n✓ Installed ${succeeded.length} rule(s) successfully`))
  }
  if (failed.length > 0) {
    console.log(pc.red(`\n✗ Failed to install ${failed.length} rule(s):`))
    for (const f of failed) {
      console.log(pc.dim(`  ${f.rule} → ${f.agent}: ${f.error}`))
    }
  }

  p.outro(pc.green('Done!'))
}

async function installFromSource(
  source: string,
  entries: RuleCatalogEntry[],
  targetAgents: AgentType[],
  mode: InstallMode,
  global: boolean,
  results: { rule: string; agent: string; success: boolean; error?: string }[]
): Promise<void> {
  const spinner = p.spinner()
  spinner.start(`Cloning ${pc.cyan(source)}...`)

  let tmpDir: string | null = null

  let parsedSource
  try {
    parsedSource = parseSource(source)
  } catch (err) {
    spinner.stop(pc.red('Invalid source'))
    for (const entry of entries) {
      for (const agent of targetAgents) {
        results.push({ rule: entry.name, agent, success: false, error: 'Invalid source URL' })
      }
    }
    return
  }

  try {
    tmpDir = await cloneRepo(parsedSource)
    spinner.stop(`Cloned ${pc.cyan(source)}`)
  } catch (err) {
    spinner.stop(pc.red(`Failed to clone ${source}`))
    const msg = err instanceof GitCloneError ? err.message : String(err)
    for (const entry of entries) {
      for (const agent of targetAgents) {
        results.push({ rule: entry.name, agent, success: false, error: msg })
      }
    }
    return
  }

  const installSpinner = p.spinner()
  installSpinner.start('Installing...')

  const installedAssetNames: string[] = []

  for (const entry of entries) {
    // Discover with subpath narrowing if specified
    const discovered = discoverRules(tmpDir, entry.subpath)

    // Find the specific rule asset
    let asset: Asset | undefined
    if (entry.ruleName) {
      asset = discovered.find(
        r =>
          r.name.toLowerCase() === entry.ruleName!.toLowerCase() ||
          r.name.toLowerCase().includes(entry.ruleName!.toLowerCase())
      )
    } else {
      // Single-rule repo — take the first discovered
      asset = discovered[0]
    }

    if (!asset) {
      for (const agent of targetAgents) {
        results.push({
          rule: entry.name,
          agent,
          success: false,
          error: `Rule "${entry.ruleName ?? entry.name}" not found in repo`,
        })
      }
      continue
    }

    for (const agentType of targetAgents) {
      const result = await installAsset(asset, 'rules', agentType, { global, mode })
      results.push({ rule: entry.name, agent: agentType, success: result.success, error: result.error })
      if (result.success && !installedAssetNames.includes(asset.name)) {
        installedAssetNames.push(asset.name)
      }
    }
  }

  installSpinner.stop('Done')

  if (installedAssetNames.length > 0) {
    await addToLock(
      {
        source,
        assetType: 'rules',
        assets: installedAssetNames,
        agents: targetAgents,
      },
      global
    )
  }

  if (tmpDir) await cleanupTempDir(tmpDir)
}
