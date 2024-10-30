'use client';
import { useState } from 'react';
import { v4 as uuid } from 'uuid';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
interface UserState {
  userId: string;
  username: string;
  setUsername: (username: string) => void;
  setUserId: (id: string) => void;
}
export const useUserStore = create(
  persist<UserState>(
    (set) => ({
      userId: '',
      username: uuid(),
      setUsername: (username: string) => set((p) => ({ ...p, username })),
      setUserId: (userId) => set((p) => ({ ...p, userId })),
    }),
    {
      name: 'user-storage/v2',
    }
  )
);
