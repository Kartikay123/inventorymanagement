import { ServerCrash, RotateCw } from 'lucide-react'

export default function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <ServerCrash className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">Couldn’t load data</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-5" onClick={onRetry}>
          <RotateCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  )
}
