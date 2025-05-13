import { Request, Response } from 'express'
import { ImagesPersistenceHandler } from '../../../images/persistence.js'

export const getImagesController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId

    const pageSize = parseInt(
      (req.query.pageSize as string | undefined) ?? '20'
    )
    const page = parseInt((req.query.page as string | undefined) ?? '1')

    const images = await persistenceHandler.list(roomId, pageSize, page)

    res.status(200).json(images)
  }
}
