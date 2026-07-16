import { Plugin } from 'obsidian';
import { HiNoteView, VIEW_TYPE_HINOTE } from './src/core/HiNoteView';
import { HiNoteSettingTab } from './src/settings/SettingTab';
import { PluginSettings, DEFAULT_SETTINGS } from './src/types';
import { registerCommands, createWindowManager } from './src/commands';
import { InitializationManager } from './src/services/InitializationManager';
import { WindowManager } from './src/services/WindowManager';

export default class CommentPlugin extends Plugin {
	settings: PluginSettings;
	private initManager: InitializationManager;
	private windowManager: WindowManager;

	// 公开服务实例供外部访问
	get highlightDecorator() { return this.initManager.highlightDecorator; }
	get eventManager() { return this.initManager.eventManager; }
	get highlightService() { return this.initManager.highlightService; }
	get dataManager() { return this.initManager.dataManager; }
	get canvasService() { return this.initManager.canvasService; }
	
	// 架构层实例
	get highlightRepository() { return this.initManager.highlightRepository; }
	get highlightManager() { return this.initManager.highlightManager; }

	async onload() {
		// 加载设置
		const loadedData = (await this.loadData()) || {};
		const {
			ai: _legacyAISettings,
			contextOptions: _legacyContextOptions,
			'flashcard-license': _legacyFlashcardLicense,
			export: _legacyExportSettings,
			...retainedData
		} = loadedData;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, retainedData);

		// 清除旧版遗留的模型配置和 API 凭据，同时保留其他插件数据。
		if ('ai' in loadedData || 'contextOptions' in loadedData || 'flashcard-license' in loadedData || 'export' in loadedData) {
			await this.saveData(this.settings);
		}

		// 初始化管理器
		this.initManager = new InitializationManager(this);
		this.windowManager = createWindowManager(this);

		// 注册视图（延迟初始化）
		this.registerView(
			VIEW_TYPE_HINOTE,
			(leaf) => {
				this.initManager.ensureInitialized();
				return new HiNoteView(leaf, this.initManager.highlightManager, this.initManager.highlightRepository);
			}
		);

		// 添加功能按钮
		this.addRibbonIcon(
			'highlighter',
			'HiNote',
			async () => {
				await this.initManager.ensureInitialized();
				await this.windowManager.openCommentPanelInSidebar();
			}
		);

		// 注册所有命令
		registerCommands(this, this.windowManager, () => this.initManager.ensureInitialized());

		// 添加设置标签页
		this.addSettingTab(new HiNoteSettingTab(this.app, this));

		// 监听文件重命名事件
		this.registerEvent(
			this.app.vault.on('rename', async (file, oldPath) => {
				if (this.initManager.initialized && this.highlightManager) {
					await this.highlightManager.handleFileRename(oldPath, file.path);
				}
			})
		);
	}


	async onunload() {
		// 清理初始化管理器
		if (this.initManager) {
			await this.initManager.cleanup();
		}
	}

	async saveSettings() {
        // 确保基础设置存在
        if (!this.settings) {
            this.settings = { ...DEFAULT_SETTINGS };
        }
        // 确保高亮相关设置存在
        this.settings.excludePatterns = this.settings.excludePatterns ?? DEFAULT_SETTINGS.excludePatterns;
        this.settings.useCustomPattern = this.settings.useCustomPattern ?? DEFAULT_SETTINGS.useCustomPattern;
        if (!this.settings.regexRules || !Array.isArray(this.settings.regexRules)) {
            this.settings.regexRules = [...DEFAULT_SETTINGS.regexRules];
        }
        await this.saveData(this.settings);
    }
}
