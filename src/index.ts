import type { DeepReadonly } from 'solid-js/store';
import { createStore, reconcile } from 'solid-js/store';
import { onCleanup } from 'solid-js';
import type {
  EqualityChecker,
  Mutate,
  State,
  StateCreator,
  StateSelector,
  StoreApi,
  StoreMutatorIdentifier,
} from 'zustand/vanilla';
import createZustandStore from 'zustand/vanilla';

export function useStore<S extends StoreApi<State>>(api: S): ExtractState<S>;
export function useStore<S extends StoreApi<State>, U>(
  api: S,
  selector: StateSelector<ExtractState<S>, U>,
  equalityFn?: EqualityChecker<U>
): U;
export function useStore<TState extends State, StateSlice>(
  api: StoreApi<TState>,
  selector: StateSelector<TState, StateSlice> = api.getState as any,
  equalityFn?: EqualityChecker<StateSlice>,
) {
  const initialValue = selector(api.getState());
  const [state, setState] = createStore(initialValue);

  const listener = () => {
    const nextState = api.getState();
    const nextStateSlice = selector(nextState);

    if (equalityFn !== undefined) {
      if (!equalityFn(state as StateSlice, nextStateSlice))
        setState(reconcile(nextStateSlice as DeepReadonly<StateSlice>));
    }
    else {
      setState(reconcile(nextStateSlice as DeepReadonly<StateSlice>));
    }
  };

  const unsubscribe = api.subscribe(listener);
  onCleanup(() => unsubscribe());
  return state;
}

type ExtractState<S> = S extends { getState: () => infer T } ? T : never;

export type UseBoundStore<S extends StoreApi<State>> = {
  (): ExtractState<S>
  <U>(
    selector: StateSelector<ExtractState<S>, U>,
    equals?: EqualityChecker<U>
  ): U
} & S;

interface Create {
  <T extends State, Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ): UseBoundStore<Mutate<StoreApi<T>, Mos>>
  <T extends State>(): <Mos extends [StoreMutatorIdentifier, unknown][] = []>(
    initializer: StateCreator<T, [], Mos>
  ) => UseBoundStore<Mutate<StoreApi<T>, Mos>>
  <S extends StoreApi<State>>(store: S): UseBoundStore<S>
}

const createImpl = <T extends State>(createState: StateCreator<T, [], []>) => {
  const api
    = typeof createState === 'function' ? createZustandStore(createState) : createState;

  const useBoundStore: any = (selector?: any, equalityFn?: any) =>
    useStore(api, selector, equalityFn);

  Object.assign(useBoundStore, api);

  return useBoundStore;
};

const create = (<T extends State>(
  createState: StateCreator<T, [], []> | undefined,
) => (createState ? createImpl(createState) : createImpl)) as Create;

export default create;
