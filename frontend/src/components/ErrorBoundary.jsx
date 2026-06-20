import { Component } from 'react'
import { ServerCrash, RotateCw } from 'lucide-react'

// Catches render-time errors anywhere below it so the app shows a message
// instead of a blank white page.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <ServerCrash className="h-8 w-8" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-slate-800">Something went wrong</h1>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            The page hit an unexpected error. Reloading usually fixes it.
          </p>
        </div>
        <button className="btn-primary" onClick={() => window.location.reload()}>
          <RotateCw className="h-4 w-4" />
          Reload
        </button>
      </div>
    )
  }
}
