import { motion } from 'framer-motion';
import { rightElementVariants } from './variants';
import { SelectionInformation } from '../selection-information';

function OverlayAnimationWrapper({
  children,
  panelId,
}: {
  children: React.ReactNode;
  panelId: string;
}) {
  return (
    <motion.div
      key={panelId}
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={rightElementVariants}
      className="absolute top-[calc(50px+16px)] right-2 bottom-[calc(50px+16px)] flex flex-col gap-5 justify-center items-center"
    >
      <div className="w-[320px] p-0 h-full bg-white border border-[#c9c9c9] flex justify-start items-center gap-3 overflow-hidden">
        <div className="w-full h-full overflow-auto custom-scrollbar !px-0">
          {children}
          <SelectionInformation />
        </div>
      </div>
    </motion.div>
  );
}

export default OverlayAnimationWrapper;
