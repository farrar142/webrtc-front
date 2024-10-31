import { Box, IconButton, Stack, Typography } from '@mui/material';
import { Participant } from '../types';
import { useValue, UseValue } from '#/useValue';
import { createRef, useEffect, useMemo } from 'react';
import {
  Camera,
  KeyboardVoice,
  MicOff,
  Tv,
  VideoCall,
} from '@mui/icons-material';

export const UserDisplayPanel: React.FC<{
  participants: Participant[];
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
}> = ({ participants, remoteStreams }) => {
  return (
    <Stack
      className='hide-scrollbar'
      spacing={1}
      sx={{
        overflow: 'scroll',
        maxHeight: '100%',
      }}
    >
      {participants.map((p) => (
        <UserPanel
          key={p.user_id}
          participant={p}
          remoteStream={remoteStreams.get.find((rs) => rs.userId === p.user_id)}
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
  remoteStream: { userId: string; stream: MediaStream } | undefined;
}> = ({ participant, remoteStream }) => {
  const videoRef = createRef<HTMLVideoElement>();
  const vidAudioRef = createRef<HTMLAudioElement>();
  const audioRef = createRef<HTMLAudioElement>();
  const videoStream = useValue<MediaStream | undefined>(undefined);
  const audioStream = useValue<MediaStream | undefined>(undefined);
  const isVideoOn = useValue(false);
  const isAudioOn = useValue(false);

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
    remoteStream.stream.onremovetrack = (e) => {
      videoStream.set(undefined);
      video.srcObject = null;
    };
  }, [isVideoStream, remoteStream?.stream.id]);

  useEffect(() => {
    if (!remoteStream || !audioRef.current) return;
    if (!isAudioStream) return;
    audioStream.set(remoteStream.stream);
    const audio = audioRef.current;
    audio.srcObject = remoteStream.stream;
    remoteStream.stream.onremovetrack = (e) => {
      audioStream.set(undefined);
      audio.srcObject = null;
    };
  }, [isAudioStream, remoteStream?.stream.id]);

  return (
    <Box
      position='relative'
      width='100%'
      maxWidth='150px'
      sx={{ aspectRatio: 16 / 9 }}
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
      <audio ref={vidAudioRef} autoPlay />
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
