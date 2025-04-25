export const postImage = async (roomId: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  const endpoint = `${process.env.NEXT_PUBLIC_API_ENDPOINT}/rooms/${roomId}/images`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const data = await response.json();

  return data;
};
