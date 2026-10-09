/**
 * El contrato por el que entra una conversación en el cómic, un puerto en
 * memoria para probar sin Stream y el controlador que la convierte en tira.
 * Quien tiene el cliente de chat (el shell en la web, la app en el móvil)
 * implementa `PuertoChat`; el motor solo lo lee. Si el chat es Stream,
 * `puertoStream` hace la traducción sobre el canal que le den.
 */

export type { AdjuntoChat, MensajeChat, ParticipanteChat, PresenciaChat, PuertoChat } from './puerto-chat.js';
export { PuertoChatFalso } from './puerto-falso.js';
export { ControladorComic, HISTORIAL_POR_DEFECTO } from './controlador.js';
export type { EstadoComic, Novedades, OpcionesControlador, VinetaClasica } from './controlador.js';
export { mensajeDeStream, puertoStream } from './stream.js';
export { CARAS_EN_CABECERA, conQuien, interlocutores } from './gente.js';
export type { Interlocutor } from './gente.js';
export { EVENTOS_DE_LA_LISTA, grupoDeCanal, nombreDeGente, resumenDe } from './conversaciones.js';
export type { CanalResumible, ResumenConversacion } from './conversaciones.js';
export { conversacionesDe, deEsteEntorno, filtrarPorEntorno, porComprobar } from './entorno.js';
export type { ConversacionesQueSeVen, Existen } from './entorno.js';
export type { CanalStream, EventoStream, MensajeStream, MiembroStream, UsuarioStream } from './stream.js';
