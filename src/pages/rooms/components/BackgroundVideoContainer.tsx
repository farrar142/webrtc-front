import { Box, Typography } from '@mui/material';
import { createRef, RefObject, useEffect, useImperativeHandle } from 'react';
import { ChangeUserStreamFunc, Participant } from '../types';
import { useValue, UseValue } from '#/useValue';
import { useUserStore } from '#/atoms/useUserId';

export const BackgroundVideoContainer: React.FC<{
  changeUserStream: RefObject<ChangeUserStreamFunc>;
  selectedUser: UseValue<Participant>;
  participants: UseValue<Participant[]>;
}> = ({ changeUserStream, selectedUser, participants }) => {
  const user = useUserStore();
  const stream = useValue<MediaStream | undefined>(undefined);
  const videoRef = createRef<HTMLVideoElement>();
  const vidAudioRef = createRef<HTMLAudioElement>();
  //   const audioRef = createRef<HTMLAudioElement>();
  useImperativeHandle(
    changeUserStream,
    () =>
      ({ videoStream, participant }) => {
        const [video, vidAudio] = [videoRef.current, vidAudioRef.current];
        if (!video || !vidAudio) return;
        if (videoStream) {
          videoStream.addEventListener('removetrack', () => {
            video.srcObject = null;
            vidAudio.srcObject = null;
            stream.set(undefined);
          });
          stream.set(videoStream);
          videoStream.getTracks().forEach((track) => {
            if (track.kind === 'video')
              video.srcObject = new MediaStream([track]);
            if (track.kind === 'audio' && participant.user_id !== user.userId)
              vidAudio.srcObject = new MediaStream([track]);
          });
        } else {
          stream.set(undefined);
          video.srcObject = null;
          vidAudio.srcObject = null;
        }
      }
  );
  useEffect(() => {
    // 유저가 존재하면 패스
    if (participants.get.find((p) => p.user_id === selectedUser.get.user_id))
      return;
    //유저가 나가면?
    selectedUser.set({
      user_id: user.userId,
      username: user.username,
      audio_on: false,
      video_on: false,
    });
  }, [participants.get, selectedUser.get.user_id]);

  return (
    <Box flex={1} className='flex'>
      <video
        ref={videoRef}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          margin: 0,
          padding: 0,
          height: 'auto',
          width: '100%',
          objectFit: 'contain',
          display: Boolean(stream.get) ? 'inherit' : 'none',
        }}
        autoPlay
        muted
      />
      {!Boolean(stream.get) && (
        <Box
          sx={(theme) => ({
            maxWidth: 200,
            aspectRatio: 1,
            borderRadius: 100,
            bgcolor: theme.palette.action.hover,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Box
            className='single-line'
            width='50%'
            display='flex'
            alignItems='center'
            justifyContent='center'
          >
            <Typography>{selectedUser.get.username}</Typography>
          </Box>
        </Box>
      )}
      <audio ref={vidAudioRef} autoPlay />
      {/* <audio ref={audioRef} autoPlay muted /> */}
    </Box>
  );
};
