import {
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { CustomWebSocket } from '../websocket';
import { FormEventHandler } from 'react';
import { ArrowBack, ArrowLeft } from '@mui/icons-material';
import { UseValue } from '#/useValue';

export const ChatPanel: React.FC<{
  websocket: CustomWebSocket;
  chatOpen: UseValue<boolean>;
}> = ({ chatOpen }) => {
  const onChatSubmit: FormEventHandler = (e) => {
    e.preventDefault();
  };
  return (
    <Stack p={1} maxWidth='320px' height='100%' maxHeight='100%'>
      <Box display='flex' flexDirection='row'>
        <Box flex={1} />
        <IconButton onClick={chatOpen.wrap(false)}>
          <ArrowBack />
        </IconButton>
      </Box>
      <Stack
        spacing={1}
        flex={1}
        sx={(theme) => ({
          //   overflowY: 'scroll',
          overflowY: 'scroll',
          scrollbarColor: 'auto',
          scrollbarGutter: 'auto',
        })}
      >
        <Box flex={1} />
        <Typography>1</Typography>
        <Typography>1</Typography>
        <Typography>1</Typography>
        <Typography>1</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
        <Typography>Lorem Ipsum</Typography>
      </Stack>
      <Box>
        <Stack
          spacing={0.5}
          direction='row'
          component='form'
          onSubmit={onChatSubmit}
        >
          <TextField size='small' />
          <Button variant='contained' type='submit'>
            전송
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};
