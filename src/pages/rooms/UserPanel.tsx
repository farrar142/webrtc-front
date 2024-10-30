import { Box, Stack, Typography } from '@mui/material';
import { Participant } from './types';
import { UseValue } from '#/useValue';
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
  useEffect(() => {
    if (!remoteStream || !videoRef.current || !audioRef.current) return;
    const video = videoRef.current;
    const audio = audioRef.current;
    // console.log(remoteStream);
    // console.log(participant);
    // if (participant.video_on) videoRef.current.srcObject = remoteStream.stream;
    // else videoRef.current.srcObject = null;

    remoteStream.stream.getTracks().forEach((track) => {
      let isVideo = false;
      let isAudio = true;
      if (track.kind === 'video') {
        isVideo = true;
        video.srcObject = new MediaStream([track]);
      } else if (track.kind === 'audio') {
        isAudio = true;
        audio.srcObject = new MediaStream([track]);
      }
    });
    remoteStream.stream.onremovetrack = (e) => {
      console.log('on ended', e.track.kind);
      if (e.track.kind === 'video') video.srcObject = null;
      if (e.track.kind === 'audio') audio.srcObject = null;
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
