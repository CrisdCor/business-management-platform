-- Igual que 0002_harden_function_security.sql: la función de trigger no debe
-- quedar expuesta como RPC pública.
revoke execute on function public.requisicion_items_before_insert() from anon, authenticated, public;
