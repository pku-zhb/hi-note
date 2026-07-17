import { App, WorkspaceLeaf } from 'obsidian';
import { VIEW_TYPE_HINOTE } from '../core/HiNoteView';

/**
 * Opens the one global HiNote view in the requested docking area.
 * Docking never changes which document HiNote targets.
 */
export class WindowManager {
    constructor(private app: App) {}

    async openCommentPanelInSidebar(): Promise<void> {
        const { workspace } = this.app;
        const existingLeaf = this.getSingleHiNoteLeaf();

        if (existingLeaf && this.isInSidebar(existingLeaf)) {
            await workspace.revealLeaf(existingLeaf);
            return;
        }

        existingLeaf?.detach();

        const leaf = workspace.getRightLeaf(false);
        if (!leaf) return;

        await leaf.setViewState({
            type: VIEW_TYPE_HINOTE,
            active: true,
        });
        await workspace.revealLeaf(leaf);
    }

    async openCommentPanelInMainWindow(): Promise<void> {
        const { workspace } = this.app;
        const existingLeaf = this.getSingleHiNoteLeaf();

        if (existingLeaf && this.isLeafInside(existingLeaf, workspace.rootSplit)) {
            await workspace.revealLeaf(existingLeaf);
            return;
        }

        existingLeaf?.detach();

        const leaf = workspace.getLeaf('tab');
        await leaf.setViewState({
            type: VIEW_TYPE_HINOTE,
            active: true,
        });
        await workspace.revealLeaf(leaf);
    }

    private getSingleHiNoteLeaf(): WorkspaceLeaf | null {
        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HINOTE);
        const [primary, ...duplicates] = leaves;

        // Old layouts may contain more than one HiNote leaf. Keep one target
        // globally so every entry point observes the same cursor document.
        duplicates.forEach((leaf) => leaf.detach());
        return primary ?? null;
    }

    private isInSidebar(leaf: WorkspaceLeaf): boolean {
        const { workspace } = this.app;
        return this.isLeafInside(leaf, workspace.leftSplit)
            || this.isLeafInside(leaf, workspace.rightSplit);
    }

    private isLeafInside(leaf: WorkspaceLeaf, parent: any): boolean {
        if (!parent) return false;
        if (parent === leaf) return true;
        if (!parent.children) return false;
        return parent.children.some((child: any) => this.isLeafInside(leaf, child));
    }
}
