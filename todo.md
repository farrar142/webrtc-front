1. 10-28
   1. 프로젝트 세팅
      1. /room에 접근시 서버에 room 이 있는지 체크 해야됨
      2. /room에 접근 시 웹소켓 연결
      3. 웹소켓 연결 후 패스워드로 인증정보 전송
      4. 성공시 후속진행,
      5. 실패시 이전 화면으로
      6. 다른 유저가 접속 시 정보 표시
      7. 다른 유저가 이탈 시 정보 제거
      8. 기존의 유저들의 정보를 표시
      9. video 스트리밍 테스트
      10. 유저가 스트리밍을 시작하면, 채널의 모든 유저들에게 자신의 sdp를 전달한다.
      11. sdp를 받은 유저들은 자신의 peerconnection에 상대의 sdp를 remotedescription으로 설정하고, answer를 생성하여 localdescription에 할당 스트리머에게 answer의 sdp를 보내준다
      12. 마지막으로 스트리머가 각 유저들의 sdp를 커넥션별로 remotedescription으로 저장하면 icecandidate시작
      13. ontrack 이벤트가 fire하면 각 유저별 컴포넌트의 video에 srcobject로 지정
2. 10-29
   1. 스트림 종료 기능
   2. 유저미디어, 유저 디스플레이별 스트림 기능
3. 10-30
   1. rtcpeerconnection을 먼저 연결하고 후에 stream을 추가 가능한지 테스트
