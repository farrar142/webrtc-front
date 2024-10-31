import { Box, IconButton, Stack, Typography } from '@mui/material';
import { ChangeUserStreamFunc, Participant } from '../types';
import { useValue, UseValue } from '#/useValue';
import {
  createRef,
  MutableRefObject,
  RefObject,
  useEffect,
  useMemo,
} from 'react';
import {
  Camera,
  KeyboardVoice,
  MicOff,
  Tv,
  VideoCall,
} from '@mui/icons-material';
import { useUserStore } from '#/atoms/useUserId';

export const UserDisplayPanel: React.FC<{
  participants: Participant[];
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  myStream: UseValue<MediaStream | undefined>;
  selectedUser: UseValue<Participant>;
  changeUserStream: MutableRefObject<ChangeUserStreamFunc>;
}> = ({
  participants,
  remoteStreams,
  myStream,
  selectedUser,
  changeUserStream,
}) => {
  const user = useUserStore();
  return (
    <Stack
      className='hide-scrollbar'
      spacing={1}
      sx={{
        overflow: 'scroll',
        maxHeight: '100%',
      }}
    >
      <UserPanel
        selectedUser={selectedUser}
        participant={{
          user_id: user.userId,
          username: user.username,
          audio_on: false,
          video_on: false,
        }}
        remoteStreams={remoteStreams}
        remoteStream={
          myStream.get
            ? { stream: myStream.get, userId: user.userId }
            : undefined
        }
        changeUserStream={changeUserStream}
      />
      {participants
        .filter((p) => p.user_id !== user.userId)
        .map((p) => (
          <UserPanel
            selectedUser={selectedUser}
            key={p.user_id}
            participant={p}
            remoteStreams={remoteStreams}
            remoteStream={remoteStreams.get.find(
              (rs) => rs.userId === p.user_id
            )}
            changeUserStream={changeUserStream}
          />
        ))}
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
      <Box width='150px' sx={{ aspectRatio: 16 / 9 }} />
    </Stack>
  );
};

const UserPanel: React.FC<{
  participant: Participant;
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  remoteStream: { userId: string; stream: MediaStream } | undefined;
  selectedUser: UseValue<Participant>;
  changeUserStream: MutableRefObject<ChangeUserStreamFunc>;
}> = ({
  participant,
  remoteStreams,
  remoteStream,
  selectedUser,
  changeUserStream,
}) => {
  const user = useUserStore();
  const videoRef = createRef<HTMLVideoElement>();
  const vidAudioRef = createRef<HTMLAudioElement>();
  const audioRef = createRef<HTMLAudioElement>();
  const videoStream = useValue<MediaStream | undefined>(undefined);
  const audioStream = useValue<MediaStream | undefined>(undefined);

  const isVideoStream = useMemo(
    () =>
      Boolean(
        remoteStream?.stream.getTracks().find((track) => track.kind === 'video')
      ),
    [remoteStream]
  );
  const isAudioStream = useMemo(
    () =>
      remoteStream?.stream.getTracks().length === 1 &&
      remoteStream.stream.getTracks().filter((t) => t.kind === 'audio')
        .length === 1,
    [remoteStream]
  );

  useEffect(() => {
    if (!remoteStream || !videoRef.current || !vidAudioRef.current) return;
    if (!isVideoStream) return;
    videoStream.set(remoteStream.stream);
    const video = videoRef.current;
    const vidAudio = vidAudioRef.current;
    remoteStream.stream.getTracks().forEach((track) => {
      if (track.kind === 'video') video.srcObject = new MediaStream([track]);
      if (track.kind === 'audio') vidAudio.srcObject = new MediaStream([track]);
    });
    video.srcObject = remoteStream.stream;
    remoteStream.stream.addEventListener('customremovetrack', () => {
      console.log('customremovetrack');
      videoStream.set(undefined);
      video.srcObject = null;
    });
    remoteStream.stream.addEventListener('removetrack', (e) => {
      console.log('remove video track');
      videoStream.set(undefined);
      video.srcObject = null;
    });
  }, [isVideoStream, remoteStream?.stream.id]);

  useEffect(() => {
    if (!remoteStream || !audioRef.current) return;
    if (!isAudioStream) return;
    audioStream.set(remoteStream.stream);
    const audio = audioRef.current;
    audio.srcObject = remoteStream.stream;
    remoteStream.stream.addEventListener('removetrack', (e) => {
      audioStream.set(undefined);
      audio.srcObject = null;
    });
  }, [isAudioStream, remoteStream?.stream.id]);

  useEffect(() => {
    if (selectedUser.get.user_id !== participant.user_id) return;
    // if (selectedUser.get.user_id === user.userId) return; //Room Container에서 처리

    changeUserStream.current({
      videoStream:
        videoStream.get && videoStream.get.active ? videoStream.get : undefined,
      // audioStream: audioStream.get,
      participant,
    });
  }, [selectedUser.get.user_id, videoStream.get, audioStream.get]);

  return (
    <Box
      position='relative'
      width='100%'
      maxWidth='150px'
      sx={{ aspectRatio: 16 / 9, cursor: 'pointer' }}
      onClick={selectedUser.wrap(participant)}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid red',
          objectFit: 'cover',
        }}
      />
      <audio ref={vidAudioRef} autoPlay muted />
      <audio ref={audioRef} autoPlay />
      <Box
        // 유저 이름
        sx={[
          {
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            px: 1,
          },
          {
            display: '-webkit-box',
            textOverflow: 'ellipsis',
            overflow: 'hidden',
            lineClamp: 1,
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          },
        ]}
      >
        <Typography>{participant.username}</Typography>
      </Box>
      <Box
        // 유저의 스트림 상황
        sx={{
          width: '100%',
          position: 'absolute',
          bottom: 0,
          left: 0,
          px: 1,
        }}
      >
        <IconButton
          size='small'
          color={Boolean(videoStream.get) ? 'warning' : undefined}
        >
          <Tv fontSize='small' />
        </IconButton>
        <IconButton
          size='small'
          color={Boolean(audioStream.get) ? 'warning' : undefined}
        >
          {Boolean(audioStream.get) ? (
            <KeyboardVoice fontSize='small' />
          ) : (
            <MicOff fontSize='small' />
          )}
        </IconButton>
      </Box>
    </Box>
  );
};
