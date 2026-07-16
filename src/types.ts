export interface CommentItem {
    id: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export interface HighlightInfo {
    // ========== 核心字段 ==========
    id?: string;                   // 高亮的唯一ID（添加评论时生成）
    text: string;                  // 高亮的文本内容（必填）
    position: number;              // 文本位置（必填）
    createdAt?: number;            // 创建时间
    updatedAt?: number;            // 最后更新时间
    comments?: CommentItem[];      // 评论列表
    
    // ========== 位置相关 ==========
    paragraphOffset?: number;      // 段落偏移量
    blockId?: string;              // Block ID（不包含文件路径）
    
    // ========== 文件相关 ==========
    filePath?: string;             // 文件路径
    fileName?: string;             // 文件名
    fileIcon?: string;             // 文件图标
    
    // ========== 显示相关 ==========
    backgroundColor?: string;      // 背景颜色
    originalLength?: number;       // 原始匹配文本的长度（包括标签）
    
    // ========== 标记字段 ==========
    isVirtual?: boolean;           // 是否为虚拟高亮（只有评论没有高亮）
    isGlobalSearch?: boolean;      // 是否为全局搜索结果
    isFromCanvas?: boolean;        // 是否来自 Canvas 文件
    canvasSource?: string;         // Canvas 文件的路径
}

export interface PluginSettings extends HighlightSettings {
    comments?: Record<string, Record<string, HighlightInfo>>;
    showCommentWidget?: boolean;
}

// FileComment 接口已移除

export const DEFAULT_SETTINGS: PluginSettings = {
    excludePatterns: '',  // 默认不排除任何文件
    useCustomPattern: false,
    regexRules: [
        {
            id: 'default-md',
            name: 'Default Highlight',
            pattern: '==([^=\\n](?:[^=\\n]|=[^=\\n])*?[^=\\n])==',
            color: '#ffeb3b',
            enabled: true
        },
        {
            id: 'default-mark',
            name: 'Mark format',
            pattern: '<mark[^>]*>([\\s\\S]*?)</mark>',
            color: '#ffeb3b',
            enabled: true
        },
        {
            id: 'default-span',
            name: 'Span format',
            pattern: '<span[^>]*>([\\s\\S]*?)</span>',
            color: '#ffeb3b',
            enabled: true
        }
    ],
    showCommentWidget: true
};

// 添加自定义事件类型
export interface CommentUpdateEvent {
    fileId: string;
    highlightId: string;
    text: string;
    comments: CommentItem[];
}

declare global {
    interface WindowEventMap {
        'comment-updated': CustomEvent<CommentUpdateEvent>;
    }
}

// 正则表达式规则
export interface RegexRule {
  id: string;         // 唯一标识符
  name: string;       // 规则名称
  pattern: string;    // 正则表达式
  color: string;      // 高亮颜色
  enabled: boolean;   // 是否启用
}

export interface HighlightSettings {
  excludePatterns: string;
  useCustomPattern: boolean;
  regexRules: RegexRule[];   // 正则表达式规则数组
}
