alter table public.profiles enable row level security;
alter table public.staff_roles enable row level security;
alter table public.campaigns enable row level security;
alter table public.positions enable row level security;
alter table public.position_questions enable row level security;
alter table public.applications enable row level security;
alter table public.application_answers enable row level security;
alter table public.review_assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.interview_slots enable row level security;
alter table public.interview_bookings enable row level security;
alter table public.interview_feedback enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.campaigns, public.positions, public.position_questions to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.audit_logs from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "published campaigns are public"
on public.campaigns for select
to anon, authenticated
using (is_published and status in ('open', 'closed'));

create policy "staff read all campaigns"
on public.campaigns for select
to authenticated
using (private.has_staff_role(array['admin', 'reviewer', 'interviewer', 'observer']::public.staff_role[]));

create policy "admins manage campaigns"
on public.campaigns for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "published positions are public"
on public.positions for select
to anon, authenticated
using (
  exists (
    select 1 from public.campaigns c
    where c.id = positions.campaign_id
      and c.is_published
      and c.status in ('open', 'closed')
  )
);

create policy "staff read all positions"
on public.positions for select
to authenticated
using (private.has_staff_role(array['admin', 'reviewer', 'interviewer', 'observer']::public.staff_role[]));

create policy "admins manage positions"
on public.positions for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "published questions are public"
on public.position_questions for select
to anon, authenticated
using (
  exists (
    select 1
    from public.positions p
    join public.campaigns c on c.id = p.campaign_id
    where p.id = position_questions.position_id
      and p.is_active
      and c.is_published
      and c.status in ('open', 'closed')
  )
);

create policy "staff read all questions"
on public.position_questions for select
to authenticated
using (private.has_staff_role(array['admin', 'reviewer', 'interviewer', 'observer']::public.staff_role[]));

create policy "admins manage questions"
on public.position_questions for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "users and authorized staff read profiles"
on public.profiles for select
to authenticated
using (private.can_read_profile(id));

create policy "users create their own profile"
on public.profiles for insert
to authenticated
with check (
  id = (select auth.uid())
  and lower(email::text) = lower((select auth.jwt() ->> 'email'))
);

create policy "users update their own profile"
on public.profiles for update
to authenticated
using (
  id = (select auth.uid())
  or private.has_staff_role(array['admin']::public.staff_role[])
)
with check (
  (id = (select auth.uid()) and lower(email::text) = lower((select auth.jwt() ->> 'email')))
  or private.has_staff_role(array['admin']::public.staff_role[])
);

create policy "staff read own role and administrators observe roles"
on public.staff_roles for select
to authenticated
using (
  user_id = (select auth.uid())
  or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
);

create policy "admins manage staff roles"
on public.staff_roles for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "authorized users read applications"
on public.applications for select
to authenticated
using (private.can_read_application(id));

create policy "applicants create draft applications"
on public.applications for insert
to authenticated
with check (
  applicant_id = (select auth.uid())
  and status = 'draft'
  and exists (
    select 1
    from public.positions p
    join public.campaigns c on c.id = p.campaign_id
    where p.id = applications.position_id
      and c.id = applications.campaign_id
      and p.is_active
      and c.is_published
      and c.status = 'open'
  )
);

create policy "applicants and admins update applications"
on public.applications for update
to authenticated
using (
  applicant_id = (select auth.uid())
  or private.has_staff_role(array['admin']::public.staff_role[])
)
with check (
  applicant_id = (select auth.uid())
  or private.has_staff_role(array['admin']::public.staff_role[])
);

create policy "admins create and delete applications"
on public.applications for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "authorized users read application answers"
on public.application_answers for select
to authenticated
using (private.can_read_application(application_id));

create policy "applicants create draft answers"
on public.application_answers for insert
to authenticated
with check (
  exists (
    select 1
    from public.applications a
    join public.position_questions q on q.id = application_answers.question_id
    where a.id = application_answers.application_id
      and a.applicant_id = (select auth.uid())
      and a.status = 'draft'
      and q.position_id = a.position_id
  )
);

create policy "applicants update draft answers"
on public.application_answers for update
to authenticated
using (
  exists (
    select 1 from public.applications a
    where a.id = application_answers.application_id
      and a.applicant_id = (select auth.uid())
      and a.status = 'draft'
  )
)
with check (
  exists (
    select 1
    from public.applications a
    join public.position_questions q on q.id = application_answers.question_id
    where a.id = application_answers.application_id
      and a.applicant_id = (select auth.uid())
      and a.status = 'draft'
      and q.position_id = a.position_id
  )
);

create policy "applicants delete draft answers"
on public.application_answers for delete
to authenticated
using (
  exists (
    select 1 from public.applications a
    where a.id = application_answers.application_id
      and a.applicant_id = (select auth.uid())
      and a.status = 'draft'
  )
);

create policy "reviewers and oversight read assignments"
on public.review_assignments for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
);

create policy "admins manage review assignments"
on public.review_assignments for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "reviewers and oversight read reviews"
on public.reviews for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
);

create policy "assigned reviewers create reviews"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.review_assignments ra
    where ra.id = reviews.assignment_id
      and ra.reviewer_id = (select auth.uid())
  )
);

create policy "assigned reviewers update reviews"
on public.reviews for update
to authenticated
using (reviewer_id = (select auth.uid()))
with check (
  reviewer_id = (select auth.uid())
  and exists (
    select 1 from public.review_assignments ra
    where ra.id = reviews.assignment_id
      and ra.reviewer_id = (select auth.uid())
  )
);

create policy "authorized users read interview slots"
on public.interview_slots for select
to authenticated
using (
  private.has_staff_role(array['admin', 'observer']::public.staff_role[])
  or (select auth.uid()) = any(interviewer_ids)
  or exists (
    select 1
    from public.interview_bookings ib
    join public.applications a on a.id = ib.application_id
    where ib.slot_id = interview_slots.id
      and a.applicant_id = (select auth.uid())
  )
);

create policy "admins manage interview slots"
on public.interview_slots for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "authorized users read bookings"
on public.interview_bookings for select
to authenticated
using (
  private.has_staff_role(array['admin', 'observer']::public.staff_role[])
  or exists (
    select 1 from public.applications a
    where a.id = interview_bookings.application_id
      and a.applicant_id = (select auth.uid())
  )
  or exists (
    select 1 from public.interview_slots ins
    where ins.id = interview_bookings.slot_id
      and (select auth.uid()) = any(ins.interviewer_ids)
  )
);

create policy "admins manage bookings"
on public.interview_bookings for all
to authenticated
using (private.has_staff_role(array['admin']::public.staff_role[]))
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "applicants respond to interview bookings"
on public.interview_bookings for update
to authenticated
using (
  exists (
    select 1 from public.applications a
    where a.id = interview_bookings.application_id
      and a.applicant_id = (select auth.uid())
  )
)
with check (
  status in ('confirmed', 'declined')
  and exists (
    select 1 from public.applications a
    where a.id = interview_bookings.application_id
      and a.applicant_id = (select auth.uid())
  )
);

create policy "authorized staff read interview feedback"
on public.interview_feedback for select
to authenticated
using (
  interviewer_id = (select auth.uid())
  or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
);

create policy "assigned interviewers create feedback"
on public.interview_feedback for insert
to authenticated
with check (
  interviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.interview_bookings ib
    join public.interview_slots ins on ins.id = ib.slot_id
    where ib.id = interview_feedback.booking_id
      and (select auth.uid()) = any(ins.interviewer_ids)
  )
);

create policy "assigned interviewers update feedback"
on public.interview_feedback for update
to authenticated
using (interviewer_id = (select auth.uid()))
with check (
  interviewer_id = (select auth.uid())
  and exists (
    select 1
    from public.interview_bookings ib
    join public.interview_slots ins on ins.id = ib.slot_id
    where ib.id = interview_feedback.booking_id
      and (select auth.uid()) = any(ins.interviewer_ids)
  )
);

create policy "users read their notifications"
on public.notifications for select
to authenticated
using (
  recipient_id = (select auth.uid())
  or private.has_staff_role(array['admin', 'observer']::public.staff_role[])
);

create policy "users mark their notifications read"
on public.notifications for update
to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

create policy "admins create notifications"
on public.notifications for insert
to authenticated
with check (private.has_staff_role(array['admin']::public.staff_role[]));

create policy "oversight reads audit logs"
on public.audit_logs for select
to authenticated
using (private.has_staff_role(array['admin', 'observer']::public.staff_role[]));
