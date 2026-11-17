import { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageGallery from "@/components/product/ImageGallery";
import ProductTabs from "@/components/product/ProductTabs";
import RelatedProducts from "@/components/product/RelatedProducts";
import SellerCard from "@/components/product/SellerCard";
import BuyBox from "@/components/product/BuyBox";
import BidBox from "@/components/product/BidBox";
import Stars from "@/components/product/Stars";
import Badge from "@/components/product/Badge";
import ProductActions from "@/components/product/ProductActions";
import MobileStickyCTA from "@/components/product/MobileStickyCTA";
import { getProductById, getRelatedProducts } from "@/lib/product-data";
import { Product, RelatedProduct } from "@/types/product";

interface Props {
  params: Promise<{ id: string }>;
}

// ─── Fetch from local API (same DB instance as homepage) ───
async function fetchListing(id: string) {
  try {
    const res = await fetch(`http://localhost:3000/api/listings/${id}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch {
    return null;
  }
}

async function fetchListingsByCategory(category: string) {
  try {
    const res = await fetch(
      `http://localhost:3000/api/listings?category=${encodeURIComponent(category)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return json.success ? json.data : [];
  } catch {
    return [];
  }
}

function mapApiToProduct(listing: any): Product {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    type: listing.type,
    category: listing.category,
    condition: listing.condition,
    location: listing.location,
    images: listing.images?.length ? listing.images : ["📦"],
    price: listing.price,
    originalPrice: listing.price,
    stockCount: 1,
    sold: 0,
    views: listing.views || 0,
    specs: [],
    shipping: [
      {
        courier: listing.shippingMethod || "Standard Delivery",
        time: "2–3 business days",
        price: listing.shippingFee || 0,
        label: (listing.shippingFee || 0) === 0 ? "Free" : "Standard",
      },
    ],
    reviews: [],
    seller: {
      name: listing.sellerName,
      avatar: "🏪",
      badge: listing.sellerBadge || "Seller",
      level: "Seller",
      rating: listing.sellerRating || 0,
      reviews: listing.sellerReviews || 0,
      sales: "0",
      responseTime: "Usually within 24 hours",
      location: listing.location,
      memberSince: new Date(listing.createdAt).toLocaleDateString("en-NG", {
        month: "long",
        year: "numeric",
      }),
    },
    currentBid: listing.currentBid,
    totalBids: listing.bids || 0,
    endTime: listing.endTime || undefined,
    startPrice: listing.reservePrice,
    reserveMet: false,
    buyNowPrice: undefined,
    bidHistory: [],
  } as Product;
}

function mapApiToRelated(listing: any): RelatedProduct {
  return {
    id: listing.id,
    title: listing.title,
    price: listing.price,
    image: listing.images?.[0] || "📦",
    type: listing.type,
    rating: listing.sellerRating || 0,
    bids: listing.bids,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: rawId } = await params;
  let product: Product | null = null;

  const apiListing = await fetchListing(rawId);
  if (apiListing) {
    product = mapApiToProduct(apiListing);
  } else {
    const mockId = rawId.split("-")[0];
    product = await getProductById(mockId);
  }

  if (!product) return { title: "Not Found | Shopdroply" };
  return {
    title: `${product.title} | Shopdroply`,
    description: product.description.slice(0, 160),
  };
}

export default async function ProductPage({ params }: Props) {
  const { id: rawId } = await params;

  // 1. Try live database via API
  let product: Product | null = null;
  const apiListing = await fetchListing(rawId);
  if (apiListing) {
    product = mapApiToProduct(apiListing);
  }

  // 2. Fallback to mock data (for old IDs like "1-iphone-...")
  if (!product) {
    const mockId = rawId.split("-")[0];
    product = await getProductById(mockId);
  }

  if (!product) notFound();

  // 3. Related products
  const relatedApi = (await fetchListingsByCategory(product.category))
    .filter((l: any) => l.id !== rawId && l.status === "active")
    .slice(0, 4);

  const related =
    relatedApi.length > 0
      ? relatedApi.map(mapApiToRelated)
      : await getRelatedProducts(product.category, product.id, 4);

  const isAuction = product.type === "auction";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-[72px] pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 mb-4 pt-4">
            <a href="/" className="text-orange-500 hover:underline">
              Home
            </a>
            <span>›</span>
            <a href="/search" className="text-orange-500 hover:underline">
              Marketplace
            </a>
            <span>›</span>
            <span className="text-gray-900 font-semibold truncate max-w-md">
              {product.title}
            </span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-snug">
                {product.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2.5 mt-2.5">
                <Stars rating={product.seller.rating} size={15} />
                <span className="text-[13px] text-gray-500">
                  {product.seller.rating} ({product.seller.reviews} reviews)
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[13px] text-gray-500">
                  {product.type === "auction"
                    ? `${product.totalBids} bids`
                    : `${product.sold} sold`}
                </span>
                <span className="text-gray-300">·</span>
                <span className="text-[13px] text-gray-500">
                  👁 {product.views?.toLocaleString()} views
                </span>
                <Badge type="Verified" />
              </div>
            </div>
            <ProductActions product={product} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5">
                <ImageGallery images={product.images} isAuction={isAuction} />
              </div>
              <ProductTabs product={product} />
            </div>

            <div className="lg:col-span-5 xl:col-span-4 space-y-4">
              <div className="lg:sticky lg:top-[80px] space-y-4">
                {product.type === "auction" ? (
                  <BidBox
                    product={product as Extract<Product, { type: "auction" }>}
                  />
                ) : (
                  <BuyBox product={product} />
                )}
                <SellerCard seller={product.seller} />
                <div className="text-center pb-2">
                  <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                    🚩 Report this listing
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10">
            <RelatedProducts items={related} />
          </div>
        </div>
      </main>
      <Footer />
      <MobileStickyCTA product={product} />
    </div>
  );
}