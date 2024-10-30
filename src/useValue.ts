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

  useEffect(() => {
    ref.current = get;
  }, [get]);

  return { get, set, onTextChange, ref };
};

export type UseValue<T> = ReturnType<typeof useValue<T>>;
