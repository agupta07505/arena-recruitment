# Supabase recruitment database

The database is defined entirely by versioned migrations. Do not reproduce these changes manually in the Supabase Dashboard.

## Local verification

Install and start Docker Desktop or Podman, then run:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run supabase:types
```

The seed creates Campaign 01 as an unpublished draft. It cannot accept applications until an administrator sets confirmed dates, changes its status to `open`, and publishes it.

## First administrator

After `arena@iiitbhopal.ac.in` has signed up and verified its email, grant the initial administrator role through the SQL editor while logged in as the project owner:

```sql
insert into public.staff_roles (user_id, role)
select id, 'admin'::public.staff_role
from auth.users
where lower(email) = 'arena@iiitbhopal.ac.in'
on conflict do nothing;
```

Subsequent roles should be assigned through the protected admin application, not through raw database access.

## Access matrix

| Data | Applicant | Assigned reviewer | Interviewer | Observer | Admin |
|---|---|---|---|---|---|
| Own profile/application | Read/write while allowed | Assigned read | Assigned read | Read | Manage |
| Application answers | Draft write, own read | Assigned read | Assigned read | Read | Read |
| Scores/private comments | No access | Own review | No access | Read | Manage |
| Interview slots/bookings | Assigned read/respond | No access | Assigned read | Read | Manage |
| Interview feedback | No access | No access | Own write | Read | Manage |
| Audit log | No access | No access | No access | Read | Read |

The service-role key bypasses RLS and must never be shipped to the browser or exposed to club staff.

## Campaign activation

Before opening recruitment, verify role wording and capacities, then set the dates explicitly:

```sql
update public.campaigns
set
  opens_at = '<confirmed opening timestamp>',
  closes_at = '<confirmed closing timestamp>',
  status = 'open',
  is_published = true
where slug = 'operations-team-01';
```

Submission guards reject closed campaigns, incomplete profiles, ineligible years, and missing required answers even if a client attempts to bypass the UI.
