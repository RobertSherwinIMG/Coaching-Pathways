-- IMG Golf Coach Development Pathway: access rules (run AFTER setup.sql)
-- Lets the web page use the three pathway_ tables with the public key, and nothing else.
-- Anyone holding the public key can do what is listed below. There is no login.

-- Make the two report views obey these rules (they would otherwise bypass them)
alter view pathway_assessment_detail   set (security_invoker = true);
alter view pathway_assessment_sections set (security_invoker = true);

-- Table permissions: no delete on assessments or scores
grant select, insert, update, delete on pathway_people            to anon, authenticated;
grant select, insert, update         on pathway_assessments       to anon, authenticated;
grant select, insert, update         on pathway_assessment_scores to anon, authenticated;
grant select on pathway_assessment_detail   to anon, authenticated;
grant select on pathway_assessment_sections to anon, authenticated;

-- pathway_people: read, add, change, delete (needed for the + popup)
drop policy if exists pathway_people_select on pathway_people;
drop policy if exists pathway_people_insert on pathway_people;
drop policy if exists pathway_people_update on pathway_people;
drop policy if exists pathway_people_delete on pathway_people;
create policy pathway_people_select on pathway_people for select to anon, authenticated using (true);
create policy pathway_people_insert on pathway_people for insert to anon, authenticated with check (true);
create policy pathway_people_update on pathway_people for update to anon, authenticated using (true) with check (true);
create policy pathway_people_delete on pathway_people for delete to anon, authenticated using (true);

-- pathway_assessments: read, add, change (no delete)
drop policy if exists pathway_assessments_select on pathway_assessments;
drop policy if exists pathway_assessments_insert on pathway_assessments;
drop policy if exists pathway_assessments_update on pathway_assessments;
create policy pathway_assessments_select on pathway_assessments for select to anon, authenticated using (true);
create policy pathway_assessments_insert on pathway_assessments for insert to anon, authenticated with check (true);
create policy pathway_assessments_update on pathway_assessments for update to anon, authenticated using (true) with check (true);

-- pathway_assessment_scores: read, add, change (no delete)
drop policy if exists pathway_scores_select on pathway_assessment_scores;
drop policy if exists pathway_scores_insert on pathway_assessment_scores;
drop policy if exists pathway_scores_update on pathway_assessment_scores;
create policy pathway_scores_select on pathway_assessment_scores for select to anon, authenticated using (true);
create policy pathway_scores_insert on pathway_assessment_scores for insert to anon, authenticated with check (true);
create policy pathway_scores_update on pathway_assessment_scores for update to anon, authenticated using (true) with check (true);
