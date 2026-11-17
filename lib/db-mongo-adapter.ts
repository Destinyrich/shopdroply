// lib/db-mongo-adapter.ts
// Skeleton for when you are ready to switch to MongoDB.
// Install: npm install mongoose

import { DatabaseAdapter, User, Listing, Order, Category, SessionRecord } from "./db-interface";
import mongoose, { Schema, model, connection } from "mongoose";

// ─── Schemas ───

const UserSchema = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: String,
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const ListingSchema = new Schema({
  title: String,
  description: String,
  price: Number,
  type: { type: String, enum: ["fixed", "auction"] },
  category: String,
  condition: String,
  images: [String],
  sellerId: String,
  sellerName: String,
  sellerRating: Number,
  sellerReviews: Number,
  sellerBadge: String,
  location: String,
  shippingFee: Number,
  shippingMethod: String,
  status: { type: String, default: "active" },
  createdAt: { type: Date, default: Date.now },
  endTime: Date,
  bids: Number,
  currentBid: Number,
  reservePrice: Number,
});

const OrderSchema = new Schema({
  buyerId: String,
  listingId: String,
  amount: Number,
  status: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const CategorySchema = new Schema({
  id: String,
  name: String,
  icon: String,
  slug: String,
  listingCount: Number,
  commissionRate: Number,
});

const OTPSchema = new Schema({
  phone: { type: String, unique: true },
  code: String,
  expiresAt: Date,
  attempts: { type: Number, default: 0 },
});

const SessionSchema = new Schema({
  token: { type: String, unique: true },
  userId: String,
  expiresAt: Date,
});

// ─── Models ───

const UserModel = mongoose.models.User || model("User", UserSchema);
const ListingModel = mongoose.models.Listing || model("Listing", ListingSchema);
const OrderModel = mongoose.models.Order || model("Order", OrderSchema);
const CategoryModel = mongoose.models.Category || model("Category", CategorySchema);
const OTPModel = mongoose.models.OTP || model("OTP", OTPSchema);
const SessionModel = mongoose.models.Session || model("Session", SessionSchema);

// ─── Adapter ───

export class MongoAdapter implements DatabaseAdapter {
  constructor(uri: string) {
    if (connection.readyState === 0) {
      mongoose.connect(uri);
    }
  }

  async createUser(userData: Omit<User, "id" | "createdAt" | "isVerified">): Promise<User> {
    const doc = await UserModel.create(userData);
    return this.mapUser(doc);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase() });
    return doc ? this.mapUser(doc) : null;
  }

  async createOTP(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await OTPModel.findOneAndUpdate(
      { phone: phone.replace(/\D/g, "") },
      { code, expiresAt: new Date(Date.now() + 10 * 60 * 1000), attempts: 0 },
      { upsert: true }
    );
    return code;
  }

  async verifyOTP(phone: string, code: string): Promise<boolean> {
    const result = await OTPModel.findOneAndDelete({
      phone: phone.replace(/\D/g, ""),
      code,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: 3 },
    });
    return !!result;
  }

  async createSession(userId: string): Promise<string> {
    const token = crypto.randomUUID();
    await SessionModel.create({ token, userId, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    return token;
  }

  async getSession(token: string): Promise<SessionRecord | null> {
    const doc = await SessionModel.findOne({ token, expiresAt: { $gt: new Date() } });
    return doc ? { userId: doc.userId, expiresAt: doc.expiresAt } : null;
  }

  async deleteSession(token: string): Promise<void> {
    await SessionModel.deleteOne({ token });
  }

  async getListings(filters?: { type?: string; category?: string }): Promise<Listing[]> {
    const query: any = { status: "active" };
    if (filters?.type) query.type = filters.type;
    if (filters?.category) query.category = filters.category;
    const docs = await ListingModel.find(query).sort({ createdAt: -1 });
    return docs.map(this.mapListing);
  }

  async getListingById(id: string): Promise<Listing | null> {
    const doc = await ListingModel.findById(id);
    return doc ? this.mapListing(doc) : null;
  }

  async createListing(listingData: Omit<Listing, "id" | "createdAt">): Promise<Listing> {
    const doc = await ListingModel.create(listingData);
    return this.mapListing(doc);
  }

  async createOrder(orderData: Omit<Order, "id" | "createdAt" | "updatedAt">): Promise<Order> {
    const doc = await OrderModel.create(orderData);
    return this.mapOrder(doc);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findById(id);
    return doc ? this.mapOrder(doc) : null;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    const docs = await OrderModel.find({ buyerId: userId }).sort({ createdAt: -1 });
    return docs.map(this.mapOrder);
  }

  async getCategories(): Promise<Category[]> {
    return CategoryModel.find().sort({ name: 1 });
  }

  // ─── Mappers ───

  private mapUser(doc: any): User {
    return {
      id: doc._id.toString(),
      email: doc.email,
      password: doc.password,
      name: doc.name,
      phone: doc.phone,
      isVerified: doc.isVerified,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private mapListing(doc: any): Listing {
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      price: doc.price,
      type: doc.type,
      category: doc.category,
      condition: doc.condition,
      images: doc.images || [],
      sellerId: doc.sellerId,
      sellerName: doc.sellerName,
      sellerRating: doc.sellerRating,
      sellerReviews: doc.sellerReviews,
      sellerBadge: doc.sellerBadge,
      location: doc.location,
      shippingFee: doc.shippingFee,
      shippingMethod: doc.shippingMethod,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      endTime: doc.endTime?.toISOString(),
      bids: doc.bids,
      currentBid: doc.currentBid,
      reservePrice: doc.reservePrice,
    };
  }

  private mapOrder(doc: any): Order {
    return {
      id: doc._id.toString(),
      buyerId: doc.buyerId,
      listingId: doc.listingId,
      amount: doc.amount,
      status: doc.status,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}

export function createMongoAdapter(uri: string): DatabaseAdapter {
  return new MongoAdapter(uri);
}