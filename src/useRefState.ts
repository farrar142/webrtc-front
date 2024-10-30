import { useRef, SetStateAction, Dispatch } from 'react';

export const useRefState = <V extends any>(defaultValue: V) => {
  const ref = useRef<V>(defaultValue);
  const isFunc = (func: SetStateAction<V>): func is (v: V) => V => {
    return typeof func === 'function';
  };
  const setter: Dispatch<SetStateAction<V>> = (func) => {
    if (isFunc(func)) {
      ref.current = func(ref.current);
    } else {
      ref.current = func;
    }
  };
  return { get: ref, set: setter };
};
export type UseRefState<V> = ReturnType<typeof useRefState<V>>;
