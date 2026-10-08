/**
 * Léxico en castellano (de la calle, no de diccionario) para leer mensajes.
 *
 * Son listas, no lógica: las reglas (reglas-base.ts) deciden qué hacer con
 * cada categoría. Añadir una expresión nueva es añadir una palabra aquí.
 *
 * Todo va NORMALIZADO: minúsculas y sin tildes ("qué" → "que", "ñ" → "n").
 * El texto del mensaje se normaliza igual antes de buscar, así que "QUÉ
 * FUERTE" y "que fuerte" casan con la misma entrada.
 */

export type CategoriaLexico =
  // emociones
  | 'risa'
  | 'sorpresa'
  | 'enfado'
  | 'tristeza'
  | 'miedo'
  | 'verguenza'
  | 'cansancio'
  | 'aburrimiento'
  | 'sueno'
  | 'amor'
  | 'duda'
  | 'confusion'
  | 'sospecha'
  | 'entusiasmo'
  | 'alegria'
  | 'sarcasmo'
  | 'preocupacion'
  | 'idea'
  // intenciones
  | 'saludo'
  | 'despedida'
  | 'acuerdo'
  | 'desacuerdo'
  | 'llamada'
  | 'agradecimiento'
  | 'disculpa'
  | 'felicitacion'
  | 'insulto'
  | 'mostrar'
  | 'secreto'
  // gestos y acciones
  | 'encogerse'
  | 'turno'
  | 'senalar'
  | 'escribir'
  | 'movil'
  | 'ordenador'
  | 'prisa'
  | 'celebrar'
  | 'bailar'
  | 'sentarse'
  | 'intensificador';

export const LEXICO: Record<CategoriaLexico, string[]> = {
  risa: ['me meo', 'me parto', 'me descojono', 'me troncho', 'que risa', 'me muero de risa', 'me rio', 'lol', 'lmao', 'xd', 'xdd', 'xddd', 'buenisimo', 'que bueno', 'jajaja', 'jaja', 'jeje', 'jiji', 'jojo', 'ajaja'],
  sorpresa: ['no me lo creo', 'no me lo puedo creer', 'en serio', 'enserio', 'de verdad', 'no me digas', 'venga ya', 'que me estas contando', 'que dices', 'anda', 'ostras', 'hostia', 'hostias', 'madre mia', 'flipo', 'flipas', 'flipa', 'alucino', 'no jodas', 'wow', 'guau', 'vaya', 'que fuerte', 'increible', 'no puede ser', 'como que', 'sorpresa', 'impresionante', 'que me dices', 'toma ya', 'ala', 'hala'],
  enfado: ['estoy harto', 'estoy harta', 'harto', 'harta', 'me cabrea', 'que rabia', 'cabreado', 'cabreada', 'enfadado', 'enfadada', 'basta', 'ya esta bien', 'joder', 'me cago', 'narices', 'mierda', 'odio', 'me tienes hasta', 'estoy hasta', 'que coraje', 'me enciende', 'no aguanto', 'indignante', 'vergonzoso', 'intolerable', 'me revienta', 'que asco', 'asco', 'asqueroso', 'asquerosa'],
  tristeza: ['triste', 'que pena', 'snif', 'me duele', 'echo de menos', 'te echo de menos', 'llorar', 'llorando', 'lloro', 'deprimido', 'deprimida', 'bajon', 'mal dia', 'que mal', 'fatal', 'destrozado', 'destrozada', 'hundido', 'hundida', 'una pena', 'lastima', 'se ha muerto', 'ha muerto', 'fallecido', 'me han despedido', 'me han echado', 'he suspendido', 'me ha dejado', 'lo hemos dejado', 'que bajon', 'estoy fatal'],
  miedo: ['miedo', 'que miedo', 'susto', 'me asusta', 'socorro', 'auxilio', 'terror', 'panico', 'me acojona', 'acojonado', 'escalofrios', 'da mal rollo', 'que mal rollo', 'fantasma', 'creepy', 'grima'],
  verguenza: ['que verguenza', 'verguenza', 'tierra tragame', 'tragame tierra', 'ups', 'uy', 'oops', 'que corte', 'me da corte', 'me muero de verguenza', 'que apuro', 'me sonrojo', 'que oso', 'la he liado', 'la lie', 'metedura de pata'],
  cansancio: ['cansado', 'cansada', 'agotado', 'agotada', 'reventado', 'reventada', 'sin dormir', 'no he dormido', 'que sueno', 'no puedo mas', 'estoy frito', 'estoy frita', 'muerto de sueno', 'molido', 'molida', 'hecho polvo', 'hecha polvo', 'uff que dia', 'que dia llevo', 'tengo sueno', 'estoy malo', 'estoy mala', 'estoy enfermo', 'estoy enferma', 'con fiebre', 'resfriado', 'resfriada'],
  aburrimiento: ['aburrido', 'aburrida', 'que aburrimiento', 'me aburro', 'que rollo', 'meh', 'bah', 'que tostón', 'que toston', 'soporifero', 'que pereza', 'pereza'],
  sueno: ['zzz', 'zzzz', 'me duermo', 'a dormir', 'me voy a dormir', 'me voy a la cama', 'me acuesto', 'buenas noches', 'dormido', 'dormida', 'siesta'],
  amor: ['te quiero', 'te amo', 'amor', 'carino', 'guapa', 'guapo', 'preciosa', 'precioso', 'me encantas', 'enamorado', 'enamorada', 'besos', 'besitos', 'muac', 'mua', 'mi vida', 'corazon', 'te adoro', 'cuqui', 'mi amor'],
  duda: ['no se', 'quiza', 'quizas', 'tal vez', 'a lo mejor', 'hmm', 'mmm', 'estoy pensando', 'creo que', 'depende', 'no estoy seguro', 'no estoy segura', 'dejame pensar', 'a ver', 'pensandolo bien', 'puede ser'],
  confusion: ['no entiendo', 'no lo entiendo', 'no pillo', 'no me entero', 'eh', 'perdona que', 'wtf', 'que lio', 'no se de que hablas', 'como dices', 'me he perdido', 'me perdi', 'que es eso'],
  sospecha: ['sospechoso', 'sospechosa', 'ya ya', 'no me fio', 'que raro', 'a otro con ese cuento', 'seguro que si', 'mentira', 'me huele', 'aqui hay gato encerrado', 'sospecho', 'tu que tramas', 'que tramas'],
  entusiasmo: ['que ganas', 'por fin', 'brutal', 'flipante', 'que guay', 'me encanta', 'epico', 'yuju', 'yupi', 'ole', 'vamoos', 'tremendo', 'espectacular', 'increible', 'la bomba', 'lo mejor', 'que pasada', 'pasada', 'crack', 'maquina', 'fiera', 'top'],
  alegria: ['bien', 'genial', 'guay', 'que bien', 'me alegro', 'perfecto', 'estupendo', 'fenomenal', 'mola', 'bonito', 'bonita', 'chulo', 'chula', 'feliz', 'contento', 'contenta', 'que alegria', 'buenas noticias', 'fantastico', 'maravilloso', 'maravilla'],
  sarcasmo: ['si claro', 'ya claro', 'claro claro', 'como no', 'vaya novedad', 'que sorpresa', 'faltaria mas', 'lo que tu digas', 'lo que usted diga', 'obvio', 'evidentemente', 'ya te digo', 'sin duda', 'seguro', 'enhorabuena campeon', 'que listo', 'que lista', 'bravo genio'],
  preocupacion: ['preocupado', 'preocupada', 'me preocupa', 'ojala', 'espero que', 'que nervios', 'nervioso', 'nerviosa', 'agobio', 'agobiado', 'agobiada', 'estres', 'estresado', 'estresada', 'uf', 'uff', 'ufff', 'ay', 'madre mia', 'miedito', 'crucemos los dedos', 'toca madera'],
  idea: ['ya se', 'tengo una idea', 'se me ocurre', 'eureka', 'lo tengo', 'tengo un plan', 'que buena idea'],
  saludo: ['hola', 'holi', 'holaa', 'buenas', 'buenos dias', 'buenas tardes', 'hey', 'ey', 'que tal', 'que pasa', 'saludos', 'hello', 'hi', 'aupa', 'epa', 'wenas', 'muy buenas', 'hola a todos', 'hola a todas', 'como estas', 'como estais', 'como vas', 'que cuentas', 'que hay', 'how are you', 'whats up'],
  despedida: ['adios', 'hasta luego', 'hasta manana', 'hasta ahora', 'hasta otra', 'chao', 'chau', 'bye', 'nos vemos', 'me voy', 'me piro', 'me las piro', 'me marcho', 'buenas noches', 'un beso', 'cuidate', 'luego hablamos', 'hablamos', 'agur', 'me tengo que ir', 'os dejo', 'te dejo'],
  acuerdo: ['si', 'sii', 'vale', 'ok', 'okey', 'okay', 'claro', 'de acuerdo', 'perfecto', 'hecho', 'venga', 'dale', 'sip', 'sisi', 'por supuesto', 'exacto', 'eso es', 'correcto', 'tienes razon', 'totalmente', 'efectivamente', 'cierto', 'trato hecho', 'oki', 'okis'],
  desacuerdo: ['no', 'nop', 'que va', 'ni de cona', 'ni hablar', 'para nada', 'de eso nada', 'falso', 'no estoy de acuerdo', 'te equivocas', 'no tienes razon', 'me niego', 'ni loco', 'ni loca', 'en absoluto', 'pues no', 'jamas', 'nunca', 'discrepo', 'eso no es asi'],
  llamada: ['ven', 'venid', 'vente', 'mira', 'mirad', 'fijate', 'escucha', 'escuchad', 'oye', 'oiga', 'atento', 'atenta', 'cuidado', 'ojo', 'espera', 'esperad', 'para', 'quieto', 'eh tu', 'oye tu'],
  agradecimiento: ['gracias', 'mil gracias', 'muchas gracias', 'te lo agradezco', 'thanks', 'merci', 'grax', 'thx', 'eres un sol', 'que detalle'],
  disculpa: ['perdon', 'perdona', 'lo siento', 'disculpa', 'disculpad', 'sorry', 'mea culpa', 'fue sin querer', 'culpa mia'],
  felicitacion: ['felicidades', 'enhorabuena', 'feliz cumpleanos', 'feliz cumple', 'felicitaciones', 'bravo', 'bien hecho', 'te lo mereces', 'chapeau', 'olee'],
  insulto: ['idiota', 'imbecil', 'gilipollas', 'capullo', 'tonto', 'tonta', 'payaso', 'payasa', 'inutil', 'cretino', 'cretina', 'pesado', 'pesada', 'callate', 'cierra el pico', 'vete a la mierda', 'vete a paseo', 'cansino', 'cansina', 'bocazas', 'memo'],
  mostrar: ['mira esto', 'mirad esto', 'te enseno', 'os enseno', 'fijate en esto', 'echa un ojo', 'mira lo que', 'mirad lo que', 'os paso', 'te paso', 'aqui lo tienes', 'aqui tienes'],
  secreto: ['psst', 'pss', 'en secreto', 'entre tu y yo', 'que no se entere', 'no se lo digas', 'bajito', 'en voz baja', 'shh', 'shhh', 'chitón', 'chiton'],
  encogerse: ['ni idea', 'yo que se', 'que mas da', 'no tengo ni idea', 'ni flowers', 'ni pajolera idea', 'a saber', 'vete tu a saber', 'ni puta idea', 'me da igual', 'me la pela', 'lo que sea'],
  turno: ['yo', 'yo tambien', 'me apunto', 'yo me apunto', 'pido', 'yo quiero', 'presente', 'aqui', 'cuenta conmigo', 'contad conmigo', 'yo voy', 'a mi tambien', 'y yo'],
  senalar: ['tu', 'mira', 'ese', 'esa', 'eso', 'ahi', 'alli', 'aquel', 'aquella', 'oye tu', 'eh tu', 'tu mismo', 'tu misma', 'por alli', 'por ahi'],
  escribir: ['apunto', 'lo apunto', 'tomo nota', 'apuntado', 'escribiendo', 'escribo', 'lo anoto', 'anotado', 'redactando'],
  movil: ['te escribo', 'te llamo', 'whatsapp', 'wasap', 'guasap', 'mensaje', 'movil', 'llamada', 'te mando', 'instagram', 'tiktok', 'twitter', 'selfie', 'story', 'stories', 'notificacion'],
  ordenador: ['programando', 'codigo', 'ordenador', 'portatil', 'compilar', 'compilando', 'bug', 'deploy', 'servidor', 'linux', 'terminal', 'commit', 'teclado', 'excel', 'correo', 'email', 'trabajando en', 'actualizando'],
  prisa: ['corre', 'corred', 'corriendo', 'rapido', 'prisa', 'llego tarde', 'que llego tarde', 'vamos tarde', 'deprisa', 'a toda leche', 'volando', 'ya voy', 'voy corriendo', 'urgente'],
  celebrar: ['ganamos', 'hemos ganado', 'gol', 'golazo', 'aprobado', 'aprobe', 'he aprobado', 'lo consegui', 'lo hemos conseguido', 'si si si', 'toma', 'toma ya', 'campeones', 'viva', 'hurra', 'brindis', 'salud'],
  bailar: ['bailar', 'baile', 'bailando', 'a bailar', 'bailamos', 'discoteca', 'perreo', 'fiesta'],
  sentarse: ['sentado', 'sentada', 'sientate', 'sentaos', 'en el sofa', 'descansando', 'tirado en el sofa', 'relajado', 'relajada'],
  intensificador: ['muy', 'super', 'mogollon', 'muchisimo', 'tope', 'cantidad', 'demasiado', 'fatal', 'que', 'tan', 'la leche', 'un monton', 'total', 'absolutamente', 'mazo', 'ultra', 'mega', 'hiper'],
};

/**
 * Emojis y su lectura. Una entrada por emoji; las categorías coinciden con
 * las del léxico para que las reglas no distingan de dónde vino la señal.
 */
export const EMOJIS: Record<string, CategoriaLexico[]> = {
  '😂': ['risa'], '🤣': ['risa'], '😆': ['risa'], '😹': ['risa'],
  '😀': ['alegria'], '😃': ['alegria'], '😄': ['alegria'], '😁': ['alegria'], '🙂': ['alegria'], '😊': ['alegria'], '☺️': ['alegria'], '😌': ['alegria'],
  '😮': ['sorpresa'], '😲': ['sorpresa'], '😯': ['sorpresa'], '🤯': ['sorpresa'], '😳': ['verguenza'], '😱': ['miedo', 'sorpresa'],
  '😢': ['tristeza'], '😭': ['tristeza'], '😞': ['tristeza'], '😔': ['tristeza'], '☹️': ['tristeza'], '🙁': ['tristeza'], '💔': ['tristeza'], '🥺': ['tristeza'],
  '😠': ['enfado'], '😡': ['enfado'], '🤬': ['enfado', 'insulto'], '😤': ['enfado'], '💢': ['enfado'],
  '😨': ['miedo'], '😰': ['miedo', 'preocupacion'], '😬': ['preocupacion'], '😟': ['preocupacion'], '😥': ['preocupacion'], '😓': ['preocupacion'],
  '😴': ['sueno'], '💤': ['sueno'], '🥱': ['aburrimiento', 'cansancio'], '😪': ['cansancio'], '😩': ['cansancio'], '😫': ['cansancio'],
  '🤔': ['duda'], '🧐': ['sospecha'], '🤨': ['sospecha'], '😒': ['aburrimiento'], '😑': ['aburrimiento'], '😐': ['aburrimiento'],
  '🤩': ['entusiasmo'], '🥳': ['celebrar', 'entusiasmo'], '🎉': ['celebrar'], '🎊': ['celebrar'], '🍾': ['celebrar'], '🥂': ['celebrar'], '🎂': ['felicitacion'], '🎁': ['felicitacion'],
  '😍': ['amor'], '🥰': ['amor'], '😘': ['amor'], '❤️': ['amor'], '❤': ['amor'], '💕': ['amor'], '💖': ['amor'], '😻': ['amor'],
  '😏': ['sarcasmo'], '🙄': ['sarcasmo'], '😎': ['sarcasmo'], '🙃': ['sarcasmo'],
  '😕': ['confusion'], '😵‍💫': ['confusion'], '😵': ['confusion'], '❓': ['confusion'], '❔': ['confusion'],
  '👋': ['saludo'], '👍': ['acuerdo'], '👌': ['acuerdo'], '👎': ['desacuerdo'], '🙏': ['agradecimiento'], '👏': ['felicitacion'],
  '🤷': ['encogerse'], '🤷‍♂️': ['encogerse'], '🤷‍♀️': ['encogerse'], '🙋': ['turno'], '🙋‍♂️': ['turno'], '🙋‍♀️': ['turno'], '✋': ['turno'],
  '👉': ['senalar'], '👈': ['senalar'], '☝️': ['idea'], '💡': ['idea'],
  '📱': ['movil'], '💻': ['ordenador'], '⌨️': ['ordenador'], '✍️': ['escribir'], '📝': ['escribir'],
  '🏃': ['prisa'], '🏃‍♂️': ['prisa'], '🏃‍♀️': ['prisa'], '💨': ['prisa'],
  '💃': ['bailar'], '🕺': ['bailar'], '🤫': ['secreto'], '🤭': ['verguenza'], '🤦': ['verguenza'], '🤦‍♂️': ['verguenza'], '🤦‍♀️': ['verguenza'],
  '💀': ['risa'], '🔥': ['entusiasmo'], '💪': ['entusiasmo'], '🙌': ['celebrar'],
};

/** Emojis que apuntan a un escenario o a un prop (ids de catálogo). */
export const EMOJIS_ESCENA: Record<string, { escenario?: string; prop?: string }> = {
  '☕': { escenario: 'cafeteria', prop: 'taza' },
  '🍺': { escenario: 'cafeteria' }, '🍻': { escenario: 'cafeteria' },
  '🍕': { prop: 'comida', escenario: 'restaurante' }, '🍔': { prop: 'comida' }, '🥘': { prop: 'comida', escenario: 'restaurante' }, '🍝': { prop: 'comida', escenario: 'restaurante' }, '🍷': { escenario: 'restaurante' },
  '🎂': { prop: 'tarta', escenario: 'celebracion' }, '🎁': { prop: 'regalo' }, '🎈': { escenario: 'celebracion', prop: 'globos' },
  '🚗': { prop: 'coche', escenario: 'calle' }, '📺': { prop: 'television', escenario: 'casa' }, '📰': { prop: 'periodico', escenario: 'noticias' },
  '📚': { prop: 'libro', escenario: 'escuela' }, '📖': { prop: 'libro' }, '🎤': { prop: 'microfono' }, '📷': { prop: 'camara' }, '📸': { prop: 'camara' },
  '✈️': { escenario: 'aeropuerto', prop: 'maleta' }, '🧳': { prop: 'maleta', escenario: 'aeropuerto' },
  '🏖️': { escenario: 'playa' }, '🏖': { escenario: 'playa' }, '🌊': { escenario: 'playa' }, '☀️': { escenario: 'playa' },
  '🌲': { escenario: 'naturaleza' }, '⛰️': { escenario: 'naturaleza' }, '🏔️': { escenario: 'naturaleza' },
  '🚀': { escenario: 'espacio' }, '🪐': { escenario: 'espacio' }, '👽': { escenario: 'espacio' }, '🛸': { escenario: 'espacio' },
  '🌙': { escenario: 'noche' }, '🌃': { escenario: 'noche' }, '🏙️': { escenario: 'ciudad' },
  '🏠': { escenario: 'casa' }, '🛋️': { escenario: 'casa' }, '🛏️': { escenario: 'habitacion' },
  '💼': { escenario: 'oficina' }, '🏢': { escenario: 'oficina' }, '🏫': { escenario: 'escuela' }, '🛒': { escenario: 'tienda' }, '🌳': { escenario: 'parque' },
};

/** Onomatopeyas: si el mensaje es solo esto, se dibuja como sonido y no como globo. */
export const ONOMATOPEYAS = [
  'boom', 'bum', 'pum', 'pam', 'crash', 'zas', 'plaf', 'paf', 'splash', 'ring', 'riiing', 'toc toc', 'toc', 'bip', 'clic', 'click', 'nam', 'glup', 'grr', 'grrr', 'argh', 'aaah', 'aaaah', 'buah', 'puaj', 'achis', 'hmpf', 'brrr', 'bang', 'kaboom', 'chof', 'ding', 'dong', 'ding dong', 'miau', 'guau guau', 'cof cof', 'plof', 'fiu', 'fiuu',
];

/** Preposiciones que introducen un destino: "voy A la cafetería". */
export const VERBOS_DESPLAZAMIENTO =
  /\b(?:voy|vamos|me voy|nos vamos|vais|va|van|ire|iremos|me acerco|nos acercamos|estoy|estamos|llego|llegamos|quedamos|nos vemos|te espero|os espero|vente|venid|vamonos|salgo|salimos|entro|entramos|bajo|bajamos|subo|subimos)\s+(?:a|al|en|a la|a los|a las|para|hacia|hasta|por)\s+(?:la |el |los |las |mi |tu |su |nuestra |nuestro )?([a-z]+(?: [a-z]+)?)/;

/** Normaliza para buscar: minúsculas, sin tildes, espacios simples. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Abreviaturas de chat → lo que quieren decir. Solo palabras sueltas: "q" es
 * "que" cuando va sola, no la q de "quiero".
 */
export const ABREVIATURAS: Record<string, string> = {
  q: 'que', k: 'que', ke: 'que', qe: 'que',
  xq: 'porque', pq: 'porque', xk: 'porque', pk: 'porque', porq: 'porque',
  tb: 'tambien', tmb: 'tambien', tbn: 'tambien', tambn: 'tambien',
  xfa: 'por favor', porfa: 'por favor', pls: 'por favor', plis: 'por favor',
  bss: 'besos', tqm: 'te quiero mucho', tq: 'te quiero',
  ntp: 'no te preocupes', ns: 'no se', npi: 'ni puta idea', nse: 'no se',
  bn: 'bien', dnd: 'donde', xa: 'para', msj: 'mensaje', grax: 'gracias',
};

const RE_ABREVIATURA = new RegExp(`(?<![a-z0-9])(${Object.keys(ABREVIATURAS).join('|')})(?![a-z0-9])`, 'g');

/**
 * Deshace lo que se escribe en un chat y no en un diccionario, para buscar
 * en el léxico:
 *
 * - alargamientos: "holaaaa" → "hola", "siiii" → "si", y la letra doblada
 *   al final de palabra: "okk" → "ok", "epaa" → "epa". Las dobles de dentro
 *   ("calle", "perro", "acción") se respetan;
 * - abreviaturas: "k pasa" → "que pasa", "xq" → "porque".
 *
 * Se aplica igual al texto y a los términos del léxico, así que un término
 * que se escriba con letra doble ("sii", "holaa") sigue casando.
 */
export function compactar(norm: string): string {
  return norm
    .replace(/([a-z])\1{2,}/g, '$1')
    .replace(/([a-z])\1(?![a-z])/g, '$1')
    .replace(RE_ABREVIATURA, (m) => ABREVIATURAS[m] ?? m);
}

const escaparRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Una expresión regular por categoría, construida una vez.
 * Los límites son "no letra ni número" para que "no" no case con "nota".
 */
export const PATRONES: Record<CategoriaLexico, RegExp> = Object.fromEntries(
  (Object.entries(LEXICO) as [CategoriaLexico, string[]][]).map(([cat, terminos]) => {
    const unicos = [...new Set(terminos.map((t) => compactar(normalizar(t))))];
    const alternativas = unicos.sort((a, b) => b.length - a.length).map(escaparRe);
    return [cat, new RegExp(`(?:^|[^a-z0-9])(${alternativas.join('|')})(?=$|[^a-z0-9])`, 'g')];
  }),
) as Record<CategoriaLexico, RegExp>;
