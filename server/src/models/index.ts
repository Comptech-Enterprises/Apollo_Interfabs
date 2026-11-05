import mongoose, { Schema, type Document, type Model, type Types } from "mongoose";

const defaultOptions = {
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (ret._id) ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      if (ret._id) ret.id = ret._id.toString();
      delete ret.__v;
      return ret;
    },
  },
};

export type Role = "OWNER" | "MANAGER" | "SALES";

// ==========================================
// User
// ==========================================
export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  username: string;
  passwordHash: string;
  role: Role;
  warehouses: string[];
  active: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

export type UserDocument = Document<Types.ObjectId, {}, IUser> & IUser & { id: string };

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["OWNER", "MANAGER", "SALES"], required: true },
    warehouses: { type: [String], default: [] },
    active: { type: Boolean, default: true },
    mustChangePassword: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { ...defaultOptions, collection: "User" }
);

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema, "User");

// ==========================================
// Sku
// ==========================================
export interface ISku {
  _id: Types.ObjectId;
  code: string;
  fabricName: string;
  fabricType: string;
  colour: string;
  pattern?: string | null;
  otherIdentifiers?: string | null;
  warehouse: string;
  sellingPricePerMetre: number;
  lowStockThreshold: number;
  currentStock: number;
  active: boolean;
  createdById: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type SkuDocument = Document<Types.ObjectId, {}, ISku> & ISku & { id: string };

const skuSchema = new Schema<ISku>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    fabricName: { type: String, required: true, trim: true },
    fabricType: { type: String, required: true, trim: true },
    colour: { type: String, required: true, trim: true },
    pattern: { type: String, default: null, trim: true },
    otherIdentifiers: { type: String, default: null, trim: true },
    warehouse: { type: String, default: "Warehouse 1", trim: true },
    sellingPricePerMetre: { type: Number, required: true },
    lowStockThreshold: { type: Number, default: 0 },
    currentStock: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { ...defaultOptions, timestamps: true, collection: "Sku" }
);

skuSchema.index({ fabricType: 1, colour: 1 });

skuSchema.virtual("stockIns", {
  ref: "StockIn",
  localField: "_id",
  foreignField: "skuId",
});

skuSchema.virtual("sales", {
  ref: "Sale",
  localField: "_id",
  foreignField: "skuId",
});

skuSchema.virtual("prices", {
  ref: "PriceChange",
  localField: "_id",
  foreignField: "skuId",
});

export const Sku: Model<ISku> = mongoose.models.Sku || mongoose.model<ISku>("Sku", skuSchema, "Sku");

// ==========================================
// StockIn
// ==========================================
export type QualityStatus = "APPROVED" | "REJECTED" | "PENDING";

export interface IStockIn {
  _id: Types.ObjectId;
  skuId: Types.ObjectId;
  supplierName: string;
  quantityMetres: number;
  purchaseDate: Date;
  costPricePerMetre: number;
  qualityStatus: QualityStatus;
  qualityReviewedById?: Types.ObjectId | null;
  qualityReviewedAt?: Date | null;
  qualityNotes?: string | null;
  createdById: Types.ObjectId;
  createdAt: Date;
  voidedAt?: Date | null;
  voidedById?: Types.ObjectId | null;
  voidReason?: string | null;
}

export type StockInDocument = Document<Types.ObjectId, {}, IStockIn> & IStockIn & { id: string };

const stockInSchema = new Schema<IStockIn>(
  {
    skuId: { type: Schema.Types.ObjectId, ref: "Sku", required: true },
    supplierName: { type: String, required: true, trim: true },
    quantityMetres: { type: Number, required: true },
    purchaseDate: { type: Date, required: true },
    costPricePerMetre: { type: Number, required: true },
    qualityStatus: {
      type: String,
      enum: ["APPROVED", "REJECTED", "PENDING"],
      default: "PENDING",
    },
    qualityReviewedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    qualityReviewedAt: { type: Date, default: null },
    qualityNotes: { type: String, default: null, trim: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    voidedAt: { type: Date, default: null },
    voidedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReason: { type: String, default: null },
  },
  { ...defaultOptions, collection: "StockIn" }
);

stockInSchema.index({ skuId: 1, purchaseDate: 1 });

stockInSchema.virtual("sku", {
  ref: "Sku",
  localField: "skuId",
  foreignField: "_id",
  justOne: true,
});

export const StockIn: Model<IStockIn> = mongoose.models.StockIn || mongoose.model<IStockIn>("StockIn", stockInSchema, "StockIn");

// ==========================================
// Sale
// ==========================================
export interface ISale {
  _id: Types.ObjectId;
  skuId: Types.ObjectId;
  quantityMetres: number;
  pricePerMetre: number;
  soldPricePerMetre: number;
  saleDate: Date;
  buyerName?: string | null;
  createdById: Types.ObjectId;
  createdAt: Date;
  voidedAt?: Date | null;
  voidedById?: Types.ObjectId | null;
  voidReason?: string | null;
}

export type SaleDocument = Document<Types.ObjectId, {}, ISale> & ISale & { id: string };

const saleSchema = new Schema<ISale>(
  {
    skuId: { type: Schema.Types.ObjectId, ref: "Sku", required: true },
    quantityMetres: { type: Number, required: true },
    pricePerMetre: { type: Number, required: true },
    soldPricePerMetre: { type: Number, required: true },
    saleDate: { type: Date, required: true },
    buyerName: { type: String, default: null, trim: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
    voidedAt: { type: Date, default: null },
    voidedById: { type: Schema.Types.ObjectId, ref: "User", default: null },
    voidReason: { type: String, default: null },
  },
  { ...defaultOptions, collection: "Sale" }
);

saleSchema.index({ skuId: 1, saleDate: 1 });

saleSchema.virtual("sku", {
  ref: "Sku",
  localField: "skuId",
  foreignField: "_id",
  justOne: true,
});

export const Sale: Model<ISale> = mongoose.models.Sale || mongoose.model<ISale>("Sale", saleSchema, "Sale");

// ==========================================
// Notification
// ==========================================
export interface INotification {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  message: string;
  link?: string | null;
  read: boolean;
  createdAt: Date;
}

export type NotificationDocument = Document<Types.ObjectId, {}, INotification> & INotification & { id: string };

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: null, trim: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { ...defaultOptions, collection: "Notification" }
);

notificationSchema.index({ userId: 1, read: 1, createdAt: 1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", notificationSchema, "Notification");

// ==========================================
// PriceChange
// ==========================================
export interface IPriceChange {
  _id: Types.ObjectId;
  skuId: Types.ObjectId;
  oldPrice?: number | null;
  newPrice: number;
  changedById: Types.ObjectId;
  changedAt: Date;
}

export type PriceChangeDocument = Document<Types.ObjectId, {}, IPriceChange> & IPriceChange & { id: string };

const priceChangeSchema = new Schema<IPriceChange>(
  {
    skuId: { type: Schema.Types.ObjectId, ref: "Sku", required: true },
    oldPrice: { type: Number, default: null },
    newPrice: { type: Number, required: true },
    changedById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { ...defaultOptions, collection: "PriceChange" }
);

priceChangeSchema.virtual("sku", {
  ref: "Sku",
  localField: "skuId",
  foreignField: "_id",
  justOne: true,
});

export const PriceChange: Model<IPriceChange> =
  mongoose.models.PriceChange || mongoose.model<IPriceChange>("PriceChange", priceChangeSchema, "PriceChange");

// ==========================================
// PurchaseOrder
// ==========================================
export interface IPurchaseOrder {
  _id: Types.ObjectId;
  companyName: string;
  billFrom?: string | null;
  supplierName?: string | null;
  poDate?: Date | null;
  quantity: number;
  description?: string | null;
  skuId?: Types.ObjectId | string | null;
  skuCode?: string | null;
  itemName?: string | null;
  createdById: Types.ObjectId;
  createdAt: Date;
}

export type PurchaseOrderDocument = Document<Types.ObjectId, {}, IPurchaseOrder> & IPurchaseOrder & { id: string };

const purchaseOrderSchema = new Schema<IPurchaseOrder>(
  {
    companyName: { type: String, required: true, trim: true },
    billFrom: { type: String, default: null, trim: true },
    supplierName: { type: String, default: null, trim: true },
    poDate: { type: Date, default: Date.now },
    quantity: { type: Number, required: true },
    description: { type: String, default: null, trim: true },
    skuId: { type: Schema.Types.ObjectId, ref: "Sku", default: null },
    skuCode: { type: String, default: null, trim: true },
    itemName: { type: String, default: null, trim: true },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { ...defaultOptions, collection: "PurchaseOrder" }
);

purchaseOrderSchema.index({ createdById: 1, createdAt: 1 });

export const PurchaseOrder: Model<IPurchaseOrder> =
  mongoose.models.PurchaseOrder || mongoose.model<IPurchaseOrder>("PurchaseOrder", purchaseOrderSchema, "PurchaseOrder");

// ==========================================
// AuditLog
// ==========================================
export interface IAuditLog {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | string;
  action: string;
  entity: string;
  entityId: string;
  details?: any;
  createdAt: Date;
}

export type AuditLogDocument = Document<Types.ObjectId, {}, IAuditLog> & IAuditLog & { id: string };

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { ...defaultOptions, collection: "AuditLog" }
);

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", auditLogSchema, "AuditLog");
