import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity';
import { CreateAddressDto } from './dtos/create-address.dto';
import { UpdateAddressDto } from './dtos/update-address.dto';

@Injectable()
export class AddressesService {
    constructor(
        @InjectRepository(Address)
        private readonly addressRepo: Repository<Address>,
    ) {}

    findAll(userId: number): Promise<Address[]> {
        return this.addressRepo.find({ where: { user: { id: userId } } });
    }

    async findOne(id: number, userId: number): Promise<Address> {
        const address = await this.addressRepo.findOne({ where: { id } });
        if (!address) throw new NotFoundException('Address not found');
        if (address.user?.id !== userId) throw new ForbiddenException('Access denied');
        return address;
    }

    async create(userId: number, dto: CreateAddressDto): Promise<Address> {
        if (dto.isDefault) {
            await this.addressRepo.update({ user: { id: userId } }, { isDefault: false });
        }
        const address = this.addressRepo.create({ ...dto, user: { id: userId } });
        return this.addressRepo.save(address);
    }

    async update(id: number, userId: number, dto: UpdateAddressDto): Promise<Address> {
        const address = await this.findOne(id, userId);
        if (dto.isDefault) {
            await this.addressRepo.update({ user: { id: userId } }, { isDefault: false });
        }
        Object.assign(address, dto);
        return this.addressRepo.save(address);
    }

    async remove(id: number, userId: number): Promise<{ message: string }> {
        const address = await this.findOne(id, userId);
        await this.addressRepo.remove(address);
        return { message: 'Address deleted' };
    }
}
