export type WordPairLang = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru'

export interface WordPair {
  civilian: string
  undercover: string
  language: WordPairLang
}

export const WORD_PAIRS: readonly WordPair[] = [
  // English
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
  { civilian: 'pizza',      undercover: 'pancake',    language: 'en' },
  { civilian: 'cloud',      undercover: 'fog',        language: 'en' },

  // Chinese
  { civilian: '苹果',   undercover: '梨',     language: 'zh' },
  { civilian: '咖啡',   undercover: '茶',     language: 'zh' },
  { civilian: '钢琴',   undercover: '吉他',   language: 'zh' },
  { civilian: '地铁',   undercover: '火车',   language: 'zh' },
  { civilian: '海豚',   undercover: '鲨鱼',   language: 'zh' },
  { civilian: '围棋',   undercover: '象棋',   language: 'zh' },
  { civilian: '小说',   undercover: '教科书', language: 'zh' },
  { civilian: '小提琴', undercover: '大提琴', language: 'zh' },
  { civilian: '足球',   undercover: '篮球',   language: 'zh' },
  { civilian: '老虎',   undercover: '狮子',   language: 'zh' },
  { civilian: '披萨',   undercover: '煎饼',   language: 'zh' },
  { civilian: '云',     undercover: '雾',     language: 'zh' },

  // Japanese
  { civilian: 'りんご',     undercover: '梨',       language: 'ja' },
  { civilian: 'コーヒー',   undercover: '紅茶',     language: 'ja' },
  { civilian: 'ピアノ',     undercover: 'ギター',   language: 'ja' },
  { civilian: '地下鉄',     undercover: '電車',     language: 'ja' },
  { civilian: 'イルカ',     undercover: 'サメ',     language: 'ja' },
  { civilian: '将棋',       undercover: '囲碁',     language: 'ja' },
  { civilian: '小説',       undercover: '教科書',   language: 'ja' },
  { civilian: 'バイオリン', undercover: 'チェロ',   language: 'ja' },
  { civilian: 'サッカー',   undercover: 'バスケ',   language: 'ja' },
  { civilian: '虎',         undercover: 'ライオン', language: 'ja' },
  { civilian: '寿司',       undercover: '刺身',     language: 'ja' },
  { civilian: '雲',         undercover: '霧',       language: 'ja' },

  // Korean
  { civilian: '사과',       undercover: '배',         language: 'ko' },
  { civilian: '커피',       undercover: '홍차',       language: 'ko' },
  { civilian: '피아노',     undercover: '기타',       language: 'ko' },
  { civilian: '지하철',     undercover: '기차',       language: 'ko' },
  { civilian: '돌고래',     undercover: '상어',       language: 'ko' },
  { civilian: '장기',       undercover: '바둑',       language: 'ko' },
  { civilian: '소설',       undercover: '교과서',     language: 'ko' },
  { civilian: '바이올린',   undercover: '첼로',       language: 'ko' },
  { civilian: '축구',       undercover: '농구',       language: 'ko' },
  { civilian: '호랑이',     undercover: '사자',       language: 'ko' },
  { civilian: '피자',       undercover: '전',         language: 'ko' },
  { civilian: '구름',       undercover: '안개',       language: 'ko' },

  // Spanish
  { civilian: 'manzana',    undercover: 'pera',       language: 'es' },
  { civilian: 'café',       undercover: 'té',         language: 'es' },
  { civilian: 'piano',      undercover: 'guitarra',   language: 'es' },
  { civilian: 'metro',      undercover: 'tren',       language: 'es' },
  { civilian: 'delfín',     undercover: 'tiburón',    language: 'es' },
  { civilian: 'ajedrez',    undercover: 'damas',      language: 'es' },
  { civilian: 'novela',     undercover: 'libro',      language: 'es' },
  { civilian: 'violín',     undercover: 'cello',      language: 'es' },
  { civilian: 'fútbol',     undercover: 'baloncesto', language: 'es' },
  { civilian: 'tigre',      undercover: 'león',       language: 'es' },
  { civilian: 'pizza',      undercover: 'tortilla',   language: 'es' },
  { civilian: 'nube',       undercover: 'niebla',     language: 'es' },

  // French
  { civilian: 'pomme',      undercover: 'poire',      language: 'fr' },
  { civilian: 'café',       undercover: 'thé',        language: 'fr' },
  { civilian: 'piano',      undercover: 'guitare',    language: 'fr' },
  { civilian: 'métro',      undercover: 'train',      language: 'fr' },
  { civilian: 'dauphin',    undercover: 'requin',     language: 'fr' },
  { civilian: 'échecs',     undercover: 'dames',      language: 'fr' },
  { civilian: 'roman',      undercover: 'manuel',     language: 'fr' },
  { civilian: 'violon',     undercover: 'violoncelle', language: 'fr' },
  { civilian: 'football',   undercover: 'basket',     language: 'fr' },
  { civilian: 'tigre',      undercover: 'lion',       language: 'fr' },
  { civilian: 'pizza',      undercover: 'crêpe',      language: 'fr' },
  { civilian: 'nuage',      undercover: 'brouillard', language: 'fr' },

  // German
  { civilian: 'Apfel',      undercover: 'Birne',      language: 'de' },
  { civilian: 'Kaffee',     undercover: 'Tee',        language: 'de' },
  { civilian: 'Klavier',    undercover: 'Gitarre',    language: 'de' },
  { civilian: 'U-Bahn',     undercover: 'Zug',        language: 'de' },
  { civilian: 'Delfin',     undercover: 'Hai',        language: 'de' },
  { civilian: 'Schach',     undercover: 'Dame',       language: 'de' },
  { civilian: 'Roman',      undercover: 'Lehrbuch',   language: 'de' },
  { civilian: 'Geige',      undercover: 'Cello',      language: 'de' },
  { civilian: 'Fußball',    undercover: 'Basketball', language: 'de' },
  { civilian: 'Tiger',      undercover: 'Löwe',       language: 'de' },
  { civilian: 'Pizza',      undercover: 'Pfannkuchen', language: 'de' },
  { civilian: 'Wolke',      undercover: 'Nebel',      language: 'de' },

  // Russian
  { civilian: 'яблоко',     undercover: 'груша',      language: 'ru' },
  { civilian: 'кофе',       undercover: 'чай',        language: 'ru' },
  { civilian: 'пианино',    undercover: 'гитара',     language: 'ru' },
  { civilian: 'метро',      undercover: 'поезд',      language: 'ru' },
  { civilian: 'дельфин',    undercover: 'акула',      language: 'ru' },
  { civilian: 'шахматы',    undercover: 'шашки',      language: 'ru' },
  { civilian: 'роман',      undercover: 'учебник',    language: 'ru' },
  { civilian: 'скрипка',    undercover: 'виолончель', language: 'ru' },
  { civilian: 'футбол',     undercover: 'баскетбол',  language: 'ru' },
  { civilian: 'тигр',       undercover: 'лев',        language: 'ru' },
  { civilian: 'пицца',      undercover: 'блин',       language: 'ru' },
  { civilian: 'облако',     undercover: 'туман',      language: 'ru' },
]
