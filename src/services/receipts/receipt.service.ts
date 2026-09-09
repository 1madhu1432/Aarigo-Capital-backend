import { prisma } from '../../lib/prisma';
import { ApiError } from '../../utils/apiError';
import { parsePagination, buildPaginationMeta } from '../../utils/pagination';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { env } from '../../config/env';

export class ReceiptService {
  static async getReceipts(params: { page?: number; limit?: number; search?: string }) {
    const { skip, take, page, limit } = parsePagination(params);

    const where: any = {};
    if (params.search) {
      where.OR = [
        { receiptNumber: { contains: params.search } },
        { payment: { paymentNumber: { contains: params.search } } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.receipt.count({ where }),
      prisma.receipt.findMany({
        where,
        skip,
        take,
        orderBy: { generatedAt: 'desc' },
        include: {
          payment: {
            include: {
              customer: {
                select: { id: true, fullName: true, mobile: true, customerCode: true },
              },
            },
          },
          loan: {
            select: { id: true, loanNumber: true },
          },
        },
      }),
    ]);

    return {
      items,
      pagination: buildPaginationMeta(total, page, limit),
    };
  }

  static async getReceiptById(id: string) {
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        payment: {
          include: {
            customer: true,
            createdBy: { select: { id: true, name: true } },
          },
        },
        loan: true,
      },
    });

    if (!receipt) {
      throw ApiError.notFound('Receipt not found');
    }

    return receipt;
  }

  static async generateReceiptPdfBuffer(receiptId: string): Promise<Buffer> {
    const receipt = await this.getReceiptById(receiptId);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A5', layout: 'portrait' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // Header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .fillColor('#1e3a8a')
        .text('AARIGO CAPITAL', { align: 'center' });

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor('#64748b')
        .text('Official Payment & EMI Acknowledgment Receipt', { align: 'center' });

      doc.moveDown(1);
      doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(380, doc.y).stroke();
      doc.moveDown(1);

      // Receipt Meta
      doc.fontSize(10).fillColor('#0f172a').font('Helvetica-Bold');
      doc.text(`Receipt No: ${receipt.receiptNumber}`, { continued: true });
      doc.font('Helvetica').text(`   Date: ${receipt.payment.paymentDate}`, { align: 'right' });

      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(`Payment No: ${receipt.payment.paymentNumber}`, { continued: true });
      doc.font('Helvetica').text(`   Loan No: ${receipt.loan.loanNumber}`, { align: 'right' });

      doc.moveDown(1);

      // Customer Details
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#1e293b').text('Customer Details:');
      doc.fontSize(9).font('Helvetica').fillColor('#334155');
      doc.text(`Name: ${receipt.payment.customer.fullName} (${receipt.payment.customer.customerCode})`);
      doc.text(`Mobile: ${receipt.payment.customer.mobile}`);
      doc.text(`Address: ${receipt.payment.customer.address}, ${receipt.payment.customer.city}`);

      doc.moveDown(1);

      // Payment Breakdown
      doc.rect(40, doc.y, 340, 70).fillAndStroke('#f8fafc', '#e2e8f0');
      const boxTop = doc.y + 10;
      doc.y = boxTop;
      doc.x = 50;

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0f172a');
      doc.text(`Amount Paid: `, { continued: true });
      doc.fillColor('#16a34a').text(`₹${Number(receipt.payment.amount).toLocaleString('en-IN')}`);

      doc.x = 50;
      doc.moveDown(0.4);
      doc.fontSize(9).font('Helvetica').fillColor('#475569');
      doc.text(`Payment Mode: ${receipt.payment.paymentMethod}`);
      if (receipt.payment.referenceNumber) {
        doc.text(`Ref / Txn No: ${receipt.payment.referenceNumber}`);
      }
      doc.text(`Remaining Outstanding: ₹${Number(receipt.loan.outstandingAmount).toLocaleString('en-IN')}`);

      doc.y = boxTop + 80;
      doc.x = 40;

      // Footer
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#94a3b8').font('Helvetica');
      doc.text('This is a computer-generated receipt issued by Aarigo Capital. No signature required.', {
        align: 'center',
      });

      doc.end();
    });
  }
}
