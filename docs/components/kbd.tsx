type KbdProps = {
  keys: string[];
};

export const Kbd = ({ keys }: Readonly<KbdProps>) => {
  return (
    <div className="inline-flex gap-1">
      {keys.map((key) => (
        <div
          key={key}
          className="bg-white px-[6px] py-[4px] rounded text-sm font-mono text-black"
        >
          {key}
        </div>
      ))}
    </div>
  );
};
