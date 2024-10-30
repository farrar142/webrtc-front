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
    console.log(remoteStream);
    console.log(participant);
    if (participant.video_on) videoRef.current.srcObject = remoteStream.stream;
    else videoRef.current.srcObject = null;
  }, [remoteStream, participant.audio_on, participant.video_on]);
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
