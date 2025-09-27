import { EmbedPlugin } from './embed-plugin';

export class EmbedPluginManager {
  private plugins = new Map<string, EmbedPlugin>();

  register(plugin: EmbedPlugin) {

    this.plugins.set(plugin.type, plugin);
  }

  unregister(type: string) {
    this.plugins.delete(type);
  }

  get(type: string) {
    return this.plugins.get(type);
  }

  has(type: string) {
    return this.plugins.has(type);
  }

  list(): string[] {
    return Array.from(this.plugins.keys());
  }

  destroy() {
    this.plugins.clear();
  }
}
