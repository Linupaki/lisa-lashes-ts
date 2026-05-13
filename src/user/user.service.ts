import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserInfo, UserRepository } from './user.repository';

@Injectable()
export class UserService {

  constructor(private readonly users: UserRepository) {}


  async register(dto: CreateUserDto) {
    const id = await this.users.registerUser({
      first: dto.firstName,
      last: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      password: dto.password,
    });
    return { id };
  }

  async login(dto: LoginUserDto) {
    const id = await this.users.loginUser(dto.identifier, dto.password);
    return { id };
  }

  findAll(email?: string) {
    return this.users.getUsersInfo(email);
  }

  findOne(id: number) {
    return this.users.getUserInfoById(id);
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.users.updateUser(id, {
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      email: dto.email,
    });
    return { ok: true };
  }

  remove(id: number) {
    return this.users.removeUser(id);
  }
}

