"use client";
import dynamic from "next/dynamic";
import PageSkeleton from "@/components/PageSkeleton";

const LiquidacionForm = dynamic(() => import("@/components/LiquidacionForm"), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function Page() { return <LiquidacionForm />; }
