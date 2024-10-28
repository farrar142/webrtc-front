import { Stack, Typography } from '@mui/material';
import { Participant } from './types';
import { UseValue } from '#/useValue';

export const UserDisplayPanel: React.FC<{
  participants: Participant[];
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
}> = ({ participants, remoteStreams }) => {
  console.log(remoteStreams.get[0]);
  return (
    <Stack spacing={1}>
      {participants.map((p) => (
        <Typography key={p.user_id}>{p.username}</Typography>
      ))}
    </Stack>
  );
};
