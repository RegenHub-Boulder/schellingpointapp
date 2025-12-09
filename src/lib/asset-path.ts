/**
 * Get the correct asset path for static files
 * Handles basePath in production builds (GitHub Pages)
 */
export function getAssetPath(path: string): string {
  const basePath = process.env.NODE_ENV === 'production' ? '/schellingpointdemo' : ''
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path
  return `${basePath}/${cleanPath}`
}
