export const getRoom = async (roomId: string) => {
  const endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${roomId}`;
  const response = await fetch(endpoint);

  if (!response.ok && response.status === 404) {
    throw new Error(`Room doesn't exist`);
  }

  const data = await response.bytes();
  return data;
};
