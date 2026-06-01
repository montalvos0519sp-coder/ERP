"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionCatalogosRH = dynamic(() => import("@/components/GestionCatalogosRH"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function CatalogosRHPage() { return <GestionCatalogosRH />; }
