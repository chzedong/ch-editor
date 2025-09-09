export type SimpleBlockPositionType = 'home' | 'end' | 'middle';

export interface SimpleBlockPosition {
  offset: number;
  type: SimpleBlockPositionType;
  blockId: string;
}

export class EditorBlockPosition implements SimpleBlockPosition {
  readonly blockId: string;
  readonly offset: number;
  readonly type: SimpleBlockPositionType;

  constructor(blockId: string, offset: number, type: SimpleBlockPositionType = 'middle') {
    this.blockId = blockId;
    this.offset = offset;
    this.type = type;
  }

  toJSON(): SimpleBlockPosition {
    return {
      blockId: this.blockId,
      offset: this.offset,
      type: this.type
    };
  }

  static fromJSON(json: SimpleBlockPosition) {
    return new EditorBlockPosition(json.blockId, json.offset, json.type);
  }
}
