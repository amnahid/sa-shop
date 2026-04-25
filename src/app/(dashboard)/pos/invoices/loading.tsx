export default function Loading() {
  return (
    <div className="p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-64"></div>
        <div className="bg-card border rounded-lg overflow-hidden">
          <div className="h-12 bg-muted"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 border-t border-muted"></div>
          ))}
        </div>
      </div>
    </div>
  );
}