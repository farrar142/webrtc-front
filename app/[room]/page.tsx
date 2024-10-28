import { RoomDetail } from '#/pages/rooms/RoomDetail';

const RoomDetailPage: ExtendedNextPage = async ({ ...props }) => {
  const room = (await props.params).room;

  return <RoomDetail room={room} />;
};
export default RoomDetailPage;
