const frs = new Set<FinalizationRegistry<undefined>>();

export function registerCollectionCallback(
  value: WeakKey,
  cb: () => void
): void {
  const fr = new FinalizationRegistry<undefined>(() => {
    frs.delete(fr);
    cb();
  });
  frs.add(fr);

  fr.register(value, undefined);
}

export function onGarbageCollection(
  cb: () => void,
  repeat: boolean = true
): void {
  const symbol = Symbol();

  registerCollectionCallback(symbol, () => {
    cb();
    if (repeat) onGarbageCollection(cb);
  });
}

export class IterableWeakSet<T extends WeakKey> {
  private readonly refSet = new Set<WeakRef<T>>();
  private readonly refMap = new WeakMap<T, WeakRef<T>>();

  protected createRef(value: T): WeakRef<T> {
    const ref = new WeakRef(value);
    this.refMap.set(value, ref);
    return ref;
  }

  public add(value: T): void {
    const ref = this.createRef(value);
    this.refSet.add(ref);

    registerCollectionCallback(value, () => {
      this.refSet.delete(ref);
    });
  }

  public clear(): void {
    this.refSet.clear();
  }

  public delete(value: T): boolean {
    const ref = this.refMap.get(value);
    if (ref === undefined) return false;

    this.refSet.delete(ref);
    return true;
  }

  public forEach(callback: (value: T, set: this) => void): void {
    this.refSet.forEach((ref) => {
      const deref = ref.deref();
      if (deref === undefined) return;
      callback(deref, this);
    });
  }

  public has(value: T): boolean {
    const ref = this.refMap.get(value);
    if (ref === undefined) return false;

    return this.refSet.has(ref);
  }

  public get size(): number {
    return this.refSet.size;
  }
}
