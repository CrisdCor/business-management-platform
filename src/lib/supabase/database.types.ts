// Generado a partir del esquema real de Supabase con generate_typescript_types.
// Regenerar tras cada migración: ver README > "Regenerar tipos".
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      ciudades_operacion: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      compras: {
        Row: {
          aprobado_superadmin_id: string | null
          created_at: string
          estado: string
          excede_presupuesto: boolean
          fecha_cierre: string | null
          fecha_compra: string
          fecha_entrega_estimada: string | null
          folio_oc: string | null
          id: string
          monto: number
          notas: string | null
          proveedor_id: string
          requisicion_id: string
          updated_at: string
        }
        Insert: {
          aprobado_superadmin_id?: string | null
          created_at?: string
          estado?: string
          excede_presupuesto?: boolean
          fecha_cierre?: string | null
          fecha_compra?: string
          fecha_entrega_estimada?: string | null
          folio_oc?: string | null
          id?: string
          monto: number
          notas?: string | null
          proveedor_id: string
          requisicion_id: string
          updated_at?: string
        }
        Update: {
          aprobado_superadmin_id?: string | null
          created_at?: string
          estado?: string
          excede_presupuesto?: boolean
          fecha_cierre?: string | null
          fecha_compra?: string
          fecha_entrega_estimada?: string | null
          folio_oc?: string | null
          id?: string
          monto?: number
          notas?: string | null
          proveedor_id?: string
          requisicion_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "compras_aprobado_superadmin_id_fkey"
            columns: ["aprobado_superadmin_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_requisicion_id_fkey"
            columns: ["requisicion_id"]
            isOneToOne: true
            referencedRelation: "requisiciones"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos: {
        Row: {
          code: string
          label: string
        }
        Insert: {
          code: string
          label: string
        }
        Update: {
          code?: string
          label?: string
        }
        Relationships: []
      }
      presupuestos: {
        Row: {
          anio: number
          area_id: string
          created_at: string
          id: string
          mes: number
          monto_asignado: number
          monto_consumido: number
          rubro_id: string
          updated_at: string
        }
        Insert: {
          anio: number
          area_id: string
          created_at?: string
          id?: string
          mes: number
          monto_asignado: number
          monto_consumido?: number
          rubro_id: string
          updated_at?: string
        }
        Update: {
          anio?: number
          area_id?: string
          created_at?: string
          id?: string
          mes?: number
          monto_asignado?: number
          monto_consumido?: number
          rubro_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "presupuestos_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "presupuestos_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          activo: boolean
          banco: string
          created_at: string
          id: string
          nit_cedula: string
          nombre: string
          numero_cuenta: string
          tipo_cuenta: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          banco: string
          created_at?: string
          id?: string
          nit_cedula: string
          nombre: string
          numero_cuenta: string
          tipo_cuenta: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          banco?: string
          created_at?: string
          id?: string
          nit_cedula?: string
          nombre?: string
          numero_cuenta?: string
          tipo_cuenta?: string
          updated_at?: string
        }
        Relationships: []
      }
      requisiciones: {
        Row: {
          aprobador_id: string | null
          area_id: string
          created_at: string
          descripcion: string
          estado: string
          fecha_aprobacion: string | null
          folio: string | null
          id: string
          monto_estimado: number
          motivo_rechazo: string | null
          presupuesto_id: string
          rubro_id: string
          solicitante_id: string
          updated_at: string
        }
        Insert: {
          aprobador_id?: string | null
          area_id: string
          created_at?: string
          descripcion: string
          estado?: string
          fecha_aprobacion?: string | null
          folio?: string | null
          id?: string
          monto_estimado: number
          motivo_rechazo?: string | null
          presupuesto_id: string
          rubro_id: string
          solicitante_id: string
          updated_at?: string
        }
        Update: {
          aprobador_id?: string | null
          area_id?: string
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_aprobacion?: string | null
          folio?: string | null
          id?: string
          monto_estimado?: number
          motivo_rechazo?: string | null
          presupuesto_id?: string
          rubro_id?: string
          solicitante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requisiciones_aprobador_id_fkey"
            columns: ["aprobador_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_presupuesto_id_fkey"
            columns: ["presupuesto_id"]
            isOneToOne: false
            referencedRelation: "presupuestos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_rubro_id_fkey"
            columns: ["rubro_id"]
            isOneToOne: false
            referencedRelation: "rubros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requisiciones_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          label: string
        }
        Insert: {
          code: string
          label: string
        }
        Update: {
          code?: string
          label?: string
        }
        Relationships: []
      }
      rubros: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      usuario_permisos: {
        Row: {
          actualizar: boolean
          crear: boolean
          eliminar: boolean
          leer: boolean
          modulo_code: string
          usuario_id: string
        }
        Insert: {
          actualizar?: boolean
          crear?: boolean
          eliminar?: boolean
          leer?: boolean
          modulo_code: string
          usuario_id: string
        }
        Update: {
          actualizar?: boolean
          crear?: boolean
          eliminar?: boolean
          leer?: boolean
          modulo_code?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_permisos_modulo_code_fkey"
            columns: ["modulo_code"]
            isOneToOne: false
            referencedRelation: "modulos"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "usuario_permisos_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario_roles: {
        Row: {
          rol_code: string
          usuario_id: string
        }
        Insert: {
          rol_code: string
          usuario_id: string
        }
        Update: {
          rol_code?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuario_roles_rol_code_fkey"
            columns: ["rol_code"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "usuario_roles_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios: {
        Row: {
          activo: boolean
          area_id: string | null
          ciudad_operacion_id: string | null
          correo: string
          created_at: string
          foto_url: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          area_id?: string | null
          ciudad_operacion_id?: string | null
          correo: string
          created_at?: string
          foto_url?: string | null
          id: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          area_id?: string | null
          ciudad_operacion_id?: string | null
          correo?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_ciudad_operacion_id_fkey"
            columns: ["ciudad_operacion_id"]
            isOneToOne: false
            referencedRelation: "ciudades_operacion"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: { Args: { p_rol: string }; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      permiso: {
        Args: { p_accion: string; p_modulo: string }
        Returns: boolean
      }
      reemplazar_roles_usuario: {
        Args: { p_roles: string[]; p_usuario_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
