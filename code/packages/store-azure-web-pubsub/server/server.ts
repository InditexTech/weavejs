import cors from "cors";
import express, { Router } from "express";
import { WebPubSubServiceClient, AzureKeyCredential } from "@azure/web-pubsub";
import SyncHandler from "./sync-handler";

const port = process.env.WEAVE_AZURE_WEB_PUBSUB_PORT || 3001;

const endpoint = process.env.WEAVE_AZURE_WEB_PUBSUB_ENDPOINT;
const key = process.env.WEAVE_AZURE_WEB_PUBSUB_KEY;
const hubName = process.env.WEAVE_AZURE_WEB_PUBSUB_HUB_NAME;

if (!endpoint || !key || !hubName) {
  throw new Error("Missing required environment variables");
}

const credentials = new AzureKeyCredential(key ?? "");

const syncClient: WebPubSubServiceClient = new WebPubSubServiceClient(endpoint, credentials, hubName);
const syncHandler = new SyncHandler(hubName, `/api/webpubsub/hubs/${hubName}`, syncClient);

const app = express();

const corsOptions = {
  origin: true,
};

app.use(cors(corsOptions));

const router = new Router();

router.use(syncHandler.getMiddleware());
router.get(`/rooms/:roomId/connect`, (req, res) => syncHandler.clientConnect(req, res));

app.use(`/api/v1/${hubName}`, router);

app.listen(port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server started @ http://0.0.0.0:${port}\n`);
  // eslint-disable-next-line no-console
  console.log("Client endpoints:");
  // eslint-disable-next-line no-console
  console.log(`- Connection\nhttp://localhost:${port}/api/v1/${hubName}/{roomId}/connect`);
});
