import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { Vendor, VendorStatus } from './entities/vendor.entity';
import { Store } from './entities/store.entity';
import {
  VendorApplication,
  VendorApplicationStatus,
} from './entities/vendor-application.entity';
import { User, UserType } from '../users/user.entity';
import {
  AdminVendorListQueryDto,
  ApplicationReviewAction,
  ApplyVendorDto,
  CreateVendorDto,
  ReviewApplicationDto,
  UpdateStoreDto,
  UpdateVendorAdminDto,
  VendorAdminAction,
  VendorListQueryDto,
} from './dtos/vendor.dtos';
import { AppError } from '../common/errors/app-exception';
import { ErrorCode } from '../common/errors/error-codes';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../common/audit/audit.service';
import { MailService } from '../mail/mail.service';
import { NotificationEvent } from '../notifications/notification-events';
import { PlatformSettingsService } from '../platform/platform-settings.service';
import { slugify } from '../utils/slugify';

const PAGE_DEFAULT = 1;
const LIMIT_DEFAULT = 12;
const LIMIT_MAX = 100;

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor) private readonly vendors: Repository<Vendor>,
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    @InjectRepository(VendorApplication)
    private readonly applications: Repository<VendorApplication>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
    private readonly events: EventEmitter2,
    private readonly settings: PlatformSettingsService,
  ) {}

  get defaultCommissionRate(): number {
    const rate = this.settings.current().defaultCommissionRate;
    return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0.1;
  }

  // ─── Customer: application ───────────────────────────────────────────────

  async apply(userId: number, dto: ApplyVendorDto): Promise<VendorApplication> {
    const existingVendor = await this.vendors.findOne({ where: { userId } });
    if (existingVendor) {
      throw AppError.conflict(
        'You already have a vendor account',
        ErrorCode.VENDOR_ALREADY_EXISTS,
      );
    }

    const pending = await this.applications.findOne({
      where: { userId, status: VendorApplicationStatus.PENDING },
    });
    if (pending) {
      throw AppError.conflict(
        'You already have a pending application',
        ErrorCode.APPLICATION_ALREADY_PENDING,
      );
    }

    const application = this.applications.create({
      userId,
      proposedStoreName: dto.proposedStoreName.trim(),
      contactPhone: dto.contactPhone.trim(),
      contactEmail: dto.contactEmail ?? null,
      description: dto.description ?? null,
      documents: dto.documents ?? [],
      status: VendorApplicationStatus.PENDING,
    });
    const saved = await this.applications.save(application);

    const user = await this.users.findOneBy({ id: userId });
    if (user) {
      this.mail
        .sendVendorApplicationReceived(user.email, user.username, saved.proposedStoreName)
        .catch(() => null);
    }
    await this.audit.record({
      actorId: userId,
      action: 'vendor_application.submitted',
      entityType: 'vendor_application',
      entityId: saved.id,
    });
    return saved;
  }

  async myApplications(userId: number): Promise<VendorApplication[]> {
    return this.applications.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Vendor: self-service ───────────────────────────────────────────────

  async findApprovedByUserId(userId: number): Promise<Vendor | null> {
    return this.vendors.findOne({
      where: { userId, status: VendorStatus.APPROVED },
    });
  }

  async getMyVendor(userId: number): Promise<{ vendor: Vendor; store: Store | null }> {
    const vendor = await this.vendors.findOne({ where: { userId } });
    if (!vendor) throw AppError.notFound('No vendor account for this user');
    const store = await this.stores.findOne({ where: { vendorId: vendor.id } });
    return { vendor, store };
  }

  async updateMyStore(userId: number, dto: UpdateStoreDto): Promise<Store> {
    const vendor = await this.findApprovedByUserId(userId);
    if (!vendor) {
      throw AppError.forbidden('Vendor account required', ErrorCode.VENDOR_NOT_APPROVED);
    }
    const store = await this.stores.findOne({ where: { vendorId: vendor.id } });
    if (!store) throw AppError.notFound('Store not found');

    if (dto.name !== undefined) store.name = dto.name.trim();
    if (dto.description !== undefined) store.description = dto.description || null;
    if (dto.logo !== undefined) store.logo = dto.logo || null;
    if (dto.coverImage !== undefined) store.coverImage = dto.coverImage || null;
    if (dto.supportEmail !== undefined) store.supportEmail = dto.supportEmail || null;
    if (dto.supportPhone !== undefined) store.supportPhone = dto.supportPhone || null;
    if (dto.returnsPolicy !== undefined || dto.shippingPolicy !== undefined) {
      store.policies = {
        returns: dto.returnsPolicy ?? store.policies?.returns,
        shipping: dto.shippingPolicy ?? store.policies?.shipping,
      };
    }
    if (dto.shippingFee !== undefined) {
      store.shippingFee = dto.shippingFee === null ? null : Number(dto.shippingFee);
    }
    // Slug is intentionally immutable once created — it is a public URL.
    return this.stores.save(store);
  }

  // ─── Public storefront ─────────────────────────────────────────────────

  async listPublicVendors(query: VendorListQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.stores
      .createQueryBuilder('store')
      .innerJoinAndSelect('store.vendor', 'vendor')
      .where('vendor.status = :status', { status: VendorStatus.APPROVED })
      .andWhere('store.isActive = true');

    if (query.search) {
      qb.andWhere('store.name ILIKE :s', { s: `%${query.search}%` });
    }
    if (query.sortBy === 'rating') qb.orderBy('vendor.ratingAverage', 'DESC');
    else if (query.sortBy === 'sales') qb.orderBy('vendor.totalSales', 'DESC');
    else qb.orderBy('store.createdAt', 'DESC');

    const [rows, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: rows.map((store) => this.toPublicStore(store)),
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPublicStore(slug: string) {
    const store = await this.stores.findOne({
      where: { slug, isActive: true },
      relations: { vendor: true },
    });
    if (!store || store.vendor.status !== VendorStatus.APPROVED) {
      throw AppError.notFound('Store not found');
    }
    return this.toPublicStore(store);
  }

  // ─── Admin: applications ───────────────────────────────────────────────

  async listApplications(query: AdminVendorListQueryDto) {
    const { page, limit } = this.paginate(query);
    const where = query.status
      ? { status: query.status as VendorApplicationStatus }
      : {};
    const [data, total] = await this.applications.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getApplication(id: number): Promise<VendorApplication> {
    const app = await this.applications.findOne({ where: { id } });
    if (!app) throw AppError.notFound('Application not found');
    return app;
  }

  async reviewApplication(
    id: number,
    dto: ReviewApplicationDto,
    adminId: number,
  ): Promise<VendorApplication> {
    const app = await this.getApplication(id);
    if (app.status !== VendorApplicationStatus.PENDING) {
      throw AppError.conflict(
        'This application has already been reviewed',
        ErrorCode.APPLICATION_ALREADY_REVIEWED,
      );
    }

    if (dto.action === ApplicationReviewAction.REJECT && !dto.note?.trim()) {
      throw AppError.badRequest('A reason is required when rejecting');
    }

    const user = await this.users.findOneBy({ id: app.userId });
    if (!user) throw AppError.notFound('Applicant no longer exists');

    return this.dataSource.transaction(async (tx) => {
      const appRepo = tx.getRepository(VendorApplication);
      const now = new Date();

      if (dto.action === ApplicationReviewAction.APPROVE) {
        await this.provisionVendor(tx, user, app.proposedStoreName, dto.commissionRate);
        app.status = VendorApplicationStatus.APPROVED;
      } else {
        app.status = VendorApplicationStatus.REJECTED;
        app.reviewNote = dto.note!.trim();
      }
      app.reviewedBy = adminId;
      app.reviewedAt = now;
      const saved = await appRepo.save(app);

      await this.audit.record({
        actorId: adminId,
        action: `vendor_application.${dto.action}`,
        entityType: 'vendor_application',
        entityId: id,
        metadata: { userId: app.userId, note: dto.note ?? null },
      });

      if (dto.action === ApplicationReviewAction.APPROVE) {
        this.mail
          .sendVendorApproved(user.email, user.username, app.proposedStoreName)
          .catch(() => null);
      } else {
        this.mail
          .sendVendorRejected(user.email, user.username, dto.note!.trim())
          .catch(() => null);
      }

      this.events.emit(NotificationEvent.VENDOR_APPLICATION_REVIEWED, {
        userId: app.userId,
        approved: dto.action === ApplicationReviewAction.APPROVE,
        storeName: app.proposedStoreName,
        reason: dto.note ?? null,
      });

      return saved;
    });
  }

  // ─── Admin: vendors ───────────────────────────────────────────────────

  async createVendorDirect(dto: CreateVendorDto, adminId: number): Promise<Vendor> {
    let user: User | null = null;
    if (dto.userId) user = await this.users.findOneBy({ id: dto.userId });
    else if (dto.email) user = await this.users.findOneBy({ email: dto.email });
    if (!user) throw AppError.notFound('User not found');

    const existing = await this.vendors.findOne({ where: { userId: user.id } });
    if (existing) {
      throw AppError.conflict(
        'This user is already a vendor',
        ErrorCode.VENDOR_ALREADY_EXISTS,
      );
    }

    const vendor = await this.dataSource.transaction((tx) =>
      this.provisionVendor(tx, user!, dto.storeName, dto.commissionRate),
    );

    await this.audit.record({
      actorId: adminId,
      action: 'vendor.created_direct',
      entityType: 'vendor',
      entityId: vendor.id,
      metadata: { userId: user.id },
    });
    this.mail
      .sendVendorApproved(user.email, user.username, dto.storeName)
      .catch(() => null);
    return vendor;
  }

  async listVendorsAdmin(query: AdminVendorListQueryDto) {
    const { page, limit } = this.paginate(query);
    const qb = this.vendors
      .createQueryBuilder('vendor')
      .leftJoinAndSelect('vendor.user', 'user')
      .leftJoinAndMapOne('vendor.store', Store, 'store', 'store.vendorId = vendor.id');

    if (query.status) qb.andWhere('vendor.status = :status', { status: query.status });
    if (query.search) {
      qb.andWhere('(store.name ILIKE :s OR user.email ILIKE :s)', {
        s: `%${query.search}%`,
      });
    }
    if (query.sortBy === 'rating') qb.orderBy('vendor.ratingAverage', 'DESC');
    else if (query.sortBy === 'sales') qb.orderBy('vendor.totalSales', 'DESC');
    else qb.orderBy('vendor.createdAt', 'DESC');

    const [data, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getVendorAdmin(id: number): Promise<{ vendor: Vendor; store: Store | null }> {
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) throw AppError.notFound('Vendor not found');
    const store = await this.stores.findOne({ where: { vendorId: id } });
    return { vendor, store };
  }

  async updateVendorAdmin(
    id: number,
    dto: UpdateVendorAdminDto,
    adminId: number,
  ): Promise<Vendor> {
    const vendor = await this.vendors.findOne({ where: { id } });
    if (!vendor) throw AppError.notFound('Vendor not found');

    if (dto.action === VendorAdminAction.SUSPEND) {
      vendor.status = VendorStatus.SUSPENDED;
    } else if (dto.action === VendorAdminAction.REACTIVATE) {
      vendor.status = VendorStatus.APPROVED;
    }
    if (dto.commissionRate !== undefined) vendor.commissionRate = dto.commissionRate;

    const saved = await this.vendors.save(vendor);
    await this.audit.record({
      actorId: adminId,
      action: `vendor.${dto.action ?? 'updated'}`,
      entityType: 'vendor',
      entityId: id,
      metadata: { commissionRate: dto.commissionRate ?? null, note: dto.note ?? null },
    });
    return saved;
  }

  async setUserRole(
    userId: number,
    role: 'user' | 'admin' | 'super_admin',
    adminId: number,
  ): Promise<User> {
    const user = await this.users.findOneBy({ id: userId });
    if (!user) throw AppError.notFound('User not found');
    const previous = user.userType;
    user.userType = role as UserType;
    const saved = await this.users.save(user);
    await this.audit.record({
      actorId: adminId,
      action: 'user.role_changed',
      entityType: 'user',
      entityId: userId,
      metadata: { from: previous, to: role },
    });
    return saved;
  }

  // ─── internals ────────────────────────────────────────────────────────

  private async provisionVendor(
    tx: import('typeorm').EntityManager,
    user: User,
    storeName: string,
    commissionRate?: number,
  ): Promise<Vendor> {
    const vendorRepo = tx.getRepository(Vendor);
    const storeRepo = tx.getRepository(Store);
    const userRepo = tx.getRepository(User);

    const vendor = await vendorRepo.save(
      vendorRepo.create({
        userId: user.id,
        status: VendorStatus.APPROVED,
        commissionRate: commissionRate ?? null,
        approvedAt: new Date(),
      }),
    );

    const slug = await this.uniqueStoreSlug(storeRepo, storeName);
    await storeRepo.save(
      storeRepo.create({
        vendorId: vendor.id,
        name: storeName.trim(),
        slug,
        isActive: true,
      }),
    );

    if (user.userType === UserType.USER) {
      await userRepo.update({ id: user.id }, { userType: UserType.ADMIN });
    }
    return vendor;
  }

  private async uniqueStoreSlug(
    repo: Repository<Store>,
    name: string,
  ): Promise<string> {
    const base = slugify(name) || 'store';
    let candidate = base;
    let n = 1;
    while (await repo.findOne({ where: { slug: candidate } })) {
      candidate = `${base}-${n++}`;
      if (n > 50) {
        candidate = `${base}-${Date.now().toString(36)}`;
        break;
      }
    }
    return candidate;
  }

  private toPublicStore(store: Store) {
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      logo: store.logo,
      coverImage: store.coverImage,
      description: store.description,
      policies: store.policies,
      supportEmail: store.supportEmail,
      supportPhone: store.supportPhone,
      shippingFee: store.shippingFee == null ? null : Number(store.shippingFee),
      rating: {
        average: store.vendor?.ratingAverage ?? 0,
        count: store.vendor?.ratingCount ?? 0,
      },
      createdAt: store.createdAt,
    };
  }

  private paginate(query: { page?: string; limit?: string }) {
    const page = Math.max(PAGE_DEFAULT, Number(query.page) || PAGE_DEFAULT);
    const limit = Math.min(
      LIMIT_MAX,
      Math.max(1, Number(query.limit) || LIMIT_DEFAULT),
    );
    return { page, limit };
  }
}
