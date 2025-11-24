export const postRemoveBackground = async (roomId: string, imageId: string) => {
  const endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${roomId}/images/${imageId}/remove-background`;
  const response = await fetch(endpoint, {
    method: "POST",
  });

  const data = await response.json();

  return data;
};
