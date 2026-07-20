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
      bhw_workers: {
        Row: {
          address: string
          age: number
          created_at: string
          gmail: string
          id: string
          is_online: boolean
          last_seen: string | null
          name: string
          number: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          age?: number
          created_at?: string
          gmail?: string
          id?: string
          is_online?: boolean
          last_seen?: string | null
          name: string
          number?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          age?: number
          created_at?: string
          gmail?: string
          id?: string
          is_online?: boolean
          last_seen?: string | null
          name?: string
          number?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      consultations: {
        Row: {
          age: number | null
          birthdate: string | null
          consultation_cause: string | null
          consultation_date: string
          created_at: string
          height: string | null
          id: string
          pulse_rate: string | null
          resident_id: string | null
          respiration_rate: string | null
          sitio: string | null
          temperature: string | null
          weight: string | null
        }
        Insert: {
          age?: number | null
          birthdate?: string | null
          consultation_cause?: string | null
          consultation_date?: string
          created_at?: string
          height?: string | null
          id?: string
          pulse_rate?: string | null
          resident_id?: string | null
          respiration_rate?: string | null
          sitio?: string | null
          temperature?: string | null
          weight?: string | null
        }
        Update: {
          age?: number | null
          birthdate?: string | null
          consultation_cause?: string | null
          consultation_date?: string
          created_at?: string
          height?: string | null
          id?: string
          pulse_rate?: string | null
          resident_id?: string | null
          respiration_rate?: string | null
          sitio?: string | null
          temperature?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consultations_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      dengue_prevention: {
        Row: {
          action_plan: string | null
          container_type: string | null
          created_at: string
          has_larvae: boolean | null
          household_name: string | null
          id: string
          resident_id: string | null
          signature: string | null
        }
        Insert: {
          action_plan?: string | null
          container_type?: string | null
          created_at?: string
          has_larvae?: boolean | null
          household_name?: string | null
          id?: string
          resident_id?: string | null
          signature?: string | null
        }
        Update: {
          action_plan?: string | null
          container_type?: string | null
          created_at?: string
          has_larvae?: boolean | null
          household_name?: string | null
          id?: string
          resident_id?: string | null
          signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dengue_prevention_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      family_data: {
        Row: {
          created_at: string
          family_number: string | null
          father_name: string | null
          id: string
          mother_name: string | null
          num_females: number | null
          num_households: number | null
          num_males: number | null
          resident_id: string | null
          total_members: number | null
        }
        Insert: {
          created_at?: string
          family_number?: string | null
          father_name?: string | null
          id?: string
          mother_name?: string | null
          num_females?: number | null
          num_households?: number | null
          num_males?: number | null
          resident_id?: string | null
          total_members?: number | null
        }
        Update: {
          created_at?: string
          family_number?: string | null
          father_name?: string | null
          id?: string
          mother_name?: string | null
          num_females?: number | null
          num_households?: number | null
          num_males?: number | null
          resident_id?: string | null
          total_members?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "family_data_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      family_planning: {
        Row: {
          created_at: string
          id: string
          method: string | null
          remarks: string | null
          resident_id: string | null
          start_date: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          method?: string | null
          remarks?: string | null
          resident_id?: string | null
          start_date?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          method?: string | null
          remarks?: string | null
          resident_id?: string | null
          start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "family_planning_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      philpen_health: {
        Row: {
          address_sitio: string | null
          age: number | null
          birthdate: string | null
          bmi: string | null
          bp: string | null
          created_at: string
          diabetes_symptoms: boolean | null
          drinks_alcohol: boolean | null
          height: string | null
          high_blood_pressure: boolean | null
          id: string
          record_date: string
          resident_id: string | null
          smokes: boolean | null
          weight: string | null
        }
        Insert: {
          address_sitio?: string | null
          age?: number | null
          birthdate?: string | null
          bmi?: string | null
          bp?: string | null
          created_at?: string
          diabetes_symptoms?: boolean | null
          drinks_alcohol?: boolean | null
          height?: string | null
          high_blood_pressure?: boolean | null
          id?: string
          record_date?: string
          resident_id?: string | null
          smokes?: boolean | null
          weight?: string | null
        }
        Update: {
          address_sitio?: string | null
          age?: number | null
          birthdate?: string | null
          bmi?: string | null
          bp?: string | null
          created_at?: string
          diabetes_symptoms?: boolean | null
          drinks_alcohol?: boolean | null
          height?: string | null
          high_blood_pressure?: boolean | null
          id?: string
          record_date?: string
          resident_id?: string | null
          smokes?: boolean | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "philpen_health_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      residents: {
        Row: {
          age: number
          birthday: string | null
          blood_type: string | null
          created_at: string
          full_name: string
          gender: string
          id: string
          nationality: string
          religion: string | null
          sitio: string | null
          status: string
          updated_at: string
        }
        Insert: {
          age?: number
          birthday?: string | null
          blood_type?: string | null
          created_at?: string
          full_name: string
          gender?: string
          id?: string
          nationality?: string
          religion?: string | null
          sitio?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          age?: number
          birthday?: string | null
          blood_type?: string | null
          created_at?: string
          full_name?: string
          gender?: string
          id?: string
          nationality?: string
          religion?: string | null
          sitio?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_activity_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          login_at: string
          logout_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          login_at?: string
          logout_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "bhw" | "supervisor" | "supervisory" | "bns"
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
      app_role: ["bhw", "supervisor", "supervisory", "bns"],
    },
  },
} as const
