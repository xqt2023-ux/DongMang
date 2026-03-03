import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { ProjectModule } from './modules/project/project.module';
import { AssetModule } from './modules/asset/asset.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ProjectModule,
    AssetModule,
  ],
})
export class AppModule {}
