import { Router } from "express";
import { WeaveAzureWebPubsubServer } from "@inditextech/weavejs-store-azure-web-pubsub/server";
import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { streamToBuffer } from "../utils.js";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

let azureWebPubsubServer: WeaveAzureWebPubsubServer | null = null;
let storageInitialized: boolean = false;
let blobServiceClient: BlobServiceClient| null = null;
let containerClient: ContainerClient| null = null;

export function getWeaveAzureWebPubsubServer() {
  if (!azureWebPubsubServer) {
    throw new Error("WeaveAzureWebPubsubServer not initialized");
  }

  return azureWebPubsubServer;
}

async function setupStorage() {
  const config = getServiceConfig();

  const {
    storage: {
      connectionString,
      rooms: { containerName },
    },
  } = config;

  blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString);
  containerClient = blobServiceClient.getContainerClient(containerName);
  if (!(await containerClient.exists())) {
    containerClient = (
      await blobServiceClient.createContainer(containerName)
    ).containerClient;
  }
}

export async function setupRoomsMiddleware(router: Router) {
  const logger = getLogger().child({ module: "middlewares.rooms" });

  logger.info("Setting up Rooms middleware");

  const config = getServiceConfig();

  const {
    pubsub: { endpoint, key, hubName },
  } = config;

  azureWebPubsubServer = new WeaveAzureWebPubsubServer({
    pubsubConfig: {
      endpoint,
      key,
      hubName,
    },

  fetchRoom: async (docName: string) => {
    try {
      if (!storageInitialized) {
        await setupStorage();
      }

      if (!containerClient || !blobServiceClient) {
        return null;
      }

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      if (!(await blockBlobClient.exists())) {
        return null;
      }

      const downloadResponse = await blockBlobClient.download();
      if (!downloadResponse.readableStreamBody) {
        return null;
      }

      const data = await streamToBuffer(
        downloadResponse.readableStreamBody,
      );

      return data;
    } catch (ex) {
      return null;
    }
  },
  persistRoom: async (
    docName: string,
    actualState: Uint8Array<ArrayBufferLike>
  ) => {
    try {
      if (!storageInitialized) {
        await setupStorage();
      }

      if (!containerClient || !blobServiceClient) {
        return;
      }

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      const uploadBlobResponse = await blockBlobClient.upload(
        actualState,
        actualState.length,
      );

      return;
    } catch (ex) {
      return;
    }
  },
  });

  // Setup the Rooms event handler
  router.use(azureWebPubsubServer.getMiddleware());
}
