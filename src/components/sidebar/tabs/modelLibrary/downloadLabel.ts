export function getDownloadLabel(savePath: string): string {
  const parts = savePath.split(/[\\/]/).filter(Boolean)
  if (parts.length === 0) return ''
  return parts.slice(-2).join('/')
}
