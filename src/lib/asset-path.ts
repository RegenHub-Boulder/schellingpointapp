/**
 * Get the correct asset path for static files
 * Returns the path as-is since the app is deployed to Vercel without a basePath
 */
export function getAssetPath(path: string): string {
  // Ensure path starts with /
  return path.startsWith('/') ? path : `/${path}`
}
