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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string
          entity_id: string
          entity_label: string | null
          entity_type: string
          id: string
          metadata: Json | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string
          entity_id: string
          entity_label?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string
          entity_id?: string
          entity_label?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attachments: {
        Row: {
          content_type: string | null
          created_at: string | null
          created_by: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
        }
        Update: {
          content_type?: string | null
          created_at?: string | null
          created_by?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
        }
        Relationships: []
      }
      board_columns: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          name: string
          position: number
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "board_columns_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: []
      }
      client_costs: {
        Row: {
          amount_allocated: number
          client_id: string
          cost_date: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          transaction_id: string | null
        }
        Insert: {
          amount_allocated: number
          client_id: string
          cost_date?: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          transaction_id?: string | null
        }
        Update: {
          amount_allocated?: number
          client_id?: string
          cost_date?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_costs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_costs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          active: boolean
          asaas_customer_id: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          asaas_customer_id?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          asaas_customer_id?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      department_members: {
        Row: {
          department_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          department_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          department_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "department_members_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      monthly_budgets: {
        Row: {
          created_at: string
          created_by: string | null
          expense_limit: number
          id: string
          revenue_target: number
          updated_at: string
          year_month: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expense_limit?: number
          id?: string
          revenue_target?: number
          updated_at?: string
          year_month: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expense_limit?: number
          id?: string
          revenue_target?: number
          updated_at?: string
          year_month?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          asaas_subscription_id: string | null
          billing_cycle: Database["public"]["Enums"]["billing_cycle"]
          billing_type: Database["public"]["Enums"]["billing_type"]
          client_id: string
          created_at: string
          description: string | null
          id: string
          next_due_date: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          value: number
        }
        Insert: {
          asaas_subscription_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id: string
          created_at?: string
          description?: string | null
          id?: string
          next_due_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          value: number
        }
        Update: {
          asaas_subscription_id?: string | null
          billing_cycle?: Database["public"]["Enums"]["billing_cycle"]
          billing_type?: Database["public"]["Enums"]["billing_type"]
          client_id?: string
          created_at?: string
          description?: string | null
          id?: string
          next_due_date?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_labels: {
        Row: {
          color: string
          department_id: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          department_id?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          department_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_labels_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          id: string
          is_completed: boolean | null
          position: number
          task_id: string | null
          title: string
        }
        Insert: {
          id?: string
          is_completed?: boolean | null
          position: number
          task_id?: string | null
          title: string
        }
        Update: {
          id?: string
          is_completed?: boolean | null
          position?: number
          task_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          client_id: string | null
          column_id: string | null
          created_at: string | null
          created_by: string | null
          department_id: string | null
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          client_id?: string | null
          column_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position: number
          priority?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          client_id?: string | null
          column_id?: string | null
          created_at?: string | null
          created_by?: string | null
          department_id?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "board_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          asaas_payment_id: string | null
          bank_slip_url: string | null
          billing_type: Database["public"]["Enums"]["billing_type"]
          category_id: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          invoice_url: string | null
          payment_date: string | null
          pix_qr_code: string | null
          pix_qr_code_image: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          invoice_url?: string | null
          payment_date?: string | null
          pix_qr_code?: string | null
          pix_qr_code_image?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          asaas_payment_id?: string | null
          bank_slip_url?: string | null
          billing_type?: Database["public"]["Enums"]["billing_type"]
          category_id?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          invoice_url?: string | null
          payment_date?: string | null
          pix_qr_code?: string | null
          pix_qr_code_image?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_write: { Args: { _user_id: string }; Returns: boolean }
      delete_user_by_admin: {
        Args: {
          target_user_id: string
        }
        Returns: void
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "financeiro"
        | "viewer"
        | "designer"
        | "video_editor"
        | "traffic_manager"
      billing_cycle: "MONTHLY" | "QUARTERLY" | "SEMIANNUALLY" | "YEARLY"
      billing_type: "BOLETO" | "PIX" | "CREDIT_CARD" | "UNDEFINED"
      subscription_status: "ACTIVE" | "INACTIVE" | "CANCELLED"
      transaction_status: "PENDING" | "PAID" | "OVERDUE" | "CANCELLED"
      transaction_type: "INCOME" | "EXPENSE"
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
    Enums: {
      app_role: [
        "admin",
        "financeiro",
        "viewer",
        "designer",
        "video_editor",
        "traffic_manager",
      ],
      billing_cycle: ["MONTHLY", "QUARTERLY", "SEMIANNUALLY", "YEARLY"],
      billing_type: ["BOLETO", "PIX", "CREDIT_CARD", "UNDEFINED"],
      subscription_status: ["ACTIVE", "INACTIVE", "CANCELLED"],
      transaction_status: ["PENDING", "PAID", "OVERDUE", "CANCELLED"],
      transaction_type: ["INCOME", "EXPENSE"],
    },
  },
} as const
