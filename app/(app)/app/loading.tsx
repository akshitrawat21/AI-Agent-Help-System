/**
 * Instant loading state for every /app route: the page's general shape in
 * shimmering placeholders, so a navigation feels immediate while the real
 * page streams in behind it.
 */
export default function Loading() {
  return (
    <div className="space-y-6 animate-fade" aria-busy="true" aria-label="Loading">
      <div className="space-y-2.5">
        <div className="skeleton h-7 w-44 rounded-lg" />
        <div className="skeleton h-4 w-80 max-w-full rounded-md" />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="skeleton h-24 rounded-xl" />
        ))}
      </div>

      <div className="skeleton h-72 rounded-xl" />
    </div>
  );
}
