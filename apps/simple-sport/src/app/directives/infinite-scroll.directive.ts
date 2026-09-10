import {
    Directive,
    ElementRef,
    OnDestroy,
    afterNextRender,
    effect,
    inject,
    input,
    output,
    untracked,
} from '@angular/core';

/** Край скролла, у которого срабатывает дозагрузка. */
export type InfiniteScrollDirection = 'up' | 'down';

/**
 * Бесконечный скролл: вешается на скролл-контейнер или любого его потомка —
 * прокручиваемый предок (либо окно страницы) находится автоматически.
 *
 * `direction` задаёт край: 'up' — дозагрузка у верхнего края (при скролле
 * вверх), 'down' — у нижнего. Когда до края остаётся не больше `threshold`%
 * длины скролла, эмитится `reached`. Эмит разовый на заход в зону порога:
 * повторный сработает после выхода из зоны либо после снятия `disabled` —
 * пока пользователь у края, дозагрузка идёт каскадом, страница за страницей.
 *
 * Пока `disabled`, срабатывания игнорируются. Если контент короче вьюпорта
 * и скролла нет, директива не срабатывает.
 *
 * Пример (лента истории, дозагрузка старого при скролле вверх):
 *
 *   <div
 *       class="history-feed"
 *       appInfiniteScroll
 *       direction="up"
 *       [threshold]="10"
 *       [disabled]="store.meta().isLoading || restoring()"
 *       (reached)="loadMore()"
 *   ></div>
 */
@Directive({
    selector: '[appInfiniteScroll]',
    standalone: true,
})
export class InfiniteScrollDirective implements OnDestroy {
    /** Край скролла: 'up' — верхний (скролл вверх), 'down' — нижний (скролл вниз). */
    readonly direction = input<InfiniteScrollDirection>('up');
    /** Порог срабатывания: сколько процентов длины скролла может остаться до края. */
    readonly threshold = input(10);
    /** Пока true — срабатывания игнорируются (идёт загрузка или восстановление скролла). */
    readonly disabled = input(false);

    /** До края осталось не больше порога — можно подгружать следующую порцию. */
    readonly reached = output<void>();

    private readonly hostEl = inject(ElementRef).nativeElement as HTMLElement;
    /** Прокручиваемый контейнер; null — скроллится окно страницы. */
    private scrollEl: HTMLElement | null = null;
    /** Замок: один эмит на заход в зону порога. */
    private armed = true;

    constructor() {
        // Контейнер ищем после первого рендера, когда хост уже в DOM.
        afterNextRender(() => this.bind());

        effect(() => {
            const disabled = this.disabled();

            untracked(() => {
                if (disabled) {
                    return;
                }

                // Флаг снят: взводим замок и сразу проверяем край, чтобы
                // каскад дозагрузки не ждал нового скролла.
                this.armed = true;
                this.check();
            });
        });
    }

    ngOnDestroy(): void {
        this.listenerTarget().removeEventListener('scroll', this.onScroll);
    }

    private readonly onScroll = (): void => this.check();

    private bind(): void {
        this.scrollEl = this.resolveScrollEl();
        this.listenerTarget().addEventListener('scroll', this.onScroll, {
            passive: true,
        });
        this.check();
    }

    private listenerTarget(): HTMLElement | Window {
        return this.scrollEl ?? window;
    }

    /** Ближайший прокручиваемый предок хоста (включая сам хост), null — окно. */
    private resolveScrollEl(): HTMLElement | null {
        let el: HTMLElement | null = this.hostEl;

        while (el) {
            const overflowY = getComputedStyle(el).overflowY;

            if (overflowY === 'auto' || overflowY === 'scroll') {
                return el;
            }

            el = el.parentElement;
        }

        return null;
    }

    private check(): void {
        if (this.disabled()) {
            return;
        }

        const el = this.scrollEl;
        const scrollTop = el ? el.scrollTop : window.scrollY;
        const scrollHeight = el
            ? el.scrollHeight
            : document.documentElement.scrollHeight;
        const clientHeight = el ? el.clientHeight : window.innerHeight;
        const maxScroll = scrollHeight - clientHeight;

        // Контент короче вьюпорта — скролла нет, срабатывать нечего.
        if (maxScroll <= 0) {
            return;
        }
        // Сколько осталось прокрутить до края: 'up' — до верхнего, 'down' — до нижнего.
        const remaining =
            this.direction() === 'up' ? scrollTop : maxScroll - scrollTop;

        if (remaining > (this.threshold() / 100) * maxScroll) {
            // Вышли из зоны порога — взводим замок для следующего захода.
            this.armed = true;
            return;
        }

        if (!this.armed) {
            return;
        }

        this.armed = false;
        this.reached.emit();
    }
}
