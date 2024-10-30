import { UseRefState } from '#/useRefState';

// Websocket Message Type
export type AuthenticationResult = {
  type: 'authentication';
  result: boolean;
  data: Participant[];
};

export type NotifyParticipant = {
  type: 'notifyparticipant';
  sender: string;
  username: string;
};
export type UserDisconnected = {
  type: 'userdisconnected';
  sender: string;
};
export type SendSDP = {
  type: 'sendsdp' | 'answersdp';
  sender: string;
  receiver: string;
  sdp?: string;
  sdp_type: RTCSdpType;
};

export type SendCandidate = {
  type: 'sendcandidate';
  sender: string;
  receiver: string;
  candidate: RTCIceCandidate;
};
export type StreamStatus = {
  type: 'streamstatus';
  sender: string;
  media: 'video' | 'audio';
  status: boolean;
};

//User Control

export type Participant = {
  user_id: string;
  username: string;
  audio_on: boolean;
  video_on: boolean;
};

export type UserController = {
  onUserAdd: (participant: Participant) => void;
  onUserRemoved: (userId: string) => void;
  // getParticipants: () => Participant[];
};

// User Defined Types

export type Connection = {
  connection: RTCPeerConnection;
  tracks: { video: RTCRtpSender[]; audio: RTCRtpSender[] };
  // offer: RTCSessionDescriptionInit;
};
export type ConnectionMap = Record<string, Connection>;
export type ConnectionState = UseRefState<ConnectionMap>;
