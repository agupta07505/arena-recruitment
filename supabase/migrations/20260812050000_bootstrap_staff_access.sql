-- Bootstrap the existing club-owned accounts that administer the first campaign.
-- Future staff access is granted from the protected staff console.
insert into public.staff_roles (user_id, role, granted_by)
select id, 'admin'::public.staff_role, id
from auth.users
where lower(email) in ('arena@iiitbhopal.ac.in', 'arena.iiitbhopal@gmail.com')
on conflict (user_id, role) do nothing;
