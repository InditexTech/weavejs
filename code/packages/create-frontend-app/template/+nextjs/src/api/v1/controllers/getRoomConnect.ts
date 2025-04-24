import { Request, Response } from "express";
import { getWeaveAzureWebPubsubServer } from "../../../middlewares/rooms.js";

export const getRoomConnectController =
  () => async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const url = await getWeaveAzureWebPubsubServer().clientConnect(roomId);

    res.status(200).json({ url });
  };
