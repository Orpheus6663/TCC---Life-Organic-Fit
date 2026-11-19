-- Lista contas de Auth somente para quem tem role=admin em app_metadata.
-- Execute no SQL Editor do projeto Supabase usado pelo aplicativo.
create or replace function public.admin_list_users(page_number integer default 1)
returns table (
  id uuid,
  email text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  is_admin boolean
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    users.id,
    users.email::text,
    users.created_at,
    users.last_sign_in_at,
    coalesce(users.raw_app_meta_data ->> 'role' = 'admin', false)
  from auth.users as users
  where coalesce(auth.jwt() -> 'app_metadata' ->> 'role' = 'admin', false)
  order by users.created_at desc, users.id asc
  offset ((greatest(coalesce(page_number, 1), 1) - 1) * 100)
  limit 100;
$function$;

revoke all on function public.admin_list_users(integer) from public;
revoke all on function public.admin_list_users(integer) from anon;
grant execute on function public.admin_list_users(integer) to authenticated;
