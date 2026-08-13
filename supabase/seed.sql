insert into public.campaigns (
  id, slug, name, description, status, is_published
)
values (
  '10000000-0000-4000-8000-000000000001',
  'operations-team-01',
  'A.R.E.N.A Operations Team — Campaign 01',
  'Recruitment for the operational team supporting the existing A.R.E.N.A leadership.',
  'draft',
  false
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description;

insert into public.positions (
  id, campaign_id, slug, title, division, summary, capacity, eligible_years, sort_order
)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'event-ops-lead', 'Event Ops Lead', 'operations', 'Own the run-of-show and lead crews from first call to final whistle.', 1, array[3,4]::smallint[], 10),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000001', 'womens-participation-coordinator', 'Women''s Participation Coordinator', 'operations', 'Create welcoming pathways for women to participate, compete, volunteer, and lead across A.R.E.N.A events.', 1, array[3,4]::smallint[], 15),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'event-coordination-logistics', 'Event Coordination & Logistics', 'operations', 'Turn schedules, venues, equipment, and people into seamless match days.', 5, array[1,2,3,4]::smallint[], 20),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'esports-coordinator', 'eSports Coordinator', 'esports', 'Operate brackets, lobbies, broadcasts, and fair competitive play.', 2, array[1,2,3,4]::smallint[], 30),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'graphic-designer', 'Graphic Designer', 'creative', 'Build the visual language behind campaigns, match days, and stories.', 2, array[1,2,3,4]::smallint[], 40),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', 'photographer', 'Photographer', 'creative', 'Find the decisive moments on fields, courts, stages, and screens.', 1, array[1,2,3,4]::smallint[], 50),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', 'video-editor', 'Video Editor', 'creative', 'Cut raw energy into recaps, promos, and stories people remember.', 2, array[1,2,3,4]::smallint[], 60),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', 'social-media-pr', 'Social Media & PR', 'creative', 'Give every fixture, player, and milestone a clear public voice.', 1, array[1,2,3,4]::smallint[], 70),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000001', 'tech-coordinator', 'Tech Coordinator', 'technology', 'Build dependable registration, scoring, streaming, and web systems.', 2, array[1,2,3,4]::smallint[], 80),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000001', 'volunteer-coordinator', 'Volunteer Coordinator', 'operations', 'Bring volunteers together, communicate clearly, and keep every crew supported and on time.', 1, array[1,2,3,4]::smallint[], 90)
on conflict (id) do update set
  title = excluded.title,
  division = excluded.division,
  summary = excluded.summary,
  capacity = excluded.capacity,
  eligible_years = excluded.eligible_years,
  sort_order = excluded.sort_order;

insert into public.position_questions (position_id, prompt, help_text, kind, is_required, sort_order)
select p.id, q.prompt, q.help_text, q.kind::public.question_kind, q.is_required, q.sort_order
from public.positions p
cross join (
  values
    ('Why do you want to join A.R.E.N.A, and what does its sports-and-esports mission mean to you?', 'Be specific about the contribution you want to make.', 'long_text', true, 10),
    ('Describe your most relevant previous experience.', 'College, school, community, freelance, and personal projects all count.', 'long_text', true, 20),
    ('What is your typical weekly availability during the semester?', 'Include known constraints and preferred working hours.', 'long_text', true, 30),
    ('Tell us about a time you worked through disagreement or pressure in a team.', null, 'long_text', true, 40),
    ('Share any relevant portfolio, Drive, social, or project link.', 'Use a publicly accessible URL. You can add more links to your shared profile.', 'url', false, 50)
) as q(prompt, help_text, kind, is_required, sort_order)
where p.campaign_id = '10000000-0000-4000-8000-000000000001'
on conflict (position_id, sort_order) do update set
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  kind = excluded.kind,
  is_required = excluded.is_required;

insert into public.position_questions (position_id, prompt, help_text, kind, is_required, sort_order)
values
  ('20000000-0000-4000-8000-000000000001', 'You are leading an event that is running late while equipment is missing. What do you do in the next fifteen minutes?', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000001', 'How would you divide responsibility and maintain a reliable run-of-show across multiple venues?', null, 'long_text', true, 70),
  ('20000000-0000-4000-8000-000000000002', 'Plan the logistics for a one-day inter-hostel sports fixture, including venue, equipment, volunteers, and contingency handling.', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000002', 'Describe how you would respond to a last-minute venue or equipment failure.', null, 'long_text', true, 70),
  ('20000000-0000-4000-8000-000000000003', 'Which esports titles and tournament formats are you confident operating?', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000003', 'Explain how you would handle lobby administration, competitive integrity, moderation, and a broadcast delay.', null, 'long_text', true, 70),
  ('20000000-0000-4000-8000-000000000004', 'Which design tools do you use, and how do you turn a brief into a clear sports or esports visual?', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000004', 'What turnaround time can you reliably offer for a match-day creative?', null, 'short_text', true, 70),
  ('20000000-0000-4000-8000-000000000005', 'What camera equipment can you access, and how would you cover simultaneous moments at a live event?', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000005', 'Share a photography portfolio link.', null, 'url', true, 70),
  ('20000000-0000-4000-8000-000000000006', 'Which editing tools do you use, and how do you shape footage into a concise story?', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000006', 'What delivery timeline can you commit to for a 60–90 second event recap?', null, 'short_text', true, 70),
  ('20000000-0000-4000-8000-000000000007', 'Outline a seven-day campaign for an upcoming A.R.E.N.A event.', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000007', 'Write a short response to a participant publicly criticizing an event delay.', null, 'long_text', true, 70),
  ('20000000-0000-4000-8000-000000000008', 'Share a GitHub or project link and explain the part you personally built.', null, 'long_text', true, 60),
  ('20000000-0000-4000-8000-000000000008', 'A live scoreboard or stream stops updating during a final. Walk us through your troubleshooting process.', null, 'long_text', true, 70)
on conflict (position_id, sort_order) do update set
  prompt = excluded.prompt,
  help_text = excluded.help_text,
  kind = excluded.kind,
  is_required = excluded.is_required;
