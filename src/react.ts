import { stream } from './graph.js';
import {
  EVENT_PER_REACTIVE_VALUE_RECALCULATIONS,
  REACTIVE_VALUE_RECALCULATIONS_EVENT,
} from './settings.js';
// import bot from './singleton/bot.js';

export let recalculations = 0;

// to fix this nasty leak, I've tried:
// 1. freeing when there are no subscribers for the second time
//   didn't work, too strict
// 2. extensive caching
//   got down to:
//     Obtain_Item(cobblestone): 11696
//     Obtain_Item(diamond): 18682

export let i = 0;
export class ReactiveValue<T> {
  public readonly id = i++;

  constructor(protected _value: T) {
    // console.log(`${this.id} create`);

    if (stream !== undefined)
      stream.write(
        `${this.id} [label=${JSON.stringify(
          String(this._value)
        )},fillcolor=red];\n`
      );
  }

  public get value() {
    return this._value;
  }

  public set value(value: T) {
    // console.log(`${this.id} value.set`);

    if (this._value === value) return;

    // console.log(`${this.id} value.change (${this.subscribers.size})`);

    this._value = value;

    if (stream !== undefined)
      stream.write(
        `${this.id} [label=${JSON.stringify(String(this._value))}];\n`
      );

    recalculations++;
    if (REACTIVE_VALUE_RECALCULATIONS_EVENT !== undefined) {
      if (recalculations % EVENT_PER_REACTIVE_VALUE_RECALCULATIONS === 0) {
        REACTIVE_VALUE_RECALCULATIONS_EVENT();
      }
    }

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
    if (this.destroyed) {
      throw new Error('subscription attempt post-destruction');
    }

    this.subscribers.add(subscriber);

    if (stream !== undefined)
      stream.write(
        `${this.id} [fillcolor=${
          this.subscribers.size > 0 ? 'green' : 'red'
        }];\n`
      );

    if (callImmediately) subscriber(this.value);
  }

  public unsubscribe(subscriber: (value: T) => void) {
    this.subscribers.delete(subscriber);

    if (stream !== undefined)
      stream.write(
        `${this.id} [fillcolor=${
          this.subscribers.size > 0 ? 'green' : 'red'
        }];\n`
      );

    // if (this.subscribers.size === 0) {
    //   this.destroy();
    // }
  }

  public derive<U>(calculate: (value: T) => U): ReactiveValue<U> {
    const derived = new ReactiveValue<U>(undefined as any);

    if (stream !== undefined)
      stream.write(`${this.id} -> ${derived.id} [label="derive"];\n`);

    const updateDerived = (value: T) => {
      derived.value = calculate(value);
    };

    this.subscribe(updateDerived);
    derived.addSubscription(this, updateDerived);

    return derived;
  }

  public static compose<T extends unknown[]>(values: {
    [K in keyof T]: ReactiveValue<T[K]>;
  }): ReactiveValue<T> {
    const composed = new ReactiveValue<T>(
      values.map((value) => value.value) as T
    );

    for (const value of values) {
      if (stream !== undefined)
        stream.write(`${value.id} -> ${composed.id} [label="compose"];\n`);
    }

    for (let i = 0; i < values.length; i++) {
      const updateComposed = (value: unknown) => {
        // if (composed.value[i] === value) return;

        composed.value[i] = value;
        composed.notifySubscribers();
      };

      values[i].subscribe(updateComposed, false);
      composed.addSubscription(values[i], updateComposed);
    }

    return composed;
  }

  // impact is minimal enough to not have garbage collection logic
  public flat(): ReactiveValue<T extends ReactiveValue<infer U> ? U : T> {
    const flat = new ReactiveValue<T extends ReactiveValue<infer U> ? U : T>(
      undefined as any
    );
    const setFlat = (value: T extends ReactiveValue<infer U> ? U : T) => {
      flat.value = value;
    };

    if (stream !== undefined)
      stream.write(`${this.id} -> ${flat.id} [label="flat"];\n`);

    let cleanup: VoidFunction | undefined;
    this.subscribe((value) => {
      cleanup?.();
      cleanup = undefined;

      if (value instanceof ReactiveValue) {
        if (stream !== undefined)
          stream.write(
            `${this.id} -> ${value.id} [label="valueof (flat)",style=dotted];\n`
          );
        if (stream !== undefined)
          stream.write(
            `${value.id} -> ${flat.id} [label="flat (value)",style=dashed];\n`
          );

        value.subscribe(setFlat);
        cleanup = () => value.unsubscribe(setFlat);

        return;
      }

      // for whatever reason, I need to use infer U, can't use unknown or any
      // (TS bug? probably)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setFlat(value as T extends ReactiveValue<infer U> ? never : T);
    });

    return flat;
  }

  // Garbage Collection

  protected readonly subscriptions = new Set<
    [WeakRef<ReactiveValue<any>>, WeakRef<(value: any) => void>]
  >();

  public addSubscription<T>(
    emitter: ReactiveValue<T>,
    subscriber: (value: T) => void
  ) {
    this.subscriptions.add([new WeakRef(emitter), new WeakRef(subscriber)]);
  }

  protected destroyed = false;

  protected destroy(): void {
    console.count('destroy');

    this.destroyed = true;

    for (const [emitterRef, subscriberRef] of this.subscriptions) {
      const emitter = emitterRef.deref();
      if (emitter === undefined) continue;

      const subscriber = subscriberRef.deref();
      if (subscriber === undefined) continue;

      emitter.unsubscribe(subscriber);
    }
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
