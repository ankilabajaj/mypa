import { useEffect, useRef } from "react";
import { formatNotificationTime } from "../utils/notificationScheduler";

export default function NotificationCenter({
  notifications,
  unreadCount,
  isOpen,
  onToggle,
  onClose,
  onMarkRead,
  onClearAll,
}) {
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <div className="notification-center" ref={panelRef}>
      <button
        type="button"
        className="notification-center__bell"
        onClick={onToggle}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
      >
        <span className="notification-center__bell-icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="notification-center__badge" aria-hidden="true">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-center__panel"
          role="dialog"
          aria-label="Notification Center"
        >
          <div className="notification-center__header">
            <h2 className="notification-center__title">Notifications</h2>
            {notifications.length > 0 && (
              <button
                type="button"
                className="notification-center__clear"
                onClick={onClearAll}
              >
                🗑 Clear All
              </button>
            )}
          </div>

          <div className="notification-center__list">
            {notifications.length === 0 ? (
              <p className="notification-center__empty">No notifications yet</p>
            ) : (
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`notification-center__item${
                    notification.read
                      ? ""
                      : " notification-center__item--unread"
                  }`}
                  onClick={() => onMarkRead(notification.id)}
                >
                  <span
                    className="notification-center__item-icon"
                    aria-hidden="true"
                  >
                    {notification.icon}
                  </span>
                  <div className="notification-center__item-body">
                    <span className="notification-center__item-title">
                      {notification.title}
                    </span>
                    <span className="notification-center__item-message">
                      {notification.message}
                    </span>
                    <span className="notification-center__item-time">
                      {formatNotificationTime(notification.createdAt)}
                    </span>
                  </div>
                  {!notification.read && (
                    <span
                      className="notification-center__unread-dot"
                      aria-hidden="true"
                    />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
