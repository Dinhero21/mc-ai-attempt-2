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
