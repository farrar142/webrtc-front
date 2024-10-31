import { UseRefState } from '#/useRefState';
import { useValue, UseValue } from '#/useValue';
import { Box, Collapse } from '@mui/material';
import {
  MutableRefObject,
  createRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  UserController,
  ConnectionMap,
  Participant,
  ChangeUserStreamFunc,
} from '../types';
import { UserDisplayPanel } from './UserPanel';
import { CustomWebSocket } from '../websocket';
import { WebRTCController } from './WebRTCController';
import { ChatPanel } from './ChatPanel';
import { BackgroundVideoContainer } from './BackgroundVideoContainer';
import { useUserStore } from '#/atoms/useUserId';

export const RoomContainer: React.FC<{
  connections: UseRefState<ConnectionMap>;
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  videoStream: UseValue<MediaStream | undefined>;
  audioStream: UseValue<MediaStream | undefined>;
  participants: UseValue<Participant[]>;
  websocket: CustomWebSocket;
}> = ({
  connections,
  remoteStreams,
  websocket,
  audioStream,
  videoStream,
  participants,
}) => {
  const user = useUserStore();
  const chatOpen = useValue(true);
  const selectedUser = useValue<Participant>({
    user_id: user.userId,
    username: user.username,
    video_on: false,
    audio_on: false,
  });
  const changeUserStream = useRef<ChangeUserStreamFunc>(() => () => {});
  //   useEffect(() => {
  //     if (selectedUser.get.user_id !== user.userId) return;
  //     changeUserStream.current({
  //       videoStream: videoStream.get,
  //       participant: {
  //         user_id: user.userId,
  //         username: user.username,
  //         audio_on: false,
  //         video_on: false,
  //       },
  //     });
  //   }, [selectedUser.get, user.userId]);
  return (
    <Box width='100%' height='100%' maxHeight='100%'>
      <Box width='100%' maxHeight='100%' display='flex' flexDirection='row'>
        <Collapse
          in={chatOpen.get}
          orientation='horizontal'
          sx={{ maxHeight: '100%' }}
        >
          <ChatPanel websocket={websocket} chatOpen={chatOpen} />
        </Collapse>
        <Box flex={1} className='flex' position='relative'>
          <BackgroundVideoContainer
            changeUserStream={changeUserStream}
            selectedUser={selectedUser}
            participants={participants}
          />
          <WebRTCController
            chatOpen={chatOpen}
            videoStream={videoStream}
            audioStream={audioStream}
            // audioRef={audioRef}
            // videoRef={videoRef}
            connections={connections}
            websocket={websocket}
            participants={participants.get}
          />
        </Box>
        <UserDisplayPanel
          participants={participants.get}
          myStream={videoStream}
          remoteStreams={remoteStreams}
          selectedUser={selectedUser}
          changeUserStream={changeUserStream}
        />
      </Box>
    </Box>
  );
};
