'use client';

import { client } from '#/api';
import { useRoomStore } from '#/atoms/useRoomStore';
import { useUserStore } from '#/atoms/useUserId';
import { useValue } from '#/useValue';
import {
  Button,
  Card,
  Container,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  ChangeEventHandler,
  FormEventHandler,
  useEffect,
  useState,
} from 'react';
import { v4 } from 'uuid';

export default function Home() {
  const router = useRouter();
  const user = useUserStore();
  const room = useRoomStore();

  const roomname = useValue('');
  const password = useValue('');

  const onSubmit: FormEventHandler = (e) => {
    e.preventDefault();
    if (!roomname.get) return;

    room.setRoomId(roomname.get, password.get);
    router.push(`/${roomname.get}`);
  };
  useEffect(() => {
    if (user.userId) return;
    user.setUserId(v4());
  }, [user.userId]);
  return (
    <Container
      sx={(theme) => ({
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
        bgcolor: theme.palette.background.default,
      })}
    >
      <Paper sx={{ p: 1 }}>
        <Stack spacing={1} component='form' onSubmit={onSubmit}>
          <TextField
            label='Room Name'
            name='roomname'
            size='small'
            value={roomname.get}
            onChange={roomname.onTextChange}
          />
          <Button variant='contained' type='submit'>
            Move
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
