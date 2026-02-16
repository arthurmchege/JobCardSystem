const illustrations = {
  jobs: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
      <rect x="20" y="15" width="80" height="70" rx="6" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <rect x="30" y="28" width="60" height="6" rx="3" fill="#CBD5E1"/>
      <rect x="30" y="40" width="45" height="4" rx="2" fill="#E2E8F0"/>
      <rect x="30" y="50" width="52" height="4" rx="2" fill="#E2E8F0"/>
      <rect x="30" y="60" width="38" height="4" rx="2" fill="#E2E8F0"/>
      <circle cx="95" cy="75" r="18" fill="#F59E0B" opacity="0.15"/>
      <circle cx="95" cy="75" r="12" fill="#F59E0B" opacity="0.25"/>
      <path d="M89 75h12M95 69v12" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  customers: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
      <circle cx="60" cy="38" r="18" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <path d="M44 38c0-8.84 7.16-16 16-16s16 7.16 16 16" stroke="#CBD5E1" strokeWidth="1.5"/>
      <path d="M52 36c0-4.42 3.58-8 8-8s8 3.58 8 8" fill="#E2E8F0"/>
      <rect x="32" y="62" width="56" height="20" rx="10" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <circle cx="95" cy="78" r="18" fill="#F59E0B" opacity="0.15"/>
      <circle cx="95" cy="78" r="12" fill="#F59E0B" opacity="0.25"/>
      <path d="M89 78h12M95 72v12" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
      <circle cx="45" cy="38" r="14" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <circle cx="45" cy="33" r="7" fill="#E2E8F0"/>
      <path d="M25 72c0-11 9-20 20-20s20 9 20 20" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <circle cx="72" cy="42" r="11" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <circle cx="72" cy="38" r="5.5" fill="#E2E8F0"/>
      <path d="M55 72c0-9.4 7.6-17 17-17" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
      <circle cx="52" cy="45" r="22" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="1.5"/>
      <circle cx="52" cy="45" r="14" fill="#E2E8F0"/>
      <path d="M69 62l16 16" stroke="#CBD5E1" strokeWidth="3" strokeLinecap="round"/>
      <path d="M44 45h16M52 37v16" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
  completed: (
    <svg viewBox="0 0 120 100" className="w-full h-full" fill="none">
      <circle cx="60" cy="48" r="28" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1.5"/>
      <circle cx="60" cy="48" r="20" fill="#DCFCE7"/>
      <path d="M48 48l8 8 16-16" stroke="#22C55E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

const EmptyState = ({
  type = 'jobs',
  title,
  description,
  onAction,
  actionLabel,
  query,
}) => {
  const defaults = {
    jobs:      { title: 'No job cards yet',     description: 'Create your first job card to get started.' },
    customers: { title: 'No customers yet',     description: 'Add your first customer to assign job cards.' },
    users:     { title: 'No users found',       description: 'Users will appear here once they register.' },
    search:    { title: `No results${query ? ` for "${query}"` : ''}`, description: 'Try adjusting your search or filters.' },
    completed: { title: 'All caught up!',       description: 'No completed jobs to display.' },
  };

  const config = defaults[type] || defaults.jobs;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-32 h-28 mb-6">
        {illustrations[type] || illustrations.jobs}
      </div>
      <h3 className="text-base font-semibold text-gray-800 mb-1.5">
        {title || config.title}
      </h3>
      <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-6">
        {description || config.description}
      </p>
      {onAction && actionLabel && (
        <button onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white
            text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors shadow-sm">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
