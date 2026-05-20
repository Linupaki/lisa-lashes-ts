import { Body, Controller, Get, Post, UseGuards, Res, Req, HttpStatus, HttpCode, Header }
  from '@nestjs/common';
import { Response } from 'express'
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() body: any,
    @Res({ passthrough: true }) res: Response // 'passthrough: true' lets us use standard return statements
  ) {
    // 1. Authenticate user via your existing service logic
    const authData = await this.authService.signIn(body.identifier, body.password);

    // 2. Attach the access_token as a secure HttpOnly cookie
    res.cookie('token', authData.access_token, {
      httpOnly: true,                 // Prevents JavaScript access (XSS Protection)
      secure: process.env.NODE_ENV === 'production', // True means HTTPS only
      sameSite: 'lax',                // Protects against CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000 // Cookie expires in 7 days (matches JWT expiration)
    });

    // 3. Return user data cleanly without exposing the raw token to the frontend script
    return {
      success: true,
      user: authData.user
    };
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    // Overwrite the cookie with an immediate expiration date
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
    });
    return { success: true };
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('me')
  @Header('Cache-Control', 'no-store, no-cache, must-revalidate')
  async getProfile(@Req() req) {

    return this.authService.getProfile(req.user.sub);
  }
}

