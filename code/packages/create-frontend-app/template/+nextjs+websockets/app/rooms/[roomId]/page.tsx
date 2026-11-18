import { Room } from "@/components/room/room";
import { NoSsr } from "@/components/room-components/no-ssr";

export default function RoomPage() {
  return (
    <NoSsr>
      <Room />
    </NoSsr>
  );
}
