export const Skeleton = ({ className = '' }) => (
  <>
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -600px 0; }
        100% { background-position:  600px 0; }
      }
      .skeleton-shimmer {
        background: linear-gradient(90deg,
          #f0f0f0 25%, #e0e0e0 37%, #f0f0f0 63%);
        background-size: 600px 100%;
        animation: shimmer 1.4s ease-in-out infinite;
        border-radius: 6px;
      }
    `}</style>
    <div className={`skeleton-shimmer ${className}`} />
  </>
);

// ── Single job card skeleton ──────────────────────────────────────────────────
export const SkeletonJobCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  </div>
);

//  Job card list skeleton 
export const SkeletonJobList = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonJobCard key={i} />
    ))}
  </div>
);

//  Table row skeleton 
export const SkeletonTableRow = ({ cols = 6 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3.5">
        <Skeleton className={`h-3.5 ${i === 0 ? 'w-40' : i === cols - 1 ? 'w-16' : 'w-24'}`} />
      </td>
    ))}
  </tr>
);

//  Table skeleton 
export const SkeletonTable = ({ rows = 5, cols = 6 }) => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
    <table className="w-full">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, i) => (
            <th key={i} className="px-4 py-3">
              <Skeleton className="h-3 w-16" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  </div>
);

//  Stat cards skeleton 
export const SkeletonStatCards = ({ count = 6 }) => (
  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    ))}
  </div>
);

//  Detail page skeleton 
export const SkeletonDetail = () => (
  <div className="space-y-4 max-w-3xl">
    <div className="flex items-center gap-3">
      <Skeleton className="h-5 w-5" />
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-6 w-24 ml-auto" />
    </div>
    <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
      <Skeleton className="h-3 w-20 mb-4" />
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex justify-between py-2 border-b border-gray-50">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-4">
      {[0, 1].map(i => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
          <Skeleton className="h-3 w-20 mb-3" />
          {[...Array(3)].map((_, j) => (
            <div key={j} className="flex justify-between py-2 border-b border-gray-50">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-28" />
            </div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default Skeleton;
