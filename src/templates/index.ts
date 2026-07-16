import { HighlightInfo } from '../types';

export interface CardTemplate {
    render: (highlight: HighlightInfo) => HTMLElement;
}

export const defaultTemplate: CardTemplate = {
    render: (highlight: HighlightInfo) => {
        const cardContainer = document.createElement('div');
        cardContainer.className = 'highlight-export-card highlight-export-card-modern';

        // 引用区域
        const quoteSection = document.createElement('div');
        quoteSection.className = 'highlight-export-quote-section';
        
        // 引用装饰
        const quoteDecoration = document.createElement('div');
        quoteDecoration.className = 'highlight-export-quote-decoration';

        const quoteSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        quoteSvg.setAttribute("viewBox", "0 0 24 24");
        quoteSvg.setAttribute("width", "48");
        quoteSvg.setAttribute("height", "48");
        quoteSvg.setAttribute("fill", "none");
        quoteSvg.setAttribute("stroke", "currentColor");
        quoteSvg.setAttribute("stroke-width", "1");

        const path1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path1.setAttribute("d", "M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z");

        const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path2.setAttribute("d", "M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z");

        quoteSvg.appendChild(path1);
        quoteSvg.appendChild(path2);
        quoteDecoration.appendChild(quoteSvg);

        quoteSection.appendChild(quoteDecoration);
        
        // 引用内容
        const quoteContent = document.createElement('div');
        quoteContent.className = 'highlight-export-quote';
        quoteContent.textContent = highlight.text;
        quoteSection.appendChild(quoteContent);
        
        cardContainer.appendChild(quoteSection);

        // 底部信息
        const footer = document.createElement('div');
        footer.className = 'highlight-export-footer';

        // 来源信息
        const source = document.createElement('div');
        source.className = 'highlight-export-source';
        source.textContent = highlight.fileName || highlight.filePath?.split('/').pop() || 'Untitled';
        footer.appendChild(source);

        // 日期信息
        const date = document.createElement('div');
        date.className = 'highlight-export-date';
        const now = new Date();
        const options: Intl.DateTimeFormatOptions = { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric'
        };
        date.textContent = now.toLocaleDateString(undefined, options);
        footer.appendChild(date);

        cardContainer.appendChild(footer);

        return cardContainer;
    }
};
