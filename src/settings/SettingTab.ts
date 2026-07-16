import { App, PluginSettingTab } from 'obsidian';
import { PluginSettings } from '../types';
import { GeneralSettingsTab } from './GeneralSettingsTab';

export class HiNoteSettingTab extends PluginSettingTab {
    plugin: any;
    DEFAULT_SETTINGS: PluginSettings;

    constructor(app: App, plugin: any) {
        super(app, plugin);
        this.plugin = plugin;
        this.DEFAULT_SETTINGS = plugin.DEFAULT_SETTINGS;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        new GeneralSettingsTab(this.plugin, containerEl).display();
    }
}
