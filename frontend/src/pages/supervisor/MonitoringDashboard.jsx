import { useState, useEffect, useRef } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────
const toGB = (b) => (b / 1024 ** 3).toFixed(1);
const fmtAgo = (ts) => {
  if (!ts) return "—";
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
};

// ─── Event config ────────────────────────────────────────────────────────────
const EVENT_CONFIG = {
  user_login: {
    color: "bg-emerald-400",
    glow: "0 0 6px #34d399",
    pill: "bg-emerald-900/50 text-emerald-400",
    label: "User Login",
    summary: (m) => {
      try {
        const meta = typeof m === "string" ? JSON.parse(m) : m;
        return meta?.email || "";
      } catch {
        return "";
      }
    },
  },
  login_failed: {
    color: "bg-red-400",
    glow: "0 0 6px #f87171",
    pill: "bg-red-900/50 text-red-400",
    label: "Login Failed",
    summary: (m) => {
      try {
        const meta = typeof m === "string" ? JSON.parse(m) : m;
        return `${meta?.email || ""} — ${meta?.reason || ""}`;
      } catch {
        return "";
      }
    },
  },
  job_assignment_email_sent: {
    color: "bg-amber-400",
    glow: "0 0 6px #fbbf24",
    pill: "bg-amber-900/50 text-amber-400",
    label: "Email Sent",
    summary: (m) => {
      try {
        const meta = typeof m === "string" ? JSON.parse(m) : m;
        return `To: ${meta?.email || ""}`;
      } catch {
        return "";
      }
    },
  },
  payment_verified: {
    color: "bg-blue-400",
    glow: "0 0 6px #60a5fa",
    pill: "bg-blue-900/50 text-blue-400",
    label: "Payment Verified",
    summary: (m) => {
      try {
        const meta = typeof m === "string" ? JSON.parse(m) : m;
        return `KES ${meta?.amount?.toLocaleString() || ""}`;
      } catch {
        return "";
      }
    },
  },
  payment_success: {
    color: "bg-blue-400",
    glow: "0 0 6px #60a5fa",
    pill: "bg-blue-900/50 text-blue-400",
    label: "M-Pesa Payment",
    summary: (m) => {
      try {
        const meta = typeof m === "string" ? JSON.parse(m) : m;
        return `KES ${meta?.amount?.toLocaleString() || ""} — ${meta?.receipt_number || ""}`;
      } catch {
        return "";
      }
    },
  },
};

const getConfig = (eventType) =>
  EVENT_CONFIG[eventType] || {
    color: "bg-slate-400",
    glow: "",
    pill: "bg-slate-800 text-slate-400",
    label: eventType,
    summary: () => "",
  };

// ─── Gauge ring ──────────────────────────────────────────────────────────────
const Gauge = ({ value, label, color }) => {
  const r = 28;
  const circ = 2 * Math.PI * r;
  const fill = circ - (circ * Math.min(value, 100)) / 100;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#1e293b"
          strokeWidth="7"
        />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeDasharray={circ}
          strokeDashoffset={fill}
          strokeLinecap="round"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "center",
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
        <text
          x="36"
          y="40"
          textAnchor="middle"
          fill="white"
          fontSize="13"
          fontWeight="700"
          fontFamily="monospace"
        >
          {Math.round(value)}%
        </text>
      </svg>
      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
    </div>
  );
};

// ─── Container row ───────────────────────────────────────────────────────────
const ContainerRow = ({ c }) => {
  const running = c.status === "running";
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors group">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`h-2 w-2 rounded-full shrink-0 ${running ? "bg-emerald-400" : "bg-red-400"}`}
          style={running ? { boxShadow: "0 0 6px #34d399" } : {}}
        />
        <span className="text-sm font-medium text-slate-200 truncate font-mono">
          {c.name}
        </span>
      </div>
      <div className="flex items-center gap-6 shrink-0 text-xs text-slate-400">
        <span
          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${running ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}
        >
          {c.status}
        </span>
        <span className="hidden sm:block">↺ {c.restart_count ?? 0}</span>
        <span className="hidden md:block text-slate-500">
          {fmtAgo(c.started_at)}
        </span>
      </div>
    </div>
  );
};

// ─── Activity row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ log }) => {
  const cfg = getConfig(log.event_type);
  const summary = cfg.summary(log.metadata);
  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/30 transition-colors">
      <span
        className={`h-2 w-2 rounded-full shrink-0 mt-1.5 ${cfg.color}`}
        style={cfg.glow ? { boxShadow: cfg.glow } : {}}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase ${cfg.pill}`}
          >
            {cfg.label}
          </span>
          <span className="text-[10px] text-slate-500 shrink-0">
            {fmtAgo(log.created_at)}
          </span>
        </div>
        {summary && (
          <p className="text-xs text-slate-400 truncate">{summary}</p>
        )}
      </div>
    </div>
  );
};

// ─── Backend Health Panel ─────────────────────────────────────────────────────
const BackendHealthPanel = ({ summary }) => {
  if (!summary) {
    return (
      <div className="flex justify-center py-6">
        <svg
          className="h-6 w-6 animate-spin text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      </div>
    );
  }
  const healthy = summary.current_status === "healthy";
  return (
    <div className="flex flex-wrap items-center gap-6 p-2">
      <div className="flex flex-col items-center gap-1.5">
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider
          ${healthy ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${healthy ? "bg-emerald-400" : "bg-red-400"}`}
            style={healthy ? { boxShadow: "0 0 5px #34d399" } : {}}
          />
          {summary.current_status}
        </div>
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
          Status
        </span>
      </div>
      <Gauge value={summary.uptime_percent} label="Uptime" color="#6366f1" />
      <div className="space-y-2 text-xs text-slate-400 min-w-[160px]">
        <div className="flex justify-between gap-4">
          <span>Avg response</span>
          <span className="text-slate-200 font-mono">
            {summary.avg_response_time_ms
              ? `${Math.round(summary.avg_response_time_ms)} ms`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Last checked</span>
          <span className="text-slate-200 font-mono">
            {fmtAgo(summary.last_checked)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span>Uptime</span>
          <span className="text-slate-200 font-mono">
            {summary.uptime_percent}%
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const MonitoringDashboard = () => {
  const [containers, setContainers] = useState([]);
  const [system, setSystem] = useState(null);
  const [summary, setSummary] = useState(null);
  const [activityLogs, setActivityLogs] = useState([]);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("wss://localhost/monitor/ws");
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("live");
      ws.onerror = () => setWsStatus("error");
      ws.onclose = () => setWsStatus("error");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setContainers(data);
          setLastUpdate(new Date());
        } catch {
          /* ignore */
        }
      };
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  useEffect(() => {
    const fetchSystem = async () => {
      try {
        const res = await fetch("/monitor/system-status");
        const data = await res.json();
        setSystem(data);
      } catch {
        /* monitor might be briefly down */
      }
    };
    fetchSystem();
    const id = setInterval(fetchSystem, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch("/monitor/summary");
        const data = await res.json();
        setSummary(data);
      } catch {
        /* monitor might be briefly down */
      }
    };
    fetchSummary();
    const id = setInterval(fetchSummary, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/monitor/activity-logs");
        const data = await res.json();
        setActivityLogs(Array.isArray(data) ? data : []);
      } catch {
        /* monitor might be briefly down */
      }
    };
    fetchLogs();
    const id = setInterval(fetchLogs, 15000);
    return () => clearInterval(id);
  }, []);

  const runningCount = containers.filter((c) => c.status === "running").length;

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="sup-title text-2xl font-bold text-slate-900">
            Monitoring
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Live infrastructure status
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${wsStatus === "live" ? "bg-emerald-400" : wsStatus === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-400"}`}
          />
          <span className="text-xs font-medium text-gray-400">
            {wsStatus === "live"
              ? "Live"
              : wsStatus === "connecting"
                ? "Connecting…"
                : "Disconnected"}
          </span>
          {lastUpdate && (
            <span className="text-xs text-gray-300 ml-2">
              Updated {fmtAgo(lastUpdate)}
            </span>
          )}
        </div>
      </div>

      {/* System Resources */}
      <div className="bg-slate-900 rounded-2xl p-5 mb-5 border border-slate-800">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
          Host Resources
        </p>
        {system ? (
          <div className="flex flex-wrap items-center justify-around gap-4">
            <Gauge
              value={system.cpu?.percent ?? 0}
              label="CPU"
              color="#f59e0b"
            />
            <Gauge
              value={system.memory?.percent ?? 0}
              label="Memory"
              color="#6366f1"
            />
            <Gauge
              value={system.disk?.percent ?? 0}
              label="Disk"
              color="#10b981"
            />
            <div className="space-y-2 text-xs text-slate-400 min-w-[140px]">
              <div className="flex justify-between gap-4">
                <span>RAM used</span>
                <span className="text-slate-200 font-mono">
                  {toGB(system.memory?.used)} / {toGB(system.memory?.total)} GB
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span>Disk used</span>
                <span className="text-slate-200 font-mono">
                  {toGB(system.disk?.used)} / {toGB(system.disk?.total)} GB
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-6">
            <svg
              className="h-6 w-6 animate-spin text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Containers + Activity Feed side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Containers */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Docker Containers
            </p>
            <span className="text-xs font-semibold text-slate-400">
              <span className="text-emerald-400">{runningCount}</span>
              <span> / {containers.length} running</span>
            </span>
          </div>
          {containers.length === 0 ? (
            <div className="py-10 text-center text-slate-600 text-sm">
              {wsStatus === "connecting"
                ? "Connecting to monitor…"
                : "No container data yet"}
            </div>
          ) : (
            containers.map((c) => <ContainerRow key={c.name} c={c} />)
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Activity Feed
            </p>
            <span className="text-xs text-slate-500">Refreshes every 15s</span>
          </div>
          <div className="flex-1 overflow-y-auto max-h-80">
            {activityLogs.length === 0 ? (
              <div className="py-10 text-center text-slate-600 text-sm">
                No activity yet
              </div>
            ) : (
              activityLogs.map((log) => <ActivityRow key={log.id} log={log} />)
            )}
          </div>
        </div>
      </div>

      {/* Backend Health */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Backend Health
          </p>
          {summary && (
            <span className="text-xs text-slate-500">Refreshes every 30s</span>
          )}
        </div>
        <div className="px-4 py-4">
          <BackendHealthPanel summary={summary} />
        </div>
      </div>
    </div>
  );
};

export default MonitoringDashboard;
