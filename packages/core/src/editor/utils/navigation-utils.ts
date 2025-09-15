import { getBlockId, isFirstBlock, isLastBlock, findPrevBlock, findNextBlock, getBlockType } from '../../block/block-dom';
import { Editor } from '../editor';
import { EditorBlockPosition } from '../../selection/block-position';
import { isTextKindBlock } from '../../text/text-block';
import { LineBreaker, TextLine } from '../../text/line/text-line';
import { assert } from '../../utils/assert';
import { BlockElement } from '../../index.type';

/**
 * 导航方向枚举
 */
export enum NavigationDirection {
  UP = 'up',
  DOWN = 'down'
}

/**
 * 根据X坐标在指定行中查找最接近的位置
 * 这是所有导航操作中最核心的通用函数
 */
export function findPositionByX(
  editor: Editor,
  blockId: string,
  line: TextLine,
  targetX: number
): EditorBlockPosition {
  const block = editor.getBlockById(blockId);
  const lineBreaker = new LineBreaker(block);

  // 处理空行的情况
  if (line.start === line.end) {
    return new EditorBlockPosition(blockId, line.start, 'home');
  }

  // 尝试使用坐标转换API
  const lineRect = line.getLineRect();
  const y = lineRect.top + lineRect.height / 2; // 行的中心Y坐标
  const position = lineBreaker.getPositionFromPoint(targetX, y);

  assert(position.offset >= line.start, 'position.offset should be greater than or equal to line.start');
  assert(position.offset <= line.end, 'position.offset should be less than or equal to line.end');

  return new EditorBlockPosition(blockId, position.offset, position.type);
}

/**
 * 获取目标块中的目标行
 * @param block 目标块
 * @param direction 导航方向
 * @param editor 编辑器实例
 * @returns 目标行，如果块为空则返回null
 */
export function getTargetLineInBlock(
  block: BlockElement,
  direction: NavigationDirection
): TextLine {
  const lineBreaker = new LineBreaker(block);
  assert(lineBreaker.lineCount > 0, 'lineBreaker.lineCount should be greater than 0');

  if (direction === NavigationDirection.UP) {
    // 向上导航时，移动到目标块的最后一行
    return lineBreaker.lines[lineBreaker.lineCount - 1];
  } else {
    // 向下导航时，移动到目标块的第一行
    return lineBreaker.lines[0];
  }
}

/**
 * 获取或初始化目标列X坐标
 * @param editor 编辑器实例
 * @returns 目标列X坐标
 */
export function getOrInitializeTargetX(editor: Editor): number | null {
  let targetX = editor.getTargetColumnX();
  if (targetX === null) {
    // 如果没有目标列状态，使用当前位置的X坐标
    editor.updateTargetColumnX();
    targetX = editor.getTargetColumnX();
  }
  return targetX;
}

export function findDownPosition(
  editor: Editor,
  focusPos: EditorBlockPosition
) {
  const block = editor.getBlockById(focusPos.blockId);

  if (!isTextKindBlock(editor, block)) {
    return moveDownToNextBlock(editor, block);
  }

  assert(isTextKindBlock(editor, block), 'not text kind block');
  const lineBreaker = new LineBreaker(block);

  // 处理空块的情况
  if (lineBreaker.lineCount === 0) {
    return moveDownToNextBlock(editor, block);
  }

  const currentLineIndex = lineBreaker.getLineIndex(focusPos);

  const targetLineIndex = currentLineIndex < lineBreaker.lineCount - 1 ? currentLineIndex + 1 : null;
  // 如果可以在当前块内向下移动
  if (targetLineIndex !== null) {
    const targetLine = lineBreaker.lines[targetLineIndex];
    const targetX = getOrInitializeTargetX(editor);

    assert(!!targetX, 'targetX is null');
    // 在目标行中找到最接近目标X坐标的位置
    const targetPos = findPositionByX(editor, focusPos.blockId, targetLine, targetX);
    return targetPos;
  }
  // 如果在最后一行，尝试移动到下一个块
  if (!isLastBlock(block)) {
    return moveDownToNextBlock(editor, block);
  }

  return null;
}

/**
 * 移动到下一个块
 */
function moveDownToNextBlock(editor: Editor, currentBlock: BlockElement) {
  const nextBlock = findNextBlock(currentBlock);
  if (!nextBlock) {
    return null;
  }

  if (!isTextKindBlock(editor, nextBlock)) {
    return getBlockStartPosition(editor, nextBlock);
  }

  const targetX = getOrInitializeTargetX(editor);
  const targetLine = getTargetLineInBlock(nextBlock, NavigationDirection.DOWN);

  assert(typeof targetX === 'number', 'targetX is null');
  // 在目标行中找到最接近目标X坐标的位置
  const targetPos = findPositionByX(editor, getBlockId(nextBlock), targetLine, targetX);

  return targetPos;
}


export function findUpPosition(editor: Editor, focusPos: EditorBlockPosition) {
  const block = editor.getBlockById(focusPos.blockId);

  if (!isTextKindBlock(editor, block)) {
    return moveUpToPreviousBlock(editor, block);
  }

  assert(isTextKindBlock(editor, block), 'not text kind block');
  const lineBreaker = new LineBreaker(block);

  // 处理空块的情况
  if (lineBreaker.lineCount === 0) {
    return moveUpToPreviousBlock(editor, block);
  }

  const currentLineIndex = lineBreaker.getLineIndex(focusPos);
  const targetLineIndex = currentLineIndex > 0 ? currentLineIndex - 1 : null;

  // 如果可以在当前块内向上移动
  if (targetLineIndex !== null) {
    const targetLine = lineBreaker.lines[targetLineIndex];
    const targetX = getOrInitializeTargetX(editor);

    assert(!!targetX, 'targetX is null');
    // 在目标行中找到最接近目标X坐标的位置
    const targetPos = findPositionByX(editor, focusPos.blockId, targetLine, targetX);
    return targetPos;
  }

  // 如果在第一行，尝试移动到上一个块
  if (!isFirstBlock(block)) {
    return moveUpToPreviousBlock(editor, block);
  }

  return null;
}

export function getBlockEndPosition(editor: Editor, block: BlockElement) {
  const blockClass = editor.editorBlocks.getBlockClass(getBlockType(block));
  const len = blockClass.getBlockTextLength(editor.getBlockData(block));
  return new EditorBlockPosition(getBlockId(block), len, 'end');
}

export function getBlockStartPosition(editor: Editor, block: BlockElement) {
  return new EditorBlockPosition(getBlockId(block), 0, 'home');
}

/**
 * 移动到上一个块
 */
function moveUpToPreviousBlock(editor: Editor, currentBlock: BlockElement) {
  const prevBlock = findPrevBlock(currentBlock);
  if (!prevBlock) {
    return null;
  }

  if (!isTextKindBlock(editor, prevBlock)) {
    return getBlockEndPosition(editor, prevBlock);
  }

  const targetX = getOrInitializeTargetX(editor);
  const targetLine = getTargetLineInBlock(prevBlock, NavigationDirection.UP);

  assert(typeof targetX === 'number', 'targetX is null');
  // 在目标行中找到最接近目标X坐标的位置
  return findPositionByX(editor, getBlockId(prevBlock), targetLine, targetX);
}
