export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      categorias: {
        Row: {
          activa: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      clientes: {
        Row: {
          activo: boolean
          apellido: string
          created_at: string
          direccion: string | null
          email: string | null
          fecha_registro: string
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          apellido: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          apellido?: string
          created_at?: string
          direccion?: string | null
          email?: string | null
          fecha_registro?: string
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracion: {
        Row: {
          created_at: string
          dias_para_recargo: number
          id: string
          moneda_default: string
          porcentaje_recargo: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dias_para_recargo?: number
          id?: string
          moneda_default?: string
          porcentaje_recargo?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dias_para_recargo?: number
          id?: string
          moneda_default?: string
          porcentaje_recargo?: number
          updated_at?: string
        }
        Relationships: []
      }
      deudas: {
        Row: {
          cliente_id: string
          concepto: string
          created_at: string
          estado: string
          fecha_creacion: string
          fecha_vencimiento: string
          id: string
          moneda: string
          monto_abonado: number
          monto_restante: number | null
          monto_total: number
          notas: string | null
          recargos: number
          updated_at: string
        }
        Insert: {
          cliente_id: string
          concepto: string
          created_at?: string
          estado?: string
          fecha_creacion?: string
          fecha_vencimiento: string
          id?: string
          moneda?: string
          monto_abonado?: number
          monto_restante?: number | null
          monto_total: number
          notas?: string | null
          recargos?: number
          updated_at?: string
        }
        Update: {
          cliente_id?: string
          concepto?: string
          created_at?: string
          estado?: string
          fecha_creacion?: string
          fecha_vencimiento?: string
          id?: string
          moneda?: string
          monto_abonado?: number
          monto_restante?: number | null
          monto_total?: number
          notas?: string | null
          recargos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deudas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_pagos: {
        Row: {
          cliente_nombre: string
          concepto: string
          created_at: string
          deuda_id: string | null
          fecha_pago: string
          id: string
          metodo_pago: string | null
          moneda: string
          monto_pago: number
          notas: string | null
        }
        Insert: {
          cliente_nombre: string
          concepto: string
          created_at?: string
          deuda_id?: string | null
          fecha_pago: string
          id?: string
          metodo_pago?: string | null
          moneda?: string
          monto_pago: number
          notas?: string | null
        }
        Update: {
          cliente_nombre?: string
          concepto?: string
          created_at?: string
          deuda_id?: string | null
          fecha_pago?: string
          id?: string
          metodo_pago?: string | null
          moneda?: string
          monto_pago?: number
          notas?: string | null
        }
        Relationships: []
      }
      movimientos_stock: {
        Row: {
          cantidad: number
          created_at: string
          fecha_movimiento: string
          id: string
          motivo: string | null
          producto_id: string
          tipo_movimiento: string
        }
        Insert: {
          cantidad: number
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo?: string | null
          producto_id: string
          tipo_movimiento: string
        }
        Update: {
          cantidad?: number
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo?: string | null
          producto_id?: string
          tipo_movimiento?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_stock_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string
          deuda_id: string
          fecha_pago: string
          id: string
          metodo_pago: string | null
          moneda: string
          monto: number
          notas: string | null
        }
        Insert: {
          created_at?: string
          deuda_id: string
          fecha_pago?: string
          id?: string
          metodo_pago?: string | null
          moneda?: string
          monto: number
          notas?: string | null
        }
        Update: {
          created_at?: string
          deuda_id?: string
          fecha_pago?: string
          id?: string
          metodo_pago?: string | null
          moneda?: string
          monto?: number
          notas?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_deuda_id_fkey"
            columns: ["deuda_id"]
            isOneToOne: false
            referencedRelation: "deudas"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          categoria_id: string | null
          codigo: string | null
          created_at: string
          descripcion: string | null
          id: string
          moneda: string
          nombre: string
          precio: number
          stock_actual: number
          stock_minimo: number
          updated_at: string
        }
        Insert: {
          activo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre: string
          precio: number
          stock_actual?: number
          stock_minimo?: number
          updated_at?: string
        }
        Update: {
          activo?: boolean
          categoria_id?: string | null
          codigo?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          moneda?: string
          nombre?: string
          precio?: number
          stock_actual?: number
          stock_minimo?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      aplicar_recargos_vencidos: {
        Args: Record<PropertyKey, never>
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
