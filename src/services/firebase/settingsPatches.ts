/** Merge a single settings namespace without touching sibling namespaces. */
export function mergeSettingsNamespace<T extends object, K extends keyof T>(
  current: T,
  namespace: K,
  updates: Partial<T[K]>,
): Pick<T, K> {
  return {
    [namespace]: {
      ...(current[namespace] as object),
      ...(updates as object),
    },
  } as Pick<T, K>;
}
