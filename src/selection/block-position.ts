export class EditorBlockPosition {
  readonly blockId: string;
  readonly offset: number;

  constructor(blockId: string, offset: number) {
    this.blockId = blockId;
    this.offset = offset;
  }
}