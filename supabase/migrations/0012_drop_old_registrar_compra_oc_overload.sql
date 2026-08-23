-- 0011 cambió la firma de registrar_compra_oc (quitó p_requisicion_id), pero
-- `create or replace function` con una firma distinta crea un OVERLOAD nuevo
-- en vez de reemplazar la función vieja -- la versión anterior de 5
-- argumentos quedó huérfana (su cuerpo referencia compras.requisicion_id,
-- columna ya eliminada; fallaría en tiempo de ejecución) y expuesta como RPC
-- vía PostgREST, lo cual además puede causar ambigüedad de sobrecarga.
-- Se elimina explícitamente esa firma vieja.
drop function if exists public.registrar_compra_oc(uuid, uuid, jsonb, timestamptz, text);
