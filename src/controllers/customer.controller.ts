import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customers/customer.service';
import { sendSuccess, sendCreated } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { ApiError } from '../utils/apiError';
import { prisma } from '../lib/prisma';

export class CustomerController {
  static async createCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.createCustomer(req.body, req.user?.id);
      return sendCreated(res, customer, 'Customer created successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await CustomerService.getCustomers(req.query as any);
      return sendSuccess(res, result.items, undefined, 200, result.pagination);
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerById(req: Request, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.getCustomerById(req.params.id);
      return sendSuccess(res, customer);
    } catch (err) {
      next(err);
    }
  }

  static async updateCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const customer = await CustomerService.updateCustomer(req.params.id, req.body, req.user?.id);
      return sendSuccess(res, customer, 'Customer updated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteCustomer(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await CustomerService.deleteCustomer(req.params.id, req.user?.id);
      return sendSuccess(res, result, 'Customer deactivated successfully');
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerLoans(req: Request, res: Response, next: NextFunction) {
    try {
      let cust = await prisma.customer.findUnique({ where: { id: req.params.id } });
      if (!cust) {
        cust = await prisma.customer.findUnique({ where: { customerCode: req.params.id } });
      }
      if (!cust) {
        return sendSuccess(res, []);
      }
      const loans = await prisma.loan.findMany({
        where: { customerId: cust.id },
        orderBy: { createdAt: 'desc' },
        include: { loanProduct: true },
      });
      return sendSuccess(res, loans);
    } catch (err) {
      next(err);
    }
  }

  static async getCustomerDocuments(req: Request, res: Response, next: NextFunction) {
    try {
      let cust = await prisma.customer.findUnique({ where: { id: req.params.id } });
      if (!cust) {
        cust = await prisma.customer.findUnique({ where: { customerCode: req.params.id } });
      }
      const customerId = cust ? cust.id : req.params.id;
      const docs = await CustomerService.getDocuments(customerId);
      return sendSuccess(res, docs);
    } catch (err) {
      next(err);
    }
  }

  static async uploadCustomerDocument(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw ApiError.badRequest('No document file uploaded');
      }

      const doc = await CustomerService.addDocument(req.params.id, {
        documentType: req.body.documentType || 'OTHER',
        documentNumber: req.body.documentNumber,
        fileName: req.file.originalname,
        filePath: `/uploads/${req.file.filename}`,
        mimeType: req.file.mimetype,
        fileSizeBytes: req.file.size,
      });

      return sendCreated(res, doc, 'Document uploaded successfully');
    } catch (err) {
      next(err);
    }
  }

  static async deleteCustomerDocument(req: Request, res: Response, next: NextFunction) {
    try {
      await CustomerService.deleteDocument(req.params.id, req.params.documentId);
      return sendSuccess(res, null, 'Document deleted successfully');
    } catch (err) {
      next(err);
    }
  }
}
