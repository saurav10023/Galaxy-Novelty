const PhoneGlyph = () => (
  <svg viewBox="0 0 64 64" className="w-16 h-16" fill="none">
    <rect x="14" y="4" width="36" height="56" rx="6" stroke="#14171C" strokeWidth="2.5" />
    <rect x="19" y="12" width="26" height="36" rx="1.5" fill="#2F5DFF" opacity="0.12" />
    <circle cx="32" cy="53" r="2.4" fill="#14171C" />
    <circle cx="41" cy="9" r="1.6" fill="#14171C" />
  </svg>
);

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-[#F3F4F1]">
      <div className="max-w-7xl mx-auto px-6 md:px-10 pt-16 pb-24 md:pt-24 md:pb-32 grid md:grid-cols-2 gap-16 items-center">
        {/* Left column — thesis */}
        <div className="max-w-xl">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-[#6B7280] mb-6">
            Mobiles · Accessories · No Hidden Markup
          </p>

          <h1 className="font-display text-[2.75rem] leading-[1.05] md:text-[3.75rem] md:leading-[1.02] text-[#14171C] tracking-tight">
            Every price you see
            <br />
            is the price you pay.
          </h1>

          <p className="mt-6 text-[17px] leading-relaxed text-[#4B4F57] max-w-md">
            Browse real specs and real prices on every phone, charger,
            power bank and pair of headphones in store — updated the
            moment stock changes, no asterisks.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="/shop"
              className="inline-flex items-center justify-center rounded-full bg-[#14171C] text-white text-[15px] font-medium px-7 py-3.5 transition-transform duration-200 hover:-translate-y-0.5 hover:bg-[#2F5DFF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F4F1]"
            >
              Browse the catalog
            </a>
            <a
              href="/shop?category=mobile"
              className="inline-flex items-center justify-center rounded-full border border-[#D8DAD3] text-[#14171C] text-[15px] font-medium px-7 py-3.5 transition-colors duration-200 hover:border-[#14171C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5DFF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3F4F1]"
            >
              Shop mobiles
            </a>
          </div>

          <div className="mt-12 flex items-center gap-6 font-mono text-[12px] text-[#6B7280]">
            <span>4G / 5G</span>
            <span className="w-1 h-1 rounded-full bg-[#D8DAD3]" />
            <span>Genuine accessories</span>
            <span className="w-1 h-1 rounded-full bg-[#D8DAD3]" />
            <span>In-store pickup</span>
          </div>
        </div>

        {/* Right column — signature price-tag card */}
        <div className="relative flex justify-center md:justify-end">
          {/* back tag, offset for depth */}
          <div
            className="hidden md:block absolute w-64 h-80 rounded-2xl bg-white border border-[#E1E3DD]"
            style={{ transform: "rotate(-8deg) translate(18px, 24px)" }}
            aria-hidden="true"
          />

          {/* front tag */}
          <div
            className="relative w-72 rounded-2xl bg-white border border-[#E1E3DD] shadow-[0_20px_50px_-20px_rgba(20,23,28,0.25)] px-6 pt-8 pb-7"
            style={{ transform: "rotate(3deg)" }}
          >
            {/* punch hole + dashed tear line */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#F3F4F1] border border-[#E1E3DD]" />
            <div className="absolute top-6 left-0 right-0 border-t border-dashed border-[#E1E3DD]" />

            <div className="mt-4 flex items-start justify-between">
              <PhoneGlyph />
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#2F5DFF] bg-[#2F5DFF]/10 rounded-full px-2.5 py-1">
                In stock
              </span>
            </div>

            <p className="mt-5 font-display text-lg text-[#14171C] leading-tight">
              Galaxy A54 5G
            </p>
            <p className="text-[13px] text-[#6B7280] mt-0.5">Samsung · 128GB</p>

            <div className="mt-4 flex flex-wrap gap-1.5 font-mono text-[11px] text-[#4B4F57]">
              <span className="border border-[#E1E3DD] rounded-full px-2.5 py-1">8GB RAM</span>
              <span className="border border-[#E1E3DD] rounded-full px-2.5 py-1">128GB</span>
              <span className="border border-[#E1E3DD] rounded-full px-2.5 py-1">5G</span>
            </div>

            <div className="mt-6 pt-5 border-t border-[#E1E3DD] flex items-baseline justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6B7280]">
                Store price
              </span>
              <span className="font-mono text-2xl text-[#14171C]">₹24,999</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;