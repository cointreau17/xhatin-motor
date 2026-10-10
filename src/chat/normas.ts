/**
 * Las normas del chat de Xhatín.
 *
 * Apple (norma 1.2) pide que, en una app con contenido de usuarios, se acepten
 * unas normas que dejen claro que no se tolera el contenido ofensivo ni el
 * acoso, y que se diga cómo denunciar. Se aceptan una vez (dhcore lo guarda en
 * el perfil de Xhatín: `PUT /xhatin/perfil { normas: true }`) y valen para la
 * web y la app, que enseñan este mismo texto.
 */
export const NORMAS_XHATIN = {
  titulo: 'Normas de Xhatín',
  entrada: 'Xhatín es para hablar con la gente de tus grupos. Para que siga siendo un buen sitio:',
  puntos: [
    'Nada de insultos, acoso, amenazas ni mensajes de odio.',
    'Nada de contenido sexual, violento o ilegal, ni spam.',
    'Respeta la intimidad: no compartas datos ni fotos de nadie sin su permiso.',
  ],
  tolerancia:
    'Tolerancia cero: quien no las cumpla puede perder su cuenta.',
  denunciar:
    'Si ves algo que no debería estar, mantén pulsada la viñeta para denunciar el mensaje o bloquear a quien lo escribió. Moderación revisa cada denuncia en menos de 24 horas.',
  aceptar: 'Acepto las normas',
} as const;
