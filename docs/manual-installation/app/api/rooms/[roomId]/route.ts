import { fetchRoom } from "@/weave/persistence";

export async function GET(
  req: Request,
  { params }: { params: { roomId: string } }
) {
  const buffer = await fetchRoom(params.roomId);

  if (!buffer) {
    return Response.json(
      {
        error: "Room not found",
      },
      {
        status: 404,
      }
    );
  }

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/octet-stream",
    },
  });
}
