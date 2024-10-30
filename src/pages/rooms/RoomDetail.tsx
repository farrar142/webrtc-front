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

type Connection = {
  connection: RTCPeerConnection;
  // offer: RTCSessionDescriptionInit;
};
type ConnectionMap = Record<string, Connection>;
type ConnectionState = UseRefState<ConnectionMap>;

const addOnCreateOffer = async ({
  connection,
  websocket,
  sender,
  receiver,
}: {
  connection: RTCPeerConnection;
  websocket: CustomWebSocket;
  sender: string;
  receiver: string;
}) => {
  const offer = await connection.createOffer();
  websocket.sendMessage({
    type: 'sendsdp',
    sender: sender,
    receiver: receiver,
    sdp: offer.sdp,
    sdp_type: offer.type,
  });
  await connection.setLocalDescription(offer);
  return offer;
};
const addStreamToConnection = ({
  stream,
  connection,
}: {
  stream: MediaStream;
  connection: RTCPeerConnection;
}) => {
  stream.getTracks().forEach((track) => {
    connection.addTrack(track, stream);
  });
};
const getOrCreatePeerConnection = async (
  connections: ConnectionState,
  sender: string,
  receiver: string,
  websocket: CustomWebSocket,
  streams: UseValue<{ userId: string; stream: MediaStream }[]>
): Promise<RTCPeerConnection> => {
  let connection = connections.get.current[receiver]?.connection;
  if (connection) return connection;
  connection = new RTCPeerConnection();
  connection.onnegotiationneeded = () => {
    console.log('onNegotiationNeeded');
    addOnCreateOffer({
      connection,
      sender: sender,
      receiver: receiver,
      websocket,
    });
  };

  connection.ontrack = (e) => {
    console.log('received track from user', e.streams);
    streams.set((p) => [
      ...p.filter((_) => _.userId !== receiver),
      { userId: receiver, stream: e.streams[0] },
    ]);
  };

  connection.onicecandidate = (e) => {
    if (!e.candidate) return;
    websocket.send(
      JSON.stringify({
        type: 'sendcandidate',
        sender: sender,
        receiver: receiver,
        candidate: e.candidate,
      })
    );
  };
  connections.get.current[receiver] = { connection };
  return connection;
};

const handleParticipantStreamStatus = (
  participants: UseValue<Participant[]>,
  userId: string,
  media: 'video' | 'audio',
  status: boolean
) => {
  participants.set((ps) =>
    ps.map((p) => {
      if (p.user_id !== userId) return p;
      if (media === 'video') return { ...p, video_on: status };
      return { ...p, audio_on: status };
    })
  );
};

const sendOfferToParticipant = ({
  // stream,
  websocket,
  participant,
  user,
  connections,
  streams,
}: {
  // stream: MediaStream;
  websocket: CustomWebSocket;
  participant: Participant;
  user: { userId: string };
  connections: UseRefState<Record<string, Connection>>;
  streams: UseValue<{ userId: string; stream: MediaStream }[]>;
}): Promise<RTCPeerConnection> => {
  return getOrCreatePeerConnection(
    connections,
    user.userId,
    participant.user_id,
    websocket,
    streams
  ).then(async (connection) => {
    await addOnCreateOffer({
      connection,
      sender: user.userId,
      receiver: participant.user_id,
      websocket,
    });
    connections.set((p) => ({
      ...p,
      [participant.user_id]: { connection },
    }));
    return connection;
  });
};
const answerOfferToParticipants = ({
  connections,
  streams,
  data,
  user,
  websocket,
}: {
  connections: ConnectionState;
  streams: UseValue<{ userId: string; stream: MediaStream }[]>;
  data: SendSDP;
  user: { userId: string };
  websocket: CustomWebSocket;
}) => {
  getOrCreatePeerConnection(
    connections,
    user.userId,
    data.sender,
    websocket,
    streams
  ).then(async (connection) => {
    await connection.setRemoteDescription({
      sdp: data.sdp,
      type: data.sdp_type,
    });
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    websocket.sendMessage({
      type: 'answersdp',
      sender: user.userId,
      receiver: data.sender,
      sdp: answer.sdp,
      sdp_type: answer.type,
    });
  });
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
    console.log(user.userId);
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
      console.log(data.type);
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
              userControlRef.current.onUserAdd(participant);
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
        userControlRef.current.onUserAdd(participant);
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
            console.log('send track to late user');
            addStreamToConnection({
              connection,
              stream: videoStream.ref.current,
            });
          }
        });
        // }
      } else if (data.type === 'userdisconnected') {
        userControlRef.current.onUserRemoved(data.sender);
        const entries = Object.entries(connections.get.current)
          .map(([userId, { connection }]) => {
            if (userId === data.sender) {
              connection.close();
              return undefined;
            }
            return [userId, { connection }] as const;
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
      } else if (data.type === 'streamstatus') {
        handleParticipantStreamStatus(
          participants,
          data.sender,
          data.media,
          data.status
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
        Object.entries(connections.get.current).forEach(
          ([userId, { connection }]) => {
            addStreamToConnection({ stream: _stream, connection });
          }
        );
        // participants
        //   .filter((p) => p.user_id !== user.userId)
        //   .forEach((participant) => {
        //     connectStreamToUser({
        //       participant,
        //       stream: _stream,
        //       websocket,
        //       user,
        //       connections,
        //     });
        //   });
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
