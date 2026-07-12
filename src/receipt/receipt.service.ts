import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class ReceiptService {
  constructor(private readonly db: DatabaseService) { }

  async generateOrderReceipt(orderId: number, userId: number, isAdmin: boolean, res: Response) {
    // Fetch order with all relations
    const order = await this.db.orders.findFirst({
      where: isAdmin ? { id: orderId } : { id: orderId, user_id: userId },
      include: {
        order_items: {
          include: {
            products: {
              select: { id: true, name: true, price: true },
            },
          },
        },
        users: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            phone: true,
            address: true,
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found.');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-order-${orderId}.pdf"`);

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const gold = '#A17E50';
    const dark = '#1a1a1a';
    const muted = '#888888';
    const border = '#e0e0e0';
    const width = 495; // usable width with 50px margins

    // ── HEADER ────────────────────────────────────────────────────────────────
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .fillColor(gold)
      .text("Lisa's Lashes", 50, 50);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(muted)
      .text('Professional Beauty Salon', 50, 85)
      .text('Dublin 15, Ireland', 50, 100)
      .text('lisa@lisaslashes.ie', 50, 115);

    // Receipt title on right
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .fillColor(dark)
      .text('RECEIPT', 400, 50, { align: 'right', width: 145 });

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor(muted)
      .text(`Order #${order.id}`, 400, 80, { align: 'right', width: 145 })
      .text(new Date(order.created_at).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric',
      }), 400, 95, { align: 'right', width: 145 });

    // Divider
    doc.moveTo(50, 140).lineTo(545, 140).strokeColor(gold).lineWidth(1.5).stroke();

    // ── BILL TO ───────────────────────────────────────────────────────────────
    let y = 160;

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(muted)
      .text('BILL TO', 50, y);

    y += 16;
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .fillColor(dark)
      .text(`${order.users.first_name} ${order.users.last_name || ''}`, 50, y);

    y += 16;
    doc.fontSize(10).font('Helvetica').fillColor(muted);
    if (order.users.phone) { doc.text(order.users.phone, 50, y); y += 14; }
    if (order.users.address) { doc.text(order.users.address, 50, y); y += 14; }

    // ── ITEMS TABLE ───────────────────────────────────────────────────────────
    y += 20;

    // Table header
    doc
      .rect(50, y, width, 24)
      .fillColor('#f5f0e8')
      .fill();

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(dark)
      .text('ITEM', 60, y + 8)
      .text('QTY', 340, y + 8, { width: 50, align: 'center' })
      .text('UNIT', 390, y + 8, { width: 70, align: 'right' })
      .text('TOTAL', 460, y + 8, { width: 80, align: 'right' });

    y += 24;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(border).lineWidth(0.5).stroke();

    // Table rows
    let subtotal = 0;
    for (const item of order.order_items) {
      const paid = Number(item.price_at_purchase);
      const line = paid * item.quantity;
      subtotal += line;

      const nameLines = doc.heightOfString(item.products?.name || 'Product', { width: 270 });
      const rowH = Math.max(30, nameLines + 20);

      // Alternate row background
      if (order.order_items.indexOf(item) % 2 === 0) {
        doc.rect(50, y, width, rowH).fillColor('#fdfcfb').fill();
      }

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(dark)
        .text(item.products?.name || 'Product', 60, y + 8, { width: 270 })
        .text(String(item.quantity), 340, y + 8, { width: 50, align: 'center' })
        .text(`€${paid.toFixed(2)}`, 390, y + 8, { width: 70, align: 'right' })
        .text(`€${line.toFixed(2)}`, 460, y + 8, { width: 80, align: 'right' });

      // Show original price if discounted
      const orig = Number(item.products?.price || paid);
      if (paid < orig - 0.01) {
        doc
          .fontSize(8)
          .fillColor(muted)
          .text(`was €${orig.toFixed(2)}`, 390, y + 20, { width: 70, align: 'right' });
      }

      y += rowH;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(border).lineWidth(0.5).stroke();
    }

    // ── TOTALS ────────────────────────────────────────────────────────────────
    y += 12;
    const total = Number(order.total);
    const discount = subtotal - total;

    const totalRow = (label: string, value: string, bold = false, color = dark) => {
      doc
        .fontSize(10)
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(muted)
        .text(label, 300, y, { width: 160 });
      doc
        .fillColor(color)
        .text(value, 460, y, { width: 80, align: 'right' });
      y += 18;
    };

    totalRow('Subtotal', `€${subtotal.toFixed(2)}`);

    if (discount > 0.01) {
      totalRow('Discount', `-€${discount.toFixed(2)}`, false, '#c0392b');
    }

    doc.moveTo(300, y).lineTo(545, y).strokeColor(border).lineWidth(0.5).stroke();
    y += 8;
    totalRow('TOTAL', `€${total.toFixed(2)}`, true, gold);

    // ── FOOTER ────────────────────────────────────────────────────────────────
    const footerY = 760;
    doc
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .strokeColor(border)
      .lineWidth(0.5)
      .stroke();

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(muted)
      .text("Thank you for choosing Lisa's Lashes!", 50, footerY + 10, { align: 'center', width })
      .text('This receipt was generated automatically. Please keep it for your records.', 50, footerY + 24, { align: 'center', width });

    doc.end();
  }
}
