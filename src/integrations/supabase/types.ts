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
      booking_items: {
        Row: {
          booking_id: string
          created_at: string
          equipment_id: string
          equipment_name: string
          equipment_price: number
          id: string
          quantity: number
          subtotal: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          equipment_id: string
          equipment_name: string
          equipment_price: number
          id?: string
          quantity: number
          subtotal: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          equipment_id?: string
          equipment_name?: string
          equipment_price?: number
          id?: string
          quantity?: number
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_failure_reason: string | null
          end_date: string
          id: string
          user_id: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_address: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_failure_reason?: string | null
          end_date: string
          id?: string
          user_id?: string | null
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_address?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_failure_reason?: string | null
          end_date?: string
          id?: string
          user_id?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      component_visibility: {
        Row: {
          component_name: string
          created_at: string
          id: string
          is_visible: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          component_name: string
          created_at?: string
          id?: string
          is_visible?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          component_name?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      content_blocks: {
        Row: {
          block_key: string
          block_type: string
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          metadata: Json | null
          page_slug: string
          sort_order: number | null
          title: string
          updated_at: string
        }
        Insert: {
          block_key: string
          block_type?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          page_slug: string
          sort_order?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          block_key?: string
          block_type?: string
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          page_slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_images: {
        Row: {
          alt_text: string | null
          created_at: string
          file_path: string
          file_size: number | null
          id: string
          image_key: string
          mime_type: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_path: string
          file_size?: number | null
          id?: string
          image_key: string
          mime_type?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_path?: string
          file_size?: number | null
          id?: string
          image_key?: string
          mime_type?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          availability: boolean
          category: string
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          name: string
          price_per_day: number
          featured: boolean
          availability_status: string | null
          stock_quantity: number
          updated_at: string
        }
        Insert: {
          availability?: boolean
          category: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name: string
          price_per_day?: number
          featured?: boolean
          availability_status?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Update: {
          availability?: boolean
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name?: string
          price_per_day?: number
          featured?: boolean
          availability_status?: string | null
          stock_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_deactivated: boolean | null
          name: string
          needs_password_change: boolean | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          is_deactivated?: boolean | null
          name: string
          needs_password_change?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_deactivated?: boolean | null
          name?: string
          needs_password_change?: boolean | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          id: string
          ip_address: string | null
          is_active: boolean | null
          last_activity: string
          session_token: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          session_token: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          last_activity?: string
          session_token?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_temp_passwords: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_used: boolean
          temp_password: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          temp_password: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          temp_password?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_temp_passwords: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      app_role: "SuperUser" | "Admin" | "Booker" | "Driver"
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
    Enums: {
      app_role: ["SuperUser", "Admin", "Booker", "Driver"],
    },
  },
} as const
