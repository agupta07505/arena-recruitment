update public.positions
set eligible_years = array[3,4]::smallint[]
where campaign_id = '10000000-0000-4000-8000-000000000001'
  and slug = 'event-ops-lead';

insert into public.positions (
  id, campaign_id, slug, title, division, summary, capacity, eligible_years, sort_order, is_active
)
values (
  '20000000-0000-4000-8000-000000000010',
  '10000000-0000-4000-8000-000000000001',
  'womens-participation-coordinator',
  'Women''s Participation Coordinator',
  'operations',
  'Create welcoming pathways for women to participate, compete, volunteer, and lead across A.R.E.N.A events.',
  1,
  array[3,4]::smallint[],
  15,
  true
)
on conflict (campaign_id, slug) do update set
  title = excluded.title,
  division = excluded.division,
  summary = excluded.summary,
  capacity = excluded.capacity,
  eligible_years = excluded.eligible_years,
  sort_order = excluded.sort_order,
  is_active = true;
