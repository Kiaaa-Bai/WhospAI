export interface WordPair {
  civilian: string
  undercover: string
  language: 'en' | 'zh'
}

export const WORD_PAIRS: readonly WordPair[] = [
  { civilian: 'apple',      undercover: 'pear',       language: 'en' },
  { civilian: 'coffee',     undercover: 'tea',        language: 'en' },
  { civilian: 'piano',      undercover: 'guitar',     language: 'en' },
  { civilian: 'subway',     undercover: 'train',      language: 'en' },
  { civilian: 'dolphin',    undercover: 'shark',      language: 'en' },
  { civilian: 'chess',      undercover: 'checkers',   language: 'en' },
  { civilian: 'novel',      undercover: 'textbook',   language: 'en' },
  { civilian: 'violin',     undercover: 'cello',      language: 'en' },
  { civilian: 'football',   undercover: 'basketball', language: 'en' },
  { civilian: 'tiger',      undercover: 'lion',       language: 'en' },
  { civilian: '苹果',   undercover: '梨',   language: 'zh' },
  { civilian: '咖啡',   undercover: '茶',   language: 'zh' },
  { civilian: '钢琴',   undercover: '吉他', language: 'zh' },
  { civilian: '地铁',   undercover: '火车', language: 'zh' },
  { civilian: '海豚',   undercover: '鲨鱼', language: 'zh' },
  { civilian: '围棋',   undercover: '象棋', language: 'zh' },
  { civilian: '小说',   undercover: '教科书', language: 'zh' },
  { civilian: '小提琴', undercover: '大提琴', language: 'zh' },
  { civilian: '足球',   undercover: '篮球', language: 'zh' },
  { civilian: '老虎',   undercover: '狮子', language: 'zh' },
]
