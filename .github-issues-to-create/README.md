# GitHub Issues from Live Demo Feedback

This directory contains detailed GitHub issue descriptions based on comprehensive feedback from testing the live demo of the Schelling Point App.

## 📋 Issues Summary

9 issues have been created covering critical bugs and feature problems:

1. **Session Submission RLS Violation** (Critical) - Users cannot submit sessions due to database permissions
2. **Missing Wordmark Asset** (Medium) - 404 error for ethboulder_wordmark.svg
3. **Voting RLS Violation** (Critical) - Users cannot cast votes due to database permissions
4. **Session Count Display Mismatch** (Low) - Count doesn't match displayed sessions
5. **Favoriting Not Working** (High) - Favorited sessions don't appear in schedule
6. **Auto-Generate Schedule Not Working** (Critical) - Core feature not functioning
7. **Session Mergers Not Working** (Medium) - Cannot merge similar sessions
8. **Admin Participants Permissions** (High) - Admins cannot view participant list
9. **Comprehensive E2E Testing** (High) - Need test infrastructure to prevent future issues

## 🚀 Quick Start - Create All Issues

### Option 1: Using the Script (Recommended)

1. **Install GitHub CLI** (if not already installed):
   ```bash
   # macOS
   brew install gh

   # Ubuntu/Debian
   sudo apt install gh

   # Windows
   winget install GitHub.cli
   ```

2. **Authenticate with GitHub**:
   ```bash
   gh auth login
   ```

3. **Run the script**:
   ```bash
   cd .github-issues-to-create
   ./create-issues.sh
   ```

   This will create all 9 issues automatically, assigned to @unforced with appropriate labels.

### Option 2: Manual Creation

If you prefer to create issues manually or want to customize them:

1. Go to https://github.com/RegenHub-Boulder/schellingpointapp/issues/new
2. Open each `.md` file in this directory
3. Copy the title (first # heading)
4. Copy the entire file content as the issue body
5. Add labels as indicated in the **Labels:** section
6. Assign to @unforced

## 🔍 Issue Details

### Critical Priority (3 issues)
- **Issue #1**: Session Submission RLS Violation - Blocks content creation
- **Issue #3**: Voting RLS Violation - Blocks core voting functionality
- **Issue #6**: Auto-Generate Schedule - Core differentiating feature not working

### High Priority (4 issues)
- **Issue #5**: Favoriting Sessions - Manual schedule curation broken
- **Issue #8**: Admin Participants - Admin functionality blocked
- **Issue #9**: E2E Testing - Infrastructure needed to prevent future issues

### Medium Priority (1 issue)
- **Issue #2**: Missing Wordmark Asset - Visual/branding issue
- **Issue #7**: Session Mergers - Admin feature not working

### Low Priority (1 issue)
- **Issue #4**: Session Count Display - UI inconsistency

## 🔗 Common Themes

### RLS (Row-Level Security) Issues
Issues #1, #3, #7, and #8 all involve Supabase RLS policy violations. These should be investigated together as they likely share root causes:
- Improper RLS policy configuration
- Missing user authentication context
- Incorrect role-based access control

### Schedule Management
Issues #5 and #6 both involve populating user schedules, suggesting:
- Shared database table issues
- Common API endpoint problems
- Frontend state management issues

## 📊 Impact Assessment

### User-Facing Breaks (Immediate Fix Needed)
- Cannot submit sessions
- Cannot vote on sessions
- Cannot generate schedules
- Cannot favorite sessions

### Admin-Facing Breaks (High Priority)
- Cannot view participants
- Cannot merge sessions

### Quality Issues (Important)
- Missing assets (404 errors)
- Inaccurate displays
- Lack of test coverage

## 🛠️ Suggested Fix Order

1. **First**: Fix RLS policies (#1, #3) - Unblocks core user functionality
2. **Second**: Fix admin permissions (#8) - Enables troubleshooting
3. **Third**: Fix schedule features (#5, #6) - Restores value proposition
4. **Fourth**: Set up E2E testing (#9) - Prevents regression
5. **Fifth**: Fix remaining issues (#2, #4, #7) - Polish and admin features

## 📝 Notes

- All issues are assigned to @unforced
- Each issue includes:
  - Detailed problem description
  - Impact assessment
  - Steps to reproduce
  - Root cause analysis
  - Suggested fixes
  - Testing checklist
- Issues are cross-referenced where they share dependencies

## 🤝 Contributing

When working on these issues:

1. **Test thoroughly** - Many issues indicate lack of testing
2. **Fix RLS policies carefully** - Don't make them too permissive
3. **Add E2E tests** - Prevent regressions
4. **Document changes** - Help future maintainers
5. **Consider dependencies** - Some issues are related

## 📧 Questions?

If you have questions about any of these issues, please comment on the specific issue in GitHub after creation.

---

**Generated from live demo feedback** - 2026-01-13
