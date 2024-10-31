'use client';

import { useRoomStore } from '#/atoms/useRoomStore';
import { useUserStore } from '#/atoms/useUserId';
import { useRefState } from '#/useRefState';
import { useValue } from '#/useValue';
import { Box } from '@mui/material';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { v4 } from 'uuid';
import { RoomContainer } from './components/RoomContainer';
import {
  addStreamToConnection,
  answerOfferToParticipants,
  handleParticipantStreamStatus,
  sendOfferToParticipant,
} from './connections';
import { ConnectionMap, Participant, UserController } from './types';
import { CustomWebSocket } from './websocket';

export const RoomDetail: React.FC<{ room: string }> = ({ room }) => {
  const router = useRouter();
  const user = useUserStore();
  const roomStore = useRoomStore();
  const password = roomStore.roomInfo[room];
  const authenticated = useValue(false);
  const websocket = useValue<CustomWebSocket | undefined>(undefined);
  const connections = useRefState<ConnectionMap>({});
  const participants = useValue<Participant[]>([]);
  const remoteStreams = useValue<{ userId: string; stream: MediaStream }[]>([]);
  const videoStream = useValue<MediaStream | undefined>(undefined);
  const audioStream = useValue<MediaStream | undefined>(undefined);

  const userControl = {
    onUserAdd: (participant: Participant) =>
      participants.set((ps) => {
        if (ps.find((p) => p.user_id === participant.user_id)) return ps;
        return [...ps, participant];
      }),
    onUserRemoved: (userId: string) => {
      participants.set((p) => {
        return p.filter((pp) => pp.user_id !== userId);
      });
    },
  };

  useEffect(() => {
    // zustand persist
    if (user.userId) return;
    const timeout = setTimeout(() => {
      user.setUserId(v4());
    }, 100);
    return () => clearTimeout(timeout);
  }, [user.userId]);

  useEffect(() => {
    if (!user.userId) return;
    const ws = new CustomWebSocket(
      process.env.NEXT_PUBLIC_BACKEND_URL + '/ws/rooms/' + room + '/'
    );
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'authentication',
          password: password,
          user_id: user.userId,
          username: user.username,
        })
      );
    };
    ws.parseMessage((data) => {
      if (data.type === 'authentication') {
        if (data.result) {
          authenticated.set(true);
          ws.sendMessage({
            type: 'notifyparticipant',
            sender: user.userId,
            username: user.username,
          });
          for (const participant of data.data) {
            setTimeout(() => {
              userControl.onUserAdd(participant);
            }, 100);
          }
        } else {
          // Notification 해줘야됨
          router.push('/');
        }
      } else if (data.type === 'notifyparticipant') {
        const participant = {
          user_id: data.sender,
          username: data.username,
          audio_on: false,
          video_on: false,
        };
        userControl.onUserAdd(participant);
        // if (videoStream.ref.current) {
        sendOfferToParticipant({
          // stream: videoStream.ref.current,
          participant,
          websocket: ws,
          connections,
          user,
          streams: remoteStreams,
        }).then((connection) => {
          if (videoStream.ref.current) {
            const senders = addStreamToConnection({
              connection,
              stream: videoStream.ref.current,
            });
            connections.get.current[participant.user_id].tracks.video.push(
              ...senders
            );
          }
          if (audioStream.ref.current) {
            const senders = addStreamToConnection({
              connection,
              stream: audioStream.ref.current,
            });
            connections.get.current[participant.user_id].tracks.audio.push(
              ...senders
            );
          }
        });
        // }
      } else if (data.type === 'userdisconnected') {
        userControl.onUserRemoved(data.sender);
        const entries = Object.entries(connections.get.current)
          .map(([userId, { connection, tracks }]) => {
            if (userId === data.sender) {
              connection.close();
              return undefined;
            }
            return [userId, { connection, tracks }] as const;
          })
          .filter((values) => values !== undefined);
        connections.set(Object.fromEntries(entries));
      } else if (data.type === 'sendsdp') {
        answerOfferToParticipants({
          websocket: ws,
          data,
          user: user,
          streams: remoteStreams,
          connections,
        });
      } else if (data.type === 'answersdp') {
        connections.get.current[data.sender].connection.setRemoteDescription({
          sdp: data.sdp,
          type: data.sdp_type,
        });
      } else if (data.type === 'sendcandidate') {
        const interval = setInterval(() => {
          const connection = connections.get.current[data.sender].connection;
          if (!connection) return;
          connection.addIceCandidate(data.candidate);
          handleParticipantStreamStatus(
            participants,
            data.sender,
            'video',
            true
          );
          clearInterval(interval);
        }, 1000);
      }
      // else if (data.type === 'streamstatus') {
      //   handleParticipantStreamStatus(
      //     participants,
      //     data.sender,
      //     data.media,
      //     data.status
      //   );
      // }
    });
    websocket.set(ws);
    return () => ws.close();
  }, [password, user.userId]);
  if (!authenticated.get) return <></>;
  if (!websocket.get) return <></>;
  return (
    <Box
      width='100%'
      height='100%'
      bgcolor={(theme) => theme.palette.background.default}
    >
      <RoomContainer
        connections={connections}
        remoteStreams={remoteStreams}
        videoStream={videoStream}
        audioStream={audioStream}
        websocket={websocket.get}
        participants={participants}
      />
    </Box>
  );
};
