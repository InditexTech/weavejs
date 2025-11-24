export const delImage = async (roomId: string, imageId: string) => {
  const endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${roomId}/images/${imageId}`;
  const response = await fetch(endpoint, {
    method: "DELETE",
  });
  const data = await response.json();
  return data;
};
