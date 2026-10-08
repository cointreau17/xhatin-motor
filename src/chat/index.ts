/**
 * El contrato por el que entra una conversación en el cómic, y un puerto en
 * memoria para probar sin Stream. Quien tiene el cliente de chat (el shell en
 * la web, la app en el móvil) implementa `PuertoChat`; el motor solo lo lee.
 */

export type { AdjuntoChat, MensajeChat, ParticipanteChat, PresenciaChat, PuertoChat } from './puerto-chat.js';
export { PuertoChatFalso } from './puerto-falso.js';
