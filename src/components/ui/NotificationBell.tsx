"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  X,
  Check,
  Trash2,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Eye,
  Settings,
} from "lucide-react";
import { useNotifications } from "@/components/ui/NotificationProvider";
import { Notification, NotificationType } from "@/lib/notifications";
import { clsx } from "clsx";

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  price_alert: <TrendingUp className="w-4 h-4 text-risk-low" />,
  system: <AlertTriangle className="w-4 h-4 text-risk-moderate" />,
  whale: <Wallet className="w-4 h-4 text-accent-shadow" />,
  watchlist: <Eye className="w-4 h-4 text-accent-lens" />,
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString();
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAll } =
    useNotifications();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayNotifications = notifications.slice(0, 20);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-text-secondary hover:text-text-primary transition-all rounded-full hover:bg-card touch-target flex items-center justify-center relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-risk-extreme text-amoled text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-pulse shadow-[0_0_10px_color-mix(in_srgb,var(--color-risk-extreme),transparent_50%)]">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-[color-mix(in_srgb,var(--color-bg),transparent_5%)] backdrop-blur-md border border-card-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-4 py-3 border-b border-card-border bg-[color-mix(in_srgb,var(--color-card),transparent_40%)]">
            <h3 className="text-text-primary font-semibold text-sm">Notifications</h3>
            {notifications.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => markAllAsRead()}
                  className="p-1.5 text-text-muted hover:text-text-primary hover:bg-card-hover rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => clearAll()}
                  className="p-1.5 text-text-muted hover:text-risk-extreme hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] rounded-lg transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="w-10 h-10 text-text-dim mb-3" />
                <p className="text-text-muted text-sm">No notifications yet</p>
                <p className="text-text-dim text-xs mt-1">Price alerts will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-card-border">
                {displayNotifications.map((notif) => (
                  <NotificationItem
                    key={notif.id}
                    notification={notif}
                    onMarkRead={() => markAsRead(notif.id)}
                    onDelete={() => deleteNotification(notif.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {notifications.length > 20 && (
            <div className="px-4 py-2 border-t border-card-border bg-[color-mix(in_srgb,var(--color-card),transparent_70%)]">
              <p className="text-text-dim text-xs text-center">
                Showing 20 of {notifications.length} notifications
              </p>
            </div>
          )}

          <div className="px-4 py-3 border-t border-card-border bg-[color-mix(in_srgb,var(--color-card),transparent_40%)]">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-text-secondary hover:text-text-primary bg-card border border-card-border rounded-xl hover:border-card-border-hover transition-all"
            >
              <Settings className="w-4 h-4" />
              Manage Alerts & Watchlist
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete,
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={clsx(
        "p-3 hover:bg-card-hover transition-colors group cursor-pointer relative",
        !notification.read && "bg-[color-mix(in_srgb,var(--color-accent),transparent_95%)]",
      )}
      onClick={() => !notification.read && onMarkRead()}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{NOTIFICATION_ICONS[notification.type]}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-text-primary text-sm font-medium truncate">{notification.title}</p>
            <span className="text-text-dim text-[10px] shrink-0">
              {formatTimeAgo(notification.timestamp)}
            </span>
          </div>
          <p className="text-text-secondary text-xs mt-0.5 line-clamp-2">{notification.message}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-risk-extreme hover:bg-[color-mix(in_srgb,var(--color-risk-extreme),transparent_90%)] rounded transition-all shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {!notification.read && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
      )}
    </div>
  );
}
