import cors from "cors";
import express from "express";
import { WebPubSubServiceClient, AzureKeyCredential } from "@azure/web-pubsub";
import SyncHandler from "./sync-handler";

const azureWebPubsubEndpoint = "https://weavejs-pubusb.webpubsub.azure.com";
const azureWebPubsubCredentials = new AzureKeyCredential(
  "1fkkt7JIBpRFDjf2K7sbNXdrKwBILphD8fEJM2VZ61ex9HHt6GKYJQQJ99BBAC5RqLJXJ3w3AAAAAWPSVIoM",
);
const hubName = "WeavejsTest";

const syncClient: WebPubSubServiceClient = new WebPubSubServiceClient(
  azureWebPubsubEndpoint,
  azureWebPubsubCredentials,
  hubName,
);
const syncHandler = new SyncHandler(hubName, `/api/webpubsub/hubs/${hubName}`, syncClient);

const app = express();

const corsOptions = {
  origin: true,
};
const corsMiddleware = cors(corsOptions);

app.options(`/${hubName}/negotiate`, corsMiddleware);
app.get(`/${hubName}/negotiate`, corsMiddleware, (req, res) => syncHandler.client_negotiate(req, res));

app.use(syncHandler.getMiddleware());

app.use(express.static("public"));
app.listen(1235, () => console.log("Azure Web PubSub store server started @ http://0.0.0.0:1235"));
