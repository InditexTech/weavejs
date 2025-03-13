import { WeaveExportNodeActionParams } from './types';
import {
  WEAVE_EXPORT_BACKGROUND_COLOR,
  WEAVE_EXPORT_FILE_FORMAT,
  WEAVE_EXPORT_FORMATS,
} from '@/constants';
import { WeaveExportNodeOptions, WeaveElementInstance } from '@/types';
import { WeaveAction } from '../action';

export class WeaveExportNodeToolAction extends WeaveAction {
  protected cancelAction!: () => void;
  private defaultFormatOptions: WeaveExportNodeOptions = {
    format: WEAVE_EXPORT_FORMATS.PNG,
    padding: 0,
    pixelRatio: 1,
    backgroundColor: WEAVE_EXPORT_BACKGROUND_COLOR,
    quality: 1,
  };
  private options!: WeaveExportNodeOptions;
  internalUpdate = undefined;
  init = undefined;

  getName(): string {
    return 'exportNodeTool';
  }

  private async exportNode(node: WeaveElementInstance) {
    const img = await this.instance.exportNode(node, this.options);

    const link = document.createElement('a');
    link.href = img.src;
    link.download = `node-${node.getAttrs().id}${
      WEAVE_EXPORT_FILE_FORMAT[this.options.format ?? WEAVE_EXPORT_FORMATS.PNG]
    }`;
    link.click();

    this.cancelAction?.();
  }

  async trigger(
    cancelAction: () => void,
    { node, options }: WeaveExportNodeActionParams
  ) {
    if (!this.instance) {
      throw new Error('Instance not defined');
    }

    const stage = this.instance.getStage();

    stage.container().tabIndex = 1;
    stage.container().focus();

    this.cancelAction = cancelAction;

    this.options = {
      ...this.defaultFormatOptions,
      ...options,
    };
    await this.exportNode(node);
  }

  cleanup() {
    const stage = this.instance.getStage();

    stage.container().tabIndex = 0;
    stage.container().click();
    stage.container().focus();
  }
}
