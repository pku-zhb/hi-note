import { Modal, Notice, TFile, setIcon } from 'obsidian';
import CommentPlugin from '../../../main';
import { HighlightService } from '../../services/HighlightService';
import { HighlightInfo } from '../../types';
import { HighlightCard } from '../../components/highlight/HighlightCard';
import { t } from '../../i18n';

/** Handles export and deletion for a multi-selection of highlights. */
export class BatchOperationsHandler {
    private multiSelectActionsContainer: HTMLElement | null = null;
    private getSelectedHighlightsCallback: () => Set<HighlightInfo>;
    private onClearSelectionCallback: () => void;
    private onRefreshViewCallback: () => Promise<void>;

    constructor(
        private plugin: CommentPlugin,
        private highlightService: HighlightService,
        private containerEl: HTMLElement
    ) {}

    setCallbacks(
        getSelectedHighlights: () => Set<HighlightInfo>,
        onClearSelection: () => void,
        onRefreshView: () => Promise<void>
    ): void {
        this.getSelectedHighlightsCallback = getSelectedHighlights;
        this.onClearSelectionCallback = onClearSelection;
        this.onRefreshViewCallback = onRefreshView;
    }

    showMultiSelectActions(selectedCount: number): void {
        if (selectedCount <= 1) {
            this.hideMultiSelectActions();
            return;
        }

        this.hideMultiSelectActions();
        this.multiSelectActionsContainer = this.containerEl.createEl('div', {
            cls: 'multi-select-actions'
        });
        this.multiSelectActionsContainer.createEl('div', {
            cls: 'selected-count',
            text: `selected ${selectedCount}`
        });

        this.createActionButton(t('Delete'), 'trash', () => {
            this.deleteSelectedHighlights();
        });
    }

    hideMultiSelectActions(): void {
        if (this.multiSelectActionsContainer) {
            this.multiSelectActionsContainer.remove();
            this.multiSelectActionsContainer = null;
        }
    }

    private createActionButton(label: string, icon: string, onClick: () => void): void {
        if (!this.multiSelectActionsContainer) return;
        const button = this.multiSelectActionsContainer.createEl('div', {
            cls: 'multi-select-action-button'
        });
        button.setAttribute('aria-label', label);
        setIcon(button, icon);
        button.addEventListener('click', onClick);
    }

    private deleteSelectedHighlights(): void {
        const selectedHighlights = this.getSelectedHighlightsCallback();
        if (selectedHighlights.size === 0) {
            new Notice(t('No highlights selected'));
            return;
        }

        const modal = new Modal(this.plugin.app);
        modal.titleEl.setText(t('Confirm delete highlights'));
        modal.contentEl.createEl('p', {
            text: t(
                `Are you sure you want to delete ${selectedHighlights.size} highlights and all their comments? This action cannot be undone.`
            )
        });

        const buttonContainer = modal.contentEl.createEl('div', {
            cls: 'modal-button-container'
        });
        buttonContainer.createEl('button', { text: t('Cancel') })
            .addEventListener('click', () => modal.close());

        const confirmButton = buttonContainer.createEl('button', {
            cls: 'mod-warning',
            text: t('Delete')
        });
        confirmButton.addEventListener('click', () => {
            modal.close();
            void this.performDeleteSelectedHighlights();
        });
        modal.open();
    }

    private async performDeleteSelectedHighlights(): Promise<void> {
        const highlights = Array.from(this.getSelectedHighlightsCallback());
        if (highlights.length === 0) return;

        let failed = 0;
        const markedHighlights = highlights
            .filter(highlight => highlight.filePath && highlight.text && !highlight.isVirtual)
            .map(highlight => ({
                text: highlight.text,
                position: highlight.position,
                filePath: highlight.filePath!,
                originalLength: highlight.originalLength
            }));

        if (markedHighlights.length > 0) {
            const markResult = await this.highlightService.batchRemoveHighlightMarks(markedHighlights);
            failed += markResult.failed;
        }

        for (const highlight of highlights) {
            if (!highlight.filePath || !highlight.id) continue;
            const file = this.plugin.app.vault.getAbstractFileByPath(highlight.filePath);
            if (!(file instanceof TFile)) {
                failed++;
                continue;
            }

            try {
                await this.plugin.highlightManager.removeHighlight(file, highlight as any);
                this.plugin.eventManager.emitHighlightDelete(
                    highlight.filePath,
                    highlight.text || '',
                    highlight.id
                );
                const card = HighlightCard.findCardInstanceByHighlightId(highlight.id);
                card?.getElement().remove();
                card?.destroy();
            } catch (error) {
                failed++;
                console.error('[BatchDelete] Failed to delete highlight:', highlight.id, error);
            }
        }

        this.onClearSelectionCallback();
        await this.onRefreshViewCallback();

        if (failed === 0) {
            new Notice(t(`Successfully deleted ${highlights.length} highlights`));
        } else {
            new Notice(t(`Deleted highlights with ${failed} failures`));
        }
    }

    destroy(): void {
        this.hideMultiSelectActions();
    }
}
