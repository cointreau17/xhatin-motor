/**
 * El contrato por el que entra una conversación en el cómic, un puerto en
 * memoria para probar sin Stream y el controlador que la convierte en tira.
 * Quien tiene el cliente de chat (el shell en la web, la app en el móvil)
 * implementa `PuertoChat`; el motor solo lo lee.
 */

export type { AdjuntoChat, MensajeChat, ParticipanteChat, PresenciaChat, PuertoChat } from './puerto-chat.js';
export { PuertoChatFalso } from './puerto-falso.js';
export { ControladorComic, HISTORIAL_POR_DEFECTO } from './controlador.js';
export type { EstadoComic, Novedades, OpcionesControlador, VinetaClasica } from './controlador.js';
