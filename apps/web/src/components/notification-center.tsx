"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleCheckBig,
  Database,
  GitCompareArrows,
  HelpCircle,
  UserCheck,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import {
  type OperationalNotification,
  type NotificationCategory,
  INITIAL_NOTIFICATIONS,
} from "@/data/notifications";

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLElement | null>;
  unreadCount: number;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationCenter({
  isOpen,
  onClose,
  anchorRef,
  onUnreadCountChange,
}: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] =
    useState<OperationalNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync unread count to parent shell on change
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  useEffect(() => {
    onUnreadCountChange(unreadCount);
  }, [unreadCount, onUnreadCountChange]);

  // Keyboard navigation & Esc close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        if (anchorRef?.current) {
          anchorRef.current.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, anchorRef]);

  // Handle Mark All Read
  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  // Toggle single notification read state
  const handleToggleRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  // Navigate to notification destination
  const handleItemClick = (notification: OperationalNotification) => {
    // Mark as read automatically when acted upon
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
    onClose();
    router.push(notification.actionUrl);
  };

  if (!isOpen) return null;

  // Filter items by active tab
  const filteredNotifications = notifications.filter((n) =>
    activeTab === "unread" ? !n.isRead : true
  );

  // Group by TODAY vs EARLIER
  const todayItems = filteredNotifications.filter((n) => n.group === "TODAY");
  const earlierItems = filteredNotifications.filter((n) => n.group === "EARLIER");

  const renderCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case "critical":
        return <AlertCircle size={15} className="notif-cat-icon notif-icon-critical" aria-hidden="true" />;
      case "review":
        return <GitCompareArrows size={15} className="notif-cat-icon notif-icon-review" aria-hidden="true" />;
      case "assigned":
        return <UserCheck size={15} className="notif-cat-icon notif-icon-assigned" aria-hidden="true" />;
      case "import":
        return <Database size={15} className="notif-cat-icon notif-icon-import" aria-hidden="true" />;
      case "unmatched":
        return <HelpCircle size={15} className="notif-cat-icon notif-icon-unmatched" aria-hidden="true" />;
      case "verified":
        return <CircleCheckBig size={15} className="notif-cat-icon notif-icon-verified" aria-hidden="true" />;
      default:
        return <AlertCircle size={15} className="notif-cat-icon" aria-hidden="true" />;
    }
  };

  return (
    <div
      ref={panelRef}
      className="shell-popover utility-popover notifications-popover notif-center-panel"
      role="dialog"
      aria-label="Operational Notifications"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Top Header */}
      <div className="notif-panel-header">
        <div className="notif-header-top">
          <h2 className="notif-panel-title">Notifications</h2>
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            aria-label="Mark all notifications as read"
          >
            Mark all read
          </button>
        </div>

        {/* Compact Tabs */}
        <div className="notif-tabs" role="tablist" aria-label="Notification view filters">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "all"}
            className={`notif-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All <span className="notif-tab-badge">{notifications.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "unread"}
            className={`notif-tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
            {unreadCount > 0 && <span className="notif-tab-badge unread">{unreadCount}</span>}
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="notif-panel-list" role="list">
        {filteredNotifications.length === 0 ? (
          /* Empty State */
          <div className="notif-empty-state">
            <div className="notif-empty-icon-wrap" aria-hidden="true">
              <CheckCircle2 size={24} className="notif-empty-icon" />
            </div>
            <p className="notif-empty-title">You&apos;re all caught up</p>
            <p className="notif-empty-desc">
              No execution or verification items currently need your attention.
            </p>
          </div>
        ) : (
          <>
            {/* TODAY Group */}
            {todayItems.length > 0 && (
              <div className="notif-group" role="group" aria-label="Notifications from today">
                <div className="notif-group-header">
                  <span>TODAY</span>
                </div>
                {todayItems.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    renderIcon={renderCategoryIcon}
                    onToggleRead={handleToggleRead}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            )}

            {/* EARLIER Group */}
            {earlierItems.length > 0 && (
              <div className="notif-group" role="group" aria-label="Earlier notifications">
                <div className="notif-group-header">
                  <span>EARLIER</span>
                </div>
                {earlierItems.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    renderIcon={renderCategoryIcon}
                    onToggleRead={handleToggleRead}
                    onClick={() => handleItemClick(item)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="notif-panel-footer">
        <button
          type="button"
          className="notif-footer-action-link"
          onClick={() => {
            onClose();
            router.push("/verification-center");
          }}
        >
          <span>Open Verification Queue</span>
          <ChevronRight size={15} className="notif-footer-arrow" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

interface NotificationRowProps {
  item: OperationalNotification;
  renderIcon: (cat: NotificationCategory) => React.ReactNode;
  onToggleRead: (id: string, e: React.MouseEvent) => void;
  onClick: () => void;
}

function NotificationRow({
  item,
  renderIcon,
  onToggleRead,
  onClick,
}: NotificationRowProps) {
  return (
    <div
      role="listitem"
      tabIndex={0}
      className={`notif-item-row ${!item.isRead ? "is-unread" : "is-read"}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`${item.title}. ${item.description}. ${item.timestamp}. ${
        item.isRead ? "Read" : "Unread"
      }`}
    >
      {/* Semantic Icon Box */}
      <div className={`notif-item-icon-box notif-box-${item.statusVariant}`} aria-hidden="true">
        {renderIcon(item.category)}
      </div>

      {/* Main Text Content */}
      <div className="notif-item-body">
        <div className="notif-item-heading">
          <div className="notif-title-with-dot">
            {!item.isRead && <span className="notif-item-unread-dot" aria-hidden="true" />}
            <h3 className="notif-item-title">{item.title}</h3>
          </div>
          <span className="notif-item-time">{item.timestamp}</span>
        </div>
        <p className="notif-item-desc">{item.description}</p>
      </div>

      <ChevronRight size={15} className="notif-row-chevron" aria-hidden="true" />

      {/* Row action appears only on hover or keyboard focus. */}
      <div className="notif-item-action-wrap">
        <Tooltip label={item.isRead ? "Mark as unread" : "Mark as read"} side="bottom" align="end">
          <button
            type="button"
            className="notif-action-btn"
            onClick={(e) => onToggleRead(item.id, e)}
            aria-label={item.isRead ? "Mark as unread" : "Mark as read"}
          >
            {item.isRead ? (
              <Circle size={13} aria-hidden="true" />
            ) : (
              <Check size={13} aria-hidden="true" />
            )}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
