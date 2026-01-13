# Missing ethboulder_wordmark.svg asset returns 404

**Assignee:** @unforced
**Priority:** Medium
**Labels:** bug, assets, frontend

## Problem
The application is attempting to load `ethboulder_wordmark.svg` but the file is missing, resulting in 404 errors.

## Error Message
```
GET https://schellingpointapp.vercel.app/schellingpointdemo/ethboulder_wordmark.svg 404 (Not Found)
```

## Impact
- Visual branding is broken on pages expecting this asset
- Console errors appearing for all users
- Unprofessional appearance for the ETHBoulder event

## Steps to Reproduce
1. Open browser developer console
2. Navigate to any page in the application
3. Observe 404 error for ethboulder_wordmark.svg

## Expected Behavior
The wordmark asset should be available and load correctly, or the code should reference the correct path to the asset.

## Possible Root Causes
1. Asset file was never added to the repository
2. Asset path is incorrect in the code
3. Asset was moved/renamed but references weren't updated
4. Build/deployment process isn't copying assets correctly

## Suggested Fix
1. Locate or create the `ethboulder_wordmark.svg` file
2. Add it to the appropriate public assets directory
3. Search codebase for references to this file and ensure paths are correct
4. Verify the asset is included in the build output
5. Consider using a fallback logo if event-specific logo is unavailable

## Files to Check
- Search for: `ethboulder_wordmark.svg` or `ethboulder_wordmark`
- Check public assets directory structure
- Review image import/reference patterns in components

## Priority
**Medium** - While this doesn't break functionality, it impacts visual presentation and indicates potential issues with asset management.
