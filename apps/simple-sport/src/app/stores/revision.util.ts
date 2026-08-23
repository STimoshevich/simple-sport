import {effect, untracked} from '@angular/core';
import {DataDomain, DataRevisionStore} from '@simple-sport/shared';

export const FEED_ORIGIN = 'feed';

export function revisionKey(
    revisions: InstanceType<typeof DataRevisionStore>,
    ...domains: DataDomain[]
): string {
    return revisions.keyOf(...domains);
}

/**
 * Перезагружает данные стора, когда кто-то другой изменил наблюдаемые домены.
 *
 * `DataRevisionStore` инкрементирует счётчик ревизии домена после каждой записи
 * в репозиторий (`bump`). Эта функция через `effect` следит за сводным ключом
 * ревизий переданных доменов: как только он меняется (данные записал другой стор,
 * страница или репозиторий), вызывается `refresh`.
 *
 * Если передан `origin`, собственные записи стора перезагрузку не запускают:
 * инициатор `bump` с этим origin уже актуализировал своё состояние, и повторная
 * загрузка была бы эхом (например, HistoryStore передаёт `FEED_ORIGIN`).
 *
 * `refresh` выполняется в `untracked`, чтобы его сигнальные чтения/записи
 * не попали в зависимости эффекта и не зациклили его.
 *
 * Пример без origin — каталог упражнений узнаёт о правке из другой части приложения:
 *
 *   1. ExerciseCatalogStore.onInit: syncOnRevision(revisions, [Exercise], reload)
 *   2. Редактор тренировки: exerciseRepository.rename(id, 'Подтягивания')
 *   3. Репозиторий после записи: revisions.bump([Exercise])   // ключ "0" -> "1"
 *   4. Эффект каталога увидел новый ключ -> reload() подтянул новое название
 *
 * Пример с origin — лента не перезагружается из-за собственного сохранения:
 *
 *   1. HistoryStore.onInit: syncOnRevision(revisions, [TrainingSet], refresh, FEED_ORIGIN)
 *   2. Пользователь отметил подход: store уже обновил ленту и вызвал сервис с origin=FEED_ORIGIN
 *   3. Репозиторий: revisions.bump([TrainingSet], FEED_ORIGIN)   // ключ изменился,
 *      но lastOrigin === FEED_ORIGIN
 *   4. Своя запись -> refresh пропущен, лента не перезагружается
 */
export function syncOnRevision(
    revisions: InstanceType<typeof DataRevisionStore>,
    domains: DataDomain[],
    refresh: () => void,
    origin?: string,
): void {
    let seen = revisions.keyOf(...domains);
    effect(() => {
        const key = revisions.keyOf(...domains);

        if (key === seen) {
            return;
        }

        if (origin && revisions.lastOrigin() === origin) {
            seen = key;
            return;
        }

        seen = key;
        untracked(() => refresh());
    });
}
