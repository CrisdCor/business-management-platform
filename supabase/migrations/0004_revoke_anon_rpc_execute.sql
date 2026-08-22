-- Advisor de seguridad: has_role/is_superadmin/permiso son SECURITY DEFINER y quedaban
-- expuestas como RPC pública (/rest/v1/rpc/...) ejecutable incluso por el rol "anon".
-- La aplicación nunca opera como "anon" (todo acceso requiere sesión autenticada), así
-- que se revoca el EXECUTE heredado de PUBLIC y se concede explícitamente solo a
-- "authenticated".

revoke execute on function public.has_role(text) from public;
revoke execute on function public.is_superadmin() from public;
revoke execute on function public.permiso(text, text) from public;

grant execute on function public.has_role(text) to authenticated;
grant execute on function public.is_superadmin() to authenticated;
grant execute on function public.permiso(text, text) to authenticated;
