export const createExportStyles = (accentColor: string, accentHoverColor: string) => `
    /* 导出卡片基础样式 */
    .highlight-export-card {
        padding: 20px;
        background-color: #ffffff;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
        
        /* 添加更严格的文本控制 */
        font-size: 16px;
        line-height: 1.6;
        letter-spacing: normal;
        word-spacing: normal;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        box-sizing: border-box;
    }

    /* 现代风格模板 */
    .highlight-export-card-modern {
        padding: 24px;
        position: relative;
        overflow: hidden;
    }

    .highlight-export-card-modern::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: linear-gradient(to bottom right, ${accentColor} 0%, ${accentHoverColor} 100%);
    }

    .highlight-export-card-modern .highlight-export-quote-decoration {
        position: absolute;
        top: 24px;
        right: 24px;
        opacity: 0.06;
        transform: scale(2);
    }

    .highlight-export-card-modern .highlight-export-quote-section {
        position: relative;
        padding: 24px 0;
        /* 确保引用部分的文本样式一致性 */
        font-size: inherit;
        line-height: inherit;
        letter-spacing: inherit;
        word-spacing: inherit;
    }

    .highlight-export-card-modern .highlight-export-quote {
        font-size: 1em;
        line-height: 1.7;
        color: #333333;
        font-weight: 400;
        margin: 0;
        position: relative;
        z-index: 1;
        /* 确保引用文本的样式一致性 */
        letter-spacing: normal;
        word-spacing: normal;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    .highlight-export-card-modern .highlight-export-footer {
        margin-top: 8px;
        padding-top: 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #6b7280;
    }

    .highlight-export-card-modern .highlight-export-source,
    .highlight-export-card-modern .highlight-export-date {
        font-size: 0.9em;
        font-weight: 400;
    }

    /* 确保所有文本元素继承基础样式 */
    .highlight-export-card * {
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;
    }

    /* 导出容器 */
    .highlight-export-container {
        padding: 20px;
        margin: 0;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        width: 480px;
    }
`;
