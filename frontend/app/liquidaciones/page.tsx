"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const GestionLiquidaciones = dynamic(() => import("@/components/GestionLiquidaciones"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() { return <GestionLiquidaciones />; }
