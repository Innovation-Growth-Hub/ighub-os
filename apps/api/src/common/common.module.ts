import { Global, Module } from "@nestjs/common";
import { ActivityController, ActivityService } from "./activity.service.js";
import { AuditService } from "./audit.service.js";
import { StorageService } from "./storage.service.js";

/** Cross-cutting services every module can inject. */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [AuditService, ActivityService, StorageService],
  exports: [AuditService, ActivityService, StorageService],
})
export class CommonModule {}
