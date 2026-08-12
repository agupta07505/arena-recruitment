# A.R.E.N.A Recruitment Operations

## Before opening a campaign

1. Confirm the production deployment matches the intended Git commit.
2. Confirm Supabase is active and all local/remote migration versions match with `npx supabase migration list`.
3. Verify Google OAuth, email/password verification, Turnstile, and the Brevo notification worker.
4. Export the current application queue and store it in the restricted club drive.
5. Set opening and closing dates in the staff console. Publishing remains blocked until Turnstile and email readiness are green.
6. Run one test application through submission, review, interview, and withdrawal using non-production test identities, then remove the test records.

## During recruitment

- Check the staff console and Supabase project daily. Free projects may pause after inactivity; wake and verify before announcing a deadline.
- Review failed email rows in `notifications` (`email_failed_at`, `email_error`). Decisions are authoritative in the database even when email fails.
- Vercel Hobby runs the safety email worker daily. During active decision windows, invoke the authenticated worker endpoint after status batches or use a zero-cost external scheduler; do not increase the native cron frequency without rechecking plan limits.
- Export a dated CSV at least daily. CSV exports are formula-neutralized but still contain private student information.
- Never share Supabase dashboard access with reviewers; grant roles in the staff console.

## Backup and recovery

- Use the protected filtered CSV for operational recovery and Supabase dashboard backups for complete database recovery.
- Before a migration, export the current queue and record the production Git SHA.
- Roll back frontend changes by redeploying the previous Vercel commit. Database migrations require a reviewed forward-fix; never reset the linked production database.

## Campaign close

- Close the campaign from the staff console, verify new submissions are rejected, and export final records.
- Resolve queued/failed notifications, record final selection counts, then restrict the final export to club leadership.
- Retain or delete applicant records only under the institute/club retention decision communicated to applicants.
