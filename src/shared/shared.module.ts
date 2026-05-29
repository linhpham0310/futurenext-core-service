/**
 * @file Defines the SharedModule, providing common infrastructure services and utilities
 * to be used across different feature modules. Marked as @Global() for convenience.
 */
import { Module, Global, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule if services need it
import { HashingService } from './providers/hashing/hashing.service';
import { AuditService } from './providers/audit/audit.service';
import { SecurityAuditLog } from './providers/audit/audit.entity';
// Import other shared providers/guards/adapters/filters here as they are created
import { RolesGuard } from './guards/roles.guard'; // <<<--- IMPORT

// Mark module as Global to make exported providers available application-wide
// without needing to import SharedModule into every feature module.
// Use with caution, ensure providers have minimal dependencies.
@Global()
@Module({
  imports: [
    ConfigModule, // Make ConfigService available within this module if needed by providers
    // Import the SecurityAuditLog entity repository so AuditService can inject it
    TypeOrmModule.forFeature([SecurityAuditLog]),
  ],
  // Declare the services provided by this module
  providers: [
    HashingService,
    AuditService,
    RolesGuard,
    Logger, // Provide Logger for use within shared services or re-export
    // Add other shared providers like JwtAuthGuard, RolesGuard, HttpExceptionFilter later
  ],
  // Export the services so they can be injected into other modules
  exports: [
    HashingService,
    AuditService,
    Logger, // Re-export Logger if needed globally
    // Export other shared components later
    RolesGuard, // <<<--- EXPORT
  ],
})
export class SharedModule {}
