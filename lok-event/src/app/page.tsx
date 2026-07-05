"use client";

import { useState } from "react";
import NavbarMain from "../../components/NavbarMain";
import Filters from "../../components/Filters";
import ProviderGrid, { ProviderFilters } from "../../components/ProviderGrid";

export default function Home() {
  const [filters, setFilters] = useState<ProviderFilters>({});

  return (
    <main className="min-h-screen bg-[#050505]">
      <NavbarMain />
      <Filters onFilterChange={setFilters} />
      <ProviderGrid filters={filters} />
    </main>
  );
}