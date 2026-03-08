import pc from 'picocolors';

export async function runSkillsFind(query?: string): Promise<void> {
  console.log(pc.dim('\nDiscover skills at: ') + pc.cyan('https://skills.sh/') + '\n');
  if (query) {
    console.log(pc.dim(`Search for "${query}" in the skills registry above.\n`));
  }
}
