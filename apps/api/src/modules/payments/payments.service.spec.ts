import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PAYMENT_PROVIDER } from './interfaces/payment-provider.interface';
import { MockPaymentProvider } from './providers/mock-payment.provider';
import { PaymentStatus, BookingStatus, PaymentEventType, PaymentMode } from '@prisma/client';
import { UnprocessableEntityException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    booking: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bookingHistory: {
      create: jest.fn(),
    },
    paymentEvent: {
      create: jest.fn(),
    },
    idempotencyKey: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PAYMENT_PROVIDER,
          useClass: MockPaymentProvider,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('confirmPayment', () => {
    it('should transition payment to FAILED and cancel booking when tok_fail is provided', async () => {
      const mockBooking = {
        id: 'b-1',
        customerId: 'cust-1',
        paymentMode: PaymentMode.PAY_NOW,
        status: BookingStatus.PENDING,
        priceMinorUnits: 1000,
        currency: 'INR',
        service: { vendorProfile: { userId: 'v-1' } },
        offering: { name: 'Test' },
      };

      const mockPayment = {
        id: 'p-1',
        bookingId: 'b-1',
        providerRef: 'pay_mock_123',
        status: PaymentStatus.INITIATED,
        booking: mockBooking,
      };

      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.FAILED,
      });

      const result = await service.confirmPayment('p-1', 'cust-1', { token: 'tok_fail' });

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'p-1' },
          data: expect.objectContaining({ status: PaymentStatus.FAILED }),
        }),
      );

      expect(prisma.booking.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'b-1' },
          data: expect.objectContaining({
            status: BookingStatus.CANCELLED,
            cancellationReason: 'Payment failed',
          }),
        }),
      );
    });

    it('should set payment to SUCCESS when tok_success is provided and keep booking PENDING', async () => {
      const mockBooking = {
        id: 'b-1',
        customerId: 'cust-1',
        paymentMode: PaymentMode.PAY_NOW,
        status: BookingStatus.PENDING,
        priceMinorUnits: 1000,
        currency: 'INR',
        service: { vendorProfile: { userId: 'v-1' } },
        offering: { name: 'Test' },
      };

      const mockPayment = {
        id: 'p-1',
        bookingId: 'b-1',
        providerRef: 'pay_mock_123',
        status: PaymentStatus.INITIATED,
        booking: mockBooking,
      };

      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);
      mockPrismaService.payment.update.mockResolvedValue({
        ...mockPayment,
        status: PaymentStatus.SUCCESS,
      });

      await service.confirmPayment('p-1', 'cust-1', { token: 'tok_success' });

      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.SUCCESS }),
        }),
      );
      expect(prisma.booking.update).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook', () => {
    it('should handle terminal payment idempotently without updating state', async () => {
      const mockPayment = {
        id: 'p-1',
        providerRef: 'ref_123',
        status: PaymentStatus.SUCCESS,
        booking: { status: BookingStatus.CONFIRMED },
      };

      mockPrismaService.payment.findUnique.mockResolvedValue(mockPayment);

      const secret = process.env.WEBHOOK_SECRET || 'replace-me';
      const res = await service.processWebhook(secret, {
        providerRef: 'ref_123',
        outcome: 'SUCCESS' as any,
      });

      expect(res.message).toContain('no state change required');
      expect(prisma.paymentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: PaymentEventType.WEBHOOK_RECEIVED,
          }),
        }),
      );
      expect(prisma.payment.update).not.toHaveBeenCalled();
    });
  });
});
