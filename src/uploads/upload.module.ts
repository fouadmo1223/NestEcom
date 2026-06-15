import { Module } from "@nestjs/common";
import { MulterModule } from "@nestjs/platform-express";
import { UploadController } from "./upload.controller";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    MulterModule.register({ dest: './src/uploads/files' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
