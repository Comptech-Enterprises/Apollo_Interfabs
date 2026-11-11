export function TableSkeleton({ cols = 5, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <div className="space-y-3">
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full">
          <thead>
            <tr className="border-b border-red-100 bg-red-50/50">
              {Array.from({ length: cols }, (_, i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-3 w-16 rounded bg-slate-200 animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                {Array.from({ length: cols }, (_, j) => (
                  <td key={j} className="px-4 py-4">
                    <div
                      className="h-4 rounded bg-slate-200 animate-pulse"
                      style={{ width: `${45 + ((i * 7 + j * 13) % 40)}%` }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 md:hidden">
        {Array.from({ length: 3 }, (_, i) => (
          <li key={i} className="card space-y-2">
            <div className="h-4 w-3/4 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-slate-200 animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-slate-200 animate-pulse" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="card space-y-4 animate-pulse">
      <div className="h-5 w-1/3 rounded bg-slate-200" />
      <div className="space-y-2">
        <div className="h-4 w-full rounded bg-slate-200" />
        <div className="h-4 w-5/6 rounded bg-slate-200" />
        <div className="h-4 w-2/3 rounded bg-slate-200" />
      </div>
      <div className="h-10 w-full rounded bg-slate-200" />
    </div>
  );
}
