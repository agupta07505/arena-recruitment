# A.R.E.N.A Recruitment

The recruitment platform for the operational team supporting the Association for Recreation, Esports, and Athletics at IIIT Bhopal.

## Implemented milestones

- Public club identity and Year‑1 goals
- Equal sports and esports division presentation
- Filterable recruitment openings with typed seed configuration
- Public leadership structure
- Scholar ID, gender, and role eligibility validation primitives
- Responsive and reduced-motion friendly presentation
- Versioned Supabase schema and local seed data
- Row Level Security for applicants, reviewers, interviewers, observers, and admins
- Google OAuth and verified email/password authentication entry points
- Protected applicant workspace with reusable autosaving profiles
- Eligibility-aware position selection and independent role application drafts
- Final review, locked submission receipts, public status timelines, withdrawal, and in-app updates
- Role-protected staff console with searchable application queue, reviewer access, assignments, rubrics, and decision controls
- Capacity-safe interview scheduling, applicant responses, interviewer attendance and feedback, and change notifications

The recruitment campaign is seeded as an unpublished draft until dates and final wording are confirmed.

## Run locally

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Configuration

Copy `.env.example` to `.env.local` and fill values only when the corresponding service is connected. Never commit secrets or applicant exports.

Use the Project URL and publishable key from the Supabase Connect dialog. Google OAuth also needs to be enabled in Supabase Auth with `/auth/callback` included in the redirect allow-list.

## Local database

The local Supabase stack requires Docker Desktop or Podman:

```bash
npm run supabase:start
npm run supabase:reset
npm run supabase:lint
npm run supabase:types
```

`supabase:reset` recreates the local database from the versioned migrations and development seed. Never run a linked reset against production.

## Next milestone

Build recruitment analytics, filtered CSV export, campaign controls, and operational backup documentation.
