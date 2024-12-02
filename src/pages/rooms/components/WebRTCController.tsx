import { useUserStore } from '#/atoms/useUserId';
import { UseRefState } from '#/useRefState';
import { UseValue } from '#/useValue';
import {
  Tv,
  VideoCall,
  KeyboardVoice,
  MicOff,
  ChatBubble,
} from '@mui/icons-material';
import { Paper, Tooltip, IconButton } from '@mui/material';
import { addStreamToConnection } from '../connections';
import { Connection, Participant } from '../types';
import { CustomWebSocket } from '../websocket';
import { enqueueSnackbar } from 'notistack';

type ConnectionType = UseRefState<Record<string, Connection>>;

const getUserMedia = () =>
  navigator.mediaDevices.getUserMedia({
    audio: false,
    video: true,
  });

const getDisplayMedia = () =>
  navigator.mediaDevices.getDisplayMedia({
    audio: true,
    video: true,
  });

const getAudioDevice = () =>
  navigator.mediaDevices.getUserMedia({ audio: true });

const onStreamEnded = (
  stream: UseValue<MediaStream | undefined>,
  media: 'video' | 'audio',
  connections: ConnectionType
) => {
  const already = stream.get;

  if (!already) return;
  already.dispatchEvent(new Event('customremovetrack'));
  already.getTracks().forEach((track) => {
    track.stop();
  });
  Object.entries(connections.get.current).forEach(
    ([userId, { connection, tracks }]) => {
      tracks[media].forEach((sender) => connection.removeTrack(sender));
    }
  );
  stream.set(undefined);
};

export const WebRTCController: React.FC<{
  videoStream: UseValue<MediaStream | undefined>;
  //   videoRef: RefObject<HTMLVideoElement>;
  audioStream: UseValue<MediaStream | undefined>;
  //   audioRef: RefObject<HTMLAudioElement>;
  connections: ConnectionType;
  websocket: CustomWebSocket;
  participants: Participant[];
  chatOpen: UseValue<boolean>;
}> = ({
  videoStream,
  //   videoRef,
  connections,
  websocket,
  participants,
  audioStream,
  //   audioRef,
  chatOpen,
}) => {
  const user = useUserStore();
  const onVideoStreamStart =
    (
      streamPromise: () => Promise<MediaStream>,
      {
        // ref,
        media,
        stream,
        connections,
      }: {
        media: 'video' | 'audio';
        stream: UseValue<MediaStream | undefined>;
        connections: ConnectionType;
      }
    ) =>
    () => {
      if (stream.get) return onStreamEnded(stream, media, connections);
      streamPromise()
        .then((_stream) => {
          stream.set(_stream);
          // if (!ref.current) return;
          // ref.current.srcObject = _stream;
          Object.entries(connections.get.current).forEach(
            ([userId, { connection, tracks }]) => {
              const senders = addStreamToConnection({
                stream: _stream,
                connection,
              });
              tracks[media].push(...senders);
            }
          );
        })
        .catch((e) => {
          if (e.message && typeof e.message === 'string') {
            enqueueSnackbar({ message: e.message, variant: 'error' });
          }
        });
    };

  //   useEffect(() => {
  //     if (!videoStream.get) return;
  //     videoStream.get.getTracks().forEach((track) => {
  //       track.onended = () => {
  //         onStreamEnded(videoStream, 'video');
  //       };
  //     });
  //   }, [videoStream.get]);
  return (
    <Paper
      sx={{
        borderRadius: 5,
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        transform: 'translate(-50%)',
      }}
    >
      <Tooltip title='채팅'>
        <IconButton onClick={chatOpen.wrap(!chatOpen.get)}>
          <ChatBubble />
        </IconButton>
      </Tooltip>
      <Tooltip title='화면 공유'>
        <IconButton
          onClick={onVideoStreamStart(getDisplayMedia, {
            media: 'video',
            stream: videoStream,
            connections,
          })}
          color={Boolean(videoStream.get) ? 'warning' : undefined}
        >
          <Tv />
        </IconButton>
      </Tooltip>
      <Tooltip title='카메라 공유'>
        <IconButton
          onClick={onVideoStreamStart(getUserMedia, {
            media: 'video',
            stream: videoStream,
            connections,
          })}
          color={Boolean(videoStream.get) ? 'warning' : undefined}
        >
          <VideoCall />
        </IconButton>
      </Tooltip>
      <Tooltip title='음성 공유'>
        <IconButton
          onClick={onVideoStreamStart(getAudioDevice, {
            media: 'audio',
            stream: audioStream,
            connections,
          })}
          color={Boolean(audioStream.get) ? 'warning' : undefined}
        >
          {Boolean(audioStream.get) ? <KeyboardVoice /> : <MicOff />}
        </IconButton>
      </Tooltip>
    </Paper>
  );
};
