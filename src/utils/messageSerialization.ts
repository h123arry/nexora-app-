export function omitUndefinedFields<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined),
  ) as T;
}

export function serializeOutgoingMessage<T extends { status: string }>(value: T): T {
  return omitUndefinedFields({ ...value, status: 'sent' } as T);
}

export function isSupportedOutgoingMediaType(type: string): type is 'voice' {
  return type === 'voice';
}
