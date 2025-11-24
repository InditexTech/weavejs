export const stringToColor = (str: string) => {
  let hash = 0;
  str.split("").forEach((char) => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash);
  });
  let colour = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    colour += value.toString(16).padStart(2, "0");
  }
  return colour;
};

export const getUserShort = (userName: string) => {
  const firstLetter = userName.slice(0, 1);
  const lastLetter = userName.slice(-1);
  return `${firstLetter}${lastLetter}`;
};
