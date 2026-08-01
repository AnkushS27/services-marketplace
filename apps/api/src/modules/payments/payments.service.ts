import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_PROVIDER } from './interfaces/payment-provider.interface';
import type { PaymentProvider } from './interfaces/payment-provider.interface';
import {
  ConfirmPaymentDto,
  WebhookPaymentDto,
  RefundPaymentDto,
  WebhookOutcome,
} from './dto/payments.dto';
import { BookingStatus, PaymentMode, PaymentStatus, PaymentEventType } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER) private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Customer confirms payment for PAY_NOW booking
   */
  async confirmPayment(id: string, userId: string, dto: ConfirmPaymentDto) {
    // Find payment by payment ID or booking ID
    let payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ id }, { bookingId: id }],
      },
      include: {
        booking: {
          include: {
            service: {
              include: { vendorProfile: true },
            },
            offering: true,
          },
        },
      },
    });

    if (!payment) {
      // Check if booking exists without a payment record yet
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        include: {
          service: { include: { vendorProfile: true } },
          offering: true,
        },
      });

      if (!booking || booking.customerId !== userId) {
        throw new NotFoundException('Payment or Booking not found');
      }

      if (booking.paymentMode !== PaymentMode.PAY_NOW) {
        throw new UnprocessableEntityException('Only PAY_NOW bookings require online payment confirmation');
      }

      // Create initial payment row if missing
      const mockRef = `pay_mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      payment = await this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          amountMinorUnits: booking.priceMinorUnits,
          currency: booking.currency,
          providerRef: mockRef,
          status: PaymentStatus.INITIATED,
        },
        include: {
          booking: {
            include: {
              service: { include: { vendorProfile: true } },
              offering: true,
            },
          },
        },
      });
    } else {
      // Ownership check: must belong to the requesting customer
      if (payment.booking.customerId !== userId) {
        throw new NotFoundException('Payment or Booking not found');
      }

      if (payment.booking.paymentMode !== PaymentMode.PAY_NOW) {
        throw new UnprocessableEntityException('Only PAY_NOW bookings require online payment confirmation');
      }
    }

    // If payment is already in a terminal state, return it directly
    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      return this.prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          booking: {
            include: {
              service: true,
              offering: true,
            },
          },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });
    }

    // Call payment provider
    const providerResult = await this.paymentProvider.confirmPayment(
      dto.token,
      payment.providerRef,
    );

    return this.prisma.$transaction(async (tx) => {
      if (providerResult.status === PaymentStatus.SUCCESS) {
        // Payment SUCCESS: Booking remains PENDING for vendor approval
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            providerRef: providerResult.providerRef || payment.providerRef,
          },
          include: {
            booking: {
              include: {
                service: true,
                offering: true,
              },
            },
            events: { orderBy: { createdAt: 'asc' } },
          },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.SUCCESS,
            metadata: providerResult.metadata || { token: dto.token },
          },
        });

        return updatedPayment;
      } else if (providerResult.status === PaymentStatus.FAILED) {
        // Payment FAILED: Transition booking PENDING -> CANCELLED to release slot
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            providerRef: providerResult.providerRef || payment.providerRef,
          },
          include: {
            booking: {
              include: {
                service: true,
                offering: true,
              },
            },
            events: { orderBy: { createdAt: 'asc' } },
          },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.FAILED,
            metadata: providerResult.metadata || { token: dto.token },
          },
        });

        // Auto-cancel booking if it is PENDING
        if (payment.booking.status === BookingStatus.PENDING) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              cancellationReason: 'Payment failed',
            },
          });

          await tx.bookingHistory.create({
            data: {
              bookingId: payment.bookingId,
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CANCELLED,
              actorUserId: userId,
              reason: 'Payment failed',
            },
          });
        }

        return updatedPayment;
      } else {
        // Payment INITIATED (delayed)
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.INITIATED,
          },
          include: {
            booking: {
              include: {
                service: true,
                offering: true,
              },
            },
            events: { orderBy: { createdAt: 'asc' } },
          },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.INITIATED,
            metadata: providerResult.metadata || { token: dto.token },
          },
        });

        return updatedPayment;
      }
    });
  }

  /**
   * Webhook handler for async payment gateway notifications
   */
  async processWebhook(secretHeader: string | undefined, dto: WebhookPaymentDto) {
    const expectedSecret = process.env.WEBHOOK_SECRET || 'replace-me';
    if (secretHeader !== expectedSecret) {
      throw new UnauthorizedException('Invalid webhook secret header');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: dto.providerRef },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment not found for providerRef '${dto.providerRef}'`);
    }

    // Idempotent by construction: if terminal state, log event and return 200
    if (
      payment.status === PaymentStatus.SUCCESS ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REFUNDED
    ) {
      await this.prisma.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK_RECEIVED,
          metadata: {
            outcome: dto.outcome,
            note: 'Webhook received for payment already in terminal state',
            currentStatus: payment.status,
          },
        },
      });

      return {
        message: 'Webhook processed (no state change required)',
        status: payment.status,
        providerRef: payment.providerRef,
      };
    }

    return this.prisma.$transaction(async (tx) => {
      // Always log WEBHOOK_RECEIVED event
      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.WEBHOOK_RECEIVED,
          metadata: { outcome: dto.outcome },
        },
      });

      if (dto.outcome === WebhookOutcome.SUCCESS) {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.SUCCESS },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.SUCCESS,
            metadata: { source: 'webhook' },
          },
        });

        return {
          message: 'Payment marked as SUCCESS via webhook',
          status: updatedPayment.status,
          providerRef: payment.providerRef,
        };
      } else {
        const updatedPayment = await tx.payment.update({
          where: { id: payment.id },
          data: { status: PaymentStatus.FAILED },
        });

        await tx.paymentEvent.create({
          data: {
            paymentId: payment.id,
            type: PaymentEventType.FAILED,
            metadata: { source: 'webhook' },
          },
        });

        // Cancel booking if PENDING to release slot
        if (payment.booking.status === BookingStatus.PENDING) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              status: BookingStatus.CANCELLED,
              cancellationReason: 'Payment failed (webhook)',
            },
          });

          await tx.bookingHistory.create({
            data: {
              bookingId: payment.bookingId,
              fromStatus: BookingStatus.PENDING,
              toStatus: BookingStatus.CANCELLED,
              reason: 'Payment failed (webhook)',
            },
          });
        }

        return {
          message: 'Payment marked as FAILED via webhook',
          status: updatedPayment.status,
          providerRef: payment.providerRef,
        };
      }
    });
  }

  /**
   * Vendor marks PAY_AFTER cash collected
   */
  async markCollected(bookingId: string, vendorUserId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        service: { include: { vendorProfile: true } },
        payment: true,
      },
    });

    if (!booking || booking.service.vendorProfile.userId !== vendorUserId) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.paymentMode !== PaymentMode.PAY_AFTER) {
      throw new UnprocessableEntityException(
        'Mark cash collected is only applicable to PAY_AFTER bookings',
      );
    }

    if (booking.payment && booking.payment.status === PaymentStatus.SUCCESS) {
      throw new ConflictException('Payment for this booking has already been collected');
    }

    return this.prisma.$transaction(async (tx) => {
      const providerRef = `cash_${booking.id}_${Date.now()}`;
      let payment;

      if (booking.payment) {
        payment = await tx.payment.update({
          where: { id: booking.payment.id },
          data: {
            status: PaymentStatus.SUCCESS,
            providerRef,
          },
        });
      } else {
        payment = await tx.payment.create({
          data: {
            bookingId: booking.id,
            amountMinorUnits: booking.priceMinorUnits,
            currency: booking.currency,
            providerRef,
            status: PaymentStatus.SUCCESS,
          },
        });
      }

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.SUCCESS,
          metadata: { method: 'cash', actorUserId: vendorUserId },
        },
      });

      return tx.booking.findUnique({
        where: { id: booking.id },
        include: {
          service: true,
          offering: true,
          payment: true,
          history: { orderBy: { createdAt: 'asc' } },
        },
      });
    });
  }

  /**
   * Admin triggers manual payment refund
   */
  async adminRefund(paymentId: string, adminUserId: string, dto: RefundPaymentDto) {
    let payment = await this.prisma.payment.findFirst({
      where: {
        OR: [{ id: paymentId }, { bookingId: paymentId }],
      },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new UnprocessableEntityException('Only SUCCESS payments can be refunded');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.REFUNDED },
        include: {
          booking: true,
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      await tx.paymentEvent.create({
        data: {
          paymentId: payment.id,
          type: PaymentEventType.REFUNDED,
          metadata: { reason: dto.reason, actorUserId: adminUserId },
        },
      });

      return updated;
    });
  }
}
