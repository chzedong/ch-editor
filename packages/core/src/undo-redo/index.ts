import { EditorDoc } from '../doc/editor-doc';
import { SnapshotCollector } from './snapshot-collector';

/**
//  * 注册快照收集扩展到EditorDoc
//  * @param editorDoc EditorDoc实例
//  * @param maxSnapshotCount 最大快照数量，默认50
//  */
// export function registerSnapshotExtension(editorDoc: EditorDoc, maxSnapshotCount: number = 50) {
//   const collector = new SnapshotCollector(editorDoc, maxSnapshotCount);

//   // 注册所有钩子
//   collector.registerHooks();

//   return {
//     collector,
//     // 提供一些便捷方法
//     getSnapshots: () => collector.getSnapshots(),
//     clearSnapshots: () => collector.clearSnapshots(),
//     getSnapshotCount: () => collector.getSnapshotCount(),
//     destroy: () => collector.destroy()
//   };
// }

// 导出类型和类
export { SnapshotCollector } from './snapshot-collector';
