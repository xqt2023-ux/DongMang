import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [
    {
      provide: DatabaseService,
      useFactory: () => {
        return new DatabaseService('./data/dongmang.sqlite');
      },
    },
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}
