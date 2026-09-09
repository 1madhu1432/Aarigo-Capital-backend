import { Request, Response, NextFunction } from 'express';
import { ReceiptService } from '../services/receipts/receipt.service';
import { sendSuccess } from '../utils/apiResponse';

export class ReceiptController {
  static async getReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ReceiptService.getReceipts(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getReceiptById(req: Request, res: Response, next: NextFunction) {
    try {
      const receipt = await ReceiptService.getReceiptById(req.params.id);
      return sendSuccess(res, receipt);
    } catch (err) {
      next(err);
    }
  }

  static async downloadReceiptPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const buffer = await ReceiptService.generateReceiptPdfBuffer(req.params.id);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="receipt-${req.params.id}.pdf"`
      );
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
