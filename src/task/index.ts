type MaybePromise<T> = T | Promise<T>;

export default abstract class Task {
  protected readonly recursive: boolean;
  protected readonly stack: string[];

  constructor(stack: string[], id?: string) {
    if (id === undefined) {
      this.recursive = false;
      this.stack = stack;
    } else {
      this.recursive = stack.includes(id);
      this.stack = stack.concat(id);
    }
  }

  public abstract run(): MaybePromise<void | Task[]>;
  // public abstract stop(): void;

  public abstract getCost(): number;

  public toString() {
    return this.constructor.name;
  }
}
