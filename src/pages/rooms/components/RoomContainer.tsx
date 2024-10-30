import { UseRefState } from '#/useRefState';
import { UseValue } from '#/useValue';
import { Box } from '@mui/material';
import { MutableRefObject, createRef, useImperativeHandle } from 'react';
import { UserController, ConnectionMap, Participant } from '../types';
import { UserDisplayPanel } from './UserPanel';
import { CustomWebSocket } from '../websocket';
import { WebRTCController } from './WebRTCController';

export const RoomContainer: React.FC<{
  userControlRef: MutableRefObject<UserController>;
  connections: UseRefState<ConnectionMap>;
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  videoStream: UseValue<MediaStream | undefined>;
  audioStream: UseValue<MediaStream | undefined>;
  participants: UseValue<Participant[]>;
  websocket: CustomWebSocket;
}> = ({
  userControlRef,
  connections,
  remoteStreams,
  websocket,
  audioStream,
  videoStream,
  participants,
}) => {
  const videoRef = createRef<HTMLVideoElement>();
  const audioRef = createRef<HTMLAudioElement>();
  useImperativeHandle(
    userControlRef,
    () => ({
      onUserAdd: (participant) => {
        if (participants.get.find((p) => p.user_id === participant.user_id))
          return;
        participants.set((p) => [...p, participant]);
      },
      onUserRemoved: (userId) => {
        participants.set((p) => {
          return p.filter((pp) => pp.user_id !== userId);
        });
      },
    }),
    [participants.get]
  );
  return (
    <Box width='100%' height='100%'>
      <Box width='100%' display='flex' flexDirection='row'>
        <Box>chat</Box>
        <Box flex={1}>
          <video
            ref={videoRef}
            style={{ width: '200px', height: '200px', border: '1px solid red' }}
            autoPlay
            muted
          />
          <audio ref={audioRef} autoPlay muted />
        </Box>
        <UserDisplayPanel
          participants={participants.get}
          remoteStreams={remoteStreams}
        />
      </Box>
      <WebRTCController
        videoStream={videoStream}
        audioStream={audioStream}
        audioRef={audioRef}
        videoRef={videoRef}
        connections={connections}
        websocket={websocket}
        participants={participants.get}
      />
    </Box>
  );
};
