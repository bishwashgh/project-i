import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { ActiveUser } from 'src/iam/decorators/active-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initialize')
  initialize(@ActiveUser('sub') userId: number, @Body() dto: InitializePaymentDto) {
    return this.paymentsService.initialize(userId, dto.bookingId, dto.provider);
  }

  @Get('khalti/return')
  khaltiReturn(@Query('pidx') pidx: string) {
    return this.paymentsService.khaltiLookupAndConfirm(pidx);
  }

  @Post('khalti/verify')
  khaltiVerify(@Body('pidx') pidx: string) {
    return this.paymentsService.khaltiLookupAndConfirm(pidx);
  }

  @Get('esewa/success')
  async esewaSuccess(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentsService.esewaVerifyAndConfirm(query);
    return res.status(200).json(result);
  }

  @Get('esewa/failure')
  esewaFailure(@Res() res: Response) {
    return res.status(200).send('Payment failed/cancelled');
  }
}