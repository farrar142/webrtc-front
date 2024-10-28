'use client';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
interface UserState {
  userId: string;
  username: string;
  setUsername: (username: string) => void;
}
export const useUserStore = create(
  persist<UserState>(
    (set) => ({
      userId: uuid(),
      username: uuid(),
      setUsername: (username: string) => set((p) => ({ ...p, username })),
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
