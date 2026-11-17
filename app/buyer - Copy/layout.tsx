import Navbar from "@/components/Navbar";

export default function BuyerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#F9FAFB] pt-[122px] pb-20">
        {children}
      </main>
    </>
  );
}