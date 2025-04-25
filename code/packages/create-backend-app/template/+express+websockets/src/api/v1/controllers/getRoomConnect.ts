import { Request, Response } from 'express';

export const getRoomConnectController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    res.status(200).json({ roomId });
  };
