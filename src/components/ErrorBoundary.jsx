import { Component } from "react";

/* Keeps one broken popup from ever blanking the whole 3D world.
   Wrap anything non-critical (modals, overlays) with this. */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[Zyverse] UI error contained:", error);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}