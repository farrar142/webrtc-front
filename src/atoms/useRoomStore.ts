import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoomInterface {
  roomInfo: { [key: string]: string };
  setRoomId: (room: string, password: string) => void;
}

export const useRoomStore = create(
  persist<RoomInterface>(
    (set, get) => ({
      roomInfo: {},
      setRoomId: (room, password) =>
        set((p) => ({ ...p, roomInfo: { ...p.roomInfo, [room]: password } })),
    }),
    {
      name: 'room-storage/v2',
    }
  )
);
