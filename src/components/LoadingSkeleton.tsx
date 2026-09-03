export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="skeleton h-8 w-32 rounded-lg mb-3" />
        <div className="skeleton h-10 w-48 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-4">
            <div className="skeleton h-4 w-20 rounded mb-2" />
            <div className="skeleton h-8 w-24 rounded" />
          </div>
        ))}
      </div>
      <div className="glass-card p-5">
        <div className="skeleton h-4 w-40 rounded mb-3" />
        <div className="skeleton h-20 w-full rounded-lg" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="glass-card p-5">
            <div className="skeleton h-4 w-28 rounded mb-3" />
            <div className="space-y-2">
              <div className="skeleton h-8 w-full rounded-lg" />
              <div className="skeleton h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
