// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import Konva from 'konva';

export interface TextWithMaxLinesConfig extends Konva.TextConfig {
  maxLines?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CreateTextWithMaxLines(): any {
  return class TextWithMaxLines extends Konva.Text {
    private _maxLines?: number;
    private _fullText: string;

    constructor(config: Konva.TextConfig & TextWithMaxLinesConfig) {
      super(config);
      this._maxLines = config.maxLines;
      this._fullText = config.text?.toString() ?? '';

      this.on(
        'textChange widthChange fontSizeChange fontFamilyChange fontStyleChange ' +
          'paddingChange alignChange letterSpacingChange lineHeightChange wrapChange',
        () => this._applyTruncation()
      );

      this._applyTruncation();
    }

    get maxLines() {
      return this._maxLines;
    }
    set maxLines(v: number | undefined) {
      this._maxLines = v;
      this._applyTruncation();
    }

    override setText(text: string) {
      if (typeof text === 'undefined') return this;
      this._fullText = text ?? '';
      super.setText(this._fullText);
      this._applyTruncation();
      return this;
    }

    private _applyTruncation() {
      if (!this._maxLines || this._maxLines <= 0) {
        super.setText(this._fullText);
        return;
      }

      super.setText(this._fullText);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const selfAny = this as any;
      if (typeof selfAny._setTextData === 'function') selfAny._setTextData();
      let textArr: Array<{ text: string }> = selfAny.textArr || [];

      if (textArr.length > this._maxLines) {
        // cut maxLines and add...
        const visible = textArr.slice(0, this._maxLines).map((l) => l.text);
        const candidate = visible[visible.length - 1] + '…';

        super.setText([...visible.slice(0, -1), candidate].join('\n'));

        // recalculate textArr with the truncated text
        if (typeof selfAny._setTextData === 'function') selfAny._setTextData();
        textArr = selfAny.textArr || [];
      }

      // we now use the real text length
      const lines = textArr.length;
      const fontSize = this.fontSize();
      const lineHeight = this.lineHeight() || 1;

      this.height(fontSize * lineHeight * lines);
    }
  };
}
