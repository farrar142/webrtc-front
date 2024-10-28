import { useState, ChangeEventHandler } from 'react';

export const useValue = <T extends any>(defaultValue: T) => {
  const [get, set] = useState(defaultValue);
  const onTextChange: ChangeEventHandler<HTMLInputElement> = ({
    target: { value },
  }) => {
    if (typeof get !== 'string') return;
    //@ts-ignore
    set(value);
  };

  return { get, set, onTextChange };
};

export type UseValue<T> = ReturnType<typeof useValue<T>>;
