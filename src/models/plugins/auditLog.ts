import mongoose from 'mongoose';

export interface IAuditLog {
  tenantId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: 'create' | 'update' | 'delete' | 'void';
  collection: string;
  documentId: mongoose.Types.ObjectId;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

const auditLogSchema = new mongoose.Schema<IAuditLog>(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    action: {
      type: String,
      required: true,
      enum: ['create', 'update', 'delete', 'void'],
    },
    collection: {
      type: String,
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: undefined,
    },
    ipAddress: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
    suppressReservedKeysWarning: true,
  }
);

auditLogSchema.index({ tenantId: 1, collection: 1, documentId: 1, timestamp: -1 });
auditLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

export async function logAudit(
  data: Omit<IAuditLog, 'timestamp'>
): Promise<mongoose.Document> {
  return AuditLog.create({
    ...data,
    timestamp: new Date(),
  });
}

export function auditPlugin(schema: mongoose.Schema<any>, options: { collectionName?: string } = {}) {
  const collectionName = options.collectionName || (schema as any).modelName || 'unknown';

  schema.post('save', function (doc) {
    const changedPaths = doc.modifiedPaths();
    if (changedPaths.length === 0) return;

    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};

    changedPaths.forEach((path) => {
      before[path] = (doc as any).__orig?.[path];
      after[path] = (doc as any)[path];
    });

    const tenantId = (doc as any).tenantId;
    const userId = (doc as any).__userId;

    if (tenantId && userId) {
      logAudit({
        tenantId: (doc as any).tenantId,
        userId: (doc as any).__userId || new mongoose.Types.ObjectId(),
        action: 'update',
        collection: collectionName,
        documentId: doc._id as mongoose.Types.ObjectId,
        before,
        after,
      });
    }
  });
}