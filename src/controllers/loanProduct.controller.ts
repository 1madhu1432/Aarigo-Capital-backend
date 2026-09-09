import { Request, Response, NextFunction } from 'express';
import { LoanProductService } from '../services/loans/loanProduct.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';

export class LoanProductController {
  static async createProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await LoanProductService.createProduct(req.body);
      return sendCreated(res, product, 'Loan product created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const activeOnly = req.query.active === 'true';
      const products = await LoanProductService.getProducts(activeOnly);
      return sendSuccess(res, products);
    } catch (err) {
      next(err);
    }
  }

  static async getProductById(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await LoanProductService.getProductById(req.params.id);
      return sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  }

  static async updateProduct(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await LoanProductService.updateProduct(req.params.id, req.body);
      return sendSuccess(res, product, 'Loan product updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteProduct(req: Request, res: Response, next: NextFunction) {
    try {
      await LoanProductService.deleteProduct(req.params.id);
      return sendSuccess(res, null, 'Loan product removed/deactivated successfully');
    } catch (err) {
      next(err);
    }
  }
}
