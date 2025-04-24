export type ServiceConfig = {
  service: {
    hostname: string;
    port: number;
  };
  pubsub: {
    endpoint: string;
    key: string;
    hubName: string;
    persistFrequencySeg: number;
  };
  storage: {
    connectionString: string;
    rooms: {
      containerName: string;
    };
    images: {
      containerName: string;
    };
  };
};

export type RoomsEventHandlerOptions = {
  persistFrequencySeg: number;
};
