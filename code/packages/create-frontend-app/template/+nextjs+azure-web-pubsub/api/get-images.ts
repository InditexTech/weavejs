export const getImages = async (
  roomId: string,
  pageSize: number,
  page: string | undefined,
) => {
  let endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${roomId}/images?pageSize=${pageSize}`;

  if (page) {
    endpoint = `${endpoint}&page=${page}`;
  }

  const response = await fetch(endpoint);
  const data = await response.json();
  return data;
};
