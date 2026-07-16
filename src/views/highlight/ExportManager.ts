import { Notice } from "obsidian";
import html2canvas from "html2canvas";
import { HighlightInfo } from "../../types";
import { defaultTemplate } from "../../templates";
import { createExportStyles } from "../../templates/exportStyles";
import { t } from "../../i18n";

/** Renders the default knowledge-card template and copies it as a PNG. */
export class ExportManager {
    async exportHighlightAsImage(highlight: HighlightInfo): Promise<void> {
        const accentColor = this.resolveThemeColor("--interactive-accent", "rgb(88, 113, 239)");
        const accentHoverColor = this.resolveThemeColor("--interactive-accent-hover", accentColor);
        const exportStyles = createExportStyles(accentColor, accentHoverColor);

        const exportFrame = document.createElement("iframe");
        exportFrame.setAttribute("aria-hidden", "true");
        exportFrame.style.position = "fixed";
        exportFrame.style.left = "-10000px";
        exportFrame.style.top = "0";
        exportFrame.style.width = "560px";
        exportFrame.style.height = "1200px";
        exportFrame.style.border = "0";
        exportFrame.style.pointerEvents = "none";
        document.body.appendChild(exportFrame);

        const frameDocument = exportFrame.contentDocument;
        if (!frameDocument) {
            exportFrame.remove();
            new Notice(t("Failed to copy image"));
            return;
        }

        frameDocument.documentElement.style.backgroundColor = "#ffffff";
        frameDocument.body.style.margin = "0";
        frameDocument.body.style.backgroundColor = "#ffffff";
        frameDocument.body.style.color = "#333333";

        const frameStyles = frameDocument.createElement("style");
        frameStyles.textContent = exportStyles;
        frameDocument.head.appendChild(frameStyles);

        const exportContainer = frameDocument.createElement("div");
        exportContainer.className = "highlight-export-container";
        exportContainer.appendChild(frameDocument.adoptNode(defaultTemplate.render(highlight)));
        frameDocument.body.appendChild(exportContainer);

        try {
            if (frameDocument.fonts?.ready) {
                await frameDocument.fonts.ready;
            }

            const canvas = await html2canvas(exportContainer, {
                backgroundColor: null,
                scale: window.devicePixelRatio * 2,
                useCORS: true,
                allowTaint: true,
                foreignObjectRendering: true,
                logging: false,
                imageTimeout: 0,
                onclone: (clonedDocument) => {
                    clonedDocument.documentElement.style.backgroundColor = "#ffffff";
                    clonedDocument.body.style.backgroundColor = "#ffffff";
                    const style = clonedDocument.createElement("style");
                    style.textContent = `
                        body { margin: 0; background: none; }
                        ${exportStyles}
                    `;
                    clonedDocument.head.appendChild(style);
                }
            });

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob((result) => {
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error("Canvas returned an empty PNG"));
                    }
                }, "image/png");
            });

            if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
                throw new Error("Image clipboard API is unavailable");
            }

            await navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob })
            ]);
            new Notice(t("Image copied to clipboard"));
        } catch (error) {
            console.error("[ExportManager] Failed to copy image:", error);
            new Notice(t("Failed to copy image"));
        } finally {
            exportFrame.remove();
        }
    }

    /** Converts theme colors, including color() and display-p3 values, to html2canvas-safe sRGB. */
    private resolveThemeColor(variableName: string, fallback: string): string {
        const rootStyles = getComputedStyle(document.documentElement);
        const bodyStyles = getComputedStyle(document.body);
        const rawValue = rootStyles.getPropertyValue(variableName).trim()
            || bodyStyles.getPropertyValue(variableName).trim();

        if (!rawValue) {
            return fallback;
        }

        const probe = document.createElement("span");
        probe.style.position = "fixed";
        probe.style.visibility = "hidden";
        probe.style.color = `var(${variableName})`;
        document.body.appendChild(probe);
        const resolvedColor = getComputedStyle(probe).color;
        probe.remove();

        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            return fallback;
        }

        context.clearRect(0, 0, 1, 1);
        context.fillStyle = resolvedColor;
        context.fillRect(0, 0, 1, 1);
        const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

        if (alpha === 0) {
            return fallback;
        }

        return alpha === 255
            ? `rgb(${red}, ${green}, ${blue})`
            : `rgba(${red}, ${green}, ${blue}, ${(alpha / 255).toFixed(3)})`;
    }
}
