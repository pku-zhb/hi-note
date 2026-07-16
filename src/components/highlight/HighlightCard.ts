import { HighlightInfo, CommentItem } from "../../types";
import type CommentPlugin from "../../../main";
import { HighlightContent } from "./HighlightContent";
import { CommentList } from "./CommentList";
import { UnfocusedCommentInput } from "../comment/UnfocusedCommentInput";
import { MarkdownView, Notice, TFile, WorkspaceLeaf, HoverParent, HoverPopover, MarkdownPreviewView, setIcon, Editor } from "obsidian";
import { DragPreview } from './DragPreview';
import { VIEW_TYPE_HINOTE } from '../../core/HiNoteView';
import { t } from "../../i18n";
import { DragContentGenerator } from "./DragContentGenerator";
import { SelectionManager } from "../../views/selection/SelectionManager";
import { HighlightDeletionManager } from "../../views/highlight";

export class HighlightCard {
    // 为了让 CommentInput 能够访问到 findCardInstanceByHighlightId 方法
    static {
        // @ts-ignore - 添加到 window 对象上，忽略类型检查
        window.HighlightCard = {
            findCardInstanceByHighlightId: HighlightCard.findCardInstanceByHighlightId
        };
    }
    
    // 静态方法：清理所有卡片实例
    public static clearAllInstances(): void {
        // 清理所有实例
        HighlightCard.cardInstances.forEach(instance => {
            // 如果有销毁方法，调用它
            if (typeof instance.destroy === 'function') {
                instance.destroy();
            }
        });
        
        // 清空实例集合
        HighlightCard.cardInstances.clear();
    }
    
    // 静态方法：根据高亮ID查找HighlightCard实例
    public static findCardInstanceByHighlightId(highlightId: string): HighlightCard | null {
        for (const instance of HighlightCard.cardInstances) {
            // 确保 highlight.id 存在再进行比较
            if (instance.highlight.id && instance.highlight.id === highlightId) {
                return instance;
            }
        }
        return null;
    }
    
    // 静态方法：清除所有卡片上的不聚焦输入框
    public static clearAllUnfocusedInputs(): void {
        HighlightCard.cardInstances.forEach(instance => {
            if (instance.unfocusedInput) {
                instance.unfocusedInput.remove();
                instance.unfocusedInput = null;
            }
        });
    }
    
    private card: HTMLElement;
    private static cardInstances = new Set<HighlightCard>();
    private fileName: string | undefined;
    private isEditing = false;
    private unfocusedInput: UnfocusedCommentInput | null = null;
    private isShowingRealInput: boolean = false; // 是否正在显示真正的输入框
    
    // 管理器实例
    private deletionManager: HighlightDeletionManager;

    constructor(
        private container: HTMLElement,
        private highlight: HighlightInfo,
        private plugin: CommentPlugin,
        private options: {
            onHighlightClick: (highlight: HighlightInfo) => Promise<void>;
            onCommentAdd: (highlight: HighlightInfo) => void;
            onExport: (highlight: HighlightInfo) => void;
            onCommentEdit: (highlight: HighlightInfo, comment: CommentItem) => void;
        },
        private isInMainView: boolean = false,
        fileName?: string,
        private selectionManager?: SelectionManager  // SelectionManager 实例
    ) {
        this.fileName = fileName;
        this.highlight = highlight;
        this.plugin = plugin;
        this.options = options;
        this.fileName = this.highlight.filePath?.split('/').pop();
        
        // 初始化管理器
        this.deletionManager = new HighlightDeletionManager(plugin);
        
        // 注册卡片实例
        HighlightCard.cardInstances.add(this);
        
        // 监听 CommentInput 组件发出的自定义事件
        this.setupCommentInputEventListeners();
        
        this.render();
    }
    
    // 设置 CommentInput 相关的事件监听
    private setupCommentInputEventListeners() {
        // 监听输入框显示事件
        const handleInputShown = (e: CustomEvent) => {
            if (e.detail?.highlightId === this.highlight.id) {
                this.isShowingRealInput = true;
                // 如果有未聚焦输入框，移除它
                if (this.unfocusedInput) {
                    this.unfocusedInput.remove();
                    this.unfocusedInput = null;
                }
            }
        };
        
        // 监听输入框关闭事件
        const handleInputClosed = (e: CustomEvent) => {
            if (e.detail?.highlightId === this.highlight.id) {
                this.isShowingRealInput = false;
            }
        };
        
        // 添加自定义事件监听
        document.addEventListener('comment-input-shown', handleInputShown as EventListener);
        document.addEventListener('comment-input-closed', handleInputClosed as EventListener);
        
        // 确保在插件卸载时移除事件监听
        // 使用 addEventListener 而不是 registerDomEvent，因为自定义事件不在 DocumentEventMap 中
        this.plugin.register(() => {
            document.removeEventListener('comment-input-shown', handleInputShown as EventListener);
            document.removeEventListener('comment-input-closed', handleInputClosed as EventListener);
        });
    }

    private render() {
        this.card = this.container.createEl("div", {
            cls: `highlight-card ${this.highlight.isVirtual ? 'virtual-highlight-card' : ''}`,
            attr: {
                'data-highlight': JSON.stringify(this.highlight)
            }
        });

        // 添加点击事件用于切换选中状态，支持多选
        this.card.addEventListener("click", (e: MouseEvent) => {
            // 如果正在编辑或显示真正的输入框，不触发选中状态切换
            if (this.isEditing || this.isShowingRealInput) {
                return;
            }
            
            // 检查点击的目标是否是输入框相关元素
            const target = e.target as HTMLElement;
            if (target.closest('.hi-note-input') || target.closest('.hi-note-actions-hint')) {
                return;
            }
            
            this.selectCard(e);
        });
        
        // 创建高亮卡片标题栏
        const titleBar = this.card.createEl("div", {
            cls: "highlight-card-title-bar"
        });
        
        // 标题栏左侧区域
        const titleBarLeft = titleBar.createEl("div", {
            cls: "highlight-card-title-left"
        });
        
        // 标题栏右侧区域 (用于放置按钮)
        const titleBarRight = titleBar.createEl("div", {
            cls: "highlight-card-title-right"
        });
        
        // 在主视图或全局搜索模式下显示文件名
        if ((this.isInMainView || this.highlight.isGlobalSearch) && this.fileName) {
            // 添加文件图标
            const fileIcon = titleBarLeft.createEl("div", {
                cls: "highlight-card-icon",
                attr: {
                    'aria-label': t('Open (DoubleClick)'),
                }
            });
            
            setIcon(fileIcon, "file-text");
            
            // 行号标签已在标题栏左侧区域添加
            
            // 添加双击事件
            fileIcon.addEventListener("dblclick", async (e) => {
                e.stopPropagation(); // 阻止事件冒泡

                // 获取文件路径，优先使用 highlight.filePath，如果不存在则使用 fileName
                const filePath = this.highlight.filePath || this.fileName;
                if (!filePath) return;

                // 获取文件
                const abstractFile = this.plugin.app.vault.getAbstractFileByPath(filePath);
                if (!abstractFile || !(abstractFile instanceof TFile)) return;

                // 先获取所有 markdown 叶子
                const leaves = this.plugin.app.workspace.getLeavesOfType('markdown');
                
                // 获取当前活动的叶子
                const activeLeaf = this.plugin.app.workspace.activeLeaf;
                
                // 尝试找到一个不是当前活动叶子的 markdown 叶子
                let targetLeaf = leaves.find(leaf => leaf !== activeLeaf);
                
                // 如果没有找到其他叶子，创建一个新的
                if (!targetLeaf) {
                    targetLeaf = this.plugin.app.workspace.getLeaf('split', 'vertical');
                }
                
                // 在目标 leaf 中打开文件
                await targetLeaf.openFile(abstractFile);

                // 定位到高亮位置
                if (this.highlight.position !== undefined) {
                    const view = targetLeaf.view;
                    if (view.getViewType() === 'markdown') {
                        // 如果是 markdown 视图，则获取其编辑器
                        const editor = view.getViewType() === 'markdown' ? (view as MarkdownView).editor : null;
                        if (editor) {
                            const pos = editor.offsetToPos(this.highlight.position);
                            editor.setCursor(pos);
                            editor.scrollIntoView({from: pos, to: pos}, true);
                        }
                    }
                }
            });
            
            // 添加文件名文本（移除 .md 后缀）
            const displayName = this.fileName ? this.fileName.replace(/\.md$/, '') : '';
            const fileNameText = titleBarLeft.createEl("span", {
                text: displayName,
                cls: "highlight-card-title-text"
            });
            
            // 添加拖拽功能
            this.setupDragFunctionality(titleBarLeft);
            
            // 添加页面预览功能
            this.addPagePreview(fileNameText, this.highlight.filePath || this.fileName);
        } 
        // 在非主视图下显示行号
        else {
            // 添加高亮图标
            const highlightIcon = titleBarLeft.createEl("div", {
                cls: "highlight-card-icon"
            });
            
            setIcon(highlightIcon, "highlighter");
            
            // 在高亮图标右侧显示行号（如果有文件路径和位置信息）
            if (this.highlight.filePath && typeof this.highlight.position === 'number') {
                // 获取文件
                const file = this.plugin.app.vault.getAbstractFileByPath(this.highlight.filePath);
                if (file instanceof TFile) {
                    // 如果是全局搜索模式，显示文件名而不是行号
                    if (this.highlight.isGlobalSearch) {
                        // 显示文件名已经在前面实现，这里不需要重复显示
                        // 不显示行号标签
                    } else {
                        // 尝试打开文件并获取编辑器实例
                        const cachedLeaf = this.plugin.app.workspace.getLeavesOfType('markdown').find(leaf => {
                            const view = leaf.view;
                            return view instanceof MarkdownView && view.file && view.file.path === file.path;
                        });
                        
                        if (cachedLeaf) {
                            const view = cachedLeaf.view as MarkdownView;
                            if (view.editor) {
                                // 计算行号
                                const pos = view.editor.offsetToPos(this.highlight.position);
                                const lineNumber = pos.line + 1; // 行号从0开始，显示时+1
                                
                                // 创建行号标签
                                const lineNumberBadge = titleBarLeft.createEl("div", {
                                    cls: "highlight-line-number-badge",
                                });
                                
                                lineNumberBadge.createEl("span", {
                                    text: `L${lineNumber}`,
                                    cls: "highlight-line-number"
                                });
                            }
                        }
                    }
                }
            }
            
            // 为非主视图也添加拖拽功能
            this.setupDragFunctionality(titleBarLeft);
        }
        
        const createActionButton = (
            icon: string,
            label: string,
            className: string,
            onClick: () => void
        ) => {
            const button = titleBarRight.createEl("button", {
                cls: `highlight-title-btn ${className}`,
                attr: {
                    type: "button",
                    "aria-label": label,
                    title: label
                }
            });
            setIcon(button, icon);
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                onClick();
            });
        };

        createActionButton("copy", t("Copy Highlight"), "highlight-copy-btn", () => {
            this.copyHighlightContent();
        });
        createActionButton("image", t("Export as Image"), "highlight-image-btn", () => {
            this.handleExportAsImage();
        });
        createActionButton("trash-2", t("Delete"), "highlight-delete-btn", () => {
            void this.handleDeleteHighlight();
        });

        // 在主视图中预先生成 Block ID
        if (this.isInMainView && this.fileName) {
            
            // 预先生成 Block ID，确保拖拽时可以使用
            if (this.highlight && this.highlight.filePath && typeof this.highlight.position === 'number') {
                const file = this.plugin.app.vault.getAbstractFileByPath(this.highlight.filePath);
                if (file instanceof TFile) {
                    // 异步预生成 Block ID，但不阻塞界面
                    this.generateDragContent().catch(error => {
                        console.error('[HighlightCard] Error pre-generating block ID:', error);
                    });
                }
            }
        }

        // 创建 content 容器
        const highlightContentEl = this.card.createEl("div", {
            cls: "highlight-content"
        });

        // 渲染高亮内容
        new HighlightContent(
            highlightContentEl,
            this.highlight,
            this.options.onHighlightClick,
            this.plugin.app,
            this.isInMainView
        );

        // 渲染评论列表 (在 card 容器内)
        new CommentList(
            this.card,
            this.highlight,
            (comment) => {
                this.isEditing = true;
                this.selectCard(); // 在进入编辑模式时选中卡片
                this.options.onCommentEdit(this.highlight, comment);
            }
        );
    }
    
    // 显示不聚焦的批注输入框
    private showUnfocusedCommentInput() {
        // 如果已经有不聚焦的输入框，先移除
        if (this.unfocusedInput) {
            this.unfocusedInput.remove();
            this.unfocusedInput = null;
        }
        
        // 如果正在编辑或显示真正的输入框，不显示不聚焦的输入框
        if (this.isEditing || this.isShowingRealInput) {
            return;
        }
        
        // 获取高亮内容容器
        const contentElement = this.card.querySelector('.highlight-content');
        if (!contentElement) return;
        
        // 创建不聚焦的批注输入框，放在高亮内容下方
        this.unfocusedInput = new UnfocusedCommentInput(
            contentElement as HTMLElement,
            this.highlight,
            () => {
                // 点击不聚焦的输入框时，移除它并显示真正的输入框
                if (this.unfocusedInput) {
                    this.unfocusedInput.remove();
                    this.unfocusedInput = null;
                }
                this.options.onCommentAdd(this.highlight);
            }
        );
    }
    
    // 根据 DOM 元素查找对应的 HighlightCard 实例
    public static findCardInstanceByElement(element: HTMLElement): HighlightCard | null {
        // 遍历所有卡片实例，查找卡片元素匹配的实例
        for (const instance of HighlightCard.cardInstances) {
            if (instance.card === element || instance.card.contains(element)) {
                return instance;
            }
        }
        return null;
    }
    
    /**
     * 显示评论输入框
     * 用于外部调用，直接触发评论输入框的显示
     */
    public showCommentInput(): void {
        // 清除所有卡片的不聚焦输入框
        HighlightCard.clearAllUnfocusedInputs();
        
        // 如果当前卡片有不聚焦输入框，先移除它
        if (this.unfocusedInput) {
            this.unfocusedInput.remove();
            this.unfocusedInput = null;
        }
        
        // 直接触发添加评论回调，显示真正的输入框
        this.options.onCommentAdd(this.highlight);
    }

    // 添加选中卡片的方法，支持多选和取消选择
    private selectCard(event?: MouseEvent) {
        // 先清除所有卡片上的不聚焦输入框
        HighlightCard.clearAllUnfocusedInputs();
        
        // 必须有 SelectionManager 才能进行选择操作
        if (!this.selectionManager) {
            console.error('[HighlightCard] SelectionManager 未传入，无法进行选择操作');
            return;
        }
        
        // 如果按住 Shift 键，则进行多选或取消选择
        if (event && event.shiftKey) {
            // 检查当前卡片是否已经被选中
            const isSelected = this.selectionManager.isCardSelected(this.card);
            
            if (isSelected) {
                // 如果已经选中，则取消选择
                this.selectionManager.unselectCard(this.card);
            } else {
                // 如果未选中，则添加到选中集合
                this.selectionManager.selectCard(this.card, this.highlight);
            }
            
            // 多选模式下不显示输入框
        } else {
            // 单选模式，先清除所有选择
            this.selectionManager.clearSelection();
            
            // 然后选中当前卡片
            this.selectionManager.selectCard(this.card, this.highlight);
            
            // 在单选模式下显示不聚焦的批注输入框
            this.showUnfocusedCommentInput();
        }
    }
    
    public getElement(): HTMLElement {
        return this.card;
    }

    private addPagePreview(element: HTMLElement, filePath: string | undefined) {
        if (!filePath) return;

        // 获取文件对象
        const file = this.plugin.app.vault.getAbstractFileByPath(filePath);
        if (!(file instanceof TFile)) return;

        let hoverTimeout: NodeJS.Timeout;

        // 添加悬停事件
        element.addEventListener("mouseenter", (event) => {
            hoverTimeout = setTimeout(async () => {
                const target = event.target as HTMLElement;
                
                // 触发 Obsidian 的页面预览事件
                this.plugin.app.workspace.trigger('hover-link', {
                    event,
                    source: 'hi-note',
                    hoverParent: target,
                    targetEl: target,
                    linktext: file.path
                });
            }, 300); // 300ms 的延迟显示
        });

        // 添加鼠标离开事件
        element.addEventListener("mouseleave", () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
        });
    }

    public update(highlight: HighlightInfo) {
        this.highlight = highlight;
        this.isEditing = false; // 重置编辑状态
        this.card.empty();
        this.render();
    }

    // 同步生成拖拽时的格式化内容
    private generateDragContentSync(): string {
        const generator = new DragContentGenerator(this.highlight, this.plugin);
        return generator.generateSync();
    }

    // 异步生成完整的格式化内容，包含 Block ID 的生成和更新
    private async generateDragContent(): Promise<string> {
        const generator = new DragContentGenerator(this.highlight, this.plugin);
        return generator.generate();
    }
    
    /**
     * 为指定元素设置拖拽功能
     * @param element 要设置拖拽功能的元素
     */
    private setupDragFunctionality(element: HTMLElement): void {
        // 添加拖拽属性
        element.setAttribute("draggable", "true");
        
        // 预先生成 Block ID，确保拖拽时可以使用
        if (this.highlight && this.highlight.filePath && typeof this.highlight.position === 'number') {
            const file = this.plugin.app.vault.getAbstractFileByPath(this.highlight.filePath);
            if (file instanceof TFile) {
                // 异步预生成 Block ID，但不阻塞界面
                this.generateDragContent().catch(error => {
                    console.error('[HighlightCard] Error pre-generating block ID:', error);
                });
            }
        }
        
        // 添加拖拽开始事件
        element.addEventListener("dragstart", async (e: DragEvent) => {
            try {
                // 首先确保 highlight 对象存在并且有所需的属性
                if (!this.highlight || !this.highlight.text) {
                    throw new Error('Invalid highlight data');
                }

                // 尝试异步生成带有 Block ID 的内容
                // 设置一个超时，避免拖拽操作等待太久
                let formattedContent;
                try {
                    const timeoutPromise = new Promise<string>((_, reject) => {
                        setTimeout(() => reject(new Error('Block ID generation timeout')), 300);
                    });
                    
                    // 使用 Promise.race 确保不会等待太久
                    formattedContent = await Promise.race([
                        this.generateDragContent(),
                        timeoutPromise
                    ]);
                } catch (timeoutError) {
                    // 如果超时或出错，回退到同步方法
                    console.debug('[HighlightCard] Using sync fallback for drag content:', timeoutError);
                    formattedContent = this.generateDragContentSync();
                }
                
                // 使用 text/plain 格式来确保编辑器能正确识别 Markdown 格式
                e.dataTransfer?.setData("text/plain", formattedContent);
                
                // 保存原始数据以供其他用途
                const highlightData = JSON.stringify(this.highlight);
                e.dataTransfer?.setData("application/highlight", highlightData);
                
                element.addClass("dragging");
                
                // 使用 DragPreview 替代原来的预览处理
                DragPreview.start(e, this.highlight.text);
            } catch (error) {
                console.error('[HighlightCard] Error during drag start:', error);
                // 防止错误时的拖拽
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // 添加拖拽结束事件
        element.addEventListener("dragend", () => {
            element.removeClass("dragging");
            DragPreview.clear();
        });
    }
    
    /**
     * 复制高亮和批注内容
     */
    private copyHighlightContent(): void {
        try {
            // 构建 Callout 格式的内容
            let content = '> [!quote] HiNote\n';
            content += `> ${this.highlight.text}`;
            
            // 添加文件名信息（如果有）
            if (this.highlight.filePath) {
                // 获取文件名，优先使用已存储的文件名，否则从路径中提取
                const displayName = this.fileName || this.highlight.filePath.split('/').pop() || this.highlight.filePath;
                
                // 在 Callout 内添加文件名信息
                content += '\n> \n';
                content += `> From: [[${displayName}]]`;
            }
            
            // 添加最后的换行
            content += '\n\n';
            
            // 复制到剪贴板
            navigator.clipboard.writeText(content).then(() => {
                // 显示成功提示
                new Notice('Copied');
            }).catch(err => {
                console.error('复制内容失败:', err);
                new Notice('Failed to copy content');
            });
        } catch (error) {
            console.error('复制高亮内容时出错:', error);
            new Notice('Failed to copy content');
        }
    }
    
    /**
     * 处理导出为图片功能
     */
    private handleExportAsImage(): void {
        this.options.onExport(this.highlight);
    }

    /**
     * 处理删除高亮的逻辑
     * 这个方法会删除编辑器中的高亮格式和批注数据
     * @param skipConfirmation 是否跳过确认对话框，默认为 false
     * @param skipNotice 是否跳过成功通知，默认为 false
     */
    public async handleDeleteHighlight(skipConfirmation: boolean = false, skipNotice: boolean = false) {
        try {
            // 委托给删除管理器
            const success = await this.deletionManager.deleteHighlight(
                this.highlight,
                skipConfirmation,
                skipNotice
            );
            
            if (success) {
                // 移除卡片
                this.card.remove();
                
                // 从卡片实例集合中移除
                HighlightCard.cardInstances.delete(this);
            }
        } catch (error) {
            console.error('删除高亮时出错:', error);
            new Notice(t(`删除高亮失败: ${error.message}`));
        }
    }
    
    /**
     * 更新评论列表（只更新评论部分，不重新渲染整个卡片）
     */
    public updateComments(updatedHighlight: HighlightInfo): void {
        // 更新高亮数据
        this.highlight = updatedHighlight;
        
        // 重置编辑状态，允许重新选中卡片
        this.isEditing = false;
        
        // 查找评论列表容器
        const commentsSection = this.card.querySelector('.hi-notes-section');
        
        if (commentsSection) {
            // 如果有评论列表，移除它
            commentsSection.remove();
        }
        
        // 重新渲染评论列表
        if (this.highlight.comments && this.highlight.comments.length > 0) {
            new CommentList(
                this.card,
                this.highlight,
                (comment) => {
                    this.isEditing = true;
                    this.selectCard();
                    this.options.onCommentEdit(this.highlight, comment);
                }
            );
        }
    }
    
    /**
     * 销毁方法，用于清理事件监听器和从静态集合中移除实例
     */
    public destroy(): void {
        // 移除事件监听器
        if (this.unfocusedInput) {
            this.unfocusedInput.remove();
            this.unfocusedInput = null;
        }
        
        // 从静态集合中移除
        HighlightCard.cardInstances.delete(this);
    }
}
