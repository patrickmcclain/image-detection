import { Response } from "express";

export class ErrorStatus extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export function handleError(res: Response, err) {
  if (err instanceof ErrorStatus) {
    res.status(err.status).json({
      status: 'FAILURE',
      error: err.message
    });
  } else if (err instanceof Error) {
    res.status(500).json({
      status: 'FAILURE',
      error: err.message
    });
  } else if (typeof err === 'string') {
    res.status(500).json({
      status: 'FAILURE',
      error: err
    });
  } else {
    res.status(500);
    res.end();
  }
}