import { useState, ChangeEventHandler, useRef, useEffect } from 'react';

export const useValue = <T extends any>(defaultValue: T) => {
  const [get, set] = useState(defaultValue);
  const ref = useRef(defaultValue);
  const onTextChange: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    if (typeof get !== 'string') return;
    //@ts-ignore
    set(value);
  };

  const wrap = (value: T) => () => {
    set(value);
  };

  useEffect(() => {
    ref.current = get;
  }, [get]);

  return { get, set, onTextChange, wrap, ref };
};

export type UseValue<T> = ReturnType<typeof useValue<T>>;
