import { WeaveAwarenessChange, WeaveStore } from "@weavejs/sdk";
import { WebPubSubSyncClient } from "y-azure-webpubsub-client";
import { WEAVER_STORE_AZURE_WEB_PUBSUB, WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS } from "./constants";
import { WeaveStoreAzureWebPubsubOptions } from "./types";

export class WeaveStoreAzureWebPubsub extends WeaveStore {
  private config: WeaveStoreAzureWebPubsubOptions;
  private roomId: string;
  protected provider!: WebPubSubSyncClient;
  protected name = WEAVER_STORE_AZURE_WEB_PUBSUB;
  protected supportsUndoManager = true;

  constructor(options: WeaveStoreAzureWebPubsubOptions) {
    super();

    const { roomId } = options;

    this.config = options;
    this.roomId = roomId;

    this.init();
  }

  private init() {
    const { url } = this.config;

    this.provider = new WebPubSubSyncClient(`${url}?id=${this.roomId}`, this.roomId, this.getDocument());

    this.provider.ws?.addEventListener("open", (event) => {
      console.log(event);
      this.config.callbacks?.onConnectionStatusChange?.(WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTED);
      this.instance.emitEvent("onConnectionStatusChange", WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.CONNECTED);
    });

    this.provider.ws?.addEventListener("close", (event) => {
      console.log(event);
      this.config.callbacks?.onConnectionStatusChange?.(WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED);
      this.instance.emitEvent("onConnectionStatusChange", WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED);
    });
  }

  connect() {
    this.config.callbacks?.onConnectionStatusChange?.(WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED);
    this.instance.emitEvent("onConnectionStatusChange", WEAVER_STORE_AZURE_WEB_PUBSUB_CONNECTION_STATUS.DISCONNECTED);

    this.provider.start();
  }

  disconnect() {
    this.provider.stop();
  }

  setAwarenessInfo(field: string, value: unknown) {
    const awareness = this.provider.awareness;
    awareness.setLocalStateField(field, value);
  }

  onAwarenessChange<K extends string, T>(callback: (changes: WeaveAwarenessChange<K, T>[]) => void): void {
    const awareness = this.provider.awareness;
    awareness.on("change", () => {
      const values = Array.from(awareness.getStates().values());
      values.splice(awareness.clientID, 1);
      callback(values as WeaveAwarenessChange<K, T>[]);
    });
  }
}
