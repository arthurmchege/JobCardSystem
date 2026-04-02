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
    <div
      className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 last:border-0
      hover:bg-slate-800/30 transition-colors group"
    >
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
          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] uppercase
          ${running ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"}`}
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

// ─── Main component ──────────────────────────────────────────────────────────
const MonitoringDashboard = () => {
  const [containers, setContainers] = useState([]);
  const [system, setSystem] = useState(null);
  const [wsStatus, setWsStatus] = useState("connecting"); // connecting | live | error
  const [lastUpdate, setLastUpdate] = useState(null);
  const wsRef = useRef(null);

  // ── WebSocket for live container updates ──
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket("wss://localhost/monitor/ws");
      wsRef.current = ws;

      ws.onopen = () => setWsStatus("live");
      ws.onerror = () => setWsStatus("error");
      ws.onclose = () => {
        setWsStatus("error");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setContainers(data);
          setLastUpdate(new Date());
        } catch {
          /* ignore malformed frames */
        }
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  // ── HTTP poll for system stats (every 5s) ──
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

  const runningCount = containers.filter((c) => c.status === "running").length;

  return (
    <div className="min-h-full">
      {/* ── Header ── */}
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
            className={`h-2 w-2 rounded-full ${
              wsStatus === "live"
                ? "bg-emerald-400"
                : wsStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
            }`}
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

      {/* ── System Resources ── */}
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

            {/* Text details */}
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

      {/* ── Containers ── */}
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
    </div>
  );
};

export default MonitoringDashboard;
