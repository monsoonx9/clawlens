import { getSupabaseAdmin } from "@/lib/supabaseClient";
import {
  AssistantSession,
  AssistantMessage,
  UserAssistantPreferences,
  PersonalityType,
} from "@/types";

export class ChatManager {
  private get supabase() {
    return getSupabaseAdmin();
  }

  async createSession(userId: string, title?: string): Promise<AssistantSession> {
    const sessionId = this.generateSessionId();

    const { data, error } = await this.supabase
      .from("personal_assistant_sessions")
      .insert({
        user_id: userId,
        session_id: sessionId,
        title: title || "New Conversation",
        preferences: {
          personality: "adaptive",
          language: "en",
          notificationEnabled: true,
          portfolioAccess: true,
          tradeAccess: false,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("[ChatManager] Error creating session:", error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return this.mapSession(data);
  }

  async getSessions(userId: string, limit = 50): Promise<AssistantSession[]> {
    const { data, error } = await this.supabase
      .from("personal_assistant_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[ChatManager] Error fetching sessions:", error);
      return [];
    }

    return data.map(this.mapSession);
  }

  async getSession(sessionId: string, userId: string): Promise<AssistantSession | null> {
    const { data, error } = await this.supabase
      .from("personal_assistant_sessions")
      .select("*")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapSession(data);
  }

  async updateSessionTitle(sessionId: string, userId: string, title: string): Promise<void> {
    const { error } = await this.supabase
      .from("personal_assistant_sessions")
      .update({ title, updated_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("[ChatManager] Error updating session title:", error);
      throw new Error(`Failed to update session: ${error.message}`);
    }
  }

  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from("personal_assistant_sessions")
      .delete()
      .eq("session_id", sessionId)
      .eq("user_id", userId);

    if (error) {
      console.error("[ChatManager] Error deleting session:", error);
      throw new Error(`Failed to delete session: ${error.message}`);
    }
  }

  async addMessage(
    sessionId: string,
    userId: string,
    role: "user" | "assistant" | "system",
    content: string,
    skillsUsed: string[] = [],
    metadata?: Record<string, any>,
  ): Promise<AssistantMessage | null> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error("Session not found");
    }

    const { data, error } = await this.supabase
      .from("personal_assistant_messages")
      .insert({
        session_id: session.id,
        role,
        content,
        skills_used: skillsUsed,
        metadata: metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("[ChatManager] Error adding message:", error);
      throw new Error(`Failed to add message: ${error.message}`);
    }

    await this.supabase
      .from("personal_assistant_sessions")
      .update({
        updated_at: new Date().toISOString(),
        last_message_at: new Date().toISOString(),
      })
      .eq("id", session.id);

    return this.mapMessage(data);
  }

  async getMessages(sessionId: string, userId: string, limit = 100): Promise<AssistantMessage[]> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      return [];
    }

    const { data, error } = await this.supabase
      .from("personal_assistant_messages")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      console.error("[ChatManager] Error fetching messages:", error);
      return [];
    }

    return data.map(this.mapMessage);
  }

  async getUserPreferences(userId: string): Promise<UserAssistantPreferences | null> {
    const { data, error } = await this.supabase
      .from("user_assistant_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      userId: data.user_id,
      personality: data.personality as PersonalityType,
      language: data.language,
      notificationEnabled: data.notification_enabled,
      portfolioAccess: data.portfolio_access,
      tradeAccess: data.trade_access,
    };
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserAssistantPreferences>,
  ): Promise<UserAssistantPreferences> {
    const updateData: Record<string, any> = {
      ...preferences,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await this.supabase
      .from("user_assistant_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (existing) {
      const { data, error } = await this.supabase
        .from("user_assistant_preferences")
        .update(updateData)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        console.error("[ChatManager] Error updating preferences:", error);
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      return {
        userId: data.user_id,
        personality: data.personality,
        language: data.language,
        notificationEnabled: data.notification_enabled,
        portfolioAccess: data.portfolio_access,
        tradeAccess: data.trade_access,
      };
    } else {
      const { data, error } = await this.supabase
        .from("user_assistant_preferences")
        .insert({
          user_id: userId,
          personality: preferences.personality || "adaptive",
          language: preferences.language || "en",
          notification_enabled: preferences.notificationEnabled ?? true,
          portfolio_access: preferences.portfolioAccess ?? true,
          trade_access: preferences.tradeAccess ?? false,
        })
        .select()
        .single();

      if (error) {
        console.error("[ChatManager] Error creating preferences:", error);
        throw new Error(`Failed to create preferences: ${error.message}`);
      }

      return {
        userId: data.user_id,
        personality: data.personality,
        language: data.language,
        notificationEnabled: data.notification_enabled,
        portfolioAccess: data.portfolio_access,
        tradeAccess: data.trade_access,
      };
    }
  }

  private generateSessionId(): string {
    return `asst_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  private mapSession(data: any): AssistantSession {
    return {
      id: data.id,
      userId: data.user_id,
      sessionId: data.session_id,
      title: data.title,
      preferences: data.preferences || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      lastMessageAt: data.last_message_at ? new Date(data.last_message_at) : undefined,
    };
  }

  private mapMessage(data: any): AssistantMessage {
    return {
      id: data.id,
      sessionId: data.session_id,
      role: data.role,
      content: data.content,
      skillsUsed: data.skills_used || [],
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
    };
  }
}

export const chatManager = new ChatManager();
