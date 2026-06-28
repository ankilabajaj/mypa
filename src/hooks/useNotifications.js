import { useState, useEffect, useRef, useCallback } from "react";
import {
  subscribeToNotifications,
  createNotification,
  markNotificationRead,
  clearAllNotifications,
} from "../services/notificationService";
import { computePendingReminders } from "../utils/notificationScheduler";

const PERMISSION_REQUESTED_KEY = "mypa_notification_permission_requested";
const NOTIFICATION_ICON = "/favicon.svg";

function requestNotificationPermissionOnce() {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "default") return;
  if (localStorage.getItem(PERMISSION_REQUESTED_KEY)) return;

  localStorage.setItem(PERMISSION_REQUESTED_KEY, "true");
  Notification.requestPermission();
}

function showBrowserNotification(reminder) {
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification(reminder.browserTitle || "MyPA Reminder", {
      body: reminder.browserBody || reminder.message,
      icon: NOTIFICATION_ICON,
    });
  } catch {
    // Browser may block notifications outside certain contexts
  }
}

export function useNotifications(uid, tasks) {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const existingIdsRef = useRef(new Set());
  const processingRef = useRef(false);

  useEffect(() => {
    if (!uid) {
      setNotifications([]);
      existingIdsRef.current = new Set();
      return;
    }

    const unsubscribe = subscribeToNotifications(uid, (notifs) => {
      setNotifications(notifs);
      existingIdsRef.current = new Set(notifs.map((n) => n.id));
    });

    return unsubscribe;
  }, [uid]);

  useEffect(() => {
    requestNotificationPermissionOnce();
  }, []);

  useEffect(() => {
    if (!uid) return;

    const runCheck = async () => {
      if (processingRef.current) return;
      processingRef.current = true;

      try {
        const pending = computePendingReminders(
          tasks,
          existingIdsRef.current
        );

        for (const reminder of pending) {
          if (existingIdsRef.current.has(reminder.id)) continue;

          const created = await createNotification(uid, reminder);
          if (created) {
            existingIdsRef.current.add(reminder.id);
            showBrowserNotification(reminder);
          }
        }
      } finally {
        processingRef.current = false;
      }
    };

    runCheck();
    const interval = setInterval(runCheck, 60000);

    return () => clearInterval(interval);
  }, [uid, tasks]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = useCallback(
    (id) => {
      if (!uid) return;
      markNotificationRead(uid, id);
    },
    [uid]
  );

  const handleClearAll = useCallback(() => {
    if (!uid) return;
    clearAllNotifications(uid);
  }, [uid]);

  const toggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  return {
    notifications,
    unreadCount,
    isOpen,
    toggleOpen,
    closePanel,
    handleMarkRead,
    handleClearAll,
  };
}
