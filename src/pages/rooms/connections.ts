// Websocket Action

import { UseRefState } from '#/useRefState';
import { UseValue } from '#/useValue';
import { ConnectionState, Participant, Connection, SendSDP } from './types';
import { CustomWebSocket } from './websocket';

export const createOffer = async ({
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
export const addStreamToConnection = ({
  stream,
  connection,
}: {
  stream: MediaStream;
  connection: RTCPeerConnection;
}) => {
  return stream.getTracks().map((track) => connection.addTrack(track, stream));
};
export const getOrCreatePeerConnection = async (
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
    createOffer({
      connection,
      sender: sender,
      receiver: receiver,
      websocket,
    });
  };

  connection.ontrack = (e) => {
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
  connections.get.current[receiver] = {
    connection,
    tracks: { video: [], audio: [] },
  };
  return connection;
};

export const handleParticipantStreamStatus = (
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

export const sendOfferToParticipant = ({
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
    await createOffer({
      connection,
      sender: user.userId,
      receiver: participant.user_id,
      websocket,
    });
    return connection;
  });
};
export const answerOfferToParticipants = ({
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
