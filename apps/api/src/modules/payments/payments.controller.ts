import {
  Controller,
  Post,
  Patch,
  Param,
  Body,
  Headers,
  UseInterceptors,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import {
  ConfirmPaymentDto,
  WebhookPaymentDto,
  RefundPaymentDto,
} from './dto/payments.dto';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { IdempotencyInterceptor } from '../../common/interceptors/idempotency.interceptor';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments/:id/confirm
   * Customer confirms payment for PAY_NOW booking
   */
  @Post('payments/:id/confirm')
  @RequirePermissions(PERMISSIONS.PAYMENT_CONFIRM)
  @UseInterceptors(IdempotencyInterceptor)
  async confirmPayment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ConfirmPaymentDto,
  ) {
    return this.paymentsService.confirmPayment(id, user.userId, dto);
  }

  /**
   * POST /payments/webhook
   * Public webhook endpoint for payment providers
   */
  @Public()
  @Post('payments/webhook')
  async processWebhook(
    @Headers('x-webhook-secret') secretHeader: string,
    @Body() dto: WebhookPaymentDto,
  ) {
    return this.paymentsService.processWebhook(secretHeader, dto);
  }

  /**
   * PATCH /bookings/:id/mark-collected
   * Vendor marks cash collected for PAY_AFTER booking
   */
  @Patch('bookings/:id/mark-collected')
  @RequirePermissions(PERMISSIONS.PAYMENT_MARK_COLLECTED)
  async markCollected(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.paymentsService.markCollected(id, user.userId);
  }

  /**
   * POST /admin/payments/:id/refund
   * Admin triggers manual payment refund
   */
  @Post('admin/payments/:id/refund')
  @RequirePermissions(PERMISSIONS.PAYMENT_REFUND)
  async adminRefund(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RefundPaymentDto,
  ) {
    return this.paymentsService.adminRefund(id, user.userId, dto);
  }
}
