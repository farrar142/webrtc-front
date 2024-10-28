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
import { ChangeEventHandler, FormEventHandler, useState } from 'react';

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
  return (
    <Container
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}
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
          <TextField
            label='Password'
            name='password'
            size='small'
            value={password.get}
            onChange={password.onTextChange}
          />
          <TextField
            label='Username'
            name='username'
            size='small'
            onChange={({ target: { value } }) => user.setUsername(value)}
          />
          <Button variant='contained' type='submit'>
            Confirm
          </Button>
        </Stack>
      </Paper>
    </Container>
  );
}
