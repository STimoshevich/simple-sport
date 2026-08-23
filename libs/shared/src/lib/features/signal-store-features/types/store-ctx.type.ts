import type {
    Prettify,
    SignalStoreFeatureResult,
    StateSignals,
    WritableStateSource,
} from '@ngrx/signals';

export type StoreCtx<Input extends SignalStoreFeatureResult> = Prettify<
    StateSignals<Input['state']> & Input['props'] & WritableStateSource<Input['state']>
>;
