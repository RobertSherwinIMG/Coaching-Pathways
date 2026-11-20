-- IMG Golf Coach Development Pathway: database setup, 3 tables (PostgreSQL / Supabase)
-- Paste into the SQL Editor and run once. Safe to re-run.

-- 1. pathway_people: coaches and assessors in one list
create table if not exists pathway_people (
  id             uuid primary key default gen_random_uuid(),
  role           text not null check (role in ('coach','assessor')),
  name           text not null,
  current_tier   text check (current_tier in ('l2','l3','lead','l4')),  -- coaches only
  years_coaching numeric(4,1),                                          -- coaches only
  years_img      numeric(4,1),                                          -- coaches only
  created_at     timestamptz not null default now()
);

-- 2. pathway_assessments: one row each time an assessor assesses a coach
create table if not exists pathway_assessments (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null references pathway_people(id),
  assessor_id     uuid not null references pathway_people(id),
  tier            text not null check (tier in ('l2','l3','lead','l4')),  -- tier being assessed
  assessment_date date not null default current_date,
  years_coaching  numeric(4,1),   -- the coach's years on the day of assessment
  years_img       numeric(4,1),
  created_at      timestamptz not null default now()
);

-- 3. pathway_assessment_scores: one row per question per assessment, with section, score and evidence
create table if not exists pathway_assessment_scores (
  assessment_id uuid not null references pathway_assessments(id) on delete cascade,
  question_no   int  not null,       -- order of the question within the tier
  section_no    int  not null,       -- 1 to 4 (Tier 2 and 3) or 1 to 5 (Tier 4)
  section       text not null,       -- e.g. Teaching, Specialist Expertise
  subsection    text,                -- Technical, Practical, On-course, Performance
  question      text not null,
  rating        smallint not null default 0 check (rating between 0 and 4),  -- 0 = not assessed
  evidence      text,
  primary key (assessment_id, question_no)
);

-- REPORT 1: every question in every assessment, with score and evidence
create or replace view pathway_assessment_detail as
select a.id as assessment_id, c.name as coach, an.name as assessor, a.assessment_date,
       a.years_coaching, a.years_img, a.tier as tier_assessed,
       s.section_no, s.section, s.subsection, s.question_no, s.question, s.rating, s.evidence
from pathway_assessments a
join pathway_people c  on c.id  = a.coach_id
join pathway_people an on an.id = a.assessor_id
join pathway_assessment_scores s on s.assessment_id = a.id;

-- REPORT 2: section totals per assessment, same maths as the form
-- (average counts only rated questions; "at standard" means rated 3 or 4)
create or replace view pathway_assessment_sections as
select assessment_id, coach, assessor, assessment_date, tier_assessed, section_no, section, subsection,
       count(*)                                         as criteria,
       round(avg(rating) filter (where rating >= 1), 1) as average,
       count(*) filter (where rating >= 3)              as at_standard
from pathway_assessment_detail
group by assessment_id, coach, assessor, assessment_date, tier_assessed, section_no, section, subsection;

-- SECURITY: lock the tables so nothing is open to the public until access rules are added
alter table pathway_people            enable row level security;
alter table pathway_assessments       enable row level security;
alter table pathway_assessment_scores enable row level security;