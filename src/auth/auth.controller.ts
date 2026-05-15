import { Body, Controller, Get, Post, UseGuards, Req }
  from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  login(
    @Body()
    body: {
      identifier: string;
      password: string;
    },
  ) {
    return this.authService.signIn(
      body.identifier,
      body.password,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req) {

    return this.authService.getProfile(req.user.sub);
  }
}

