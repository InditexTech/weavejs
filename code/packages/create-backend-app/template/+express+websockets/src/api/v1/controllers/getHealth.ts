import { Request, Response } from "express";

export const getHealthController = () => (req: Request, res: Response): void => {
  res.status(200).json({ status: "OK" });
};
