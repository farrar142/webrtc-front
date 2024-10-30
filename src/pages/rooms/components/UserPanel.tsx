import { Box, Stack, Typography } from '@mui/material';
import { Participant } from '../types';
import { useValue, UseValue } from '#/useValue';
import { createRef, useEffect, useMemo } from 'react';

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
  const vidAudioRef = createRef<HTMLAudioElement>();
  const audioRef = createRef<HTMLAudioElement>();
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
    isVideoOn.set(true);
    const video = videoRef.current;
    const vidAudio = vidAudioRef.current;
    remoteStream.stream.getTracks().forEach((track) => {
      if (track.kind === 'video') video.srcObject = new MediaStream([track]);
      if (track.kind === 'audio') vidAudio.srcObject = new MediaStream([track]);
    });
    video.srcObject = remoteStream.stream;
    remoteStream.stream.onremovetrack = (e) => {
      isVideoOn.set(false);
      video.srcObject = null;
    };
  }, [isVideoStream, remoteStream?.stream.id]);

  useEffect(() => {
    if (!remoteStream || !audioRef.current) return;
    if (!isAudioStream) return;
    isAudioOn.set(true);
    const audio = audioRef.current;
    audio.srcObject = remoteStream.stream;
    remoteStream.stream.onremovetrack = (e) => {
      isAudioOn.set(false);
      audio.srcObject = null;
    };
  }, [isAudioStream, remoteStream?.stream.id]);

  return (
    <Box>
      <Typography>{participant.username}</Typography>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '200px', height: '200px', border: '1px solid red' }}
      />
      <audio ref={vidAudioRef} autoPlay />
      <audio ref={audioRef} autoPlay />
    </Box>
  );
};
