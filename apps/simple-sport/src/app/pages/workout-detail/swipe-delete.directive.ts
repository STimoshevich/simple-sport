import {Directive, output} from '@angular/core';

const THRESHOLD_PX = 72;
const IGNORE = 'INPUT,TEXTAREA,BUTTON,MAT-CHECKBOX,A,.cdk-drag-handle,.mat-mdc-checkbox';

@Directive({
    selector: '[appSwipeDelete]',
    standalone: true,
    host: {
        '(pointerdown)': 'onDown($event)',
        '(pointermove)': 'onMove($event)',
        '(pointerup)': 'onUp($event)',
        '(pointercancel)': 'onUp($event)',
        '[style.transform]': 'shift',
        '[style.transition]': 'transition',
    },
})
export class SwipeDeleteDirective {
    readonly deleted = output<void>();

    shift = '';
    transition = '';
    private startX = 0;
    private startY = 0;
    private dx = 0;
    private tracking = false;
    private pointerId?: number;

    onDown(event: PointerEvent): void {
        if (event.pointerType === 'mouse' && event.button !== 0) {
            return;
        }

        const target = event.target as HTMLElement | null;

        if (target?.closest(IGNORE)) {
            return;
        }

        this.startX = event.clientX;
        this.startY = event.clientY;
        this.dx = 0;
        this.tracking = true;
        this.pointerId = event.pointerId;
        this.transition = 'none';
    }

    onMove(event: PointerEvent): void {
        if (!this.tracking || event.pointerId !== this.pointerId) {
            return;
        }

        const moveX = event.clientX - this.startX;
        const moveY = event.clientY - this.startY;

        if (Math.abs(moveX) < 8 && Math.abs(moveY) < 8) {
            return;
        }

        if (Math.abs(moveY) > Math.abs(moveX)) {
            this.reset();
            return;
        }

        if (moveX > 0) {
            this.dx = 0;
            this.shift = '';
            return;
        }

        event.preventDefault();
        this.dx = moveX;
        this.shift = `translateX(${moveX}px)`;
    }

    onUp(event: PointerEvent): void {
        if (!this.tracking || event.pointerId !== this.pointerId) {
            return;
        }

        const shouldDelete = this.dx <= -THRESHOLD_PX;
        this.reset();

        if (shouldDelete) {
            this.deleted.emit();
        }
    }

    private reset(): void {
        this.tracking = false;
        this.pointerId = undefined;
        this.dx = 0;
        this.shift = '';
        this.transition = 'transform 160ms ease';
    }
}
