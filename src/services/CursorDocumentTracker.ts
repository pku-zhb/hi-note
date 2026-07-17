import { MarkdownView, Plugin, TFile, WorkspaceLeaf } from 'obsidian';

export type CursorDocumentListener = (file: TFile) => void;

/**
 * Tracks the single Markdown document that most recently owned the editor cursor.
 *
 * HiNote itself can become the active leaf (especially when it is opened in the
 * main workspace), so workspace.getActiveFile() is not a stable source of truth.
 * This tracker only replaces its target when a Markdown leaf actually becomes
 * active or receives editor focus, and keeps that target while HiNote is focused.
 */
export class CursorDocumentTracker {
    private currentFile: TFile | null = null;
    private listeners = new Set<CursorDocumentListener>();
    private refreshQueued = false;

    constructor(private plugin: Plugin) {}

    start(): void {
        this.plugin.registerEvent(
            this.plugin.app.workspace.on('active-leaf-change', (leaf) => {
                if (!this.trackLeaf(leaf)) {
                    this.queueRefresh();
                }
            })
        );

        this.plugin.registerEvent(
            this.plugin.app.workspace.on('file-open', () => this.queueRefresh())
        );

        this.plugin.registerEvent(
            this.plugin.app.workspace.on('editor-change', (_editor, info) => {
                if (info instanceof MarkdownView) {
                    this.trackLeaf(info.leaf);
                }
            })
        );

        // focusin identifies the real editor even when workspace.activeLeaf is
        // temporarily occupied by HiNote. pointerdown is queued because focus is
        // updated after the pointer event begins.
        this.plugin.registerDomEvent(document, 'focusin', () => this.refresh());
        this.plugin.registerDomEvent(document, 'pointerdown', () => this.queueRefresh(), true);

        this.refresh();
    }

    getCurrentFile(): TFile | null {
        return this.currentFile;
    }

    subscribe(listener: CursorDocumentListener): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    clear(): void {
        this.listeners.clear();
        this.currentFile = null;
    }

    private queueRefresh(): void {
        if (this.refreshQueued) return;

        this.refreshQueued = true;
        queueMicrotask(() => {
            this.refreshQueued = false;
            this.refresh();
        });
    }

    private refresh(): void {
        const focusedLeaf = this.findFocusedMarkdownLeaf();
        if (focusedLeaf && this.trackLeaf(focusedLeaf)) {
            return;
        }

        // Only use the active leaf when it is Markdown. If HiNote or another
        // utility view owns focus, preserve the last real editor target.
        this.trackLeaf(this.plugin.app.workspace.activeLeaf);
    }

    private findFocusedMarkdownLeaf(): WorkspaceLeaf | null {
        const markdownLeaves = this.plugin.app.workspace.getLeavesOfType('markdown');

        for (const leaf of markdownLeaves) {
            if (!(leaf.view instanceof MarkdownView) || !leaf.view.file) continue;

            const container = leaf.view.containerEl;
            const activeElement = container.ownerDocument.activeElement;
            if (activeElement && container.contains(activeElement)) {
                return leaf;
            }
        }

        for (const leaf of markdownLeaves) {
            if (!(leaf.view instanceof MarkdownView) || !leaf.view.file) continue;
            if (leaf.view.containerEl.querySelector('.cm-editor.cm-focused')) {
                return leaf;
            }
        }

        return null;
    }

    private trackLeaf(leaf: WorkspaceLeaf | null): boolean {
        if (!leaf || !(leaf.view instanceof MarkdownView) || !leaf.view.file) {
            return false;
        }

        const file = leaf.view.file;
        const didChange = this.currentFile?.path !== file.path;
        this.currentFile = file;

        if (didChange) {
            this.listeners.forEach((listener) => listener(file));
        }

        return true;
    }
}
