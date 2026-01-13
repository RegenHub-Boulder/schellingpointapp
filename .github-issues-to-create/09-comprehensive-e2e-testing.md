# Implement comprehensive end-to-end testing for all user flows

**Assignee:** @unforced
**Priority:** High
**Labels:** testing, qa, infrastructure, technical-debt

## Problem
The application lacks comprehensive end-to-end (E2E) testing, resulting in multiple broken features being deployed to production. Recent testing revealed numerous critical issues that should have been caught before deployment.

## Impact
- Critical features are broken in production (voting, session submission, schedule generation)
- User experience is severely degraded
- Loss of user trust and confidence
- Increased development time fixing issues reactively
- Risk of data integrity issues
- Difficulty ensuring regressions don't reoccur

## Issues Discovered Without E2E Tests
1. Session submission blocked by RLS policies (#1)
2. Voting completely broken (#3)
3. Schedule auto-generation not working (#6)
4. Favoriting sessions not updating schedules (#5)
5. Session mergers not functioning (#7)
6. Admin participants view inaccessible (#8)
7. Session count display inaccurate (#4)

## Required E2E Test Coverage

### Critical User Flows
1. **Authentication & Registration**
   - Sign up new user
   - Login existing user
   - Logout
   - Password reset
   - Profile management

2. **Session Management**
   - Submit new session proposal
   - Edit session
   - Delete session
   - View session details
   - Search/filter sessions

3. **Voting & Preferences**
   - Cast vote on session
   - Update vote
   - Remove vote
   - View voting results

4. **Schedule Management**
   - Favorite/unfavorite sessions
   - View personal schedule
   - Auto-generate schedule
   - Manual schedule editing
   - Export schedule

5. **Admin Functions**
   - View all participants
   - View all sessions
   - Merge sessions
   - Manage user permissions
   - View analytics/reports

### Database & Permissions Testing
- Verify RLS policies work correctly for all roles
- Test multi-user scenarios
- Verify data integrity constraints
- Test concurrent operations

### Integration Testing
- API endpoint responses
- Database operations
- Authentication flows
- Authorization checks
- Error handling

## Recommended Testing Stack

### E2E Testing Framework Options
- **Playwright** (recommended) - Modern, fast, cross-browser
- **Cypress** - Popular, good DX
- **Selenium** - Mature, widely supported

### Additional Tools
- **Testing Library** - For component testing
- **MSW (Mock Service Worker)** - For API mocking in tests
- **Vitest/Jest** - Unit testing
- **Database seeding tools** - For consistent test data

## Implementation Plan

### Phase 1: Critical Flows (Immediate)
1. Set up E2E testing framework
2. Configure test database
3. Create test data fixtures
4. Implement tests for:
   - User authentication
   - Session submission
   - Voting
   - Basic schedule viewing

### Phase 2: Core Features (Short-term)
1. Schedule generation
2. Favoriting/bookmarking
3. Session search and filtering
4. Profile management

### Phase 3: Admin & Advanced (Medium-term)
1. Admin console functions
2. Session mergers
3. Batch operations
4. Analytics and reporting

### Phase 4: Continuous Testing (Ongoing)
1. Integrate with CI/CD pipeline
2. Run tests on every PR
3. Block deployments if tests fail
4. Monitor test coverage metrics

## Test Environment Requirements
- Dedicated test database (isolated from production)
- Seeded test data (users, sessions, votes, etc.)
- Test user accounts with different roles
- Ability to reset database between test runs
- Environment variables for test configuration

## CI/CD Integration
```yaml
# Example GitHub Actions workflow
name: E2E Tests
on: [pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Setup test database
        run: npm run db:test:setup
      - name: Run E2E tests
        run: npm run test:e2e
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Testing Best Practices
1. **Test realistic user journeys** - Not just individual features
2. **Use data-testid attributes** - For stable selectors
3. **Seed predictable test data** - Avoid flaky tests
4. **Test error states** - Not just happy paths
5. **Keep tests fast** - Parallelize where possible
6. **Clear test names** - Describe what's being tested
7. **Clean up after tests** - Reset database state
8. **Test across browsers** - Chrome, Firefox, Safari

## Success Criteria
- [ ] E2E test framework set up and configured
- [ ] All critical user flows have E2E tests
- [ ] Tests run in CI/CD pipeline
- [ ] PRs cannot merge if E2E tests fail
- [ ] Test coverage report generated
- [ ] Documentation for writing and running tests
- [ ] Test data fixtures and seeding documented
- [ ] At least 80% coverage of core user journeys

## Monitoring & Maintenance
- Track test execution time (keep under 10 minutes)
- Monitor flaky tests and fix immediately
- Update tests when features change
- Review test coverage regularly
- Add tests for any new features
- Add tests for any bugs discovered

## Resources Needed
- Developer time for initial setup (2-3 days)
- Ongoing maintenance (10-15% of dev time)
- Test infrastructure (CI/CD minutes)
- Documentation and training

## Related Issues
- Fixes for issues #1-#8 should include corresponding E2E tests
- Each new feature should include E2E test coverage
- Bug fixes should include regression tests

## Priority
**High** - While existing issues need immediate fixes, E2E testing infrastructure is essential to prevent future issues and ensure sustainable development velocity.

## Notes
Many of the current production issues suggest that features were implemented without adequate testing. Implementing E2E testing will:
1. Catch issues before they reach production
2. Provide confidence in deployments
3. Enable faster development by catching regressions early
4. Serve as living documentation of expected behavior
5. Reduce time spent on manual QA testing
