export type NotificationCategory =
  | "critical"
  | "review"
  | "assigned"
  | "import"
  | "unmatched"
  | "verified";

export type NotificationGroup = "TODAY" | "EARLIER";

export interface OperationalNotification {
  id: string;
  category: NotificationCategory;
  categoryLabel: string;
  title: string;
  description: string;
  timestamp: string;
  group: NotificationGroup;
  isRead: boolean;
  statusText?: string;
  statusVariant: "critical" | "review" | "assigned" | "import" | "unmatched" | "verified";
  actionLabel: string;
  actionUrl: string;
  entityId?: string;
}

export const INITIAL_NOTIFICATIONS: OperationalNotification[] = [
  {
    id: "NOTIF-001",
    category: "critical",
    categoryLabel: "CRITICAL",
    title: "Activity ACT-P125 blocked",
    description: "P-110 Hydrotest is blocked due to permit readiness.",
    timestamp: "2 min ago",
    group: "TODAY",
    isRead: false,
    statusText: "Blocked",
    statusVariant: "critical",
    actionLabel: "Open Live Execution",
    actionUrl: "/live-execution?activity=ACT-P125",
    entityId: "ACT-P125",
  },
  {
    id: "NOTIF-002",
    category: "review",
    categoryLabel: "REVIEW",
    title: "Match requires verification",
    description: "EVT-024 has 76% confidence against ACT-P110.",
    timestamp: "8 min ago",
    group: "TODAY",
    isRead: false,
    statusText: "Review",
    statusVariant: "review",
    actionLabel: "Open Verification Center",
    actionUrl: "/verification-center?proposal=PRP-01",
    entityId: "EVT-024",
  },
  {
    id: "NOTIF-003",
    category: "assigned",
    categoryLabel: "ASSIGNED",
    title: "Verification assigned to you",
    description: "Planner review required for P-204 foundation pour.",
    timestamp: "18 min ago",
    group: "TODAY",
    isRead: false,
    statusText: "Assigned",
    statusVariant: "assigned",
    actionLabel: "Open Verification Center",
    actionUrl: "/verification-center",
    entityId: "PRP-03",
  },
  {
    id: "NOTIF-004",
    category: "import",
    categoryLabel: "IMPORT",
    title: "DPR processing complete",
    description:
      "DPR_26_Sep.xlsx produced 42 execution events: 31 high confidence, 8 review, 3 unmatched.",
    timestamp: "42 min ago",
    group: "TODAY",
    isRead: true,
    statusText: "Complete",
    statusVariant: "import",
    actionLabel: "Open Data Ingestion",
    actionUrl: "/data-ingestion",
  },
  {
    id: "NOTIF-005",
    category: "unmatched",
    categoryLabel: "UNMATCHED",
    title: "Unmatched execution event",
    description: "“Temporary bypass spool installed” has no reliable L6 candidate.",
    timestamp: "1 hr ago",
    group: "TODAY",
    isRead: true,
    statusText: "Unmatched",
    statusVariant: "unmatched",
    actionLabel: "Open Verification Center",
    actionUrl: "/verification-center?filter=unmatched",
    entityId: "EVT-0131",
  },
  {
    id: "NOTIF-006",
    category: "verified",
    categoryLabel: "VERIFIED",
    title: "Schedule actual updated",
    description: "ACT-P110 verified progress changed from 45% → 64%.",
    timestamp: "2 hr ago",
    group: "EARLIER",
    isRead: true,
    statusText: "Verified",
    statusVariant: "verified",
    actionLabel: "Open Schedule Explorer",
    actionUrl: "/schedule-explorer?activity=ACT-P110",
    entityId: "ACT-P110",
  },
  {
    id: "NOTIF-007",
    category: "verified",
    categoryLabel: "VERIFIED",
    title: "Inspection signoff verified",
    description: "QC hydrotest signoff for P-110 blinding package recorded with certified evidence.",
    timestamp: "Yesterday",
    group: "EARLIER",
    isRead: true,
    statusText: "Verified",
    statusVariant: "verified",
    actionLabel: "Open Schedule Explorer",
    actionUrl: "/schedule-explorer?activity=ACT-P125&tab=evidence",
    entityId: "ACT-P125",
  },
];
