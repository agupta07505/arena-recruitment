# A.R.E.N.A Recruitment

The recruitment platform for the operational team supporting the Association for Recreation, Esports, and Athletics at IIIT Bhopal.

## Current milestone

- Public club identity and Year‑1 goals
- Equal sports and esports division presentation
- Filterable recruitment openings with typed seed configuration
- Public leadership structure
- Scholar ID, gender, and role eligibility validation primitives
- Responsive and reduced-motion friendly presentation

The application CTA deliberately remains disabled until campaign dates and Supabase are configured.

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

## Next milestone

Set up Supabase migrations and Row Level Security for profiles, campaigns, positions, applications, and answers. Then add Google/email authentication and the reusable applicant profile flow.
