import { Component, type ReactNode } from 'react';
import { StateView } from '@/components/state-view';

export class DeviceFeatureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <StateView kind="error" title="Fitur perangkat belum tersedia"
      message="Pasang development build Hadirin terbaru yang menyertakan kamera, lokasi, dan notifikasi. Tutup pemindai sebelum mencoba lagi." /> : this.props.children;
  }
}
