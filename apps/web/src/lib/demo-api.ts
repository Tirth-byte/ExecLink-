export const API_BASE_URL = typeof window !== "undefined" && window.location.origin.includes(":3000")
  ? "http://127.0.0.1:8000/api/v1"
  : "/api/v1";

const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("execlink_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {})
  };
};

export type VerificationResponse = {
  verificationId: string;
  progressPercent: number;
  auditSequence?: number;
};

export type AuditChainStatus = {
  valid: boolean;
  entriesChecked: number;
  lastHash?: string;
  failedSequence?: number;
  reason?: string;
};

export function assertProgressNotRegressing(previousPercent: number, nextPercent: number): void {
  if (nextPercent < previousPercent) throw new Error("Progress must not regress.");
  if (nextPercent > 100) throw new Error("Progress cannot exceed 100%.");
}

export async function verifyMatchOnline(
  projectId: string,
  proposalId: string,
  activityId: string,
  progress: number,
  expectedVersion: number = 1
): Promise<VerificationResponse> {
  const idempotencyKey = `verify-${proposalId}-${activityId}-${progress}`;
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/proposals/${proposalId}/verify`, {
    method: "POST",
    headers: { ...getAuthHeaders(), "Idempotency-Key": idempotencyKey },
    body: JSON.stringify({
      activityId,
      progressPercent: progress,
      expectedActivityVersion: expectedVersion
    })
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `API verification failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchAuditChainStatus(projectId: string): Promise<AuditChainStatus> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/audit/verify`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Audit chain check failed with status ${res.status}`);
  }
  return res.json();
}

export async function fetchProjectJson<T>(projectId: string, path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/${path}`, { headers: getAuthHeaders() });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `GET ${path} failed with status ${res.status}`);
  }
  return res.json();
}

export async function downloadReportCsv(projectId: string, reportType: string): Promise<number> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/reports/${reportType}?format=csv`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `Report download failed with status ${res.status}`);
  }
  const text = await res.text();
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${reportType}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  return text.split("\n").filter((line) => line.trim().length > 0).length - 1;
}
