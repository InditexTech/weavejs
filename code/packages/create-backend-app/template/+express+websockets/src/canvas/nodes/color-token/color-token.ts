import Konva from 'konva'
import { WeaveNode } from '@inditextech/weave-sdk/server'
import {
  WeaveElementAttributes,
  WeaveElementInstance
} from '@inditextech/weave-types'

export const COLOR_TOKEN_NODE_TYPE = 'color-token'

export class ColorTokenNode extends WeaveNode {
  protected nodeType = COLOR_TOKEN_NODE_TYPE

  onRender(props: WeaveElementAttributes) {
    const { id } = props

    const colorTokenColor = props.colorToken ?? '#DEFFA0'

    const colorTokenParams = {
      ...props
    }
    delete colorTokenParams.zIndex

    const colorTokenNode = new Konva.Group({
      ...colorTokenParams,
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      name: 'node'
    })

    this.setupDefaultNodeAugmentation(colorTokenNode)

    const internalRect = new Konva.Rect({
      groupId: id,
      nodeId: id,
      id: `${id}-colorToken`,
      x: 0,
      y: 0,
      fill: '#FFFFFFFF',
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      strokeEnabled: false
    })

    colorTokenNode.add(internalRect)

    const internalRect2 = new Konva.Rect({
      id: `${id}-colorToken-1`,
      groupId: id,
      nodeId: id,
      x: 0,
      y: 0,
      fill: colorTokenColor,
      strokeWidth: 0,
      strokeEnabled: false,
      width: colorTokenParams.width,
      height: (colorTokenParams.height ?? 0) - 60,
      listening: false,
      draggable: false
    })

    colorTokenNode.add(internalRect2)

    const internalText = new Konva.Text({
      id: `${id}-colorToken-code`,
      groupId: id,
      nodeId: id,
      x: 20,
      y: 260,
      fontSize: 20,
      fontFamily: 'Inter, sans-serif',
      fill: '#CCCCCCFF',
      strokeEnabled: false,
      stroke: '#000000FF',
      strokeWidth: 1,
      text: `${colorTokenColor}`,
      width: (colorTokenParams.width ?? 0) - 40,
      height: 20,
      align: 'left',
      listening: false,
      draggable: false
    })

    colorTokenNode.add(internalText)

    const border = new Konva.Rect({
      groupId: id,
      nodeId: id,
      id: `${id}-colorToken-border`,
      x: 0,
      y: 0,
      fill: 'transparent',
      width: colorTokenParams.width,
      height: colorTokenParams.height,
      strokeScaleEnabled: true,
      stroke: 'black',
      strokeWidth: 1
    })

    colorTokenNode.add(border)
    border.moveToTop()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(colorTokenNode as any).getTransformerProperties = () => {
      const baseConfig = this.defaultGetTransformerProperties({})
      return {
        ...baseConfig,
        resizeEnabled: false,
        enabledAnchors: [] as string[],
        borderStrokeWidth: 2,
        padding: 0
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(colorTokenNode as any).allowedAnchors = () => {
      return []
    }

    this.setupDefaultNodeEvents(colorTokenNode)

    return colorTokenNode
  }

  onUpdate(
    nodeInstance: WeaveElementInstance,
    nextProps: WeaveElementAttributes
  ) {
    const { id, colorToken } = nextProps

    const colorTokenNode = nodeInstance as Konva.Group

    const nodeInstanceZIndex = nodeInstance.zIndex()
    nodeInstance.setAttrs({
      ...nextProps,
      zIndex: nodeInstanceZIndex
    })

    const colorTokenColor = colorToken ?? '#DEFFA0'

    const colorTokenNode1 = colorTokenNode.findOne(`#${id}-colorToken-1`)
    if (colorTokenNode1) {
      colorTokenNode1.setAttrs({
        fill: colorTokenColor
      })
    }
    const colorTokenCode = colorTokenNode.findOne(`#${id}-colorToken-code`)
    if (colorTokenCode) {
      colorTokenCode.setAttr('text', `${colorTokenColor}`)
    }
  }
}
