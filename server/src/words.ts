// server/src/words.ts
// Bilingual word corpus. Each entry has the citizens' word and the impostor's
// optional CLUE (a neighboring concept), in both languages. The room's
// language — chosen by the host on the first screen — picks which side is dealt.

import type { Language } from './types.js';

interface L10n {
  en: string;
  es: string;
}

export interface WordEntry {
  word: L10n;
  clue: L10n;
  category: string; // category id
  difficulty: 1 | 2 | 3;
}

export interface Category {
  id: string;
  label: L10n;
}

export const CATEGORIES: Category[] = [
  { id: 'animals', label: { en: 'Animals', es: 'Animales' } },
  { id: 'food', label: { en: 'Food', es: 'Comida' } },
  { id: 'tech', label: { en: 'Technology', es: 'Tecnología' } },
  { id: 'countries', label: { en: 'Countries', es: 'Países' } },
  { id: 'cities', label: { en: 'Cities', es: 'Ciudades' } },
  { id: 'sports', label: { en: 'Sports', es: 'Deportes' } },
  { id: 'music', label: { en: 'Music', es: 'Música' } },
  { id: 'science', label: { en: 'Science', es: 'Ciencia' } },
  { id: 'nature', label: { en: 'Nature', es: 'Naturaleza' } },
  { id: 'vehicles', label: { en: 'Vehicles', es: 'Vehículos' } },
  { id: 'jobs', label: { en: 'Jobs', es: 'Profesiones' } },
  { id: 'gaming', label: { en: 'Gaming', es: 'Videojuegos' } },
  { id: 'random', label: { en: 'Random', es: 'Variado' } },
];

export const ALL_LABEL: L10n = { en: 'All categories', es: 'Todas las categorías' };
export const CUSTOM_LABEL: L10n = { en: 'Custom list', es: 'Lista personalizada' };

export function categoryLabel(id: string, lang: Language): string {
  if (id === 'all') return ALL_LABEL[lang];
  if (id === 'custom') return CUSTOM_LABEL[lang];
  return CATEGORIES.find((c) => c.id === id)?.label[lang] ?? id;
}

export const WORDS: WordEntry[] = [
  // Animals
  { word: { en: 'Dog', es: 'Perro' }, clue: { en: 'Cat', es: 'Gato' }, category: 'animals', difficulty: 1 },
  { word: { en: 'Lion', es: 'León' }, clue: { en: 'Tiger', es: 'Tigre' }, category: 'animals', difficulty: 1 },
  { word: { en: 'Dolphin', es: 'Delfín' }, clue: { en: 'Shark', es: 'Tiburón' }, category: 'animals', difficulty: 2 },
  { word: { en: 'Crocodile', es: 'Cocodrilo' }, clue: { en: 'Lizard', es: 'Lagarto' }, category: 'animals', difficulty: 3 },
  { word: { en: 'Bee', es: 'Abeja' }, clue: { en: 'Wasp', es: 'Avispa' }, category: 'animals', difficulty: 2 },
  { word: { en: 'Owl', es: 'Búho' }, clue: { en: 'Eagle', es: 'Águila' }, category: 'animals', difficulty: 2 },
  { word: { en: 'Penguin', es: 'Pingüino' }, clue: { en: 'Duck', es: 'Pato' }, category: 'animals', difficulty: 1 },

  // Food
  { word: { en: 'Pizza', es: 'Pizza' }, clue: { en: 'Burger', es: 'Hamburguesa' }, category: 'food', difficulty: 1 },
  { word: { en: 'Cappuccino', es: 'Capuchino' }, clue: { en: 'Latte', es: 'Café con leche' }, category: 'food', difficulty: 2 },
  { word: { en: 'Pancake', es: 'Panqueque' }, clue: { en: 'Waffle', es: 'Gofre' }, category: 'food', difficulty: 2 },
  { word: { en: 'Sushi', es: 'Sushi' }, clue: { en: 'Ramen', es: 'Ramen' }, category: 'food', difficulty: 1 },
  { word: { en: 'Ketchup', es: 'Kétchup' }, clue: { en: 'Mustard', es: 'Mostaza' }, category: 'food', difficulty: 2 },
  { word: { en: 'Cupcake', es: 'Magdalena' }, clue: { en: 'Muffin', es: 'Muffin' }, category: 'food', difficulty: 3 },
  { word: { en: 'Taco', es: 'Taco' }, clue: { en: 'Burrito', es: 'Burrito' }, category: 'food', difficulty: 1 },

  // Technology
  { word: { en: 'Phone', es: 'Celular' }, clue: { en: 'Tablet', es: 'Tableta' }, category: 'tech', difficulty: 1 },
  { word: { en: 'Keyboard', es: 'Teclado' }, clue: { en: 'Mouse', es: 'Ratón' }, category: 'tech', difficulty: 1 },
  { word: { en: 'Wi-Fi', es: 'Wifi' }, clue: { en: 'Bluetooth', es: 'Bluetooth' }, category: 'tech', difficulty: 2 },
  { word: { en: 'Robot', es: 'Robot' }, clue: { en: 'Drone', es: 'Dron' }, category: 'tech', difficulty: 2 },
  { word: { en: 'Password', es: 'Contraseña' }, clue: { en: 'Username', es: 'Usuario' }, category: 'tech', difficulty: 2 },

  // Countries
  { word: { en: 'Brazil', es: 'Brasil' }, clue: { en: 'Argentina', es: 'Argentina' }, category: 'countries', difficulty: 1 },
  { word: { en: 'Japan', es: 'Japón' }, clue: { en: 'China', es: 'China' }, category: 'countries', difficulty: 1 },
  { word: { en: 'Egypt', es: 'Egipto' }, clue: { en: 'Morocco', es: 'Marruecos' }, category: 'countries', difficulty: 2 },
  { word: { en: 'Norway', es: 'Noruega' }, clue: { en: 'Sweden', es: 'Suecia' }, category: 'countries', difficulty: 2 },
  { word: { en: 'Mexico', es: 'México' }, clue: { en: 'Spain', es: 'España' }, category: 'countries', difficulty: 1 },

  // Cities
  { word: { en: 'Paris', es: 'París' }, clue: { en: 'London', es: 'Londres' }, category: 'cities', difficulty: 1 },
  { word: { en: 'New York', es: 'Nueva York' }, clue: { en: 'Los Angeles', es: 'Los Ángeles' }, category: 'cities', difficulty: 1 },
  { word: { en: 'Venice', es: 'Venecia' }, clue: { en: 'Amsterdam', es: 'Ámsterdam' }, category: 'cities', difficulty: 2 },
  { word: { en: 'Tokyo', es: 'Tokio' }, clue: { en: 'Seoul', es: 'Seúl' }, category: 'cities', difficulty: 2 },

  // Sports
  { word: { en: 'Football', es: 'Fútbol' }, clue: { en: 'Rugby', es: 'Rugby' }, category: 'sports', difficulty: 1 },
  { word: { en: 'Tennis', es: 'Tenis' }, clue: { en: 'Badminton', es: 'Bádminton' }, category: 'sports', difficulty: 2 },
  { word: { en: 'Boxing', es: 'Boxeo' }, clue: { en: 'Wrestling', es: 'Lucha libre' }, category: 'sports', difficulty: 2 },
  { word: { en: 'Skiing', es: 'Esquí' }, clue: { en: 'Snowboarding', es: 'Snowboard' }, category: 'sports', difficulty: 2 },
  { word: { en: 'Marathon', es: 'Maratón' }, clue: { en: 'Sprint', es: 'Carrera corta' }, category: 'sports', difficulty: 2 },

  // Music
  { word: { en: 'Guitar', es: 'Guitarra' }, clue: { en: 'Bass', es: 'Bajo' }, category: 'music', difficulty: 2 },
  { word: { en: 'Piano', es: 'Piano' }, clue: { en: 'Organ', es: 'Órgano' }, category: 'music', difficulty: 3 },
  { word: { en: 'Choir', es: 'Coro' }, clue: { en: 'Band', es: 'Banda' }, category: 'music', difficulty: 3 },
  { word: { en: 'Drums', es: 'Batería' }, clue: { en: 'Bongos', es: 'Bongós' }, category: 'music', difficulty: 2 },

  // Science
  { word: { en: 'Sun', es: 'Sol' }, clue: { en: 'Star', es: 'Estrella' }, category: 'science', difficulty: 2 },
  { word: { en: 'Virus', es: 'Virus' }, clue: { en: 'Bacteria', es: 'Bacteria' }, category: 'science', difficulty: 3 },
  { word: { en: 'Volcano', es: 'Volcán' }, clue: { en: 'Earthquake', es: 'Terremoto' }, category: 'science', difficulty: 1 },
  { word: { en: 'Magnet', es: 'Imán' }, clue: { en: 'Battery', es: 'Pila' }, category: 'science', difficulty: 2 },

  // Nature
  { word: { en: 'River', es: 'Río' }, clue: { en: 'Lake', es: 'Lago' }, category: 'nature', difficulty: 2 },
  { word: { en: 'Beach', es: 'Playa' }, clue: { en: 'Desert', es: 'Desierto' }, category: 'nature', difficulty: 1 },
  { word: { en: 'Rainbow', es: 'Arcoíris' }, clue: { en: 'Sunset', es: 'Atardecer' }, category: 'nature', difficulty: 1 },
  { word: { en: 'Hurricane', es: 'Huracán' }, clue: { en: 'Tornado', es: 'Tornado' }, category: 'nature', difficulty: 3 },

  // Vehicles
  { word: { en: 'Car', es: 'Coche' }, clue: { en: 'Truck', es: 'Camión' }, category: 'vehicles', difficulty: 1 },
  { word: { en: 'Yacht', es: 'Yate' }, clue: { en: 'Sailboat', es: 'Velero' }, category: 'vehicles', difficulty: 3 },
  { word: { en: 'Helicopter', es: 'Helicóptero' }, clue: { en: 'Airplane', es: 'Avión' }, category: 'vehicles', difficulty: 1 },
  { word: { en: 'Skateboard', es: 'Patineta' }, clue: { en: 'Scooter', es: 'Patinete' }, category: 'vehicles', difficulty: 2 },

  // Jobs
  { word: { en: 'Doctor', es: 'Médico' }, clue: { en: 'Nurse', es: 'Enfermero' }, category: 'jobs', difficulty: 1 },
  { word: { en: 'Chef', es: 'Chef' }, clue: { en: 'Baker', es: 'Panadero' }, category: 'jobs', difficulty: 2 },
  { word: { en: 'Pilot', es: 'Piloto' }, clue: { en: 'Astronaut', es: 'Astronauta' }, category: 'jobs', difficulty: 1 },
  { word: { en: 'Lawyer', es: 'Abogado' }, clue: { en: 'Judge', es: 'Juez' }, category: 'jobs', difficulty: 3 },
  { word: { en: 'Firefighter', es: 'Bombero' }, clue: { en: 'Police officer', es: 'Policía' }, category: 'jobs', difficulty: 1 },

  // Gaming
  { word: { en: 'Console', es: 'Consola' }, clue: { en: 'Arcade', es: 'Arcade' }, category: 'gaming', difficulty: 1 },
  { word: { en: 'Chess', es: 'Ajedrez' }, clue: { en: 'Checkers', es: 'Damas' }, category: 'gaming', difficulty: 2 },
  { word: { en: 'Final boss', es: 'Jefe final' }, clue: { en: 'Last level', es: 'Último nivel' }, category: 'gaming', difficulty: 2 },

  // Random
  { word: { en: 'Pillow', es: 'Almohada' }, clue: { en: 'Cushion', es: 'Cojín' }, category: 'random', difficulty: 3 },
  { word: { en: 'Mirror', es: 'Espejo' }, clue: { en: 'Window', es: 'Ventana' }, category: 'random', difficulty: 2 },
  { word: { en: 'Umbrella', es: 'Paraguas' }, clue: { en: 'Raincoat', es: 'Impermeable' }, category: 'random', difficulty: 2 },
  { word: { en: 'Birthday', es: 'Cumpleaños' }, clue: { en: 'Wedding', es: 'Boda' }, category: 'random', difficulty: 1 },
];

/** Pick an entry from a category ('all' = whole corpus) the room hasn't seen. */
export function pickEntry(
  usedIndexes: Set<number>,
  category: string,
): { entry: WordEntry; index: number } | null {
  const pool = WORDS.map((w, i) => ({ w, i })).filter(
    ({ w, i }) => (category === 'all' || w.category === category) && !usedIndexes.has(i),
  );
  if (pool.length === 0) {
    // Exhausted this category — recycle it.
    for (const { i } of WORDS.map((w, i) => ({ w, i })).filter(
      ({ w }) => category === 'all' || w.category === category,
    ))
      usedIndexes.delete(i);
    return pickEntryFresh(usedIndexes, category);
  }
  const picked = pool[Math.floor(Math.random() * pool.length)];
  usedIndexes.add(picked.i);
  return { entry: picked.w, index: picked.i };
}

function pickEntryFresh(usedIndexes: Set<number>, category: string) {
  const pool = WORDS.map((w, i) => ({ w, i })).filter(
    ({ w }) => category === 'all' || w.category === category,
  );
  if (pool.length === 0) return null;
  const picked = pool[Math.floor(Math.random() * pool.length)];
  usedIndexes.add(picked.i);
  return { entry: picked.w, index: picked.i };
}
