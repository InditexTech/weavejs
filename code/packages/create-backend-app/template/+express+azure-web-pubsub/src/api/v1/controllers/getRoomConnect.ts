import { Request, Response } from 'express'
import { getAzureWebPubsubServer } from '@/store'

export const getRoomConnectController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId

    if (!getAzureWebPubsubServer) {
      res.status(500).json({ error: 'Azure Web PubSub server not found' })
      return
    }

    const url = await getAzureWebPubsubServer().clientConnect(roomId)

    res.status(200).json({ url })
  }
