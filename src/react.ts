import { IterableWeakSet, registerCollectionCallback } from './gc.js';
import { writeMessage } from './module/reactive-value-viz.js';
import { DEBUG_REACTIVE_VALUE_GRAPH } from './settings.js';
// import bot from './singleton/bot.js';

// to fix this nasty leak, I've tried:
// 1. caching (as of d67f61704b58e355b5fa6c357b4ab80a6a58ee42)
//   got down to:
//     Obtain_Item(cobblestone): 42994
//     Obtain_Item(diamond): 246700
// 2. freeing when there are no subscribers for the second time
//   didn't work, too strict
// 3. extensive caching (as of 745a1612ab150a1f08f31d75579a51bebe715121)
//   got down to:
//     Obtain_Item(cobblestone): 11696
//     Obtain_Item(diamond): 18682
// 4. semi-manual GC, using WeakRefs for subscribers and a global Set for active ReactiveValues
//    where ReactiveValues are marked active only when they have subscribers
//   got down to:
//     Obtain_Item(cobblestone): 11507
//     Obtain_Item(diamond): 17592
// 5. backwards ref
//   (should be equivalent to 4)
//   got down to:
//     Obtain_Item(cobblestone): 3320
//     Obtain_Item(diamond): 3481

export let reactiveValuesInMemory = 0;

export const reactiveValueSet = new IterableWeakSet<ReactiveValue<any>>();

export let i = 0;
export class ReactiveValue<T> {
  public readonly id = i++;

  constructor(protected _value: T) {
    reactiveValueSet.add(this);

    // console.log(`${this.id} create`);
    if (DEBUG_REACTIVE_VALUE_GRAPH) {
      writeMessage({
        type: 'create',
        id: this.id,
        label: JSON.stringify(_value),
      });
    }

    reactiveValuesInMemory++;

    registerCollectionCallback(this, () => {
      if (DEBUG_REACTIVE_VALUE_GRAPH) {
        writeMessage({
          type: 'destroy',
          id: this.id,
        });
      }

      reactiveValuesInMemory--;
    });
  }

  public get value() {
    return this._value;
  }

  public set value(value: T) {
    // console.log(`${this.id} value.set`);

    if (this._value === value) return;

    // console.log(`${this.id} value.change (${this.subscribers.size})`);
    if (DEBUG_REACTIVE_VALUE_GRAPH) {
      writeMessage({
        type: 'change',
        id: this.id,
        label: JSON.stringify(value),
      });
    }

    this._value = value;

    this.notifySubscribers();
  }

  protected readonly subscribers = new Set<(value: T) => void>();

  public notifySubscribers() {
    for (const subscriber of this.subscribers) {
      subscriber(this.value);
    }
  }

  public subscribe(
    subscriber: (value: T) => void,
    callImmediately: boolean = true
  ) {
    this.subscribers.add(subscriber);

    if (callImmediately) subscriber(this.value);
  }

  public unsubscribe(subscriber: (value: T) => void) {
    this.subscribers.delete(subscriber);
  }

  public derive<U>(calculate: (value: T) => U): ReactiveValue<U> {
    const derived = new ReactiveValue<U>(undefined as any);
    const weakRef = new WeakRef(derived);

    const updateDerived = (value: T) => {
      const derived = weakRef.deref();
      if (derived === undefined) {
        console.warn(
          'something is wrong: derivation update attempt on non-existent ReactiveValue'
        );
        return;
      }

      derived.value = calculate(value);
    };

    this.subscribe(updateDerived);
    registerCollectionCallback(derived, () => {
      this.unsubscribe(updateDerived);
    });
    derived.refs.add(this);
    if (DEBUG_REACTIVE_VALUE_GRAPH) {
      writeMessage({
        type: 'edge',
        from: this.id,
        to: derived.id,
      });
    }

    return derived;
  }

  public static compose<T extends unknown[]>(values: {
    [K in keyof T]: ReactiveValue<T[K]>;
  }): ReactiveValue<T> {
    const composed = new ReactiveValue<T>(
      values.map((value) => value.value) as T
    );
    const weakRef = new WeakRef(composed);

    for (let i = 0; i < values.length; i++) {
      const updateComposed = (value: unknown) => {
        const composed = weakRef.deref();
        if (composed === undefined) {
          console.warn(
            'something is wrong: composition update attempt on non-existent ReactiveValue'
          );
          return;
        }

        // if (composed.value[i] === value) return;

        composed.value[i] = value;
        composed.notifySubscribers();
      };

      values[i].subscribe(updateComposed, false);
      registerCollectionCallback(composed, () => {
        values[i].unsubscribe(updateComposed);
      });
      composed.refs.add(values[i]);
      if (DEBUG_REACTIVE_VALUE_GRAPH) {
        writeMessage({
          type: 'edge',
          from: values[i].id,
          to: composed.id,
        });
      }
    }

    return composed;
  }

  // impact is minimal enough to not have garbage collection logic
  public flat(): ReactiveValue<T extends ReactiveValue<infer U> ? U : T> {
    const flat = new ReactiveValue<T extends ReactiveValue<infer U> ? U : T>(
      undefined as any
    );
    const weakRef = new WeakRef(flat);
    const setFlat = (value: T extends ReactiveValue<infer U> ? U : T) => {
      const flat = weakRef.deref();
      if (flat === undefined) {
        console.warn(
          'something is wrong: flat set attempt on non-existent ReactiveValue'
        );
        return;
      }

      flat.value = value;
    };

    let cleanup: VoidFunction | undefined;
    this.subscribe((value) => {
      cleanup?.();
      cleanup = undefined;

      if (value instanceof ReactiveValue) {
        value.subscribe(setFlat);
        registerCollectionCallback(flat, () => {
          value.unsubscribe(setFlat);
        });
        flat.refs.add(value);
        if (DEBUG_REACTIVE_VALUE_GRAPH) {
          writeMessage({
            type: 'edge',
            from: value.id,
            to: flat.id,
          });
        }

        cleanup = () => {
          value.unsubscribe(setFlat);
          flat.refs.delete(value);
          if (DEBUG_REACTIVE_VALUE_GRAPH) {
            writeMessage({
              type: 'remove-edge',
              from: value.id,
              to: flat.id,
            });
          }
        };

        return;
      }

      // for whatever reason, I need to use infer U, can't use unknown or any
      // (TS bug? probably)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setFlat(value as T extends ReactiveValue<infer U> ? never : T);
    });

    return flat;
  }

  public readonly refs = new Set<any>();

  // values

  protected static constCache = new Map<any, ReactiveValue<any>>();
  static const<T>(primitive: T): ReactiveValue<T> {
    const cached = this.constCache.get(primitive);
    if (cached !== undefined) return cached;

    const value = new ReactiveValue(primitive);
    this.constCache.set(primitive, value);

    return value;
  }
}

export class ReactiveMap<K, V>
  extends ReactiveValue<Map<K, V>>
  implements Map<K, V>
{
  constructor(...args: ConstructorParameters<typeof Map<K, V>>) {
    super(new Map(...args));
  }

  public entries(): MapIterator<[K, V]> {
    return this.value.entries();
  }

  public keys(): MapIterator<K> {
    return this.value.keys();
  }

  public values(): MapIterator<V> {
    return this.value.values();
  }

  public [Symbol.iterator](): MapIterator<[K, V]> {
    return this.value[Symbol.iterator]();
  }

  public [Symbol.toStringTag]: string = '<Reactive>Map';

  public clear(): void {
    this.value.clear();
    this.notifySubscribers();
  }

  public delete(key: K): boolean {
    const result = this.value.delete(key);

    this.notifySubscribers();

    return result;
  }

  public forEach(
    callbackfn: (value: V, key: K, map: Map<K, V>) => void,
    thisArg?: any
  ): void {
    return this.value.forEach(callbackfn, thisArg);
  }

  public get(key: K): V | undefined {
    return this.value.get(key);
  }

  public getReactive(key: K): ReactiveValue<V | undefined> {
    return this.derive((value) => value.get(key));
  }

  public has(key: K): boolean {
    return this.value.has(key);
  }

  public hasReactive(key: K): ReactiveValue<boolean> {
    return this.derive((value) => value.has(key));
  }

  public set(key: K, value: V): this {
    this.value.set(key, value);
    this.notifySubscribers();

    return this;
  }

  public get size() {
    return this.value.size;
  }
}

export class ReactiveSet<T> extends ReactiveValue<
  Set<T>
> /* implements Set<T> */ {
  constructor(...args: ConstructorParameters<typeof Set<T>>) {
    super(new Set(...args));
  }

  public static fromReactiveValue<T>(
    value: ReactiveValue<Set<T>>
  ): ReactiveSet<T> {
    const set = new ReactiveSet<T>();
    value.subscribe((value) => {
      set.value = value;
    });

    return set;
  }

  public union<U>(other: ReactiveSet<U>): ReactiveSet<T | U> {
    const value = ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.union(b)
    );

    return ReactiveSet.fromReactiveValue(value);
  }

  public intersection<U>(other: ReactiveSet<U>): ReactiveSet<T & U> {
    const value = ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.intersection(b)
    );

    return ReactiveSet.fromReactiveValue(value);
  }

  public difference<U>(other: ReactiveSet<U>): ReactiveSet<T> {
    const value = ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.difference(b)
    );

    return ReactiveSet.fromReactiveValue(value);
  }

  public symmetricDifference<U>(other: ReactiveSet<U>): ReactiveSet<T | U> {
    const value = ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.symmetricDifference(b)
    );

    return ReactiveSet.fromReactiveValue(value);
  }

  public isSubsetOf(other: ReactiveSet<unknown>): ReactiveValue<boolean> {
    return ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.isSubsetOf(b)
    );
  }

  public isSupersetOf(other: ReactiveSet<unknown>): ReactiveValue<boolean> {
    return ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.isSupersetOf(b)
    );
  }

  public isDisjointFrom(other: ReactiveSet<unknown>): ReactiveValue<boolean> {
    return ReactiveValue.compose([this, other]).derive(([a, b]) =>
      a.isDisjointFrom(b)
    );
  }

  public entries(): SetIterator<[T, T]> {
    return this.value.entries();
  }

  public keys(): SetIterator<T> {
    return this.value.keys();
  }

  public values(): SetIterator<T> {
    return this.value.values();
  }

  public [Symbol.iterator](): SetIterator<T> {
    return this.value[Symbol.iterator]();
  }

  public [Symbol.toStringTag]: string = '<Reactive>Set';

  public add(value: T): this {
    this.value.add(value);
    this.notifySubscribers();

    return this;
  }

  public clear(): void {
    this.value.clear();
    this.notifySubscribers();
  }

  public delete(value: T): boolean {
    const result = this.value.delete(value);
    this.notifySubscribers();

    return result;
  }

  public forEach(
    callbackfn: (value: T, value2: T, set: Set<T>) => void,
    thisArg?: any
  ): void {
    return this.value.forEach(callbackfn, thisArg);
  }

  public has(value: T): boolean {
    return this.value.has(value);
  }

  public hasReactive(value: T): ReactiveValue<boolean> {
    return this.derive((set) => set.has(value));
  }

  public get size() {
    return this.value.size;
  }
}
