'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type Lang = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru'

export const LANG_LIST: ReadonlyArray<{ code: Lang; label: string; name: string }> = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'zh', label: '中', name: '中文' },
  { code: 'ja', label: '日', name: '日本語' },
  { code: 'ko', label: '한', name: '한국어' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'de', label: 'DE', name: 'Deutsch' },
  { code: 'ru', label: 'RU', name: 'Русский' },
]

/**
 * All user-facing strings, keyed. Small game-loop labels ("NOW", "UPNEXT",
 * "DONE", "SKIPPED", "OUT", "R{n}") deliberately stay English per the
 * gamified design — those are not in this dictionary.
 */
type Dict = Record<Lang, Record<string, string>>

const DICT: Dict = {
  en: {
    'app.title': 'WHOSPAI',
    'app.tagline': 'Watch 6 AI models play Who is the Spy',

    'setup.secret_words': 'Secret Words',
    'setup.civilian_word': 'Civilian word',
    'setup.undercover_word': 'Undercover word',
    'setup.let_ai_pick': 'Let AI Pick',
    'setup.generating': 'GENERATING…',
    'setup.generate_with_ai': 'GENERATE WITH AI',
    'setup.or_preset': 'Or Pick a Preset',
    'setup.start': 'START THE GAME',
    'setup.caption': '6 AIs · 1 undercover · you watch and judge',
    'setup.play_remaining': '{remaining} / {limit} games left today',
    'setup.gen_remaining': '{remaining} / {limit} AI picks left this hour',
    'setup.quota_used_up': 'DAILY LIMIT REACHED',
    'setup.contestants': "Tonight's Contestants",
    'setup.rules':
      'Each AI gets a secret word. One gets a {different} word — the {undercover}. They describe their word in short phrases without saying it, then vote to eliminate the one that sounds off. Civilians win if they catch the spy before the final two.',
    'setup.rules.different': 'different',
    'setup.rules.undercover': 'undercover',

    'game.error_title': 'Something went wrong',
    'game.back_to_setup': 'Back to setup',
    'game.dealing': 'DEALING THE WORDS…',
    'game.inner_thoughts': 'Inner Thoughts',
    'game.thinking': 'thinking…',
    'game.dealing_lower': 'Dealing the words…',
    'game.contestants': 'Contestants',
    'game.round_history': 'Round History',
    'game.no_rounds': 'no rounds yet',

    'overlay.game_start': 'GAME START',
    'overlay.game_start_sub': '6 AIs · 1 undercover',
    'overlay.round': 'ROUND {round}',
    'overlay.describe_phase': 'DESCRIBE PHASE',
    'overlay.vote_phase': 'VOTE PHASE',
    'overlay.tiebreak': 'TIEBREAK',
    'overlay.no_elimination': 'NO ELIMINATION',
    'overlay.vote_tied': 'Vote was tied',
    'overlay.name_out': '{name} OUT',
    'overlay.eliminated': 'ELIMINATED',
    'role.civilian': 'CIVILIAN',
    'role.undercover': 'UNDERCOVER',

    'end.game_over': 'Game Over',
    'end.civilians_win': 'CIVILIANS WIN',
    'end.undercover_wins': 'UNDERCOVER WINS',
    'end.rounds': '{n} rounds',
    'end.round': '{n} round',
    'end.final_roster': 'Final Roster',
    'end.out_round': 'Out · R{n}',
    'end.survived': 'Survived',
    'end.timeline': 'Timeline',
    'end.round_tied': 'R{n} TIED',
    'end.no_elims': 'No eliminations this game',
    'end.play_again': 'PLAY AGAIN',
    'end.change_words': 'CHANGE WORDS',
    'end.win': 'WIN',
  },

  zh: {
    'app.title': 'WHOSPAI',
    'app.tagline': '观看 6 个 AI 模型玩"谁是卧底"',

    'setup.secret_words': '秘密词语',
    'setup.civilian_word': '平民词',
    'setup.undercover_word': '卧底词',
    'setup.let_ai_pick': '让 AI 选',
    'setup.generating': '生成中…',
    'setup.generate_with_ai': 'AI 生成词组',
    'setup.or_preset': '或选一组预设',
    'setup.start': '开始游戏',
    'setup.caption': '6 个 AI · 1 个卧底 · 你观战评判',
    'setup.play_remaining': '今日还剩 {remaining} / {limit} 局',
    'setup.gen_remaining': '本小时还剩 {remaining} / {limit} 次 AI 生成',
    'setup.quota_used_up': '今日配额已用完',
    'setup.contestants': '今晚的选手',
    'setup.rules':
      '每个 AI 会得到一个秘密词，其中一人拿到的是{different}的词——{undercover}。大家用简短的话描述自己的词但不能直说，再投票淘汰听起来不对劲的那个。平民在最后两人之前抓到卧底就赢。',
    'setup.rules.different': '不同',
    'setup.rules.undercover': '卧底',

    'game.error_title': '出了点问题',
    'game.back_to_setup': '返回设置',
    'game.dealing': '正在发牌…',
    'game.inner_thoughts': '内心戏',
    'game.thinking': '思考中…',
    'game.dealing_lower': '正在发牌…',
    'game.contestants': '选手席',
    'game.round_history': '历史记录',
    'game.no_rounds': '暂无回合',

    'overlay.game_start': '游戏开始',
    'overlay.game_start_sub': '6 AI · 1 卧底',
    'overlay.round': '第 {round} 回合',
    'overlay.describe_phase': '描述阶段',
    'overlay.vote_phase': '投票阶段',
    'overlay.tiebreak': '加赛',
    'overlay.no_elimination': '无人淘汰',
    'overlay.vote_tied': '投票平局',
    'overlay.name_out': '{name} 出局',
    'overlay.eliminated': '已淘汰',
    'role.civilian': '平民',
    'role.undercover': '卧底',

    'end.game_over': '游戏结束',
    'end.civilians_win': '平民获胜',
    'end.undercover_wins': '卧底获胜',
    'end.rounds': '{n} 回合',
    'end.round': '{n} 回合',
    'end.final_roster': '最终花名册',
    'end.out_round': '出局 · R{n}',
    'end.survived': '存活',
    'end.timeline': '时间线',
    'end.round_tied': 'R{n} 平票',
    'end.no_elims': '本局无人淘汰',
    'end.play_again': '再来一局',
    'end.change_words': '更换词组',
    'end.win': '获胜',
  },

  ja: {
    'app.title': 'WHOSPAI',
    'app.tagline': '6 つの AI モデルが「スパイは誰だ」をプレイ',
    'setup.secret_words': '秘密の単語',
    'setup.civilian_word': '市民の単語',
    'setup.undercover_word': 'スパイの単語',
    'setup.let_ai_pick': 'AI に任せる',
    'setup.generating': '生成中…',
    'setup.generate_with_ai': 'AI で生成',
    'setup.or_preset': 'プリセットを選ぶ',
    'setup.start': 'ゲーム開始',
    'setup.caption': 'AI 6 人 · スパイ 1 人 · あなたが観戦',
    'setup.play_remaining': '本日の残り {remaining} / {limit} 局',
    'setup.gen_remaining': '今時間の残り AI 生成 {remaining} / {limit} 回',
    'setup.quota_used_up': '本日の上限に達しました',
    'setup.contestants': '今夜の出場者',
    'setup.rules':
      '各 AI は秘密の単語を受け取ります。1 人だけ{different}単語——{undercover}——を受け取ります。短い表現で単語を説明し（直接言ってはいけない）、怪しい人に投票して脱落させます。市民は最後の 2 人になる前にスパイを見抜けば勝利です。',
    'setup.rules.different': '違う',
    'setup.rules.undercover': 'スパイ',

    'game.error_title': '問題が発生しました',
    'game.back_to_setup': '設定に戻る',
    'game.dealing': 'カードを配っています…',
    'game.inner_thoughts': '心の声',
    'game.thinking': '考え中…',
    'game.dealing_lower': 'カードを配っています…',
    'game.contestants': '出場者',
    'game.round_history': 'ラウンド履歴',
    'game.no_rounds': 'ラウンドなし',

    'overlay.game_start': 'ゲーム開始',
    'overlay.game_start_sub': 'AI 6 人 · スパイ 1 人',
    'overlay.round': 'ラウンド {round}',
    'overlay.describe_phase': '説明フェーズ',
    'overlay.vote_phase': '投票フェーズ',
    'overlay.tiebreak': 'タイブレーク',
    'overlay.no_elimination': '脱落なし',
    'overlay.vote_tied': '投票同数',
    'overlay.name_out': '{name} 脱落',
    'overlay.eliminated': '脱落',
    'role.civilian': '市民',
    'role.undercover': 'スパイ',

    'end.game_over': 'ゲーム終了',
    'end.civilians_win': '市民の勝利',
    'end.undercover_wins': 'スパイの勝利',
    'end.rounds': '{n} ラウンド',
    'end.round': '{n} ラウンド',
    'end.final_roster': '最終メンバー',
    'end.out_round': '脱落 · R{n}',
    'end.survived': '生存',
    'end.timeline': 'タイムライン',
    'end.round_tied': 'R{n} 同点',
    'end.no_elims': '今回は脱落者なし',
    'end.play_again': 'もう一度',
    'end.change_words': '単語を変える',
    'end.win': '勝利',
  },

  ko: {
    'app.title': 'WHOSPAI',
    'app.tagline': '6 개의 AI 모델이 누가 스파이인가를 플레이',
    'setup.secret_words': '비밀 단어',
    'setup.civilian_word': '시민 단어',
    'setup.undercover_word': '스파이 단어',
    'setup.let_ai_pick': 'AI 에게 맡기기',
    'setup.generating': '생성 중…',
    'setup.generate_with_ai': 'AI 로 생성',
    'setup.or_preset': '프리셋 선택',
    'setup.start': '게임 시작',
    'setup.caption': 'AI 6 · 스파이 1 · 당신은 관전자',
    'setup.play_remaining': '오늘 남은 게임 {remaining} / {limit}',
    'setup.gen_remaining': '이번 시간 AI 생성 {remaining} / {limit} 회',
    'setup.quota_used_up': '오늘 한도에 도달',
    'setup.contestants': '오늘 밤의 참가자',
    'setup.rules':
      '각 AI 는 비밀 단어를 받습니다. 한 명은 {different} 단어——{undercover}——를 받습니다. 단어를 직접 말하지 않고 짧게 설명한 뒤 수상한 사람을 투표로 탈락시킵니다. 시민은 최종 2 인이 되기 전에 스파이를 잡으면 승리합니다.',
    'setup.rules.different': '다른',
    'setup.rules.undercover': '스파이',

    'game.error_title': '문제가 발생했습니다',
    'game.back_to_setup': '설정으로 돌아가기',
    'game.dealing': '카드를 나눠주는 중…',
    'game.inner_thoughts': '속마음',
    'game.thinking': '생각 중…',
    'game.dealing_lower': '카드를 나눠주는 중…',
    'game.contestants': '참가자',
    'game.round_history': '라운드 기록',
    'game.no_rounds': '아직 라운드 없음',

    'overlay.game_start': '게임 시작',
    'overlay.game_start_sub': 'AI 6 · 스파이 1',
    'overlay.round': '라운드 {round}',
    'overlay.describe_phase': '설명 단계',
    'overlay.vote_phase': '투표 단계',
    'overlay.tiebreak': '타이브레이크',
    'overlay.no_elimination': '탈락 없음',
    'overlay.vote_tied': '투표 동률',
    'overlay.name_out': '{name} 탈락',
    'overlay.eliminated': '탈락',
    'role.civilian': '시민',
    'role.undercover': '스파이',

    'end.game_over': '게임 종료',
    'end.civilians_win': '시민 승리',
    'end.undercover_wins': '스파이 승리',
    'end.rounds': '{n} 라운드',
    'end.round': '{n} 라운드',
    'end.final_roster': '최종 명단',
    'end.out_round': '탈락 · R{n}',
    'end.survived': '생존',
    'end.timeline': '타임라인',
    'end.round_tied': 'R{n} 동률',
    'end.no_elims': '이번 게임에서 탈락 없음',
    'end.play_again': '다시 하기',
    'end.change_words': '단어 바꾸기',
    'end.win': '승리',
  },

  es: {
    'app.title': 'WHOSPAI',
    'app.tagline': 'Mira a 6 modelos de IA jugando al Espía',
    'setup.secret_words': 'Palabras secretas',
    'setup.civilian_word': 'Palabra de civil',
    'setup.undercover_word': 'Palabra del espía',
    'setup.let_ai_pick': 'Que elija la IA',
    'setup.generating': 'GENERANDO…',
    'setup.generate_with_ai': 'GENERAR CON IA',
    'setup.or_preset': 'O elige un preset',
    'setup.start': 'EMPEZAR',
    'setup.caption': '6 IAs · 1 espía · tú observas',
    'setup.play_remaining': 'Te quedan {remaining} / {limit} partidas hoy',
    'setup.gen_remaining': 'Quedan {remaining} / {limit} generaciones IA esta hora',
    'setup.quota_used_up': 'LÍMITE DIARIO ALCANZADO',
    'setup.contestants': 'Los concursantes',
    'setup.rules':
      'Cada IA recibe una palabra secreta. Una recibe una palabra {different}—el {undercover}—. Describen su palabra con frases cortas sin decirla, y votan para eliminar al que suene raro. Los civiles ganan si pillan al espía antes de llegar a dos jugadores.',
    'setup.rules.different': 'distinta',
    'setup.rules.undercover': 'espía',

    'game.error_title': 'Algo salió mal',
    'game.back_to_setup': 'Volver al inicio',
    'game.dealing': 'REPARTIENDO PALABRAS…',
    'game.inner_thoughts': 'Pensamientos',
    'game.thinking': 'pensando…',
    'game.dealing_lower': 'Repartiendo palabras…',
    'game.contestants': 'Concursantes',
    'game.round_history': 'Historial',
    'game.no_rounds': 'aún no hay rondas',

    'overlay.game_start': 'COMIENZA EL JUEGO',
    'overlay.game_start_sub': '6 IAs · 1 espía',
    'overlay.round': 'RONDA {round}',
    'overlay.describe_phase': 'FASE DE DESCRIPCIÓN',
    'overlay.vote_phase': 'FASE DE VOTACIÓN',
    'overlay.tiebreak': 'DESEMPATE',
    'overlay.no_elimination': 'SIN ELIMINACIÓN',
    'overlay.vote_tied': 'Empate en la votación',
    'overlay.name_out': '{name} FUERA',
    'overlay.eliminated': 'ELIMINADO',
    'role.civilian': 'CIVIL',
    'role.undercover': 'ESPÍA',

    'end.game_over': 'Fin del juego',
    'end.civilians_win': 'GANAN LOS CIVILES',
    'end.undercover_wins': 'GANA EL ESPÍA',
    'end.rounds': '{n} rondas',
    'end.round': '{n} ronda',
    'end.final_roster': 'Lista final',
    'end.out_round': 'Fuera · R{n}',
    'end.survived': 'Sobrevivió',
    'end.timeline': 'Cronología',
    'end.round_tied': 'R{n} EMPATE',
    'end.no_elims': 'No hubo eliminaciones',
    'end.play_again': 'JUGAR OTRA VEZ',
    'end.change_words': 'CAMBIAR PALABRAS',
    'end.win': 'GANA',
  },

  fr: {
    'app.title': 'WHOSPAI',
    'app.tagline': 'Regardez 6 IA jouer à Qui est l’espion',
    'setup.secret_words': 'Mots secrets',
    'setup.civilian_word': 'Mot du civil',
    'setup.undercover_word': "Mot de l'espion",
    'setup.let_ai_pick': "Laisser l'IA choisir",
    'setup.generating': 'GÉNÉRATION…',
    'setup.generate_with_ai': 'GÉNÉRER AVEC IA',
    'setup.or_preset': 'Ou choisir un préréglage',
    'setup.start': 'COMMENCER',
    'setup.caption': '6 IA · 1 espion · vous regardez',
    'setup.play_remaining': '{remaining} / {limit} parties restantes aujourd’hui',
    'setup.gen_remaining': '{remaining} / {limit} générations IA cette heure',
    'setup.quota_used_up': 'LIMITE QUOTIDIENNE ATTEINTE',
    'setup.contestants': 'Les concurrents',
    'setup.rules':
      "Chaque IA reçoit un mot secret. L'une d'elles reçoit un mot {different}—l'{undercover}—. Elles décrivent leur mot en courtes phrases sans le dire, puis votent pour éliminer celle qui sonne faux. Les civils gagnent s'ils attrapent l'espion avant les deux derniers.",
    'setup.rules.different': 'différent',
    'setup.rules.undercover': 'espion',

    'game.error_title': 'Une erreur est survenue',
    'game.back_to_setup': 'Retour au menu',
    'game.dealing': 'DISTRIBUTION DES MOTS…',
    'game.inner_thoughts': 'Pensées',
    'game.thinking': 'réflexion…',
    'game.dealing_lower': 'Distribution des mots…',
    'game.contestants': 'Concurrents',
    'game.round_history': 'Historique',
    'game.no_rounds': 'aucune manche',

    'overlay.game_start': 'DÉBUT DE PARTIE',
    'overlay.game_start_sub': '6 IA · 1 espion',
    'overlay.round': 'MANCHE {round}',
    'overlay.describe_phase': 'DESCRIPTION',
    'overlay.vote_phase': 'VOTE',
    'overlay.tiebreak': 'BARRAGE',
    'overlay.no_elimination': 'AUCUNE ÉLIMINATION',
    'overlay.vote_tied': 'Vote à égalité',
    'overlay.name_out': '{name} SORT',
    'overlay.eliminated': 'ÉLIMINÉ',
    'role.civilian': 'CIVIL',
    'role.undercover': 'ESPION',

    'end.game_over': 'Partie terminée',
    'end.civilians_win': 'LES CIVILS GAGNENT',
    'end.undercover_wins': "L'ESPION GAGNE",
    'end.rounds': '{n} manches',
    'end.round': '{n} manche',
    'end.final_roster': 'Liste finale',
    'end.out_round': 'Sorti · R{n}',
    'end.survived': 'Survécu',
    'end.timeline': 'Chronologie',
    'end.round_tied': 'R{n} ÉGALITÉ',
    'end.no_elims': 'Aucune élimination',
    'end.play_again': 'REJOUER',
    'end.change_words': 'CHANGER LES MOTS',
    'end.win': 'GAGNE',
  },

  de: {
    'app.title': 'WHOSPAI',
    'app.tagline': 'Sieh 6 KI-Modellen beim Spionen-Spiel zu',
    'setup.secret_words': 'Geheime Wörter',
    'setup.civilian_word': 'Zivilist-Wort',
    'setup.undercover_word': 'Spion-Wort',
    'setup.let_ai_pick': 'KI wählen lassen',
    'setup.generating': 'GENERIERE…',
    'setup.generate_with_ai': 'MIT KI GENERIEREN',
    'setup.or_preset': 'Oder Preset wählen',
    'setup.start': 'SPIEL STARTEN',
    'setup.caption': '6 KIs · 1 Spion · du schaust zu',
    'setup.play_remaining': '{remaining} / {limit} Spiele heute übrig',
    'setup.gen_remaining': '{remaining} / {limit} KI-Generierungen diese Stunde',
    'setup.quota_used_up': 'TAGESLIMIT ERREICHT',
    'setup.contestants': 'Die Teilnehmer',
    'setup.rules':
      'Jede KI bekommt ein geheimes Wort. Eine bekommt ein {different} Wort—den {undercover}—. Sie beschreiben ihr Wort in kurzen Sätzen, ohne es zu sagen, und stimmen dann ab, wer eliminiert wird. Die Zivilisten gewinnen, wenn sie den Spion vor den letzten zwei enttarnen.',
    'setup.rules.different': 'anderes',
    'setup.rules.undercover': 'Spion',

    'game.error_title': 'Etwas ist schiefgelaufen',
    'game.back_to_setup': 'Zurück zum Setup',
    'game.dealing': 'WÖRTER WERDEN VERTEILT…',
    'game.inner_thoughts': 'Gedanken',
    'game.thinking': 'denkt nach…',
    'game.dealing_lower': 'Wörter werden verteilt…',
    'game.contestants': 'Teilnehmer',
    'game.round_history': 'Rundenverlauf',
    'game.no_rounds': 'noch keine Runden',

    'overlay.game_start': 'SPIELBEGINN',
    'overlay.game_start_sub': '6 KIs · 1 Spion',
    'overlay.round': 'RUNDE {round}',
    'overlay.describe_phase': 'BESCHREIBUNG',
    'overlay.vote_phase': 'ABSTIMMUNG',
    'overlay.tiebreak': 'STICHWAHL',
    'overlay.no_elimination': 'KEINE ELIMINATION',
    'overlay.vote_tied': 'Stimmengleichheit',
    'overlay.name_out': '{name} AUSGESCHIEDEN',
    'overlay.eliminated': 'ELIMINIERT',
    'role.civilian': 'ZIVILIST',
    'role.undercover': 'SPION',

    'end.game_over': 'Spiel vorbei',
    'end.civilians_win': 'ZIVILISTEN GEWINNEN',
    'end.undercover_wins': 'SPION GEWINNT',
    'end.rounds': '{n} Runden',
    'end.round': '{n} Runde',
    'end.final_roster': 'Abschlussliste',
    'end.out_round': 'Aus · R{n}',
    'end.survived': 'Überlebt',
    'end.timeline': 'Zeitleiste',
    'end.round_tied': 'R{n} UNENTSCHIEDEN',
    'end.no_elims': 'Keine Eliminationen',
    'end.play_again': 'NOCHMAL SPIELEN',
    'end.change_words': 'WÖRTER ÄNDERN',
    'end.win': 'SIEG',
  },

  ru: {
    'app.title': 'WHOSPAI',
    'app.tagline': 'Смотрите, как 6 ИИ играют в Шпиона',
    'setup.secret_words': 'Секретные слова',
    'setup.civilian_word': 'Слово мирного',
    'setup.undercover_word': 'Слово шпиона',
    'setup.let_ai_pick': 'Пусть выберет ИИ',
    'setup.generating': 'ГЕНЕРАЦИЯ…',
    'setup.generate_with_ai': 'СГЕНЕРИРОВАТЬ С ИИ',
    'setup.or_preset': 'Или выбрать пресет',
    'setup.start': 'НАЧАТЬ ИГРУ',
    'setup.caption': '6 ИИ · 1 шпион · вы смотрите',
    'setup.play_remaining': 'Осталось {remaining} / {limit} игр сегодня',
    'setup.gen_remaining': '{remaining} / {limit} ИИ-генераций в этот час',
    'setup.quota_used_up': 'СУТОЧНЫЙ ЛИМИТ ДОСТИГНУТ',
    'setup.contestants': 'Участники',
    'setup.rules':
      'Каждому ИИ достаётся секретное слово. Один получает {different} слово — {undercover}. Они по очереди описывают слово, не называя его, затем голосуют, кого исключить. Мирные побеждают, если вычислят шпиона до последних двух.',
    'setup.rules.different': 'другое',
    'setup.rules.undercover': 'шпион',

    'game.error_title': 'Что-то пошло не так',
    'game.back_to_setup': 'К настройке',
    'game.dealing': 'РАЗДАЁМ СЛОВА…',
    'game.inner_thoughts': 'Мысли',
    'game.thinking': 'думает…',
    'game.dealing_lower': 'Раздаём слова…',
    'game.contestants': 'Участники',
    'game.round_history': 'История',
    'game.no_rounds': 'пока нет раундов',

    'overlay.game_start': 'НАЧАЛО ИГРЫ',
    'overlay.game_start_sub': '6 ИИ · 1 шпион',
    'overlay.round': 'РАУНД {round}',
    'overlay.describe_phase': 'ОПИСАНИЕ',
    'overlay.vote_phase': 'ГОЛОСОВАНИЕ',
    'overlay.tiebreak': 'ПЕРЕИГРОВКА',
    'overlay.no_elimination': 'НИКТО НЕ ВЫБЫЛ',
    'overlay.vote_tied': 'Голоса поровну',
    'overlay.name_out': '{name} ВЫБЫЛ',
    'overlay.eliminated': 'ВЫБЫЛ',
    'role.civilian': 'МИРНЫЙ',
    'role.undercover': 'ШПИОН',

    'end.game_over': 'Игра окончена',
    'end.civilians_win': 'МИРНЫЕ ПОБЕДИЛИ',
    'end.undercover_wins': 'ШПИОН ПОБЕДИЛ',
    'end.rounds': '{n} раундов',
    'end.round': '{n} раунд',
    'end.final_roster': 'Итоговый состав',
    'end.out_round': 'Выбыл · R{n}',
    'end.survived': 'Выжил',
    'end.timeline': 'Хронология',
    'end.round_tied': 'R{n} НИЧЬЯ',
    'end.no_elims': 'Никто не выбыл',
    'end.play_again': 'ЕЩЁ РАЗ',
    'end.change_words': 'СМЕНИТЬ СЛОВА',
    'end.win': 'ПОБЕДА',
  },
}

/** Language codes in a stable order — used for browser auto-detect. */
const SUPPORTED_LANGS: Lang[] = ['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru']

const STORAGE_KEY = 'whospy.lang'

function detectBrowserLang(): Lang {
  if (typeof navigator === 'undefined') return 'en'
  const candidates = (navigator.languages ?? [navigator.language ?? 'en']).map(s =>
    s.toLowerCase(),
  )
  for (const c of candidates) {
    const head = c.split('-')[0] as Lang
    if (SUPPORTED_LANGS.includes(head)) return head
  }
  return 'en'
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    Object.prototype.hasOwnProperty.call(params, k) ? String(params[k]) : `{${k}}`,
  )
}

export type TFn = (key: string, params?: Record<string, string | number>) => string

interface LangContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: TFn
}

const LangContext = createContext<LangContextValue | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Server render always defaults to 'en' for hydration stability; client
  // swaps to detected / persisted value after mount.
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    const stored = typeof localStorage !== 'undefined'
      ? (localStorage.getItem(STORAGE_KEY) as Lang | null)
      : null
    if (stored && SUPPORTED_LANGS.includes(stored)) {
      setLangState(stored)
      return
    }
    setLangState(detectBrowserLang())
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback<TFn>(
    (key, params) => {
      const table = DICT[lang] ?? DICT.en
      const raw = table[key] ?? DICT.en[key] ?? key
      return interpolate(raw, params)
    },
    [lang],
  )

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t])

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>')
  return ctx
}
