import { MsEdgeTTS } from 'msedge-tts'
const tts = new MsEdgeTTS()
const voices = await tts.getVoices()
const check = (prefixes, label) => {
  const list = voices
    .filter(v => prefixes.some(p => v.Locale?.startsWith(p)))
    .map(v => `${v.ShortName}${v.Gender ? ` (${v.Gender[0]})` : ''}`)
    .sort()
  console.log(`\n${label} — ${list.length} voice(s):\n` + list.join('\n'))
}
check(['ko-KR'], 'Korean')
check(['es-ES','es-MX','es-US'], 'Spanish (ES/MX/US)')
check(['fr-FR','fr-CA'], 'French (FR/CA)')
check(['de-DE'], 'German')
check(['ru-RU'], 'Russian')
