import { Network, ConnectionStatus } from '@capacitor/network';

export function listenNetworkStatus(onChange: (status: ConnectionStatus) => void) {
  try {
    const handle = Network.addListener('networkStatusChange', onChange);
    return () => {
      handle.then(h => h.remove());
    };
  } catch {
    return () => {};
  }
}

export async function getCurrentNetworkStatus(): Promise<ConnectionStatus> {
  try {
    return await Network.getStatus();
  } catch {
    return { connected: true, connectionType: 'wifi' };
  }
}
