import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { randomUUID } from 'crypto';

import { Payment, PaymentProvider, PaymentStatus } from './entities/payment.entity';
import { Booking } from 'src/bookings/entities/booking.entity';
import { BookingStatus } from 'src/bookings/enum/bookingstatus.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Booking) private readonly bookingsRepo: Repository<Booking>,
    private readonly config: ConfigService,
  ) {}

  async initialize(userId: number, bookingId: number, provider: PaymentProvider) {
    const booking = await this.bookingsRepo.findOne({
      where: { id: bookingId, user: { id: userId } },
      relations: { user: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Booking is not pending payment');
    }

    const totalAmount = Number(booking.amount);
     if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
       throw new BadRequestException('Invalid booking amount');
      }

     // 40% deposit (upfront payment)
      const depositAmount = Math.ceil(totalAmount * 0.4); // Rs
      const amount = depositAmount;

    const payment = await this.paymentsRepo.save(
      this.paymentsRepo.create({
        booking: { id: booking.id } as any,
        user: { id: userId } as any,
        provider,
        amount,
        status: PaymentStatus.PENDING,
      }),
    );

    if (provider === PaymentProvider.KHALTI) return this.initializeKhalti(payment.id);
    if (provider === PaymentProvider.ESEWA) return this.initializeEsewa(payment.id);

    throw new BadRequestException('Unsupported provider');
  }

  private async initializeKhalti(paymentId: number) {
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId },
      relations: { booking: true, user: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const baseUrl = this.config.get<string>('KHALTI_BASE_URL');
    const secretKey = this.config.get<string>('KHALTI_SECRET_KEY');
    const appUrl = this.config.get<string>('APP_URL');
    const returnPath = this.config.get<string>('KHALTI_RETURN_PATH');
    const websiteUrl = this.config.get<string>('KHALTI_WEBSITE_URL') ?? appUrl;

    if (!baseUrl || !secretKey || !appUrl || !returnPath) {
      throw new BadRequestException('Missing Khalti configuration in .env');
    }

    const return_url = `${appUrl}${returnPath}`;
    const amountPaisa = Math.round(Number(payment.amount) * 100);

    const payload = {
      return_url,
      website_url: websiteUrl,
      amount: amountPaisa,
      purchase_order_id: `BOOKING-${payment.booking.id}-PAYMENT-${payment.id}`,
      purchase_order_name: `Booking #${payment.booking.id}`,
      merchant_extra: String(payment.id),
    };

    const res = await axios.post(`${baseUrl}/epayment/initiate/`, payload, {
      headers: {
        Authorization: secretKey.startsWith('Key ') ? secretKey : `Key ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    // Save pidx
    payment.gatewayRef = res.data.pidx;
    payment.raw = res.data;
    await this.paymentsRepo.save(payment);

    return {
      provider: PaymentProvider.KHALTI,
      paymentId: payment.id,
      pidx: res.data.pidx,
      payment_url: res.data.payment_url,
      expires_at: res.data.expires_at,
      expires_in: res.data.expires_in,
      userId: payment.user?.id,
      userEmail: payment.user?.email,
    };
  }

  private async initializeEsewa(paymentId: number) {
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId },
      relations: { booking: true ,user:true},
    });
    if (!payment) throw new NotFoundException('Payment not found');

    const baseUrl = this.config.get<string>('ESEWA_BASE_URL');
    const merchantCode = this.config.get<string>('ESEWA_MERCHANT_CODE');
    const verifyPath = this.config.get<string>('ESEWA_VERIFY_PATH') ?? '/epay/transrec';
    const appUrl = this.config.get<string>('APP_URL');
    const successPath = this.config.get<string>('ESEWA_SUCCESS_PATH');
    const failurePath = this.config.get<string>('ESEWA_FAILURE_PATH');

    if (!baseUrl || !merchantCode || !appUrl || !successPath || !failurePath) {
      throw new BadRequestException('Missing eSewa configuration in .env');
    }

    const pid = `BOOKING-${payment.booking.id}-PAYMENT-${payment.id}-${randomUUID()}`;
    payment.gatewayRef = pid; // store pid so we can find payment on callback
    await this.paymentsRepo.save(payment);

    // eSewa expects plain amount (usually string/number). Keep it consistent with your booking amount.
    const amt = String(payment.amount);

    return {
      provider: PaymentProvider.ESEWA,
      paymentId: payment.id,
      userId: payment.user?.id,
      userEmail: payment.user?.email,
      action: `${baseUrl}/epay/main`, // common ePay form action
      method: 'POST',
      fields: {
        amt,
        psc: 0,
        pdc: 0,
        txAmt: 0,
        tAmt: amt,           // some implementations use tAmt as total
        pid,
        scd: merchantCode,
        su: `${appUrl}${successPath}`,
        fu: `${appUrl}${failurePath}`,
      },
      verify: {
        endpoint: `${baseUrl}${verifyPath}`,
      },
    };
  }

  async khaltiLookupAndConfirm(pidx: string) {
    const baseUrl = this.config.get<string>('KHALTI_BASE_URL');
    const secretKey = this.config.get<string>('KHALTI_SECRET_KEY');
    if (!baseUrl || !secretKey) throw new BadRequestException('Missing Khalti configuration');

    const payment = await this.paymentsRepo.findOne({
      where: { gatewayRef: pidx, provider: PaymentProvider.KHALTI },
      relations: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found for this pidx');

    const res = await axios.post(
      `${baseUrl}/epayment/lookup/`,
      { pidx },
      {
        headers: {
          Authorization: secretKey.startsWith('Key ') ? secretKey : `Key ${secretKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    payment.raw = res.data;

    if (res.data.status === 'Completed') {
      return this.markPaidAndConfirmBooking(payment.id, res.data, pidx);
    }

    if (res.data.status === 'User canceled' || res.data.status === 'Expired') {
      payment.status = PaymentStatus.FAILED;
      await this.paymentsRepo.save(payment);
      return { ok: false, status: res.data.status, lookup: res.data };
    }

    // Pending/Initiated/Refunded etc.
    await this.paymentsRepo.save(payment);
    return { ok: false, status: res.data.status, lookup: res.data };
  }

  async esewaVerifyAndConfirm(query: { amt?: string; pid?: string; rid?: string; refId?: string; scd?: string }) {
    const baseUrl = this.config.get<string>('ESEWA_BASE_URL');
    const merchantCode = this.config.get<string>('ESEWA_MERCHANT_CODE');
    const verifyPath = this.config.get<string>('ESEWA_VERIFY_PATH') ?? '/epay/transrec';

    if (!baseUrl || !merchantCode) throw new BadRequestException('Missing eSewa configuration');

    const amt = query.amt;
    const pid = query.pid;
    const rid = query.rid ?? query.refId; // different implementations name it differently

    if (!amt || !pid || !rid) throw new BadRequestException('Missing eSewa callback params');

    const payment = await this.paymentsRepo.findOne({
      where: { gatewayRef: pid, provider: PaymentProvider.ESEWA },
      relations: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found for this pid');

    // eSewa transrec verify is usually form-url-encoded
    const body = new URLSearchParams({
      amt,
      rid,
      pid,
      scd: merchantCode,
    });

    const res = await axios.post(`${baseUrl}${verifyPath}`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    // eSewa often responds with text/xml-ish "Success" or similar depending on version
    const rawText = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    payment.raw = { verifyResponse: rawText, callback: query };

    if (rawText.toLowerCase().includes('success')) {
      return this.markPaidAndConfirmBooking(payment.id, payment.raw, rid);
    }

    payment.status = PaymentStatus.FAILED;
    await this.paymentsRepo.save(payment);

    return { ok: false, status: 'FAILED', response: rawText };
  }

  async markPaidAndConfirmBooking(paymentId: number, raw: any, gatewayRef?: string) {
    const payment = await this.paymentsRepo.findOne({
      where: { id: paymentId },
      relations: { booking: { user: true } },
    });
    if (!payment) throw new NotFoundException('Payment not found');

    payment.status = PaymentStatus.PAID;
    payment.raw = raw ?? null;
    if (gatewayRef) payment.gatewayRef = gatewayRef;

    await this.paymentsRepo.save(payment);

    await this.bookingsRepo.update(payment.booking.id, {
      status: BookingStatus.CONFIRMED,
    });

    return payment;
  }
}