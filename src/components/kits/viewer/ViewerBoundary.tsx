import { Component, type ReactNode } from 'react'

/** Si el chunk del visor o el modelo fallan, queda el póster: se avisa y no se dibuja nada. */
export class ViewerBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onError()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}
