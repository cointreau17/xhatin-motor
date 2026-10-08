import { defineConfig } from 'vitest/config';

// `globals` porque los tests vienen del remote de Angular, cuyo runner los
// expone sin importarlos. El motor no toca el navegador en lo que se prueba
// (el `fetch` del refinador se inyecta), así que basta con Node.
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
