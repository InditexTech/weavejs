import { WeaveStore } from '@inditextech/weavejs-sdk';
import {
  WeaveAwarenessChange,
  WeaveStoreOptions,
} from '@inditextech/weavejs-types';
import { WebsocketProvider } from 'y-websocket';
import { WEAVE_STORE_WEBSOCKETS } from './constants';
import {
  WeaveStoreWebsocketsConnectionStatus,
  WeaveStoreWebsocketsOptions,
} from './types';

export class WeaveStoreWebsockets extends WeaveStore {
  private websocketOptions: WeaveStoreWebsocketsOptions;
  private roomId: string;
  protected provider!: WebsocketProvider;
  protected name = WEAVE_STORE_WEBSOCKETS;
  protected supportsUndoManager = true;

  constructor(
    storeOptions: WeaveStoreOptions,
    websocketOptions: WeaveStoreWebsocketsOptions
  ) {
    super(storeOptions);

    const { roomId } = websocketOptions;

    this.websocketOptions = websocketOptions;
    this.roomId = roomId;

    this.init();
  }

  private init() {
    const {
      wsOptions: { serverUrl },
    } = this.websocketOptions;

    this.provider = new WebsocketProvider(
      serverUrl,
      this.roomId,
      this.getDocument(),
      {
        connect: false,
        disableBc: true,
      }
    );

    this.provider.on(
      'status',
      ({ status }: { status: WeaveStoreWebsocketsConnectionStatus }) => {
        this.websocketOptions.callbacks?.onConnectionStatusChange?.(status);
        this.instance.emitEvent('onConnectionStatusChange', status);
      }
    );
  }

  connect() {
    this.provider.connect();
  }

  disconnect() {
    this.provider.connect();
  }

  setAwarenessInfo(field: string, value: unknown) {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }

  onAwarenessChange<K extends string, T>(
    callback: (changes: WeaveAwarenessChange<K, T>[]) => void
  ): void {
    const awareness = this.provider.awareness;
    awareness.on('change', () => {
      const values = Array.from(awareness.getStates().values());
      values.splice(awareness.clientID, 1);
      callback(values as WeaveAwarenessChange<K, T>[]);
    });
  }
}
