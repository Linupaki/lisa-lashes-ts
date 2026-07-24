import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class ReceiptService {
  constructor(private readonly db: DatabaseService) { }

  // ── SHARED HELPERS ─────────────────────────────────────────────────────────

  private readonly GOLD = '#A17E50';
  private readonly DARK = '#1a1a1a';
  private readonly MUTED = '#888888';
  private readonly BORDER = '#e0e0e0';
  private readonly WIDTH = 495;
  private readonly RED = '#c0392b';

  private async getBusinessProfile() {
    const profile = await this.db.business_profile.findFirst();
    return {
      name: profile?.business_name || 'Business Name',
      owner: profile?.owner_name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      about: profile?.about || '',
    };
  }

  private drawHeader(doc: PDFKit.PDFDocument, refLabel: string, refValue: string, date: string, business: { name: string; address: string; email: string }) {
    const { GOLD, DARK, MUTED, BORDER, WIDTH } = this;

    doc
      .fontSize(28).font('Helvetica-Bold').fillColor(GOLD)
      .text(business.name, 50, 50);

    doc
      .fontSize(10).font('Helvetica').fillColor(MUTED)
      .text('Professional Beauty Salon', 50, 85)
      .text(business.address, 50, 100)
      .text(business.email, 50, 115);

    doc
      .fontSize(22).font('Helvetica-Bold').fillColor(DARK)
      .text('RECEIPT', 400, 50, { align: 'right', width: 145 });

    doc
      .fontSize(10).font('Helvetica').fillColor(MUTED)
      .text(refLabel, 400, 80, { align: 'right', width: 145 })
      .text(refValue, 400, 95, { align: 'right', width: 145 })
      .text(date, 400, 110, { align: 'right', width: 145 });

    doc.moveTo(50, 140).lineTo(545, 140).strokeColor(GOLD).lineWidth(1.5).stroke();
  }

  private drawBillTo(doc: PDFKit.PDFDocument, firstName: string, lastName: string, phone?: string, email?: string): number {
    const { DARK, MUTED } = this;
    let y = 160;

    doc.fontSize(9).font('Helvetica-Bold').fillColor(MUTED).text('BILL TO', 50, y);
    y += 16;
    doc.fontSize(11).font('Helvetica-Bold').fillColor(DARK).text(`${firstName} ${lastName || ''}`, 50, y);
    y += 16;
    doc.fontSize(10).font('Helvetica').fillColor(MUTED);
    if (phone) { doc.text(phone, 50, y); y += 14; }
    if (email) { doc.text(email, 50, y); y += 14; }

    return y + 20;
  }

  private drawDeliveryPaymentBox(
    doc: PDFKit.PDFDocument,
    y: number,
    delivery: { method?: string | null; address1?: string | null; address2?: string | null; city?: string | null; eircode?: string | null },
    payment: { method?: string | null },
    note?: string | null,
  ): number {
    const { MUTED, DARK, WIDTH, BORDER } = this;

    const lines: string[] = [];

    if (delivery?.method) {
      const methodLabel = delivery.method === 'pickup'
        ? 'Pickup'
        : (delivery.method === 'express' ? 'Express delivery' : 'Standard delivery');
      lines.push(`Delivery: ${methodLabel}`);
    }

    const addressParts = [delivery?.address1, delivery?.address2, delivery?.city, delivery?.eircode].filter(Boolean);
    if (addressParts.length) {
      lines.push(`Address: ${addressParts.join(', ')}`);
    }

    if (payment?.method) {
      const pm = payment.method === 'pickup'
        ? 'Pay on pickup'
        : (payment.method === 'cash' ? 'Cash on delivery' : payment.method);
      lines.push(`Payment: ${pm}`);
    }

    if (note) {
      lines.push(`Note: ${note}`);
    }

    if (!lines.length) return y;

    const boxH = 18 + lines.length * 14 + 10;
    doc.rect(50, y, WIDTH, boxH).fillColor('#faf7f2').fill();
    doc.moveTo(50, y).lineTo(50, y + boxH).strokeColor(BORDER).lineWidth(3).stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor(MUTED).text('DELIVERY & PAYMENT', 62, y + 8);
    doc.fontSize(10).font('Helvetica').fillColor(DARK);
    let ly = y + 24;
    for (const line of lines) {
      doc.text(line, 62, ly, { width: WIDTH - 24 });
      ly += 14;
    }

    return y + boxH + 18;
  }

  private drawPaymentNotice(doc: PDFKit.PDFDocument, y: number, message: string): number {
    doc
      .rect(50, y, this.WIDTH, 36)
      .fillColor('#fff8e8').fill();

    doc
      .fontSize(10).font('Helvetica-Bold').fillColor('#c9a84c')
      .text('⚠  PAYMENT NOTICE', 62, y + 6);
    doc
      .fontSize(9).font('Helvetica').fillColor('#856404')
      .text(message, 62, y + 20, { width: this.WIDTH - 24 });

    doc.moveTo(50, y).lineTo(50, y + 36).strokeColor('#c9a84c').lineWidth(3).stroke();

    return y + 52;
  }

  private drawTotalsAndFooter(doc: PDFKit.PDFDocument, y: number, subtotal: number, total: number, status: string, businessName = 'our salon') {
    const { GOLD, MUTED, DARK, BORDER } = this;
    const discount = subtotal - total;

    const totalRow = (label: string, value: string, bold = false, color = DARK) => {
      doc.fontSize(10).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(MUTED).text(label, 300, y, { width: 160 });
      doc.fillColor(color).text(value, 460, y, { width: 80, align: 'right' });
      y += 18;
    };

    totalRow('Subtotal', `€${subtotal.toFixed(2)}`);
    if (discount > 0.01) totalRow('Discount', `-€${discount.toFixed(2)}`, false, this.RED);

    doc.moveTo(300, y).lineTo(545, y).strokeColor(BORDER).lineWidth(0.5).stroke();
    y += 8;
    totalRow('TOTAL', `€${total.toFixed(2)}`, true, GOLD);

    const footerY = 760;
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(BORDER).lineWidth(0.5).stroke();
    doc.fontSize(9).font('Helvetica').fillColor(MUTED)
      .text(`Thank you for choosing ${businessName}!`, 50, footerY + 10, { align: 'center', width: this.WIDTH })
      .text('This receipt was generated automatically. Please keep it for your records.', 50, footerY + 24, { align: 'center', width: this.WIDTH });
  }

  // ── ORDER RECEIPT ──────────────────────────────────────────────────────────

  async generateOrderReceipt(orderId: number, userId: number, isAdmin: boolean, res: Response) {
    const order = await this.db.orders.findFirst({
      where: isAdmin ? { id: orderId } : { id: orderId, user_id: userId },
      include: {
        order_items: {
          include: { products: { select: { id: true, name: true, price: true } } },
        },
        users: { select: { id: true, first_name: true, last_name: true, phone: true, address: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found.');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-order-${orderId}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const business = await this.getBusinessProfile();
    const date = new Date(order.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    this.drawHeader(doc, `Order #${order.id}`, 'Product Order', date, business);

    const billFirst = (order as any).customer_first_name || order.users.first_name;
    const billLast = (order as any).customer_last_name || order.users.last_name;
    const billPhone = (order as any).customer_phone || order.users.phone;
    const billEmail = (order as any).customer_email || order.users.address;

    let y = this.drawBillTo(doc, billFirst, billLast, billPhone, billEmail);

    y = this.drawDeliveryPaymentBox(
      doc,
      y,
      {
        method: (order as any).delivery_method,
        address1: (order as any).delivery_address1,
        address2: (order as any).delivery_address2,
        city: (order as any).delivery_city,
        eircode: (order as any).delivery_eircode,
      },
      { method: (order as any).payment_method },
      (order as any).order_note,
    );

    // Table header
    doc.rect(50, y, this.WIDTH, 24).fillColor('#f5f0e8').fill();
    doc.fontSize(9).font('Helvetica-Bold').fillColor(this.DARK)
      .text('ITEM', 60, y + 8)
      .text('QTY', 340, y + 8, { width: 50, align: 'center' })
      .text('UNIT', 390, y + 8, { width: 70, align: 'right' })
      .text('TOTAL', 460, y + 8, { width: 80, align: 'right' });
    y += 24;
    doc.moveTo(50, y).lineTo(545, y).strokeColor(this.BORDER).lineWidth(0.5).stroke();

    let subtotal = 0;
    for (const [i, item] of order.order_items.entries()) {
      const paid = Number(item.price_at_purchase);
      const line = paid * item.quantity;
      subtotal += line;
      const rowH = Math.max(30, doc.heightOfString(item.products?.name || 'Product', { width: 270 }) + 20);
      if (i % 2 === 0) doc.rect(50, y, this.WIDTH, rowH).fillColor('#fdfcfb').fill();
      doc.fontSize(10).font('Helvetica').fillColor(this.DARK)
        .text(item.products?.name || 'Product', 60, y + 8, { width: 270 })
        .text(String(item.quantity), 340, y + 8, { width: 50, align: 'center' })
        .text(`€${paid.toFixed(2)}`, 390, y + 8, { width: 70, align: 'right' })
        .text(`€${line.toFixed(2)}`, 460, y + 8, { width: 80, align: 'right' });
      const orig = Number(item.products?.price || paid);
      if (paid < orig - 0.01) {
        doc.fontSize(8).fillColor(this.MUTED).text(`was €${orig.toFixed(2)}`, 390, y + 20, { width: 70, align: 'right' });
      }
      y += rowH;
      doc.moveTo(50, y).lineTo(545, y).strokeColor(this.BORDER).lineWidth(0.5).stroke();
    }

    y += 12;
    this.drawTotalsAndFooter(doc, y, subtotal, Number(order.total), order.status, business.name);
    doc.end();
  }

  // ── BOOKING RECEIPT ────────────────────────────────────────────────────────

  async generateBookingReceipt(bookingId: number, userId: number, isAdmin: boolean, res: Response) {
    const booking = await this.db.bookings.findFirst({
      where: isAdmin ? { id: bookingId } : { id: bookingId, user_id: userId },
      include: {
        salon_services: { select: { id: true, name: true, price: true, duration_minutes: true } },
        resources: { select: { id: true, name: true } },
        users: { select: { id: true, first_name: true, last_name: true, phone: true, address: true } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found.');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-booking-${bookingId}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const date = booking.start_time
      ? new Date(booking.start_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';
    const time = booking.start_time
      ? new Date(booking.start_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : '';

    const business = await this.getBusinessProfile();
    this.drawHeader(doc, `Booking #${booking.id}`, 'Salon Appointment', date, business);

    const user = booking.users;
    let y = this.drawBillTo(doc, user.first_name, user.last_name, user.phone, user.address);

    // Payment notice
    y = this.drawPaymentNotice(doc, y, 'Payment is due in-person at the salon on the day of your appointment.');

    // Booking details box
    doc.rect(50, y, this.WIDTH, 120).fillColor('#faf7f2').fill();
    doc.moveTo(50, y).lineTo(50, y + 120).strokeColor(this.GOLD).lineWidth(3).stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor(this.MUTED).text('APPOINTMENT DETAILS', 62, y + 10);
    doc.fontSize(11).font('Helvetica-Bold').fillColor(this.DARK).text(booking.salon_services?.name || 'Service', 62, y + 26);
    doc.fontSize(10).font('Helvetica').fillColor(this.MUTED);

    let detailY = y + 44;
    if (booking.resources?.name) { doc.text(`Artist:    ${booking.resources.name}`, 62, detailY); detailY += 16; }
    if (time) { doc.text(`Time:      ${time}`, 62, detailY); detailY += 16; }
    if (booking.salon_services?.duration_minutes) { doc.text(`Duration:  ${booking.salon_services.duration_minutes} min`, 62, detailY); detailY += 16; }

    y += 132;

    const price = Number(booking.salon_services?.price || 0);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(this.BORDER).lineWidth(0.5).stroke();
    y += 12;

    this.drawTotalsAndFooter(doc, y, price, price, booking.status, business.name);
    doc.end();
  }

  // ── COURSE BOOKING RECEIPT ─────────────────────────────────────────────────

  async generateCourseReceipt(bookingId: number, userId: number, isAdmin: boolean, res: Response) {
    const booking = await this.db.course_bookings.findFirst({
      where: isAdmin ? { id: bookingId } : { id: bookingId, user_id: userId },
      include: {
        course: true,
        user: { select: { id: true, first_name: true, last_name: true, phone: true, address: true } },
      },
    });
    if (!booking) throw new NotFoundException('Course booking not found.');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-course-booking-${bookingId}.pdf"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    const course = booking.course;
    const date = course.date
      ? new Date(course.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : '—';

    const business = await this.getBusinessProfile();
    this.drawHeader(doc, `Booking #${booking.id}`, 'Course Registration', new Date(booking.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), business);

    const user = booking.user;
    let y = this.drawBillTo(doc, user.first_name, user.last_name, user.phone, user.address);

    // Course details box
    doc.rect(50, y, this.WIDTH, 140).fillColor('#faf7f2').fill();
    doc.moveTo(50, y).lineTo(50, y + 140).strokeColor(this.GOLD).lineWidth(3).stroke();

    doc.fontSize(9).font('Helvetica-Bold').fillColor(this.MUTED).text('COURSE DETAILS', 62, y + 10);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(this.DARK).text(course.title, 62, y + 26);
    doc.fontSize(10).font('Helvetica').fillColor(this.MUTED);

    let detailY = y + 50;
    if (course.instructor) { doc.text(`Instructor:  ${course.instructor}`, 62, detailY); detailY += 16; }
    if (date !== '—') { doc.text(`Date:        ${date}`, 62, detailY); detailY += 16; }
    if (course.time_start && course.time_end) {
      doc.text(`Time:        ${course.time_start} – ${course.time_end}`, 62, detailY); detailY += 16;
    }
    if (course.location) { doc.text(`Location:    ${course.location}`, 62, detailY); detailY += 16; }
    if (course.certificate) { doc.text('Certificate: Included upon completion', 62, detailY); }

    y += 152;

    const price = Number(course.price);
    doc.moveTo(50, y).lineTo(545, y).strokeColor(this.BORDER).lineWidth(0.5).stroke();
    y += 12;

    this.drawTotalsAndFooter(doc, y, price, price, booking.status, business.name);
    doc.end();
  }
}
