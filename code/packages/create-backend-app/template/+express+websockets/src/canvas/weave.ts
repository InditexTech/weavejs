import { WeaveStoreStandalone } from '@inditextech/weave-store-standalone/server'
import {
  Weave,
  WeaveStageNode,
  WeaveLayerNode,
  WeaveGroupNode,
  WeaveRectangleNode,
  WeaveEllipseNode,
  WeaveLineNode,
  WeaveTextNode,
  WeaveImageNode,
  WeaveVideoNode,
  WeaveStarNode,
  WeaveArrowNode,
  WeaveRegularPolygonNode,
  WeaveFrameNode,
  WeaveStrokeNode,
  // setupSkiaBackend,
  setupCanvasBackend
} from '@inditextech/weave-sdk/server'
import { ColorTokenNode } from './nodes/color-token/color-token.js'
import { isAbsoluteUrl, stripOrigin } from '../utils.js'
import { ServiceConfig } from '../types.js'
import {
  // registerSkiaFonts,
  registerCanvasFonts
} from './fonts.js'

export type RenderWeaveRoom = {
  instance: Weave
  destroy: () => void
}

export const renderWeaveRoom = (
  config: ServiceConfig,
  roomData: string
): Promise<RenderWeaveRoom> => {
  let weave: Weave | undefined = undefined

  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve) => {
    const destroyWeaveRoom = () => {
      if (weave) {
        weave.destroy()
      }
    }

    // Setup Skia backend
    // registerSkiaFonts();
    // await setupSkiaBackend();

    // Setup Canvas backend
    registerCanvasFonts()
    await setupCanvasBackend()

    const store = new WeaveStoreStandalone(
      {
        roomData
      },
      {
        getUser: () => {
          return {
            id: 'user-dummy',
            name: 'User Dummy',
            email: 'user@mail.com'
          }
        }
      }
    )

    weave = new Weave(
      {
        store,
        nodes: getNodes(config),
        actions: [],
        plugins: [],
        fonts: [],
        logger: {
          level: 'info'
        }
      },
      {
        container: undefined,
        width: 800,
        height: 600
      }
    )

    let roomLoaded = false

    const checkIfRoomLoaded = () => {
      if (!weave) {
        return false
      }

      if (!weave.getStage()) {
        return false
      }

      if (roomLoaded && weave.asyncElementsLoaded()) {
        return true
      }

      return false
    }

    weave.addEventListener('onRoomLoaded', async (status: boolean) => {
      if (!weave) {
        return
      }

      if (!weave.getStage()) {
        return false
      }

      if (status) {
        roomLoaded = true
      }

      if (checkIfRoomLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom })
      }
    })

    weave.addEventListener('onAsyncElementChange', () => {
      if (!weave) {
        return
      }

      if (!weave.getStage()) {
        return false
      }

      if (checkIfRoomLoaded()) {
        resolve({ instance: weave, destroy: destroyWeaveRoom })
      }
    })

    weave.start()
  })
}

const getNodes = (config: ServiceConfig) => {
  return [
    new WeaveStageNode(),
    new WeaveLayerNode(),
    new WeaveGroupNode(),
    new WeaveRectangleNode(),
    new WeaveEllipseNode(),
    new WeaveLineNode(),
    new WeaveStrokeNode(),
    new WeaveTextNode(),
    new WeaveImageNode({
      config: {
        urlTransformer: (url: string) => {
          const isAbsolute = isAbsoluteUrl(url)

          let relativeUrl = url
          if (isAbsolute) {
            relativeUrl = stripOrigin(url)
          }

          const transformedUrl = relativeUrl.replace('/weavebff', '')
          return `http://localhost:${config.service.port}${transformedUrl}`
        }
      }
    }),
    new WeaveVideoNode({
      config: {
        urlTransformer: (url: string) => {
          const isAbsolute = isAbsoluteUrl(url)

          let relativeUrl = url
          if (isAbsolute) {
            relativeUrl = stripOrigin(url)
          }

          const transformedUrl = relativeUrl.replace('/weavebff', '')
          return `http://localhost:${config.service.port}${transformedUrl}`
        }
      }
    }),
    new WeaveStarNode(),
    new WeaveArrowNode(),
    new WeaveRegularPolygonNode(),
    new WeaveFrameNode({
      config: {
        fontFamily: "'Inter', sans-serif",
        fontStyle: 'normal',
        fontSize: 14,
        borderColor: '#9E9994',
        fontColor: '#757575',
        titleMargin: 5,
        transform: {
          rotateEnabled: false,
          resizeEnabled: false,
          enabledAnchors: [] as string[]
        }
      }
    }),
    new ColorTokenNode()
  ]
}
