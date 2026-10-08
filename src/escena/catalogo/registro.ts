/**
 * Un registro de assets con id.
 *
 * Todo el catálogo (poses, expresiones, escenarios, props, efectos) son
 * instancias de esto. Añadir un asset es `registrar()`; el motor nunca tiene
 * una lista cerrada, así que una pose nueva no obliga a tocar ni el director
 * ni el compositor.
 *
 * Un id repetido SUSTITUYE al anterior. Es a propósito: un paquete cargado
 * de remoto puede redibujar un escenario existente sin que haya que borrar
 * el original.
 */
export class Registro<T extends { id: string }> {
  private readonly items = new Map<string, T>();

  constructor(
    readonly nombre: string,
    iniciales: readonly T[] = [],
    /** Id que se devuelve cuando piden algo que no existe. */
    private readonly respaldo?: string,
  ) {
    for (const i of iniciales) this.registrar(i);
  }

  registrar(item: T): this {
    this.items.set(item.id, item);
    return this;
  }

  registrarVarios(items: readonly T[]): this {
    for (const i of items) this.registrar(i);
    return this;
  }

  existe(id: string | undefined | null): boolean {
    return !!id && this.items.has(id);
  }

  /** El asset, o el de respaldo si no existe. Nunca `undefined` si hay respaldo. */
  obtener(id: string | undefined | null): T {
    const item = (id && this.items.get(id)) || (this.respaldo && this.items.get(this.respaldo));
    if (!item) throw new Error(`[Escena] ${this.nombre}: no existe "${id}" ni respaldo`);
    return item;
  }

  /** El asset si existe; `undefined` si no, sin caer al respaldo. */
  buscar(id: string | undefined | null): T | undefined {
    return id ? this.items.get(id) : undefined;
  }

  listar(): T[] {
    return [...this.items.values()];
  }

  ids(): string[] {
    return [...this.items.keys()];
  }

  get tamano(): number {
    return this.items.size;
  }
}
