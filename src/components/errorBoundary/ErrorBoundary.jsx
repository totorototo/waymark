import { Component } from "react";

import { Fallback } from "./ErrorBoundary.style.js";

/**
 * Keeps a render error to the part of the page that threw: React 19 unmounts the whole root
 * otherwise. Shows `message` in its place, and tries again when `resetKey` changes (a new
 * report).
 * why: a class: React catches render errors only in componentDidCatch /
 * getDerivedStateFromError, which have no hook equivalent. React logs the error itself.
 */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error) {
    return { error };
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey === state.resetKey) return null;
    return { error: null, resetKey: props.resetKey };
  }

  render() {
    if (this.state.error) {
      return (
        <Fallback role="alert" className={this.props.className}>
          {this.props.message}
        </Fallback>
      );
    }
    return this.props.children;
  }
}
