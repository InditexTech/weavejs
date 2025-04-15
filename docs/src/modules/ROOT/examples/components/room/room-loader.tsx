"use client";

type RoomLoaderProps = {
  roomId?: string;
  content: string;
  description?: string;
};

export function RoomLoader({
  roomId,
  content,
  description,
}: Readonly<RoomLoaderProps>) {
  return (
    <div
      className="w-full h-full bg-white flex justify-center items-center overflow-hidden absolute z-[1000]"
    >
      <div className="absolute bottom-0 left-0 right-0 h-full flex justify-center items-center">
        <div className="flex flex-col items-center justify-center space-y-4 p-4">
          <div className="flex flex-col justify-center items-center text-black gap-3">
            <div className="font-noto-sans font-extralight text-2xl uppercase">
              <span>{content}</span>
            </div>

            {roomId && (
              <div className="font-noto-sans text-2xl font-semibold">
                <span>{roomId}</span>
              </div>
            )}
              {description && (
                <div className="font-noto-sans-mono text-xl">
                  <span key={description}>
                    {description}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}
