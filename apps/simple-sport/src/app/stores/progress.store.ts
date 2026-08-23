import {computed, inject} from '@angular/core';
import {signalStore, withProps} from '@ngrx/signals';
import {withRxResourceState} from '@simple-sport/shared';
import {TrainingSqlService} from '@simple-sport/integration';

export const ProgressStore = signalStore(
    withProps(() => ({
        _trainingSql: inject(TrainingSqlService),
    })),
    withRxResourceState({
        name: 'names',
        eager: true,
        loader: ({store}) => store._trainingSql.listAllNames(),
    }),
    withProps((store) => ({
        names: computed(() => store._names() ?? []),
    })),
);
