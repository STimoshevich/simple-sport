import {
    Guid,
    SyncOperationLog,
    SyncPreview,
    SyncTarget,
    TemplateDelta,
    TemplateFull,
    TemplateQuery,
    TemplateSaveInput,
    TemplateSummary,
} from '@simple-sport/shared';
import {Observable} from 'rxjs';

/** Implemented with Epic 7 (Stage 5). Signatures are the Stage 1 contract. */
export interface TemplateRepository {
    queryTemplates(q: TemplateQuery): Observable<TemplateSummary[]>;
    getTemplate(id: Guid): Observable<TemplateFull | undefined>;
    saveTemplate(input: TemplateSaveInput): Observable<TemplateFull>;
    setArchived(id: Guid, archived: boolean): Observable<void>;
    deleteTemplate(id: Guid): Observable<void>;
    instantiate(templateId: Guid, dates: string[]): Observable<Guid[]>;
    findSyncTargets(templateId: Guid, fromDate: string): Observable<SyncTarget[]>;
    previewApply(delta: TemplateDelta, trainingIds: Guid[]): Observable<SyncPreview>;
    applySync(delta: TemplateDelta, trainingIds: Guid[]): Observable<SyncOperationLog>;
    revertSync(log: SyncOperationLog): Observable<void>;
}
