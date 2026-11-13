export function reviewRefLabel(ref: string) {
  return ref.replace(/^refs\/(heads|remotes)\//, '');
}
