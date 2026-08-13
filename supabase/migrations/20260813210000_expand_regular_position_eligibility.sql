update public.positions
set eligible_years = array[1,2,3,4]::smallint[]
where slug not in ('event-ops-lead', 'womens-participation-coordinator');

update public.positions
set eligible_years = array[3,4]::smallint[]
where slug in ('event-ops-lead', 'womens-participation-coordinator');
