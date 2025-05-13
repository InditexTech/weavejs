import { Express, Router } from 'express'
import multer from 'multer'
import { getAzureWebPubsubServer } from '@/store'
import { getHealthController } from './controllers/getHealth.js'
import { getRoomConnectController } from './controllers/getRoomConnect.js'
import { getImageController } from './controllers/getImage.js'
import { postUploadImageController } from './controllers/postUploadImage.js'
import { delImageController } from './controllers/delImage.js'
import { getImagesController } from './controllers/getImages.js'
import { postRemoveBackgroundController } from './controllers/postRemoveBackground.js'

const router: Router = Router()

export function getApiV1Router() {
  return router
}

export function setupApiV1Router(app: Express) {
  const router: Router = Router()

  // Setup multer to upload files
  const upload = multer()

  // Setup router routes
  router.get(`/health`, getHealthController())

  // Room handling API
  router.use(getAzureWebPubsubServer().getMiddleware())
  router.get(`/rooms/:roomId/connect`, getRoomConnectController())

  // Images handling API
  router.get(`/rooms/:roomId/images`, getImagesController())
  router.get(`/rooms/:roomId/images/:imageId`, getImageController())
  router.post(
    `/rooms/:roomId/images/:imageId/remove-background`,
    postRemoveBackgroundController()
  )
  router.post(
    `/rooms/:roomId/images`,
    upload.single('file'),
    postUploadImageController()
  )
  router.delete(`/rooms/:roomId/images/:imageId`, delImageController())

  app.use('/api/v1', router)
}
