'use client';

import { useRoomStore } from '#/atoms/useRoomStore';
import { useUserStore } from '#/atoms/useUserId';
import { UseValue, useValue } from '#/useValue';
import { Box, IconButton, Stack, Typography } from '@mui/material';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  createRef,
  Dispatch,
  LegacyRef,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  NotifyParticipant,
  UserController,
  AuthenticationResult,
  UserDisconnected,
  Participant,
  SendSDP,
  SendCandidate,
} from './types';
import { UserDisplayPanel } from './UserPanel';
import { KeyboardVoice, Tv, VideoCall } from '@mui/icons-material';

// Websocket Action

const useRefState = <V extends any>(defaultValue: V) => {
  const ref = useRef<V>(defaultValue);
  const isFunc = (func: SetStateAction<V>): func is (v: V) => V => {
    return typeof func === 'function';
  };
  const setter: Dispatch<SetStateAction<V>> = (func) => {
    if (isFunc(func)) {
      ref.current = func(ref.current);
    } else {
      ref.current = func;
    }
  };
  return { get: ref, set: setter };
};
type UseRefState<V> = ReturnType<typeof useRefState<V>>;

const notifyParticipant = (ws: WebSocket, data: NotifyParticipant) => {
  ws.send(JSON.stringify(data));
};

type Connection = {
  connection: RTCPeerConnection;
  offer: RTCSessionDescriptionInit;
};

const addOnIceCandidate = (
  connection: RTCPeerConnection,
  websocket: WebSocket,
  { sender, receiver }: { sender: string; receiver: string }
) => {
  connection.onicecandidate = (e) => {
    console.log('oncandidate');
    if (!e.candidate) return;
    websocket.send(
      JSON.stringify({
        type: 'sendcandidate',
        sender: receiver,
        receiver: sender,
        candidate: e.candidate,
      })
    );
  };
};

const createPeerConnection = async (): Promise<RTCPeerConnection> => {
  const connection = new RTCPeerConnection();
  return connection;
};

export const RoomDetail: React.FC<{ room: string }> = ({ room }) => {
  const router = useRouter();
  const user = useUserStore();
  const roomStore = useRoomStore();
  const password = roomStore.roomInfo[room];
  const authenticated = useValue(false);
  const websocket = useValue<WebSocket | undefined>(undefined);
  const connections = useRefState<Record<string, Connection>>({});
  const remoteStreams = useValue<{ userId: string; stream: MediaStream }[]>([]);

  const userControlRef = useRef<UserController>({
    onUserAdd: () => {},
    onUserRemoved: () => {},
  });

  useEffect(() => {
    const ws = new WebSocket(
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
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data) as
        | AuthenticationResult
        | NotifyParticipant
        | UserDisconnected
        | SendSDP
        | SendCandidate;
      console.log(data);
      if (data.type === 'authentication') {
        if (data.result) {
          authenticated.set(true);
          notifyParticipant(ws, {
            type: 'notifyparticipant',
            user_id: user.userId,
            username: user.username,
          });
          for (const participant of data.data) {
            setTimeout(() => {
              userControlRef.current.onUserAdd(participant);
            }, 100);
          }
        } else {
          // Notification 해줘야됨
          router.push('/');
        }
      } else if (data.type === 'notifyparticipant') {
        userControlRef.current.onUserAdd({
          user_id: data.user_id,
          username: data.username,
          audio_on: false,
          video_on: false,
        });
      } else if (data.type === 'userdisconnected') {
        userControlRef.current.onUserRemoved(data.user_id);
      } else if (data.type === 'sendsdp') {
        createPeerConnection().then(async (connection) => {
          await connection.setRemoteDescription({
            sdp: data.sdp,
            type: data.sdp_type,
          });
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          addOnIceCandidate(connection, ws, { ...data });

          connection.ontrack = (e) => {
            console.log('on track');
            remoteStreams.set((p) => [
              ...p.filter((_) => _.userId !== data.sender),
              { userId: data.sender, stream: e.streams[0] },
            ]);
          };
          connections.set((p) => ({
            ...p,
            [data.sender]: { connection, offer: answer },
          }));
          ws.send(
            JSON.stringify({
              type: 'answersdp',
              sender: user.userId,
              receiver: data.sender,
              sdp: answer.sdp,
              sdp_type: answer.type,
            })
          );
        });
      } else if (data.type === 'answersdp') {
        (async () => {
          connections.get.current[data.sender].connection.setRemoteDescription({
            sdp: data.sdp,
            type: data.sdp_type,
          });
        })();
      } else if (data.type === 'sendcandidate') {
        const interval = setInterval(() => {
          if (!connections.get.current[data.sender]) return;
          console.log('add icecandidate');
          connections.get.current[data.sender].connection.addIceCandidate(
            data.candidate
          );
          clearInterval(interval);
        }, 1000);
      }
    };
    websocket.set(ws);
    return () => ws.close();
  }, [password]);
  if (!authenticated.get) return <></>;
  if (!websocket.get) return <></>;
  return (
    <Box width='100%' height='100%'>
      <RoomContainer
        userControlRef={userControlRef}
        connections={connections}
        remoteStreams={remoteStreams}
        websocket={websocket.get}
      />
    </Box>
  );
};

const RoomContainer: React.FC<{
  userControlRef: MutableRefObject<UserController>;
  connections: UseRefState<Record<string, Connection>>;
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  websocket: WebSocket;
}> = ({ userControlRef, connections, remoteStreams, websocket }) => {
  const participants = useValue<Participant[]>([]);
  const videoRef = createRef<HTMLVideoElement>();
  const mediaStream = useValue<MediaStream | undefined>(undefined);
  useImperativeHandle(
    userControlRef,
    () => ({
      onUserAdd: (participant) => {
        if (participants.get.find((p) => p.user_id === participant.user_id))
          return;
        participants.set((p) => [...p, participant]);
      },
      onUserRemoved: (userId) => {
        participants.set((p) => {
          console.log(p);
          return p.filter((pp) => pp.user_id !== userId);
        });
      },
    }),
    [participants.get]
  );
  return (
    <Box width='100%' height='100%'>
      <Box width='100%' display='flex' flexDirection='row'>
        <Box>chat</Box>
        <Box flex={1}>
          <video
            ref={videoRef}
            style={{ width: '200px', height: '200px', border: '1px solid red' }}
            autoPlay
          />
        </Box>
        <UserDisplayPanel
          participants={participants.get}
          remoteStreams={remoteStreams}
        />
      </Box>
      <WebRTCController
        mediaStream={mediaStream}
        videoRef={videoRef}
        connections={connections}
        websocket={websocket}
        participants={participants.get}
      />
    </Box>
  );
};

const WebRTCController: React.FC<{
  mediaStream: UseValue<MediaStream | undefined>;
  videoRef: RefObject<HTMLVideoElement>;
  connections: UseRefState<Record<string, Connection>>;
  websocket: WebSocket;
  participants: Participant[];
}> = ({ mediaStream, videoRef, connections, websocket, participants }) => {
  const user = useUserStore();
  const onVideoStreamStart = async () => {
    console.log(navigator.mediaCapabilities);
    navigator.mediaDevices.enumerateDevices().then(console.log);
    const stream = await navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
    mediaStream.set(stream);
    if (!videoRef.current) return;
    videoRef.current.srcObject = stream;

    participants
      .filter((p) => p.user_id !== user.userId)
      .forEach((participant) => {
        createPeerConnection().then(async (connection) => {
          stream.getTracks().forEach((track) => {
            connection.addTrack(track);
          });
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          addOnIceCandidate(connection, websocket, {
            sender: participant.user_id,
            receiver: user.userId,
          });
          connections.set((p) => ({
            ...p,
            [participant.user_id]: { connection, offer },
          }));

          websocket.send(
            JSON.stringify({
              type: 'sendsdp',
              sender: user.userId,
              receiver: participant.user_id,
              sdp: offer.sdp,
              sdp_type: offer.type,
            })
          );
        });
      });
  };
  return (
    <Box
      position='absolute'
      bottom='5%'
      left='50%'
      sx={{ transform: 'translate(-50%);' }}
    >
      <IconButton onClick={onVideoStreamStart}>
        <Tv />
      </IconButton>
      <IconButton>
        <VideoCall />
      </IconButton>
      <IconButton>
        <KeyboardVoice />
      </IconButton>
    </Box>
  );
};
