import { Box, Stack, Typography } from '@mui/material';
import { Participant } from '../types';
import { useValue, UseValue } from '#/useValue';
import { createRef, useEffect } from 'react';

export const UserDisplayPanel: React.FC<{
  participants: Participant[];
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
}> = ({ participants, remoteStreams }) => {
  return (
    <Stack spacing={1}>
      {participants.map((p) => (
        <UserPanel
          key={p.user_id}
          participant={p}
          remoteStream={remoteStreams.get.find((rs) => rs.userId === p.user_id)}
        ></UserPanel>
      ))}
    </Stack>
  );
};
const UserPanel: React.FC<{
  participant: Participant;
  remoteStream: { userId: string; stream: MediaStream } | undefined;
}> = ({ participant, remoteStream }) => {
  const videoRef = createRef<HTMLVideoElement>();
  const audioRef = createRef<HTMLAudioElement>();
  const media = useValue<{ audio: boolean; video: boolean }>({
    audio: false,
    video: false,
  });
  useEffect(() => {
    if (!remoteStream || !videoRef.current || !audioRef.current) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    const isVideoStream = Boolean(
      remoteStream.stream.getTracks().find((track) => track.kind === 'video')
    );
    const isAudioStream =
      remoteStream.stream.getTracks().length === 1 &&
      remoteStream.stream.getTracks().filter((t) => t.kind === 'audio')
        .length === 1;
    if (isVideoStream) video.srcObject = remoteStream.stream;
    if (isAudioStream) audio.srcObject = remoteStream.stream;
    remoteStream.stream.onremovetrack = (e) => {
      if (isVideoStream) video.srcObject === null;
      if (isAudioStream) audio.srcObject === null;
    };
  }, [remoteStream]);
  return (
    <Box>
      <Typography>{participant.username}</Typography>
      <video
        ref={videoRef}
        autoPlay
        muted
        // playsInline
        style={{ width: '200px', height: '200px', border: '1px solid red' }}
      />
      <audio ref={audioRef} autoPlay />
    </Box>
  );
};
