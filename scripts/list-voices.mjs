import { MsEdgeTTS } from 'msedge-tts'
const tts = new MsEdgeTTS()
const voices = await tts.getVoices()
const check = (prefix) => {
  const list = voices.filter(v => v.Locale?.startsWith(prefix)).map(v => v.ShortName).sort()
  console.log(`\n${prefix} voices (${list.length}):\n` + list.join('\n'))
}
check('zh-CN')
check('ja-JP')
check('en-US')
