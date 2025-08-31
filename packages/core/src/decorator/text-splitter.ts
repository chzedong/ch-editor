import { DocBlockText, DocBlockTextOp } from '../index.type';
import { isBoxOp, isTextOp } from '../box/box-data-model';
import { BaseDecorator, DecoratorRange, WidgetDecorator, WidgetRange } from './base-decorator';
import { assert } from '../main';

/**
 * 文本操作片段
 * 表示经过装饰器分割后的最小文本单元
 */
export interface TextOpSegment {
  /** 原始操作 */
  originalOp: DocBlockTextOp | null;
  /** 在原始操作中的起始位置 */
  startInOp: number;
  /** 在原始操作中的结束位置 */
  endInOp: number;
  /** 在整个块文本中的起始位置 */
  globalStart: number;
  /** 在整个块文本中的结束位置 */
  globalEnd: number;
  /** 应用的装饰器 */
  decorators: BaseDecorator[];
  /** 是否为Box操作 */
  isBox: boolean;
  /** 是否为Widget片段 */
  isWidget: boolean;
  /** Widget装饰器（如果是Widget片段） */
  widgetDecorator?: WidgetDecorator;
  /** Widget数据（如果是Widget片段） */
  widgetData?: any;
}

/**
 * 分割点信息
 */
interface SplitPoint {
  /** 全局偏移量 */
  globalOffset: number;
  /** 操作索引 */
  opIndex: number;
  /** 在操作内的偏移量 */
  offsetInOp: number;
  /** 分割类型 */
  type: ('decorator-start' | 'decorator-end' | 'op-boundary' | 'widget')[];
  /** 相关装饰器（如果是装饰器分割点） */
  decorator?: BaseDecorator | WidgetDecorator;
}

/**
 * 文本分割器
 * 负责将DocBlockText根据装饰器范围进行精确分割
 */
export class TextSplitter {
  /**
   * 分割文本操作以应用装饰器
   * @param blockText 块文本操作数组
   * @param decoratorRanges 装饰器范围数组
   * @param widgetRanges Widget范围列表
   * @returns 分割后的文本片段数组
   */
  static splitTextOps(blockText: DocBlockText, decoratorRanges: DecoratorRange[], widgetRanges: WidgetRange[] = []): TextOpSegment[] {
    if (blockText.length === 0) {
      return [];
    }

    // 计算所有分割点（包括widget范围）
    const splitPoints = this.calculateSplitPoints(blockText, decoratorRanges, widgetRanges);

    // 根据分割点创建片段（包括widget片段）
    return this.createSegments(blockText, splitPoints, decoratorRanges, widgetRanges);
  }

  /**
   * 计算所有需要分割的点
   */
  private static calculateSplitPoints(blockText: DocBlockText, decoratorRanges: DecoratorRange[], widgetRanges: WidgetRange[]): SplitPoint[] {
    const splitPoints: SplitPoint[] = [];
    let globalOffset = 0;

    // 添加操作边界分割点
    blockText.forEach((op, opIndex) => {
      // 操作开始点
      splitPoints.push({
        globalOffset,
        opIndex,
        offsetInOp: 0,
        type: ['op-boundary']
      });

      const opLength = this.getOpLength(op);
      globalOffset += opLength;

      // 操作结束点
      splitPoints.push({
        globalOffset,
        opIndex,
        offsetInOp: opLength,
        type: ['op-boundary']
      });
    });

    // 添加装饰器分割点
    decoratorRanges.forEach((range) => {
      // 装饰器开始点
      const startPoint = this.globalOffsetToOpPosition(blockText, range.start);
      if (startPoint) {
        splitPoints.push({
          globalOffset: range.start,
          opIndex: startPoint.opIndex,
          offsetInOp: startPoint.offsetInOp,
          type: ['decorator-start'],
          decorator: range.decorator
        });
      }

      // 装饰器结束点
      const endPoint = this.globalOffsetToOpPosition(blockText, range.end);
      if (endPoint) {
        splitPoints.push({
          globalOffset: range.end,
          opIndex: endPoint.opIndex,
          offsetInOp: endPoint.offsetInOp,
          type: ['decorator-end'],
          decorator: range.decorator
        });
      }
    });

    // 添加widget范围的分割点
    widgetRanges.forEach((widgetRange) => {
      const widgetPoint = this.globalOffsetToOpPosition(blockText, widgetRange.position);
      if (widgetPoint) {
        splitPoints.push({
          globalOffset: widgetRange.position,
          opIndex: widgetPoint.opIndex,
          offsetInOp: widgetPoint.offsetInOp,
          type: ['widget'],
          decorator: widgetRange.decorator
        });
      }
    });

    // 排序并去重
    return this.sortAndDeduplicateSplitPoints(splitPoints);
  }

  /**
   * 将全局偏移量转换为操作位置
   */
  private static globalOffsetToOpPosition(blockText: DocBlockText, globalOffset: number): { opIndex: number; offsetInOp: number } | null {
    let currentOffset = 0;

    for (let opIndex = 0; opIndex < blockText.length; opIndex++) {
      const op = blockText[opIndex];
      const opLength = this.getOpLength(op);

      if (globalOffset >= currentOffset && globalOffset <= currentOffset + opLength) {
        return {
          opIndex,
          offsetInOp: globalOffset - currentOffset
        };
      }

      currentOffset += opLength;
    }

    return null;
  }

  /**
   * 获取操作的长度
   */
  private static getOpLength(op: DocBlockTextOp): number {
    if (isBoxOp(op)) {
      return 1; // Box操作占用1个字符位置
    }
    if (isTextOp(op)) {
      return op.insert.length;
    }
    return 0;
  }

  /**
   * 排序并去重分割点
   */
  private static sortAndDeduplicateSplitPoints(splitPoints: SplitPoint[]): SplitPoint[] {
    // 按全局偏移量排序
    splitPoints.sort((a, b) => {
      if (a.globalOffset !== b.globalOffset) {
        return a.globalOffset - b.globalOffset;
      }
      // 相同位置时，优先处理操作边界
      if (a.type.includes('op-boundary') && !b.type.includes('op-boundary')) {
        return -1;
      }
      if (b.type.includes('op-boundary') && !a.type.includes('op-boundary')) {
        return 1;
      }
      return 0;
    });

    // 去重：相同位置的分割点合并
    const deduplicated: SplitPoint[] = [];
    let lastOffset = -1;
    let lastPoint: SplitPoint | null = null;

    for (const point of splitPoints) {
      if (point.globalOffset !== lastOffset) {
        deduplicated.push(point);
        lastOffset = point.globalOffset;
        lastPoint = point;
      } else if (lastPoint) {
        // 合并相同位置的type到数组中
        for (const type of point.type) {
          if (!lastPoint.type.includes(type)) {
            lastPoint.type.push(type);
          }
        }
        // 如果有装饰器信息，保留第一个非空的
        if (!lastPoint.decorator && point.decorator) {
          lastPoint.decorator = point.decorator;
        }
      }
    }

    return deduplicated;
  }

  /**
   * 根据分割点创建片段
   */
  private static createSegments(blockText: DocBlockText, splitPoints: SplitPoint[], decoratorRanges: DecoratorRange[], widgetRanges: WidgetRange[]): TextOpSegment[] {
    const segments: TextOpSegment[] = [];

    for (let i = 0; i < splitPoints.length - 1; i++) {
      const startPoint = splitPoints[i];
      const endPoint = splitPoints[i + 1];

      // 检查是否为widget分割点
      if (startPoint.type.includes('widget')) {
        const widgetSegment = this.createWidgetSegment(startPoint, widgetRanges);
        if (widgetSegment) {
          segments.push(widgetSegment);
        }
      }

      // 跳过零长度片段
      if (startPoint.globalOffset >= endPoint.globalOffset) {
        continue;
      }

      // 处理跨操作的片段
      if (startPoint.opIndex !== endPoint.opIndex) {
        // 分割跨操作的片段
        const crossOpSegments = this.createCrossOpSegments(blockText, startPoint, endPoint, decoratorRanges);
        segments.push(...crossOpSegments);
      } else {
        // 单操作内的片段
        const segment = this.createSingleOpSegment(blockText, startPoint, endPoint, decoratorRanges);
        if (segment) {
          segments.push(segment);
        }
      }
    }

    return segments;
  }

  /**
   * 创建跨操作的片段
   */
  private static createCrossOpSegments(
    blockText: DocBlockText,
    startPoint: SplitPoint,
    endPoint: SplitPoint,
    decoratorRanges: DecoratorRange[]
  ): TextOpSegment[] {
    const segments: TextOpSegment[] = [];
    let currentGlobalOffset = startPoint.globalOffset;

    for (let opIndex = startPoint.opIndex; opIndex <= endPoint.opIndex; opIndex++) {
      const op = blockText[opIndex];
      const opLength = this.getOpLength(op);

      let startInOp: number;
      let endInOp: number;

      if (opIndex === startPoint.opIndex) {
        startInOp = startPoint.offsetInOp;
        endInOp = opLength;
      } else if (opIndex === endPoint.opIndex) {
        startInOp = 0;
        endInOp = endPoint.offsetInOp;
      } else {
        startInOp = 0;
        endInOp = opLength;
      }

      // 跳过零长度片段
      if (startInOp >= endInOp) {
        continue;
      }

      const segmentStart = currentGlobalOffset + startInOp;
      const segmentEnd = currentGlobalOffset + endInOp;

      const segment: TextOpSegment = {
        originalOp: op,
        startInOp,
        endInOp,
        globalStart: segmentStart,
        globalEnd: segmentEnd,
        decorators: this.getApplicableDecorators(decoratorRanges, segmentStart, segmentEnd),
        isBox: isBoxOp(op),
        isWidget: false
      };

      segments.push(segment);
      currentGlobalOffset += opLength;
    }

    return segments;
  }

  /**
   * 创建单操作内的片段
   */
  private static createSingleOpSegment(
    blockText: DocBlockText,
    startPoint: SplitPoint,
    endPoint: SplitPoint,
    decoratorRanges: DecoratorRange[]
  ): TextOpSegment | null {
    const op = blockText[startPoint.opIndex];
    const startInOp = startPoint.offsetInOp;
    const endInOp = endPoint.offsetInOp;

    // 跳过零长度片段
    if (startInOp >= endInOp) {
      return null;
    }

    const segment: TextOpSegment = {
      originalOp: op,
      startInOp,
      endInOp,
      globalStart: startPoint.globalOffset,
      globalEnd: endPoint.globalOffset,
      decorators: this.getApplicableDecorators(decoratorRanges, startPoint.globalOffset, endPoint.globalOffset),
      isBox: isBoxOp(op),
      isWidget: false
    };

    return segment;
  }

  /**
   * 创建widget片段
   */
  private static createWidgetSegment(
    widgetPoint: SplitPoint,
    widgetRanges: WidgetRange[]
  ): TextOpSegment | null {
    // 查找对应的widget范围
    const widgetRange = widgetRanges.find(
      range => range.position === widgetPoint.globalOffset
    );

    if (!widgetRange) {
      return null;
    }

    // 创建widget片段
    const segment: TextOpSegment = {
      originalOp: null, // widget没有原始操作
      startInOp: widgetPoint.offsetInOp,
      endInOp: widgetPoint.offsetInOp, // widget的开始和结束位置相同
      globalStart: widgetPoint.globalOffset,
      globalEnd: widgetPoint.globalOffset, // widget是零长度的
      decorators: [],
      isBox: false,
      isWidget: true,
      widgetDecorator: widgetRange.decorator,
      widgetData: widgetRange.data
    };

    return segment;
  }

  /**
   * 获取适用于指定范围的装饰器
   */
  private static getApplicableDecorators(decoratorRanges: DecoratorRange[], segmentStart: number, segmentEnd: number): BaseDecorator[] {
    const applicable: BaseDecorator[] = [];
    const appliedNames = new Set<string>();

    for (const range of decoratorRanges) {
      // 检查范围是否覆盖片段
      if (range.start <= segmentStart && range.end >= segmentEnd) {
        const decorator = range.decorator;

        // 检查互斥
        let hasConflict = false;
        for (const appliedName of appliedNames) {
          const appliedDecorator = applicable.find((d) => d.name === appliedName);
          if (appliedDecorator && (decorator.excludes(appliedName) || appliedDecorator.excludes(decorator.name))) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          applicable.push(decorator);
          appliedNames.add(decorator.name);
        }
      }
    }

    // 按优先级排序
    return applicable.sort((a, b) => b.getPriority() - a.getPriority());
  }

  /**
   * 从片段重建操作
   * 用于调试和测试
   */
  static reconstructOpsFromSegments(segments: TextOpSegment[]): DocBlockText {
    const reconstructed: DocBlockText = [];
    let currentOp: DocBlockTextOp | null = null;
    let currentText = '';

    for (const segment of segments) {

      if (segment.isWidget) {
        continue;
      }

      assert(segment.originalOp, 'Widget segment should not have original op');

      if (segment.isBox) {
        // 处理Box操作
        if (currentOp && currentText) {
          reconstructed.push({ ...currentOp, insert: currentText });
          currentOp = null;
          currentText = '';
        }
        reconstructed.push(segment.originalOp);
      } else {
        // 处理文本操作
        const segmentText = segment.originalOp.insert.substring(segment.startInOp, segment.endInOp);

        if (!currentOp || JSON.stringify(currentOp.attributes) !== JSON.stringify(segment.originalOp.attributes)) {
          // 开始新的操作
          if (currentOp && currentText) {
            reconstructed.push({ ...currentOp, insert: currentText });
          }
          currentOp = { ...segment.originalOp };
          currentText = segmentText;
        } else {
          // 继续当前操作
          currentText += segmentText;
        }
      }
    }

    // 处理最后的操作
    if (currentOp && currentText) {
      reconstructed.push({ ...currentOp, insert: currentText });
    }

    return reconstructed;
  }
}
