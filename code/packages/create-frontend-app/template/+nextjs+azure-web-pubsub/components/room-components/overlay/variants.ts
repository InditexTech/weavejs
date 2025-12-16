const topElementVariants = {
  hidden: {
    transform: "translateY(-20%)",
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  visible: {
    transform: "translateY(0)",
    opacity: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 },
  },
};

const bottomElementVariants = {
  hidden: {
    transform: "translateY(20%)",
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  visible: {
    transform: "translateY(0)",
    opacity: 1,
    transition: { duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 },
  },
};

const leftElementVariants = {
  hidden: {
    transform: "translateX(-20%)",
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 },
  },
  visible: {
    transform: "translateX(0)",
    opacity: 1,
    transition: { duration: 2, ease: [0.25, 0.1, 0.25, 1], delay: 0.5 },
  },
};

const rightElementVariants = {
  hidden: {
    transform: "translateX(10%)",
    opacity: 0,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
  visible: {
    transform: "translateX(0)",
    opacity: 1,
    transition: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export {
  topElementVariants,
  bottomElementVariants,
  leftElementVariants,
  rightElementVariants,
};
