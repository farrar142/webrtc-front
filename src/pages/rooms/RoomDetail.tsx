'use client';

import { useRoomStore } from '#/atoms/useRoomStore';
import { useUserStore } from '#/atoms/useUserId';
import { UseValue, useValue } from '#/useValue';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
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
  useMemo,
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
import { v4 } from 'uuid';
import { CustomWebSocket } from './websocket';

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
type ConnectionMap = Record<string, Connection>;
type ConnectionState = UseRefState<ConnectionMap>;

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

const getOrCreatePeerConnection = async (
  connections: ConnectionState,
  userId: string
): Promise<RTCPeerConnection> => {
  let connection = connections.get.current.userId?.connection;
  if (connection) return connection;
  connection = new RTCPeerConnection();
  return connection;
};

const connectStreamToUser = ({
  stream,
  websocket,
  participant,
  user,
  connections,
}: {
  stream: MediaStream;
  websocket: CustomWebSocket;
  participant: Participant;
  user: { userId: string };
  connections: UseRefState<Record<string, Connection>>;
}) => {
  getOrCreatePeerConnection(connections, participant.user_id).then(
    async (connection) => {
      stream.getTracks().forEach((track) => {
        connection.addTrack(track, stream);
      });
      // connection.addTransceiver('video');
      const offer = await connection.createOffer();
      websocket.sendMessage({
        type: 'sendsdp',
        sender: user.userId,
        receiver: participant.user_id,
        sdp: offer.sdp,
        sdp_type: offer.type,
      });
      await connection.setLocalDescription(offer);
      addOnIceCandidate(connection, websocket, {
        sender: participant.user_id,
        receiver: user.userId,
      });
      connections.set((p) => ({
        ...p,
        [participant.user_id]: { connection, offer },
      }));
    }
  );
};

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

  const userControlRef = useRef<UserController>({
    onUserAdd: () => {},
    onUserRemoved: () => {},
  });

  useEffect(() => {
    if (user.userId) return;
    user.setUserId(v4());
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
        const participant = {
          user_id: data.user_id,
          username: data.username,
          audio_on: false,
          video_on: false,
        };
        userControlRef.current.onUserAdd(participant);
        if (videoStream.ref.current) {
          connectStreamToUser({
            stream: videoStream.ref.current,
            participant,
            websocket: ws,
            connections,
            user,
          });
        }
      } else if (data.type === 'userdisconnected') {
        userControlRef.current.onUserRemoved(data.user_id);
      } else if (data.type === 'sendsdp') {
        participants.set((ps) =>
          ps.map((p) => {
            if (p.user_id !== data.sender) return p;
            return { ...p, video_on: true };
          })
        );
        getOrCreatePeerConnection(connections, data.sender).then(
          async (connection) => {
            connection.ontrack = (e) => {
              console.log(e.streams);
              remoteStreams.set((p) => [
                ...p.filter((_) => _.userId !== data.sender),
                { userId: data.sender, stream: e.streams[0] },
              ]);
            };
            await connection.setRemoteDescription({
              sdp: data.sdp,
              type: data.sdp_type,
            });
            const answer = await connection.createAnswer();
            await connection.setLocalDescription(answer);
            addOnIceCandidate(connection, ws, { ...data });

            connections.set((p) => ({
              ...p,
              [data.sender]: { connection, offer: answer },
            }));
            ws.sendMessage({
              type: 'answersdp',
              sender: user.userId,
              receiver: data.sender,
              sdp: answer.sdp,
              sdp_type: answer.type,
            });
          }
        );
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
      } else if (data.type === 'streamstatus') {
        participants.set((ps) =>
          ps.map((p) => {
            if (p.user_id !== data.sender) return p;
            if (data.media === 'video') return { ...p, video_on: data.status };
            return { ...p, audio_on: data.status };
          })
        );
      }
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
        userControlRef={userControlRef}
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

const RoomContainer: React.FC<{
  userControlRef: MutableRefObject<UserController>;
  connections: UseRefState<ConnectionMap>;
  remoteStreams: UseValue<{ userId: string; stream: MediaStream }[]>;
  videoStream: UseValue<MediaStream | undefined>;
  audioStream: UseValue<MediaStream | undefined>;
  participants: UseValue<Participant[]>;
  websocket: CustomWebSocket;
}> = ({
  userControlRef,
  connections,
  remoteStreams,
  websocket,
  audioStream,
  videoStream,
  participants,
}) => {
  const videoRef = createRef<HTMLVideoElement>();
  const audioRef = createRef<HTMLAudioElement>();
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
            muted
          />
          <audio ref={audioRef} autoPlay muted />
        </Box>
        <UserDisplayPanel
          participants={participants.get}
          remoteStreams={remoteStreams}
        />
      </Box>
      <WebRTCController
        videoStream={videoStream}
        audioStream={audioStream}
        audioRef={audioRef}
        videoRef={videoRef}
        connections={connections}
        websocket={websocket}
        participants={participants.get}
      />
    </Box>
  );
};

const WebRTCController: React.FC<{
  videoStream: UseValue<MediaStream | undefined>;
  videoRef: RefObject<HTMLVideoElement>;
  audioStream: UseValue<MediaStream | undefined>;
  audioRef: RefObject<HTMLAudioElement>;
  connections: UseRefState<Record<string, Connection>>;
  websocket: CustomWebSocket;
  participants: Participant[];
}> = ({
  videoStream,
  videoRef,
  connections,
  websocket,
  participants,
  audioStream,
  audioRef,
}) => {
  const user = useUserStore();

  const onStreamEnded = (
    stream: UseValue<MediaStream | undefined>,
    media: 'video' | 'audio'
  ) => {
    const already = stream.get;
    if (already) {
      already.getTracks().forEach((track) => {
        track.stop();
      });
      stream.set(undefined);
      websocket.sendMessage({
        type: 'streamstatus',
        media: media,
        sender: user.userId,
        status: false,
      });
    }
  };
  const getUserMedia = () =>
    navigator.mediaDevices.getDisplayMedia({
      audio: true,
      video: true,
    });
  const getDisplayMedia = () =>
    navigator.mediaDevices.getDisplayMedia({
      audio: false,
      video: true,
    });
  const getAudioDevice = () =>
    navigator.mediaDevices.getUserMedia({ audio: true });

  const onVideoStreamStart =
    (
      streamPromise: () => Promise<MediaStream>,
      {
        ref,
        media,
        stream,
      }: {
        ref: RefObject<HTMLVideoElement> | RefObject<HTMLAudioElement>;
        media: 'video' | 'audio';
        stream: UseValue<MediaStream | undefined>;
      }
    ) =>
    () => {
      if (stream.get) return onStreamEnded(stream, media);
      streamPromise().then((_stream) => {
        stream.set(_stream);
        if (!ref.current) return;
        ref.current.srcObject = _stream;
        // audioRef.current.srcObject = stream;
        websocket.sendMessage({
          type: 'streamstatus',
          media: media,
          sender: user.userId,
          status: true,
        });
        participants
          .filter((p) => p.user_id !== user.userId)
          .forEach((participant) => {
            connectStreamToUser({
              participant,
              stream: _stream,
              websocket,
              user,
              connections,
            });
          });
      });
    };

  useEffect(() => {
    if (!videoStream.get) return;
    videoStream.get.getTracks().forEach((track) => {
      track.onended = () => {
        onStreamEnded(videoStream, 'video');
      };
    });
  }, [videoStream.get]);
  return (
    <Box
      position='absolute'
      bottom='5%'
      left='50%'
      sx={{ transform: 'translate(-50%);' }}
    >
      <Tooltip title='화면 공유'>
        <IconButton
          onClick={onVideoStreamStart(getUserMedia, {
            media: 'video',
            stream: videoStream,
            ref: videoRef,
          })}
          color='warning'
        >
          <Tv />
        </IconButton>
      </Tooltip>
      <Tooltip title='카메라 공유'>
        <IconButton
          onClick={onVideoStreamStart(getDisplayMedia, {
            media: 'video',
            stream: videoStream,
            ref: videoRef,
          })}
        >
          <VideoCall />
        </IconButton>
      </Tooltip>
      <Tooltip title='음성 공유'>
        <IconButton
          onClick={onVideoStreamStart(getAudioDevice, {
            media: 'audio',
            stream: audioStream,
            ref: audioRef,
          })}
        >
          <KeyboardVoice />
        </IconButton>
      </Tooltip>
    </Box>
  );
};
