// client/src/i18n.ts
// Tiny i18n: a dictionary, a module store, and a hook. The language is chosen
// on the first screen and persists in localStorage.

import { useEffect, useSyncExternalStore } from 'react';
import type { Language } from './types';

const STRINGS = {
  // Home
  tagline: {
    en: 'Everyone gets a secret word. One of you is the Impostor. Give clues, find them — before they find the word.',
    es: 'Todos reciben una palabra secreta. Uno de ustedes es el Impostor. Den pistas y encuéntrenlo… antes de que él descubra la palabra.',
  },
  yourName: { en: 'Your name', es: 'Tu nombre' },
  namePlaceholder: { en: 'e.g. Javier', es: 'p. ej. Javier' },
  yourPfp: { en: 'Your profile pic', es: 'Tu foto de perfil' },
  randomize: { en: 'Randomize', es: 'Aleatorio' },
  noAvatars: { en: '. . .', es: '. . .' },
  openTable: { en: 'Open a table', es: 'Crear una mesa' },
  orJoin: { en: 'or join existing table', es: 'o únete a una mesa existente' },
  join: { en: 'Join', es: 'Unirse' },
  pickName: { en: 'Pick a name first.', es: 'Primero elige un nombre.' },
  enterCode: { en: 'Enter a table code.', es: 'Escribe el código de la mesa.' },
  footerHome: { en: '3–12 players · one screen each · rounds take ~5 minutes', es: '3–12 jugadores · cada uno con su pantalla · rondas de ~5 minutos' },

  // Lobby
  leave: { en: 'Leave', es: 'Salir' },
  roomLabel: { en: 'Room', es: 'Sala' },
  copied: { en: 'Copied!', es: '¡Copiado!' },
  answerTime: { en: 'Time to answer', es: 'Tiempo para responder' },
  answerTimeHint: { en: 'Seconds each player has to give their clue.', es: 'Segundos que tiene cada jugador para dar su pista.' },
  secondsShort: { en: '{n}s', es: '{n}s' },
  tableSet: { en: 'The table is set', es: 'La mesa está lista' },
  seated: { en: 'seated', es: 'en la mesa' },
  needMore: { en: 'need {n} more to start', es: 'faltan {n} para empezar' },
  emptySeat: { en: 'Empty seat', es: 'Asiento libre' },
  host: { en: 'Host', es: 'Anfitrión' },
  ready: { en: 'Ready', es: 'Listo' },
  notReady: { en: 'Not ready', es: 'No listo' },
  you: { en: 'you', es: 'tú' },
  imReady: { en: "I'm ready", es: 'Estoy listo' },
  readyUndo: { en: "I'm ready ✓ (tap to undo)", es: 'Listo ✓ (toca para deshacer)' },
  dealWords: { en: 'Start the round', es: 'Iniciar la ronda' },
  waitingReady: { en: 'Waiting for everyone to ready up…', es: 'Esperando a que todos estén listos…' },
  shareCode: { en: 'Share the code above — friends join from the home screen in one tap.', es: 'Comparte el código de arriba: tus amigos se unen desde la pantalla de inicio.' },

  // Lobby — host settings
  gameSettings: { en: 'Game settings', es: 'Configuración de la partida' },
  hostSetsUp: { en: 'The host sets up the round', es: 'El anfitrión configura la ronda' },
  category: { en: 'Category', es: 'Categoría' },
  impostorClue: { en: 'Impostor gets a clue', es: 'El impostor recibe una pista' },
  clueOnHint: { en: 'The Impostor receives a hint word close to the secret word.', es: 'El impostor recibe una palabra parecida a la secreta.' },
  clueOffHint: { en: 'The Impostor gets nothing — pure bluffing.', es: 'El impostor no recibe nada: puro engaño.' },
  lastChance: { en: 'Impostor last chance', es: 'Última oportunidad del impostor' },
  lastChanceOnHint: { en: 'If caught, the Impostor gets one final guess at the word.', es: 'Si lo descubren, el impostor tiene una última oportunidad de adivinar la palabra.' },
  lastChanceOffHint: { en: 'If caught, the round ends immediately — no final guess.', es: 'Si lo descubren, la ronda termina de inmediato: sin última oportunidad.' },
  lcOn: { en: 'On', es: 'Sí' },
  lcOff: { en: 'Off', es: 'No' },
  customWords: { en: 'Your word list', es: 'Tu lista de palabras' },
  customPlaceholder: { en: 'One word per line…\nPizza\nBeach\nRobot', es: 'Una palabra por línea…\nPizza\nPlaya\nRobot' },
  customHint: { en: 'One per line, at least 5. Custom words have no impostor clue.', es: 'Una por línea, mínimo 5. Las palabras personalizadas no llevan pista.' },
  saveList: { en: 'Save list', es: 'Guardar lista' },
  wordsSaved: { en: '{n} words saved', es: '{n} palabras guardadas' },
  clueOn: { en: 'Clue on', es: 'Con pista' },
  clueOff: { en: 'No clue', es: 'Sin pista' },

  // Game
  holdToPeek: { en: 'hold to peek', es: 'mantén para ver' },
  yourSecretWord: { en: 'Your secret word', es: 'Tu palabra secreta' },
  dontSayIt: { en: "Don't say it. Don't type it. Clue around it.", es: 'No la digas. No la escribas. Da pistas alrededor de ella.' },
  youAreImpostor: { en: 'You are the IMPOSTOR', es: 'Eres el IMPOSTOR' },
  yourClue: { en: 'Your clue', es: 'Tu pista' },
  blendIn: { en: 'Blend in. Listen hard. Survive the vote.', es: 'Camúflate. Escucha bien. Sobrevive a la votación.' },
  noClueThisGame: { en: 'No clue this game — improvise from their clues.', es: 'Sin pista esta partida: improvisa con las pistas de los demás.' },
  holdToOpen: { en: 'Hold to tear open your envelope', es: 'Mantén presionado para abrir tu sobre' },
  hold: { en: 'Hold', es: 'Mantén' },
  dealing: { en: 'Dealing envelopes…', es: 'Repartiendo sobres…' },
  clueRoundN: { en: 'Clue round {n}', es: 'Ronda de pistas {n}' },
  yourClueTurn: { en: 'Your clue.', es: 'Tu pista.' },
  isThinking: { en: '{name} is thinking…', es: '{name} está pensando…' },
  yourTurnBadge: { en: 'YOUR TURN', es: 'TU TURNO' },
  turnBadge: { en: 'THEIR TURN', es: 'SU TURNO' },
  clueTip: { en: 'True for your word — vague enough to hide it.', es: 'Cierta para tu palabra, pero vaga para no delatarla.' },
  theVote: { en: 'Vote', es: 'Votación' },
  whoIsImpostor: { en: 'Who is the Impostor?', es: '¿Quién es el Impostor?' },
  sealed: { en: 'sealed', es: 'selladas' },
  impostorCaught: { en: 'Impostor caught!', es: '¡Impostor atrapado!' },
  lastGuessMine: { en: 'One last guess. Steal it.', es: 'Una última oportunidad. Róbatela.' },
  lastGuessOther: { en: '{name} gets one final guess…', es: '{name} tiene una última oportunidad…' },
  cluesBoard: { en: 'Clue board', es: 'Tablero de pistas' },
  round: { en: 'Round', es: 'Ronda' },
  cluePlaceholder: { en: 'One to three words…', es: 'De una a tres palabras…' },
  giveClue: { en: 'Give clue', es: 'Dar pista' },
  noCluesYet: { en: 'no clues yet', es: 'sin pistas aún' },
  voteSealed: { en: 'Vote sealed ✓', es: 'Voto sellado ✓' },
  sealVoteFor: { en: 'Seal vote for {name}', es: 'Votar por {name}' },
  pickSuspect: { en: 'Pick a suspect', es: 'Elige a un sospechoso' },
  skipVote: { en: 'Skip vote', es: 'Omitir voto' },
  skipSealed: { en: 'Skip sealed ✓', es: 'Omitir sellado ✓' },
  sealSkip: { en: 'Seal: skip the vote', es: 'Sellar: omitir la votación' },
  guessWarning: { en: "They caught you. Guess their word and steal the win — they're watching you type.", es: 'Te atraparon. Adivina su palabra y roba la victoria… están viendo lo que escribes.' },
  guessPlaceholder: { en: 'The real word is…', es: 'La palabra real es…' },
  guess: { en: 'Guess', es: 'Adivinar' },
  phaseDeal: { en: '✉️ Reveal', es: '✉️ Revelación' },
  phaseClues: { en: '💬 Clues — round {n}', es: '💬 Pistas — ronda {n}' },
  phaseVote: { en: '🪧 Vote', es: '🪧 Votación' },
  phaseGuess: { en: '🎯 Final guess', es: '🎯 Última oportunidad' },
  ejected: { en: 'Out', es: 'Fuera' },

  // Results
  citizensWin: { en: 'Impostor caught', es: 'Impostor descubierto' },
  impostorWins: { en: 'Impostor wins', es: 'Gana el impostor' },
  victory: { en: 'Victory!', es: '¡Victoria!' },
  soClose: { en: 'So close.', es: 'Casi…' },
  theWordWas: { en: 'The word was', es: 'La palabra era' },
  impostorClueWas: { en: "The Impostor's clue", es: 'La pista del Impostor' },
  noClueGiven: { en: 'no clue', es: 'sin pista' },
  theImpostorWas: { en: 'The Impostor was', es: 'El Impostor era' },
  thatWasYou: { en: '— that was you!', es: '— ¡eras tú!' },
  finalGuessLabel: { en: 'Final guess', es: 'Última respuesta' },
  aSteal: { en: '— a steal! 🎯', es: '— ¡se la robó! 🎯' },
  notIt: { en: '— not it. 🛡️', es: '— no era. 🛡️' },
  tableScores: { en: 'Table scores', es: 'Puntuación de la mesa' },
  playAgain: { en: 'Continue', es: 'Continuar' },
  waitingHost: { en: 'Waiting for the host to continue…', es: 'Esperando a que el anfitrión continúe…' },
  leaveTable: { en: 'Leave the table', es: 'Salir de la mesa' },
  playerLeft: { en: 'a player who left', es: 'alguien que se fue' },
} as const;

export type StringKey = keyof typeof STRINGS;

// `lang` is the ACTIVE language everything renders in. The device preference is
// persisted separately — while in a room we override the active language with
// the room's language (so the whole UI matches the server's localized messages)
// without clobbering the player's saved preference.
function devicePref(): Language {
  return (localStorage.getItem('impostor:lang') as Language) ?? 'en';
}
let lang: Language = devicePref();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Home-screen toggle: change the active language AND persist it as the device preference. */
export function setLanguage(next: Language) {
  lang = next;
  localStorage.setItem('impostor:lang', next);
  emit();
}

/** While in a room: render in the room's language without changing the saved
 *  preference. On leaving (roomLang null) the device preference is restored. */
export function useRoomLanguage(roomLang: Language | null) {
  useEffect(() => {
    const target = roomLang ?? devicePref();
    if (lang !== target) {
      lang = target;
      emit();
    }
  }, [roomLang]);
}

export function getLanguage(): Language {
  return lang;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Hook: returns t(key, vars) and re-renders on language change. */
export function useT() {
  const current = useSyncExternalStore(subscribe, () => lang);
  return {
    lang: current,
    t: (key: StringKey, vars?: Record<string, string | number>) => {
      let s: string = STRINGS[key][current];
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
      return s;
    },
  };
}
