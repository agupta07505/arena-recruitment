create or replace function private.audit_privileged_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_id uuid;
begin
  row_id := case
    when tg_op = 'DELETE' then (to_jsonb(old) ->> 'id')::uuid
    else (to_jsonb(new) ->> 'id')::uuid
  end;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, before_data, after_data, request_id)
  values (
    (select auth.uid()),
    lower(tg_table_name) || '.' || lower(tg_op),
    tg_table_name,
    row_id,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end,
    nullif(current_setting('request.headers', true), '')::jsonb ->> 'x-request-id'
  );
  return coalesce(new, old);
end;
$$;

create trigger campaigns_privileged_audit after insert or update or delete on public.campaigns for each row execute function private.audit_privileged_change();
create trigger staff_roles_privileged_audit after insert or update or delete on public.staff_roles for each row execute function private.audit_privileged_change();
create trigger review_assignments_privileged_audit after insert or update or delete on public.review_assignments for each row execute function private.audit_privileged_change();
create trigger reviews_privileged_audit after insert or update or delete on public.reviews for each row execute function private.audit_privileged_change();
create trigger interview_slots_privileged_audit after insert or update or delete on public.interview_slots for each row execute function private.audit_privileged_change();
create trigger interview_bookings_privileged_audit after insert or update or delete on public.interview_bookings for each row execute function private.audit_privileged_change();
create trigger interview_feedback_privileged_audit after insert or update or delete on public.interview_feedback for each row execute function private.audit_privileged_change();

revoke all on function private.audit_privileged_change() from public, anon, authenticated;
