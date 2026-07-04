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
      app_versions: {
        Row: {
          bugfix_ids: string[]
          created_at: string
          created_by: string | null
          feature_ids: string[]
          id: string
          notes_md: string
          published: boolean
          published_at: string | null
          title: string
          updated_at: string
          version: string
        }
        Insert: {
          bugfix_ids?: string[]
          created_at?: string
          created_by?: string | null
          feature_ids?: string[]
          id?: string
          notes_md?: string
          published?: boolean
          published_at?: string | null
          title: string
          updated_at?: string
          version: string
        }
        Update: {
          bugfix_ids?: string[]
          created_at?: string
          created_by?: string | null
          feature_ids?: string[]
          id?: string
          notes_md?: string
          published?: boolean
          published_at?: string | null
          title?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      apply_applications: {
        Row: {
          applicant_name: string
          contact: string | null
          created_at: string
          created_by_slid: string | null
          id: string
          note: string | null
          position_id: string | null
          source: string
          status: string
          updated_at: string
          wish: string | null
        }
        Insert: {
          applicant_name: string
          contact?: string | null
          created_at?: string
          created_by_slid?: string | null
          id?: string
          note?: string | null
          position_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          wish?: string | null
        }
        Update: {
          applicant_name?: string
          contact?: string | null
          created_at?: string
          created_by_slid?: string | null
          id?: string
          note?: string | null
          position_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          wish?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apply_applications_position_id_fkey"
            columns: ["position_id"]
            isOneToOne: false
            referencedRelation: "apply_positions"
            referencedColumns: ["id"]
          },
        ]
      }
      apply_positions: {
        Row: {
          created_at: string
          created_by: string | null
          department: string
          description: string | null
          hl_max: number
          id: string
          open: boolean
          position: string
          team: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          department: string
          description?: string | null
          hl_max?: number
          id?: string
          open?: boolean
          position: string
          team?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          department?: string
          description?: string | null
          hl_max?: number
          id?: string
          open?: boolean
          position?: string
          team?: string | null
          updated_at?: string
        }
        Relationships: []
      }
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
      cal_events: {
        Row: {
          all_day: boolean
          color: string | null
          created_at: string
          description: string | null
          ends_at: string
          id: string
          location: string | null
          owner_slid: string
          starts_at: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at: string
          id?: string
          location?: string | null
          owner_slid: string
          starts_at: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          all_day?: boolean
          color?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string
          id?: string
          location?: string | null
          owner_slid?: string
          starts_at?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
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
          department: string | null
          email: string | null
          hl: number
          kind: string
          kwn: string | null
          kwn_active: boolean
          name: string
          notes: string | null
          pik: string
          position: string | null
          regid: string
          slid: string
          updated_at: string
        }
        Insert: {
          cip: string
          created_at?: string
          department?: string | null
          email?: string | null
          hl: number
          kind?: string
          kwn?: string | null
          kwn_active?: boolean
          name: string
          notes?: string | null
          pik: string
          position?: string | null
          regid: string
          slid: string
          updated_at?: string
        }
        Update: {
          cip?: string
          created_at?: string
          department?: string | null
          email?: string | null
          hl?: number
          kind?: string
          kwn?: string | null
          kwn_active?: boolean
          name?: string
          notes?: string | null
          pik?: string
          position?: string | null
          regid?: string
          slid?: string
          updated_at?: string
        }
        Relationships: []
      }
      fin_accounts: {
        Row: {
          archived: boolean
          bic: string | null
          created_at: string
          created_by: string | null
          currency: string
          iban: string | null
          id: string
          name: string
          notes: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          archived?: boolean
          bic?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          iban?: string | null
          id?: string
          name: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          archived?: boolean
          bic?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          iban?: string | null
          id?: string
          name?: string
          notes?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: []
      }
      fin_transactions: {
        Row: {
          account_id: string
          amount: number
          booking_date: string
          category: string | null
          counterparty: string | null
          counterparty_iban: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          direction: string
          id: string
          purpose: string
          receipt_no: string | null
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          amount: number
          booking_date?: string
          category?: string | null
          counterparty?: string | null
          counterparty_iban?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          direction: string
          id?: string
          purpose?: string
          receipt_no?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          amount?: number
          booking_date?: string
          category?: string | null
          counterparty?: string | null
          counterparty_iban?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          purpose?: string
          receipt_no?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "fin_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string
          device_model: string | null
          id: string
          ip: string | null
          method: string | null
          ok: boolean
          os: string | null
          slid: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_model?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          ok?: boolean
          os?: string | null
          slid: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_model?: string | null
          id?: string
          ip?: string | null
          method?: string | null
          ok?: boolean
          os?: string | null
          slid?: string
          user_agent?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read_at: string | null
          recipient_slid: string
          sender_slid: string | null
          source: string
          title: string
          url: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_slid: string
          sender_slid?: string | null
          source?: string
          title: string
          url?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_slid?: string
          sender_slid?: string | null
          source?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      pdf_templates: {
        Row: {
          created_at: string
          created_by: string | null
          css: string | null
          html: string
          id: string
          is_default: boolean
          kind: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          css?: string | null
          html: string
          id?: string
          is_default?: boolean
          kind?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          css?: string | null
          html?: string
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          slid: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          slid: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          slid?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      quick_login_codes: {
        Row: {
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          issued_by: string
          slid: string
          used: boolean
        }
        Insert: {
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          issued_by: string
          slid: string
          used?: boolean
        }
        Update: {
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          issued_by?: string
          slid?: string
          used?: boolean
        }
        Relationships: []
      }
      roadmap_items: {
        Row: {
          created_at: string
          created_by: string | null
          description: string
          id: string
          sort_order: number
          status: string
          target_quarter: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          sort_order?: number
          status?: string
          target_quarter?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          sort_order?: number
          status?: string
          target_quarter?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_accounts: {
        Row: {
          closed_at: string | null
          code_hash: string
          created_at: string
          id: string
          name: string
          ticket_id: string | null
        }
        Insert: {
          closed_at?: string | null
          code_hash: string
          created_at?: string
          id?: string
          name: string
          ticket_id?: string | null
        }
        Update: {
          closed_at?: string | null
          code_hash?: string
          created_at?: string
          id?: string
          name?: string
          ticket_id?: string | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          author_role: string
          author_slid: string
          body: string
          created_at: string
          id: string
          ticket_id: string
        }
        Insert: {
          author_role?: string
          author_slid: string
          body: string
          created_at?: string
          id?: string
          ticket_id: string
        }
        Update: {
          author_role?: string
          author_slid?: string
          body?: string
          created_at?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_slid: string | null
          created_at: string
          id: string
          opener_slid: string
          priority: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          assigned_slid?: string | null
          created_at?: string
          id?: string
          opener_slid: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          assigned_slid?: string | null
          created_at?: string
          id?: string
          opener_slid?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      syn_external_configs: {
        Row: {
          anon_key: string
          created_at: string
          key: string
          label: string
          notes: string | null
          service_key: string | null
          supabase_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          anon_key: string
          created_at?: string
          key: string
          label: string
          notes?: string | null
          service_key?: string | null
          supabase_url: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          anon_key?: string
          created_at?: string
          key?: string
          label?: string
          notes?: string | null
          service_key?: string | null
          supabase_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee_slid: string
          created_at: string
          creator_slid: string
          description: string | null
          due_at: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_slid: string
          created_at?: string
          creator_slid: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_slid?: string
          created_at?: string
          creator_slid?: string
          description?: string | null
          due_at?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          hl_at_join: number | null
          id: string
          role: string | null
          slid: string
          team_id: string
        }
        Insert: {
          created_at?: string
          hl_at_join?: number | null
          id?: string
          role?: string | null
          slid: string
          team_id: string
        }
        Update: {
          created_at?: string
          hl_at_join?: number | null
          id?: string
          role?: string | null
          slid?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          leader_slid: string | null
          min_hl: number | null
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          leader_slid?: string | null
          min_hl?: number | null
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          leader_slid?: string | null
          min_hl?: number | null
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      user_bans: {
        Row: {
          active: boolean
          banned_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          message: string
          slid: string
        }
        Insert: {
          active?: boolean
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message: string
          slid: string
        }
        Update: {
          active?: boolean
          banned_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          message?: string
          slid?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          design_json: Json
          notify_json: Json
          slid: string
          updated_at: string
        }
        Insert: {
          design_json?: Json
          notify_json?: Json
          slid: string
          updated_at?: string
        }
        Update: {
          design_json?: Json
          notify_json?: Json
          slid?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          device_fingerprint: string
          device_model: string | null
          expires_at: string | null
          id: string
          ip: string | null
          last_seen_at: string
          os: string | null
          slid: string
          trusted: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          device_model?: string | null
          expires_at?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          os?: string | null
          slid: string
          trusted?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          device_model?: string | null
          expires_at?: string | null
          id?: string
          ip?: string | null
          last_seen_at?: string
          os?: string | null
          slid?: string
          trusted?: boolean
          user_agent?: string | null
        }
        Relationships: []
      }
      user_tab_permissions: {
        Row: {
          allowed: boolean
          id: string
          slid: string
          tab_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed?: boolean
          id?: string
          slid: string
          tab_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed?: boolean
          id?: string
          slid?: string
          tab_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_tab_prefs: {
        Row: {
          id: string
          pinned: boolean
          slid: string
          sort_order: number
          tab_key: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          id?: string
          pinned?: boolean
          slid: string
          sort_order?: number
          tab_key: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          id?: string
          pinned?: boolean
          slid?: string
          sort_order?: number
          tab_key?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
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
      work_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          invalidated_reason: string | null
          last_ping_at: string
          shift_id: string | null
          slid: string
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          invalidated_reason?: string | null
          last_ping_at?: string
          shift_id?: string | null
          slid: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          invalidated_reason?: string | null
          last_ping_at?: string
          shift_id?: string | null
          slid?: string
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_sessions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "work_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      work_shifts: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          note: string | null
          slid: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          note?: string | null
          slid: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          note?: string | null
          slid?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
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
