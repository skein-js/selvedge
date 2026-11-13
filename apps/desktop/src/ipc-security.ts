export function isTrustedSender(
  actual: { contentsId: number; topFrame: boolean; url: string },
  expected: { contentsId: number; url: string },
): boolean {
  return (
    actual.contentsId === expected.contentsId && actual.topFrame && actual.url === expected.url
  );
}
