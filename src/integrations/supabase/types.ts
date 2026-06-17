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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      basics_docs: {
        Row: {
          body_md: string
          created_at: string
          file_url: string | null
          id: string
          kind: string
          pinned: boolean
          slug: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_md?: string
          created_at?: string
          file_url?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          slug: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_md?: string
          created_at?: string
          file_url?: string | null
          id?: string
          kind?: string
          pinned?: boolean
          slug?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "basics_docs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      chat_members: {
        Row: {
          joined_at: string
          slid: string
          thread_id: string
        }
        Insert: {
          joined_at?: string
          slid: string
          thread_id: string
        }
        Update: {
          joined_at?: string
          slid?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_members_slid_fkey"
            columns: ["slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
          {
            foreignKeyName: "chat_members_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_slid: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_slid: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_slid?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_sender_slid_fkey"
            columns: ["sender_slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_group: boolean
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_group?: boolean
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_threads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      crm_data: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          owner_slid: string
          phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_slid: string
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_slid?: string
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_data_owner_slid_fkey"
            columns: ["owner_slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      employee_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          slid: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          slid: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          slid?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_roles_slid_fkey"
            columns: ["slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      employees: {
        Row: {
          cip: string
          created_at: string
          email: string | null
          hl: number
          kind: string
          kwn: string | null
          kwn_active: boolean
          name: string
          notes: string | null
          pik: string
          regid: string
          slid: string
          updated_at: string
        }
        Insert: {
          cip: string
          created_at?: string
          email?: string | null
          hl: number
          kind?: string
          kwn?: string | null
          kwn_active?: boolean
          name: string
          notes?: string | null
          pik: string
          regid: string
          slid: string
          updated_at?: string
        }
        Update: {
          cip?: string
          created_at?: string
          email?: string | null
          hl?: number
          kind?: string
          kwn?: string | null
          kwn_active?: boolean
          name?: string
          notes?: string | null
          pik?: string
          regid?: string
          slid?: string
          updated_at?: string
        }
        Relationships: []
      }
      mail_accounts: {
        Row: {
          address: string
          created_at: string
          display_name: string | null
          id: string
          slid: string
        }
        Insert: {
          address: string
          created_at?: string
          display_name?: string | null
          id?: string
          slid: string
        }
        Update: {
          address?: string
          created_at?: string
          display_name?: string | null
          id?: string
          slid?: string
        }
        Relationships: [
          {
            foreignKeyName: "mail_accounts_slid_fkey"
            columns: ["slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      mail_messages: {
        Row: {
          account_id: string
          body_html: string | null
          body_text: string | null
          cc_addrs: string[]
          created_at: string
          direction: string
          from_addr: string
          id: string
          provider_id: string | null
          read_at: string | null
          received_at: string | null
          sent_at: string | null
          subject: string | null
          to_addrs: string[]
        }
        Insert: {
          account_id: string
          body_html?: string | null
          body_text?: string | null
          cc_addrs?: string[]
          created_at?: string
          direction: string
          from_addr: string
          id?: string
          provider_id?: string | null
          read_at?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_addrs?: string[]
        }
        Update: {
          account_id?: string
          body_html?: string | null
          body_text?: string | null
          cc_addrs?: string[]
          created_at?: string
          direction?: string
          from_addr?: string
          id?: string
          provider_id?: string | null
          read_at?: string | null
          received_at?: string | null
          sent_at?: string | null
          subject?: string | null
          to_addrs?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "mail_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "mail_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_entries: {
        Row: {
          created_at: string
          id: string
          label: string
          notes: string | null
          owner_slid: string
          secret_enc: string
          secret_iv: string
          updated_at: string
          url: string | null
          username: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          notes?: string | null
          owner_slid: string
          secret_enc: string
          secret_iv: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          notes?: string | null
          owner_slid?: string
          secret_enc?: string
          secret_iv?: string
          updated_at?: string
          url?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vault_entries_owner_slid_fkey"
            columns: ["owner_slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
      workspace_docs: {
        Row: {
          content_md: string
          created_at: string
          id: string
          owner_slid: string
          tags: string[]
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          content_md?: string
          created_at?: string
          id?: string
          owner_slid: string
          tags?: string[]
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          content_md?: string
          created_at?: string
          id?: string
          owner_slid?: string
          tags?: string[]
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_docs_owner_slid_fkey"
            columns: ["owner_slid"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["slid"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"]; _slid: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superuser" | "admin" | "mitarbeiter" | "partner" | "kunde"
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
      app_role: ["superuser", "admin", "mitarbeiter", "partner", "kunde"],
    },
  },
} as const
