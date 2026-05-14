import { Controller } from '@nestjs/common';

@Controller('auth')
export class AuthController {


  @Post('login')
  login(@Body() authPayload: authPayloadDto){

  }
}
