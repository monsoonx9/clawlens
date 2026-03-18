import { create } from "zustand";
import { AssistantSession, AssistantMessage, PersonalityType } from "@/types";

interface AssistantState {
  sessions: AssistantSession[];
  activeSession: AssistantSession | null;
  messages: AssistantMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  error: string | null;
  personality: PersonalityType;

  setSessions: (sessions: AssistantSession[]) => void;
  setActiveSession: (session: AssistantSession | null) => void;
  setMessages: (messages: AssistantMessage[]) => void;
  addMessage: (message: AssistantMessage) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
  setPersonality: (personality: PersonalityType) => void;
  clearMessages: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  sessions: [],
  activeSession: null,
  messages: [],
  isLoading: false,
  isStreaming: false,
  error: null,
  personality: "adaptive",

  setSessions: (sessions) => set({ sessions }),
  setActiveSession: (session) => set({ activeSession: session }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setLoading: (loading) => set({ isLoading: loading }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
  setPersonality: (personality) => set({ personality }),
  clearMessages: () => set({ messages: [] }),
}));
