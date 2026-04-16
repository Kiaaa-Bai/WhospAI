// scripts/list-models.ts
import 'dotenv/config'
import { gateway } from 'ai'

async function main() {
  const result = await gateway.getAvailableModels()
  const relevant = ['openai', 'anthropic', 'google', 'deepseek', 'xai', 'alibaba']

  for (const provider of relevant) {
    console.log(`\n=== ${provider} ===`)
    const matching = result.models.filter(m => m.id.startsWith(`${provider}/`))
    if (matching.length === 0) {
      console.log(`  (none)`)
      continue
    }
    for (const m of matching) {
      console.log(`  ${m.id}`)
    }
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
