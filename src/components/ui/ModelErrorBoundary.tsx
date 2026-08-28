"use client";

import React from "react";

interface Props {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ModelErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Expected when no external .glb is present in /public/models/ — smoothly falls back to procedural
    console.info("[kaos-kami] Notice: External GLTF model not loaded. Activating procedural garment fallback.", error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}
