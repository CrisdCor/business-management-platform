-- Endurecimiento de funciones: fija search_path explícito en el trigger genérico
-- (evita "search_path mutable" en funciones SECURITY DEFINER/INVOKER) y retira el
-- permiso de ejecución vía RPC pública de las funciones que solo deben usarse como
-- triggers internos.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function public.requisiciones_before_insert() from anon, authenticated, public;
revoke execute on function public.compras_before_insert() from anon, authenticated, public;
revoke execute on function public.compras_after_insert() from anon, authenticated, public;
revoke execute on function public.compras_after_update() from anon, authenticated, public;
