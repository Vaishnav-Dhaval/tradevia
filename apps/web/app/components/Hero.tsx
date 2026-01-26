import React from "react";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-medium text-[#f0f6fc] leading-tight mb-4 font-dm-sans tracking-tighter">
          Turn{" "}
          <span className="italic font-instrument-serif tracking-normal bg-gradient-to-r from-[#00d9ff] to-[#00b050] bg-clip-text text-transparent">
            Market Volatility
          </span>{" "}
          into <br /> Opportunity with tradevia
        </h1>

        <p className="text-sm md:text-md text-[#8b949e] mb-8 max-w-3xl mx-auto leading-relaxed font-ibm-plex-mono">
          Step into the world of limitless opportunities with a trusted broker.
          A global reach to give you the confidence to trade smarter and scale
          faster.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
          <Link
            href="/marketplace"
            className="bg-gradient-to-r from-[#00d9ff] to-[#00b050] text-[#0d1117] px-8 py-3 rounded-4xl hover:opacity-90 transition-all font-dm-sans font-semibold text-lg w-full sm:w-auto cursor-pointer text-center shadow-lg shadow-[#00d9ff]/20"
          >
            Let&apos;s trade
          </Link>
          <Link
            href="/docs"
            className="border-2 border-[#30363d] text-[#f0f6fc] bg-transparent px-8 py-3 rounded-4xl hover:border-[#00d9ff] hover:text-[#00d9ff] transition-all font-dm-sans font-medium text-lg w-full sm:w-auto cursor-pointer text-center"
          >
            Read Docs
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Hero;
