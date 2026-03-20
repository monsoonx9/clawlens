"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import {
  Notification,
  loadNotifications,
  addNotification as addNotif,
  markNotificationRead as markRead,
  markAllNotificationsRead as markAllRead,
  deleteNotification as deleteNotif,
  clearAllNotifications as clearAll,
  getUnreadCount,
  checkPriceAlertsAndCreateNotifications,
  checkWatchlistAlertsAndCreateNotifications,
} from "@/lib/notifications";

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = useCallback(() => {
    const loaded = loadNotifications();
    setNotifications(loaded);
    setUnreadCount(getUnreadCount());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => refreshNotifications(), 0);
    return () => clearTimeout(t);
  }, [refreshNotifications]);

  useEffect(() => {
    const checkAlerts = async () => {
      try {
        await checkPriceAlertsAndCreateNotifications();

        if (typeof window !== "undefined") {
          try {
            const stored = localStorage.getItem("clawlens_preferences");
            if (stored) {
              const prefs = JSON.parse(stored);
              if (prefs.watchlist && Array.isArray(prefs.watchlist)) {
                await checkWatchlistAlertsAndCreateNotifications(prefs.watchlist);
              }
            }
          } catch {
            // Ignore errors loading preferences
          }
        }

        refreshNotifications();
      } catch {
        // Silently fail - alerts will be checked again later
      }
    };

    checkAlerts();

    const interval = setInterval(checkAlerts, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const addNotification = useCallback(
    (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
      addNotif(notification);
      refreshNotifications();
    },
    [refreshNotifications],
  );

  const markAsRead = useCallback(
    (id: string) => {
      markRead(id);
      refreshNotifications();
    },
    [refreshNotifications],
  );

  const markAllAsRead = useCallback(() => {
    markAllRead();
    refreshNotifications();
  }, [refreshNotifications]);

  const deleteNotification = useCallback(
    (id: string) => {
      deleteNotif(id);
      refreshNotifications();
    },
    [refreshNotifications],
  );

  const handleClearAll = useCallback(() => {
    clearAll();
    refreshNotifications();
  }, [refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll: handleClearAll,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}
