import {
  AuthenticationResult,
  NotifyParticipant,
  UserDisconnected,
  SendSDP,
  SendCandidate,
  StreamStatus,
} from './types';
type WebSocketEvents =
  | AuthenticationResult
  | NotifyParticipant
  | UserDisconnected
  | SendSDP
  | SendCandidate
  | StreamStatus;
export class CustomWebSocket extends WebSocket {
  parseMessage(events: (events: WebSocketEvents) => void) {
    this.onmessage = (e) => {
      const data = JSON.parse(e.data) as Parameters<typeof events>[number];
      events(data);
    };
  }
  sendMessage(data: WebSocketEvents) {
    this.send(JSON.stringify(data));
  }
}
