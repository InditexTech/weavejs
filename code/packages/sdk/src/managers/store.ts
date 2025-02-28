import { Logger } from "pino";
import { Weave } from "@/weave";
import { WeaveStore } from "@/stores/store";

export class WeaveStoreManager {
  private instance: Weave;
  private store!: WeaveStore;
  private logger: Logger;

  constructor(instance: Weave) {
    this.instance = instance;
    this.logger = this.instance.getChildLogger("store-manager");
    this.logger.debug("Store manager created");
  }

  getStore<T extends WeaveStore>() {
    return this.store as T;
  }

  registerStore(store: WeaveStore) {
    if (this.store) {
      const msg = `Store already exists`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    const storeInstance = store.register(this.instance);
    this.store = storeInstance;
  }
}
